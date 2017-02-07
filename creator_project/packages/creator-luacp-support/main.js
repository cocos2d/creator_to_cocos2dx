
/* jslint node: true, sub: true, esversion: 6 */
/* globals Editor */

"use strict";

const Fs = require('fs');
const Path = require('path');

const Electron = require('electron');

const TIMEOUT = -1;
const DEBUG_WORKER = true;
let PACKAGE_VERSION = '';

const Project = require('./core/Project');

let _buildState = 'sleep';

function _fetchVersion() {
    const Constants = require('./core/Constants');
    let info = Editor.Package.packageInfo(Editor.Package.packagePath(Constants.PACKAGE_NAME));
    PACKAGE_VERSION = info.version;
}

function _runWorker(url, message, project) {
    let buildWorker;
    Editor.App.spawnWorker(url, (worker) => {
        buildWorker = worker;
        let opts = {version: PACKAGE_VERSION, debug: DEBUG_WORKER};
        let state = project.dumpState();
        buildWorker.send(message, state, opts, (err) => {
            if (err) {
                Editor.error(err);
            }

            if (buildWorker) {
                buildWorker.close();
            }
            buildWorker = null;
        }, TIMEOUT);
    }, DEBUG_WORKER);
}

function _checkProject(reason) {
    // workaround for creator 1.3
    const Constants = require('./core/Constants');
    let state = Editor.Profile.load(Constants.PACKAGE_NAME, 'project', Constants.PROFILE_DEFAULTS);
    let project = new Project(state);

    if (project.validate()) {
        return project;
    } else {
        if (reason !== 'scene:saved') {
            Editor.Dialog.messageBox({
              type: 'warning',
              buttons: [Editor.T('MESSAGE.ok')],
              title: 'Warning - Lua Support',
              message: 'Please setup Target Project first',
              noLink: true,
            });
        } else {
            Editor.warn('[Lua Support] Please setup Target Project first');
        }
    }

    return null;
}

function _build(reason) {
    if (_buildState !== 'sleep' && _buildState !== 'finish') {
        Editor.warn('[Lua Support] Building in progress');
        return;
    }

    let project = _checkProject(reason);
    if (!project) return;

    Editor.Ipc.sendToAll('creator-lua-support:state-changed', 'start', 0);

    let workerUrl = 'packages://creator-lua-support/core/BuildWorker';
    _runWorker(workerUrl, 'creator-lua-support:run-build-worker', project);
}

module.exports = {
    load() {
        _fetchVersion();
        Editor.log('[Lua Support] version ' + PACKAGE_VERSION);
    },

    unload() {
    },

    messages: {
        'setup-target-project'() {
            const Constants = require('./core/Constants');
            Editor.Panel.open(Constants.PACKAGE_NAME, {version: PACKAGE_VERSION});
        },

        'build'(event, reason) {
            _build(reason);
        },

        'scene:saved'(event) {
            // workaround for creator 1.3
            const Constants = require('./core/Constants');
            let state = Editor.Profile.load(Constants.PACKAGE_NAME, 'project', Constants.PROFILE_DEFAULTS);
            if (state.autoBuild) {
                _build('scene:saved');
            }
        },

        'creator-lua-support:state-changed'(event, state, progress) {
            _buildState = state;
            Editor.Ipc.sendToWins('creator-lua-support:state-changed', state, progress);
        }
    }
};

