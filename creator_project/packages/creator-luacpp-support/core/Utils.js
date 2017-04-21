
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const Path = require('path');
const Fs = require('fire-fs');
const Constants = require('./Constants');

class Utils {
    static log(data) {
        const logFunc = Editor ? Editor.log : console.log;
        logFunc(data);
    }

    static runpython(params, cb) {
        let pyPath = 'python';
        if (process.platform !== 'darwin')
            pyPath = Editor.url('unpack://utils/Python27/python');

        Utils.runcommand(pyPath, params, cb);
    }

    static runcommand(cmd, params, cb) {
        const spawn = require('child_process').spawn;
        const sp = spawn(cmd, params);

        sp.stdout.on('data', (data) => {
            Utils.log(data);
        });

        sp.stderr.on('data', (data) => {
            Utils.log(data);
        });

        sp.on('close', (code) => {
            cb(code);
        });
    }

    // lua project includes config.json
    static isLuaProject(dir) {
        let config = Path.join(dir, 'config.json');
        return Fs.existsSync(config);
    }

    static getRelativePath(fullpath, uuid) {
        // let path = Editor.assetdb.mountInfoByUuid(uuid).path;
        // return fullpath.substring(path.length);

        return Editor.assetdb.mountInfoByUuid(uuid);
    }

    // should be invoked in main.js
    static getAssetsInfo(cb) {
        Editor.assetdb.queryMetas('db://**/*', '', function(err, metaInfos) {
            let uuidmaps = {};

            for (let i = 0, len = metaInfos.length; i < len; ++i) {
                let meta = metaInfos[i];
                let type = meta.assetType();
                if (type === 'folder' || type === 'javascript')
                    continue;

                let path = null;
                let uuid = meta.uuid;
                if (meta && !meta.useRawfile()) {
                    path = Editor.assetdb._uuidToImportPathNoExt(uuid);
                    path += '.json';
                }

                uuidmaps[uuid] = {
                    fullpath: path,
                    rawpath: Editor.assetdb.uuidToFspath(uuid),
                    relativePath: Utils.getRelativePath(path, uuid)
                }
            }

            Utils.log(uuidmaps);

            cb(uuidmaps);
        })
    }

    static eachSeries(array, iteratee, cb) {
           let i = 0;
           let len = array.length;
           let element = array[i];
           if (len == 0) {
               cb();
               return;
           }

           let callnext = function() {
               ++i;
               if (i == len)
                   cb();
               else {
                   element = array[i];
                   iteratee(element, callnext);
               }
           }

           iteratee(element, callnext);
       }
}

module.exports = Utils;
