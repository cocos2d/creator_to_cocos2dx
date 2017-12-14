
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const Path = require('path');
const Fs = require('fire-fs');
const Constants = require('./Constants');

let analytics = undefined;

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
        // project created by console
        let cocos2dx_path = Path.join(dir, 'frameworks/cocos2d-x');
        if (Fs.existsSync(cocos2dx_path))
            return true;

        // cocos2d-x internal lua tests
        let app_delegate_path = Path.join(dir, 'project/Classes/AppDelegate.cpp');
        if (Fs.existsSync(app_delegate_path))
            return true;

        return false;
    }

    static getRelativePath(fullpath, uuid) {
        // let path = Editor.assetdb.mountInfoByUuid(uuid).path;
        // return fullpath.substring(path.length);

        return Editor.assetdb.mountInfoByUuid(uuid);
    }

    // should be invoked in renderer process
    static getAssetsInfo(cb) {
        Editor.remote.assetdb.queryMetas('db://**/*', '', function(err, metaInfos) {
            let uuidmaps = {};

            for (let i = 0, len = metaInfos.length; i < len; ++i) {
                let meta = metaInfos[i];
                let type = meta.assetType();
                if (type === 'folder' || type === 'javascript')
                    continue;

                let uuid = meta.uuid;
                let path = null;
                if (meta && !meta.useRawfile()) {
                    path = Editor.remote.assetdb._uuidToImportPathNoExt(uuid);
                    path += '.json';
                }

                if (!path)
                    path = Editor.remote.assetdb.uuidToFspath(uuid);

                let url = path.replace(/\\/g, '/');

                uuidmaps[uuid] = url;
            }

            cb(uuidmaps);
        })
    }

    static replaceExt(path, ext) {
        return (path.substr(0, path.lastIndexOf(".")) + ext);
    }

    static recordBuild() {
        Utils.initAnalytics(function(analytics){
            analytics.CAEvent.onEvent({ eventName: 'build' });
        });
    }

    static initAnalytics(callback) {
        if (Utils._isAnalyticsInitialized()) {
            callback(analytics);
            return;
        }

        var src = "https://analytics.cocos.com/assets/js/cocosAnalytics.min.js";
        var script = document.createElement('script');
        script.onload = function () {
            document.head.removeChild(script);

            analytics = cocosAnalytics;
            if (typeof(analytics) !== 'undefined') {
                analytics.init({
                    appID: '630639001',
                    appSecret: 'a2d8adf595006f7a6af5f9b7e66a31d7',
                    channel: 'creator',
                    version: Constants.VERDION
                });
                // analytics.enableDebug(true);
                analytics.CAAccount.loginStart();
                analytics.CAAccount.loginSuccess({'userID': 'creator_for_cpp'});

                callback(analytics);
            }
        };
        script.onerror = function () {
            document.head.removeChild(script);
        };
        script.src = src;
        document.head.appendChild(script);
    }

    static _isAnalyticsInitialized() {
        return typeof(analytics) !== 'undefined';
    }
}

module.exports = Utils;
