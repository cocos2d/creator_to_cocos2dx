
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";
const Path = require('path');

const Utils = require('./Utils');
const Constants = require('./Constants');
const Fs = require('fire-fs');
const Del = require('del')
const parse_fire = require('./ConvertFireToJson');

const {WorkerBase, registerWorker} = require('./WorkerBase');

class BuildWorker extends WorkerBase {
    run(state, callback) {
        Editor.Ipc.sendToAll('creator-luacpp-support:state-changed', 'start', 0);
        Utils.log('[creator-luacpp-support] build start');

        this._callback = callback;
        this._state = state;

         // creator json folder if not exist
        if (!Fs.existsSync(Constants.JSON_PATH))
            Fs.mkdirSync(Constants.JSON_PATH);

        // creator ccreator folder if not exist
        if (!Fs.existsSync(Constants.CCREATOR_PATH))
            Fs.mkdirSync(Constants.CCREATOR_PATH);

        Utils.getAssetsInfo(function(uuidmap) {
            let copyReourceInfos = this._convertFireToJson(uuidmap);
            this._compileJsonToBinary(function() {
                this._copyResources(copyReourceInfos);
                Editor.Ipc.sendToAll('creator-luacpp-support:state-changed', 'finish', 100);
                this._callback();
            }.bind(this));
        }.bind(this));
    }

    _convertFireToJson(uuidmap) {
        let fireFiles = this._getFireList();  
        let copyReourceInfos = parse_fire(fireFiles, 'creator', Constants.JSON_PATH, uuidmap);

        return copyReourceInfos;
    }

    // .json -> .ccreator
    _compileJsonToBinary(cb) {
        const jsonFiles = this._getJsonList();

        var params = ['-b', '-o', Constants.CCREATOR_PATH, Constants.CREATOR_READER_FBS].concat(jsonFiles);
        Utils.runcommand(Constants.FLATC, params, (code) => {
            if (code != 0)
                Utils.log('[creator-luacpp-support] convert .json to .ccreator error');
            cb();
        });
    }

    _copyResources(copyReourceInfos) {
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
        Del.sync(resdst, {force: true});
        Del.sync(classes, {force: true});

        // copy .ccreator
        this._copyTo(Constants.CCREATOR_PATH, resdst, ['.ccreator']);
        // copy reader
        // should exclude binding codes for c++ project
        Fs.copySync(Constants.READER_PATH, classes);
        if (!isLuaProject)
        {
            Fs.unlink(Path.join(classes, 'CreatorReaderBinding.h'));
            Fs.unlink(Path.join(classes, 'CreatorReaderBinding.cpp'));
        }

        Object.keys(copyReourceInfos).forEach(function(uuid) {
            let pathInfo = copyReourceInfos[uuid];
            let src = pathInfo.fullpath;
            let dst = Path.join(resdst, pathInfo.relative_path);
            Fs.ensureDirSync(Path.dirname(dst));
            Fs.copySync(src, dst);
        });
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
        return this._getFilesWithExt(Constants.ASSETS_PATH, ['.fire'], true);
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
