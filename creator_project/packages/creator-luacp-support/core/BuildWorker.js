
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const {log, runpython, runcommand, getPackagePath} = require('./Utils');

const Fs = require('fire-fs');
const Path = require('path');

const {WorkerBase, registerWorker} = require('./WorkerBase');

const Project = require('./Project');


class BuildWorker extends WorkerBase {
    run(state, callback) {
        Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'start', 0);
        log('[creator-luacpp-support] build start');

        this._callback = callback;
        this._fireFiles = [];

        // convert fire to json
        this._convertFireToJson();
    }

    // .fire -> .json
    _convertFireToJson() {
        log('[creator-luacpp-support] converting .fire to .json start');

        const packagePath = getPackagePath();
        // TODO: should change url
        const pyFilePath = Path.join(packagePath, '../../../convert_fire_to_json.py');
        // TODO: should use creator API to get project path
        const tempPath = Path.join(packagePath, '../../temp');

        let params = [pyFilePath, '--creatorassets', tempPath];
        this._fireFiles = this._getFireList();  
        params = params.concat(this._fireFiles);

        runpython(params, (code) => {
            if (code == 0) {
                log('[creator-luacpp-support] convert .fire to .json finish');
                this._compileJsonToBinary();
            }
            else {
                log('[creator-luacpp-support] convert .fire to .json error');
                Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'finish', 100);
                this._callback();
            }
        });
    }

    // generate cpp header files
    _generateHeader() {

    }

    // .json -> .ccreator
    _compileJsonToBinary() {
        log('[creator-luacpp-support] convert .json to .ccreator start');
        
        const packagePath = getPackagePath();
        // TODO: change url for windows
        let flatc = Path.join(packagePath, '../../../bin/flatc')

        const fbs = Path.join(packagePath, '../../../CreatorReader.fbs'); 
        const jsonFiles = this._getJsonList();
        const outPath = Path.join(packagePath, '../../..');
        debugger;

        let params = ['-b', '-o', outPath, fbs].concat(jsonFiles);
        runcommand(flatc, params, (code) => {
            if (code == 0) {
                log('[creator-luacpp-support] convert .json to .ccreator finish');
            } 
            else {
                log('[creator-luacpp-support] convert .json to .ccreator error');
            }

            Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'finish', 100);
            this._callback();
        });
    }

    // get all .fire file in assets folder
    _getFireList() {
        // TODO: change the path
        const packagePath = getPackagePath();
        const assetsPath = Path.join(packagePath, '../../assets');
        return this._getFilesWithExt(assetsPath, '.fire');
    }

    _getJsonList() {
        // TODO: change the path
        const packagePath = getPackagePath();
        const assetsPath = Path.join(packagePath, '../../../json');
        return this._getFilesWithExt(assetsPath, '.json');
    }

   // return file list with `ext` in dir
    _getFilesWithExt(dir, ext) {
        let foundFiles = [];

        const files = Fs.readdirSync(dir);
        files.forEach((f) => {
            if (f.endsWith(ext))
                foundFiles.push(Path.join(dir, f));
        });
        return foundFiles;
    }
}

registerWorker(BuildWorker, 'run-build-worker');
