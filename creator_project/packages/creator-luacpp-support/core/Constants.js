/* jslint node: true, sub: true, esversion: 6, browser: true */
/* globals Editor */

"use strict";

const Path = require('path');

class Constants{};

Constants.PACKAGE_NAME = 'creator-luacpp-support';
// root of the this plugin 
Constants.PACKAGE_PATH = Editor.url('packages://' + Constants.PACKAGE_NAME + '/');
// root of creator project
if (process && process.type === 'renderer')
    Constants.PROJECT_PATH = Editor.remote.projectInfo.path;
else
    Constants.PROJECT_PATH = Editor.projectInfo.path;
// path of `assets` folder
Constants.ASSETS_PATH = Path.join(Constants.PROJECT_PATH, 'assets');
// path of `temp` folder
Constants.TEMP_PATH = Path.join(Constants.PROJECT_PATH, 'temp');
// path of `temp/internal`
Constants.INTERNAL_PATH = Path.join(Constants.TEMP_PATH, 'internal');
// path of `CreatorReader.fbs`
Constants.CREATOR_READER_FBS = Path.join(Constants.PACKAGE_PATH, 'CreatorReader.fbs');
// path of `flatc`
Constants.FLATC = Path.join(Constants.PACKAGE_PATH, 'bin/flatc');
// path of `convert_fire_to_json.py`c
Constants.CONVERT_FIRE_TO_JSON_PY = Path.join(Constants.PACKAGE_PATH, 'convert_fire_to_json.py');
// path of generated .json files
Constants.JSON_PATH = Path.join(Constants.PROJECT_PATH, 'json');
// path of generated .ccreator files
Constants.CCREATOR_PATH = Path.join(Constants.PROJECT_PATH, 'ccreator');
// path of reader folder
Constants.READER_PATH = Path.join(Constants.PACKAGE_PATH, 'reader');
// the folder that all resources are copied to
Constants.RESOURCE_FOLDER_NAME = 'creator';

Constants.VERDION = '0.4.0';

Constants.PROFILE_DEFAULTS = {
    setup: false,
    path: '',
    autoBuild: false,
    exportResourceOnly: false,
    exportResourceDynamicallyLoaded: false
};

module.exports = Constants;
