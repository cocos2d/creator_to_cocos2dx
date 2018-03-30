
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";
const Path = require('path');

const Utils = require('./Utils');
const Constants = require('./Constants');
const Fs = require('fire-fs');
const Del = require('del')
const parse_fire = require('./parser/ConvertFireToJson');
const parse_utils = require('./parser/Utils')

const {WorkerBase, registerWorker} = require('./WorkerBase');

const plugin_profile = 'profile://project/creator-luacpp-support.json';

class BuildWorker extends WorkerBase {
    run(state, callback) {
        Utils.recordBuild();

        Editor.Ipc.sendToAll('creator-luacpp-support:state-changed', 'start', 0);
        Utils.log('[creator-luacpp-support] build start');

        this._callback = callback;
        this._state = state;

        // clean old json or ccreator files
        Fs.emptyDirSync(Constants.JSON_PATH);
        Fs.emptyDirSync(Constants.CCREATOR_PATH);

        Utils.getAssetsInfo(function(uuidmap) {
            let copyReourceInfos = this._convertFireToJson(uuidmap);
            let dynamicLoadRes = this._getDynamicLoadRes(uuidmap);
            Object.assign(copyReourceInfos, dynamicLoadRes);
            this._compileJsonToBinary(function() {
                this._copyResources(copyReourceInfos);
                Editor.Ipc.sendToAll('creator-luacpp-support:state-changed', 'finish', 100);
                this._callback();
                Utils.log('[creator-luacpp-support] build end');
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

        let i = 0;
        jsonFiles.forEach(function(file) {
            let subFolder = Path.dirname(file).substr(Constants.JSON_PATH.length + 1);
            let creatorPath = Path.join(Constants.CCREATOR_PATH, subFolder);
            let params = ['-b', '-o', creatorPath, Constants.CREATOR_READER_FBS, file];

            Utils.runcommand(Constants.FLATC, params, function(code){
                if (code != 0)
                    Utils.log('[creator-luacpp-support] convert ' + file + ' to .ccreator error');

                ++i;
                if (i === jsonFiles.length)
                    cb();
            });
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
            if (!Fs.existsSync(classes))
                classes = Path.join(projectRoot, 'project/Classes'); // cocos2d-x internal lua tests
        } 
        else {
            resdst = Path.join(projectRoot, 'Resources');
            classes = Path.join(projectRoot, 'Classes');
        }

        // copy resources
        {
            // copy .ccreator
            resdst = Path.join(resdst, Constants.RESOURCE_FOLDER_NAME);
            Del.sync(resdst, {force: true});
            this._copyTo(Constants.CCREATOR_PATH, resdst, ['.ccreator'], true);

            // copy other resources
            Object.keys(copyReourceInfos).forEach(function(uuid) {
                let pathInfo = copyReourceInfos[uuid];
                let src = pathInfo.fullpath;
                let dst = Path.join(resdst, pathInfo.relative_path);
                Fs.ensureDirSync(Path.dirname(dst));
                Fs.copySync(src, dst);
            });
        }

        let state = Editor.remote.Profile.load(plugin_profile, Constants.PROFILE_DEFAULTS);
        if (state.data.exportResourceOnly)
            return;

        // copy reader
        {
            let codeFilesDist = Path.join(classes, 'reader')
            Del.sync(codeFilesDist, {force: true});
            Fs.copySync(Constants.READER_PATH, codeFilesDist);

            // should exclude binding codes for c++ project
            if (!isLuaProject)
            {
                let bindingCodesPath = Path.join(classes, 'reader/lua-bindings');
                Del.sync(bindingCodesPath, {force: true});
            }
        }
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
        return this._getFilesWithExt(Constants.JSON_PATH, ['.json'], true);
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

    // dynamically load resources located at assets/resources folder
    _getDynamicLoadRes(uuidmap, collectedResources) {
        let state = Editor.remote.Profile.load(plugin_profile, Constants.PROFILE_DEFAULTS);
        if (!state.data.exportResourceDynamicallyLoaded)
            return;
        
        let dynamicLoadRes = {};
        let resourcesPath = Path.join(Constants.ASSETS_PATH, 'resources');

        Object.keys(uuidmap).forEach(function(uuid) {
            if(uuidmap[uuid].indexOf(resourcesPath) < 0)
                return true;
            
            dynamicLoadRes[uuid] = parse_utils.get_relative_full_path_by_uuid(uuid);
        });

        return dynamicLoadRes;
    }
}

registerWorker(BuildWorker, 'run-build-worker');
