
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const Path = require('path');
const Fs = require('fire-fs');

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
}

module.exports = Utils;
