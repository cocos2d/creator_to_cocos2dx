
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const Electron = require('electron');

class WorkerBase {
    constructor(opts) {
        this._time = new Date();
        this._progress = 0;
        this._opts = opts;
        this._debug = opts.debug;
    }

    _updateProgress(step) {
        this._progress += step;
        Editor.Ipc.sendToAll('creator-luacpp-support:state-changed',
            'progress ' + Math.floor(this._progress) + '%',
            this._progress);
    }

    _execTime(tag) {
        let current = new Date();
        if (this._debug) {
            let times = (current.getTime() - this._time.getTime()) / 1000;
            Editor.log('[creator-luacpp-support] [' + tag + '] ' + times.toString() + 's');
        }
        this._time = current;
    }
}


function registerWorker(workerClass, runEvent) {
    Electron.ipcRenderer.on('creator-luacpp-support:' + runEvent, (event, state, opts) => {
        let worker = new workerClass(opts);
        worker.run(state, () => {
            event.reply();
        });
    });
}

module.exports.WorkerBase     = WorkerBase;
module.exports.registerWorker = registerWorker;

