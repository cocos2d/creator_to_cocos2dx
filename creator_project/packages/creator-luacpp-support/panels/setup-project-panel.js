
/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

'use strict';

const Fs = require('fs');
const Path = require('path');
const Electron = require('electron');

const Project = require(Editor.url('packages://creator-luacpp-support/core/Project.js'));

const styleUrl = Editor.url('packages://creator-luacpp-support/panels/style.css');
const style = Fs.readFileSync(styleUrl);

const templateUrl = Editor.url('packages://creator-luacpp-support/panels/setup-project-panel.html');
const template = Fs.readFileSync(templateUrl);

Editor.Panel.extend({
    style: style,
    template: template,

    ready() {
        let opts = Editor.require('packages://creator-luacpp-support/package.json');       
        let profileProject = this.profiles.project;

        let vm;
        window.vm = vm = this._vm = new window.Vue({
            el: this.shadowRoot,
            data: {
                profileProject: profileProject,
                task: '',
                buildState: 'sleep',
                buildProgress: 0,
                version: opts.version
            },

            watch: {
                project: {
                    handler(val) {
                        if (!profileProject.save) return;

                        profileProject.save();
                    },
                    deep: true
                }
            },

            methods: {
                _onChooseDistPathClick(event) {
                    event.stopPropagation();
                    let res = Editor.Dialog.openFile({
                        defaultPath: this.profileProject.data.path,
                        properties: ['openDirectory']
                    });
                    if (res && res[0]) {
                        this.profileProject.data.path = res[0];
                        this.profileProject.save();
                    }
                },

                _onShowInFinderClick(event) {
                    event.stopPropagation();
                    if (!Fs.existsSync(this.profileProject.data.path)) {
                        Editor.warn('%s not exists!', this.profileProject.data.path);
                        return;
                    }
                    Electron.shell.showItemInFolder(this.profileProject.data.path);
                    Electron.shell.beep();
                },

                _onBuildClick(event) {
                    event.stopPropagation();
                    Editor.Ipc.sendToMain('creator-luacpp-support:build', {
                        reason: 'ui',
                        profile: this.profileProject.data
                    });
                },

                _onSetupClick(event) {
                    event.stopPropagation();
                    Editor.Panel.close('creator-luacpp-support');
                },

                _onChangeExportResourceOnly(event) {
                    event.stopPropagation();
                    this.profileProject.data.exportResourceOnly = event.target.value;
                    this.profileProject.save();
                },

                _onChangeExportDynamicallyLoadResource(event) {
                    event.stopPropagation();
                    this.profileProject.data.exportResourceDynamicallyLoaded = event.target.value;
                    this.profileProject.save();
                },

                _onChangeAutoBuild(event) {
                    event.stopPropagation();
                    this.profileProject.data.autoBuild = event.target.value;
                    this.profileProject.save();
                }
            }
        });
    },

    _stateChanged: function(state, progress) {
        this._vm.buildProgress = progress;
        this._vm.buildState = state;
    },

    messages: {
        'creator-luacpp-support:state-changed'(event, state, progress) {
            this._stateChanged(state, progress);
        }
    }
});

