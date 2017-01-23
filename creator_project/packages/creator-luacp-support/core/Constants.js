/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const Path = require('path');

class Constants{};

Constants.PACKAGE_NAME = 'creator-lua-support';
// root of the this plugin 
Constants.PACKAGE_PATH = Editor.url('packages://' + Constants.PACKAGE_NAME + '/');
// path of `assets` folder
Constants.ASSETS_PATH = Path.join(Constants.PACKAGE_PATH, '../../assets');
// path of `temp` folder
Constants.TEMP_PATH = Path.join(Constants.PACKAGE_PATH, '../../temp');
// path of `temp/internal`
Constants.INTERNAL_PATH = Path.join(Constants.TEMP_PATH, 'internal');
// path of `CreatorReader.fbs`
Constants.CREATOR_READER_FBS = Path.join(Constants.PACKAGE_PATH, '../../../CreatorReader.fbs');
// path of `flatc`
Constants.FLATC = Path.join(Constants.PACKAGE_PATH, '../../../bin/flatc');
// root of creator_to_cocos2d
Constants.CREATOR_TO_COCOS2D_ROOT = Path.join(Constants.PACKAGE_PATH, '../../..');
// path of `convert_fire_to_json.py`
Constants.CONVERT_FIRE_TO_JSON_PY = Path.join(Constants.PACKAGE_PATH, '../../../convert_fire_to_json.py');
// root of generated json files
Constants.JSON_PATH = Path.join(Constants.CREATOR_TO_COCOS2D_ROOT, 'json');
// path of reader folder
Constants.READER_PATH = Path.join(Constants.CREATOR_TO_COCOS2D_ROOT, 'reader');

Constants.PROFILE_DEFAULTS = {
    setup: false,
    path: '',
    startSceneUuid: '',
    selectAllScenes: true,
    autoBuild: false,
    scenesUuid: []
};

module.exports = Constants;
