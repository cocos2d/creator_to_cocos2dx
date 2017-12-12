const fs = require('fs');
const fire_fs = require('fire-fs');
const path = require('path');
const Utils = require('../Utils');
const Constants = require('../Constants');
const Scene = require('./Scene');
const state = require('./Global').state;
const get_sprite_frame_name_by_uuid = require('./Utils').get_sprite_frame_name_by_uuid;

let uuidInfos = null;

/**
 * bootstrap + helper functions
 */
class FireParser {
    constructor() {
        this._state = state;
        this._json_file = null;
        this._json_output = {version: Constants.VERDION, root: {}};
        this._creatorassets = null;
    }

    to_json_setup() {
        this.to_json_setup_design_resolution();
        this.to_json_setup_sprite_frames();
        this.to_json_setup_collision_matrix();
    }

    to_json_setup_design_resolution() {
        if (this._state._design_resolution)
            this._json_output.designResolution = {
                w: this._state._design_resolution.width,
                h: this._state._design_resolution.height
            }

        this._json_output.resolutionFitWidth = state._fit_width;
        this._json_output.resolutionFitHeight = state._fit_height;
    }

    to_json_setup_sprite_frames() {
        let sprite_frames = [];

        for (let sprite_frame_uuid in state._sprite_frames) {
            let sprite_frame = state._sprite_frames[sprite_frame_uuid];

            let frame = {
                name: get_sprite_frame_name_by_uuid(sprite_frame_uuid),
                texturePath: state._assetpath + sprite_frame.texture_path,
                rect: {x:sprite_frame.trimX, y:sprite_frame.trimY, w:sprite_frame.width, h:sprite_frame.height},
                offset: {x:sprite_frame.offsetX, y:sprite_frame.offsetY},
                rotated: sprite_frame.rotated,
                originalSize: {w:sprite_frame.rawWidth, h:sprite_frame.rawHeight}
            };
            // does it have a capInsets?
            if (sprite_frame.borderTop != 0 || sprite_frame.borderBottom != 0 || 
                sprite_frame.borderLeft != 0 || sprite_frame.borderRgith != 0) {
                
                frame.centerRect = {
                    x: sprite_frame.borderLeft,
                    y: sprite_frame.borderTop,
                    w: sprite_frame.width - sprite_frame.borderRight - sprite_frame.borderLeft,
                    h: sprite_frame.height - sprite_frame.borderBottom - sprite_frame.borderTop
                }
            }

            sprite_frames.push(frame);
        }

        this._json_output.spriteFrames = sprite_frames;
    }

    to_json_setup_collision_matrix() {
        let collisionMatrix = Editor.remote.Profile.load('profile://project/project.json').data['collision-matrix'];
        this._json_output.collisionMatrix = [];
        for (let i = 0, len = collisionMatrix.length; i < len; ++i) {
            let collisionLine = {value: collisionMatrix[i]};
            this._json_output.collisionMatrix.push(collisionLine);
        }
    }

    create_file(filename) {
        fire_fs.ensureDirSync(path.dirname(filename));
        return fs.openSync(filename, 'w');
    }

    run(filename, assetpath, path_to_json_files) {
        state._filename = path.basename(filename, '.fire');
        let sub_folder = path.dirname(filename).substr(Constants.ASSETS_PATH.length + 1);
        let json_name = path.join(path_to_json_files, sub_folder, state._filename) + '.json';
        this._json_file = this.create_file(json_name);
        state._assetpath = assetpath;

        state._json_data = JSON.parse(fs.readFileSync(filename));

        state._json_data.forEach(obj => {
            if (obj.__type__ === 'cc.SceneAsset') {
                let scene = obj.scene;
                let scene_idx = scene.__id__;
                let scene_obj = new Scene(state._json_data[scene_idx]);

                scene_obj.parse_properties();

                this.to_json_setup();
                let jsonNode = scene_obj.to_json(0, 0);
                this._json_output.root = jsonNode;
                let dump = JSON.stringify(this._json_output, null, '\t').replace(/\\\\/g,'/');
                fs.writeSync(this._json_file, dump);
                fs.close(this._json_file);
            }
        });
    }
}

function parse_fire(filenames, assetpath, path_to_json_files, uuidmaps) {
    if (assetpath[-1] != '/')
        assetpath += '/';

    uuidinfos = uuidmaps;

    let uuid = {};
    filenames.forEach(function(filename) {
        state.reset();
        let parser = new FireParser();
        parser.run(filename, assetpath, path_to_json_files)
        for(let key in state._uuid) {
            if (state._uuid.hasOwnProperty(key))
                uuid[key] = state._uuid[key];
        }
    });
    return uuid;
}

module.exports = parse_fire;