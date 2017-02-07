
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";
const Path = require('path');

const Utils = require('./Utils');
const Constants = require('./Constants');
const Fs = require('fire-fs');
const Del = require('del')

const {WorkerBase, registerWorker} = require('./WorkerBase');

class BuildWorker extends WorkerBase {
    run(state, callback) {
        Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'start', 0);
        Utils.log('[creator-luacpp-support] build start');

        this._callback = callback;
        this._fireFiles = [];
        this._state = state;

        // creator json folder if not exist
        if (!Fs.existsSync(Constants.JSON_PATH))
            Fs.mkdirSync(Constants.JSON_PATH);

        // creator ccreator folder if not exist
        if (!Fs.existsSync(Constants.CCREATOR_PATH))
            Fs.mkdirSync(Constants.CCREATOR_PATH);

        // convert fire to json
        this._convertFireToJson()
        .then(() => {
            return this._compileJsonToBinary();
        }).then(() => {
            return this._copyResources();
        }).catch((err) => {
            Utils.log(err);
        }).then(() => {
            Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'finish', 100);
            this._callback();

            // remove generated .json/.ccreator files
            Del.sync(Constants.JSON_PATH);
            Del.sync(Constants.CCREATOR_PATH);
        });
    }

    // .fire -> .json
    _convertFireToJson() {
        let params = [Constants.CONVERT_FIRE_TO_JSON_PY, 
        '--cocospath', Constants.RESOURCE_FOLDER_NAME , 
        '--creatorassets', Constants.TEMP_PATH,
        '--jsonpath', Constants.JSON_PATH];

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

        var params = ['-b', '-o', Constants.CCREATOR_PATH, Constants.CREATOR_READER_FBS].concat(jsonFiles);
        return new Promise((resolve, reject) => {
            Utils.runcommand(Constants.FLATC, params, (code) => {
                if (code == 0) {
                    resolve();
                } 
                else {
                    reject('[creator-luacpp-support] convert .json to .ccreator error');
                }    
            });
        });
    }

    _copyResources() {
        // should copy these resources
        // - all .ccreator files
        // - resources in assets and folder
        // - all files in reader
        // - lua binding codes(currently is missing)

        let projectRoot = this._state.path;
        
        // root path of resources
        let resdst;
        let classes;
        let isLuaProject = Utils.isLuaProject(projectRoot);
        if (isLuaProject) {
            resdst = Path.join(projectRoot, 'res');
            classes = Path.join(projectRoot, 'frameworks/runtime-src/Classes');
        } 
        else {
            resdst = Path.join(projectRoot, 'Resources');
            classes = Path.join(projectRoot, 'Classes');
        }
        // move all resources into 'creator' folder
        resdst = Path.join(resdst, Constants.RESOURCE_FOLDER_NAME);
        // remove all .cpp/.h files into 'reader'
        classes = Path.join(classes, 'reader');

        // remove previous reader and resources first
        Del.sync(resdst);
        Del.sync(classes);

        // copy .ccreator
        this._copyTo(Constants.CCREATOR_PATH, resdst, ['.ccreator']);
        // copy reader
        Fs.copySync(Constants.READER_PATH, classes);

        // copy resources
        let exts = ['.png', '.ttf', '.fnt', '.plist', '.atlas', '.tmx', '.json'];
        this._copyTo(Constants.ASSETS_PATH, resdst, exts, true);
        this._copyTo(Constants.INTERNAL_PATH, resdst, exts, true);
    }

   // copy all files with ext in src to dst
   // @exts array of ext, such as ['.json', '.ccreator']
   // @recursive whether recursively to copy the subfolder
    _copyTo(src, dst, exts, recursive) {
        let files = this._getFilesWithExt(src, exts, recursive);

        let dstpath;
        let subpath;
        files.forEach((f) => {
            subpath = f.slice(src.length, f.length);
            dstpath = Path.join(dst, subpath);
            Fs.ensureDirSync(Path.dirname(dstpath));
            Fs.copySync(f, dstpath);
        });
    }

    // get all .fire file in assets folder
    _getFireList() {
        return this._getFilesWithExt(Constants.ASSETS_PATH, ['.fire']);
    }

    _getJsonList() {
        return this._getFilesWithExt(Constants.JSON_PATH, ['.json']);
    }

   // return file list ends with `exts` in dir
    _getFilesWithExt(dir, exts, recursive) {
        let foundFiles = [];

        const files = Fs.readdirSync(dir);
        files.forEach((f) => {
            let fullpath = Path.join(dir, f)
            let ext = Path.extname(f);
            if (exts.includes(ext))
                foundFiles.push(fullpath);

            if (recursive) {
                let stats = Fs.lstatSync(fullpath);
                if (stats.isDirectory()) 
                    foundFiles = foundFiles.concat(this._getFilesWithExt(fullpath, exts, recursive));
            }
        });
        return foundFiles;
    }
}

registerWorker(BuildWorker, 'run-build-worker');
