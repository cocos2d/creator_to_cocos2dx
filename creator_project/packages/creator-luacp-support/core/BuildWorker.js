
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";
const Path = require('path');

const Utils = require('./Utils');
const Constants = require('./Constants');
const Fs = require('fire-fs');

const {WorkerBase, registerWorker} = require('./WorkerBase');

class BuildWorker extends WorkerBase {
    run(state, callback) {
        Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'start', 0);
        Utils.log('[creator-luacpp-support] build start');

        this._callback = callback;
        this._fireFiles = [];
        this._state = state;

        // convert fire to json
        this._convertFireToJson()
        .then(() => {
            return this._compileJsonToBinary();
        }).then((params) => {
            return this._generateHeader(params);
        }).then(() => {
            return this._copyResources();
        }).catch((err) => {
            Utils.log(err);
        }).then(() => {
            Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'finish', 100);
            this._callback();
        });
    }

    // .fire -> .json
    _convertFireToJson() {
        let params = [Constants.CONVERT_FIRE_TO_JSON_PY, '--creatorassets', Constants.TEMP_PATH];
        this._fireFiles = this._getFireList();  
        params = params.concat(this._fireFiles);

        return new Promise((resolve, reject) => {
            Utils.runpython(params, (code) => {
                if (code != 0)
                    reject('[creator-luacpp-support] convert .fire to .json error');
                else
                    resolve();
                }
            );
        });
    }

    // .json -> .ccreator
    _compileJsonToBinary() {
        const jsonFiles = this._getJsonList();

        var params = ['-b', '-o', Constants.CREATOR_TO_COCOS2D_ROOT, Constants.CREATOR_READER_FBS].concat(jsonFiles);
        return new Promise((resolve, reject) => {
            Utils.runcommand(Constants.FLATC, params, (code) => {
                if (code == 0) {
                    let newParams = ['-c'].concat(params);
                    resolve(newParams);
                } 
                else {
                    reject('[creator-luacpp-support] convert .json to .ccreator error');
                }    
            });
        });
        
    }

    // generate cpp header files
    _generateHeader(params) {
        return new Promise((resolve, reject) => {
            Utils.runcommand(Constants.FLATC, params, (code) => {
                if (code != 0) 
                    reject('[creator-luacpp-support] generate CreatorReader_generated.h error');
                else
                   resolve();
            });
        })
    }

    _copyResources() {
        // should copy these resources
        // - all .ccreator files
        // - resources in assets and folder
        // - all files in reader
        // - lua binding codes(currently is missing)

        let projectRoot = this._state.path;
        let isLuaProject = Utils.isLuaProject(projectRoot);

        // root path of resources
        let resdst;
        let classes;
        if (isLuaProject) {
            resdst = Path.join(projectRoot, 'res');
            classes = Path.join(projectRoot, 'frameworks/runtime-src/Classes');
        } 
        else {
            resdst = Path.join(projectRoot, 'Resources');
            classes = Path.join(projectRoot, 'Classes');
        }

        // copy .ccreator
        this._copyTo(Constants.CREATOR_TO_COCOS2D_ROOT, resdst, ['.ccreator']);
        // copy reader
        Fs.copySync(Constants.READER_PATH, classes);

        let exts = ['.png', '.ttf', '.fnt', '.plist', '.atlas', '.tmx', '.json'];
        this._copyTo(Constants.ASSETS_PATH, resdst, exts, true);
        // FIXME: should consider the folder path
        this._copyTo(Constants.INTERNAL_PATH, resdst, exts, true);
    }

   // copy all files with ext in src to dst
   // @exts array of ext, such as [.json, .ccreator]
   // @recursive whether recursively to copy the subfolder
    _copyTo(src, dst, exts, recursive) {
        let files = this._getFilesWithExt(src, exts);

        let dstpath;
        files.forEach((f) => {
            dstpath = Path.join(dst, Path.basename(f));
            Fs.ensureDirSync(Path.dirname(dstpath));
            Fs.copySync(f, dstpath);
        });
    }

   // copy all files in src to dst recursively
    _copyToAll(src, dst) {

    }

    // get all .fire file in assets folder
    _getFireList() {
        return this._getFilesWithExt(Constants.ASSETS_PATH, ['.fire']);
    }

    _getJsonList() {
        return this._getFilesWithExt(Constants.JSON_PATH, ['.json']);
    }

   // return file list with `ext` in dir
    _getFilesWithExt(dir, exts, recursive) {
        let foundFiles = [];

        const files = Fs.readdirSync(dir);
        let folders = [];
        files.forEach((f) => {
            let ext = Path.extname(f);
            if (exts.includes(ext))
                foundFiles.push(Path.join(dir, f));

            if (recursive) {
                let stats = Fs.lstateSync(f);
                if (stat.isDirectory) 
                    foundFiles.concat(this._getFilesWithExt(f, ext, recursive));
            }
        });
        return foundFiles;
    }

    // get all files
    _getFolderList(dir) {

    }
}

registerWorker(BuildWorker, 'run-build-worker');
