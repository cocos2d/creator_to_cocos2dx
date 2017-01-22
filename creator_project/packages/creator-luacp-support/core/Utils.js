
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const PACKAGE_NAME = 'creator-lua-support';

function log(data) {
    const logFunc = Editor ? Editor.log : console.log;
    logFunc(data);
}

function runpython(params, cb) {
    let pyPath = 'python';
    if (process.platform !== 'darwin')
        pyPath = Editor.url('unpack://utils/Python27/python');

    return runcommand(pyPath, params, cb);
}

function runcommand(cmd, params, cb) {
    const spawn = require('child_process').spawn;
    const sp = spawn(cmd, params);

    sp.stdout.on('data', (data) => {
        log(data);
    });

    sp.stderr.on('data', (data) => {
        log(data);
    });

    sp.on('close', (code) => {
        cb(code);
    });
}

function getPackagePath() {
    return Editor.url('packages://' + PACKAGE_NAME + '/');
}

module.exports = {log, runpython, runcommand, getPackagePath};