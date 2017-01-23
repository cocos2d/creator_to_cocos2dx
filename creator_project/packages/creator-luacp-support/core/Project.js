
/* jslint node: true, sub: true, esversion: 6 */
/* globals Editor */

"use strict";

const Fs = require('fire-fs');
const Path = require('path');

const printlog = Editor ? Editor.log : console.log;
function tostring(v) {
    return v === null ? '' : v.toString();
}

module.exports = class Project {
    constructor(state) {
        this.path = state ? state.path : '';
        this.startSceneUuid = state ? state.startSceneUuid : '';
        this.selectAllScenes = state ? state.selectAllScenes : true;
        this.autoBuild = state ? state.autoBuild : true;
        this.scenes = [];
        this._scenesUuid = (state && Array.isArray(state.scenesUuid)) ? state.scenesUuid : [];
    }

    validate() {
        if (typeof this.path !== 'string' || this.path === '') {
            Editor.warn('[Lua Support] not set Target Project Path');
            return false;
        }

        try {
            let stat = Fs.statSync(this.path);
            if (!stat.isDirectory()) {
                Editor.warn('[Lua Support] ' + this.path + ' is not directory');
                return false;
            }
        } catch (e) {
            Editor.warn('[Lua Support] invalid path: ' + this.path);
            return false;
        }

        return true;
    }

    printlog() {
        printlog('-- dump project');
        printlog('  path: ' + tostring(this.path));
        printlog('  startSceneUuid: ' + tostring(this.startSceneUuid));
        printlog('  selectAllScenes: ' + (this.selectAllScenes ? 'YES' : 'NO'));
        printlog('  autoBuild: ' + (this.autoBuild ? 'YES' : 'NO'));
        printlog('  scenes:');
        this.scenes.forEach((scene, index) => {
            printlog('    ' + (index + 1).toString() + ': ' + scene.url + (scene.checked ? ' [*]' : ' [ ]'));
        });
    }

    setScenes(scenes) {
        this.scenes.splice(0);
        scenes.forEach((scene) => {
            this.scenes.push({
                uuid: scene.uuid,
                url: scene.url,
                checked: this.selectAllScenes || this._scenesUuid.indexOf(scene.uuid) !== -1
            });
        });

        let startSceneUuid = this.startSceneUuid;
        let found = this.scenes.find((item) => {
            return item.uuid == startSceneUuid;
        });

        if (!found) {
            if (this.scenes.length > 0) {
                this.startSceneUuid = this.scenes[0].uuid;
                this.scenes[0].checked = true;
            } else {
                this.startSceneUuid = '';
            }
        }
    }

    dumpState(state) {
        if (!state) {
            state = {};
        }
        state.path = this.path;
        state.startSceneUuid = this.startSceneUuid;
        state.selectAllScenes = this.selectAllScenes;
        state.autoBuild = this.autoBuild;
        state.scenesUuid = [];
        this.scenes.forEach((scene) => {
            if (this.selectAllScenes || scene.checked) {
                state.scenesUuid.push(scene.uuid);
            }
        });
        return state;
    }

    getSelectedScenes() {
        let scenes = [];
        this.scenes.forEach((scene) => {
            if (this.selectAllScenes || scene.checked) {
                scenes.push(scene);
            }
        });
        return scenes;
    }
};
