const path = require('path');
const fs = require('fs');
const state = require('./Global').state;
const Utils = require('../Utils');

/**
 * Get resource path by uuid.
 * The return value:
 * @fullpath: full path of the resource
 * @relative_path: relative path to assets folder or creator default asset path
 */
let get_relative_full_path_by_uuid = function(uuid) {
    let fullpath = Editor.remote.assetdb.uuidToFspath(uuid);
    let mountInfo = Editor.remote.assetdb.mountInfoByUuid(uuid);
    let root = mountInfo.path;
    let relative_path = fullpath.substring(root.length + 1);

    return {
        fullpath: fullpath,
        relative_path: relative_path
    };
}


/**
 * The sprite frame name will include path information if it is not a texture packer
 */
let get_sprite_frame_name_by_uuid = function(uuid) {
    if (uuid in state._sprite_frames) {
        let uuid_info = state._sprite_frames[uuid];
        if (uuid_info.is_texture_packer)
            return uuid_info.name;
        else
            return uuid_info.texture_path;
    }
    else {
        let jsonfile = uuidinfos[uuid];
        if (jsonfile) {
            let contents = fs.readFileSync(jsonfile);
            let contents_json = JSON.parse(contents);

            let metauuid;
            let texture_uuid = contents_json.content.texture;
            let is_texture_packer = false;
            if (contents_json.content.atlas !== '') {
                // texture packer
                metauuid = contents_json.content.atlas;
                is_texture_packer = true;
            }
            else
                // a single picture
                metauuid = texture_uuid;

            // handle texture path

            let path_info = get_relative_full_path_by_uuid(texture_uuid);
            state._uuid[texture_uuid] = path_info;

            // get texture frames information
            let meta = Editor.remote.assetdb._uuid2meta[metauuid].__subMetas__;
            let found_sprite_frame_name = null;
            Object.keys(meta).forEach(sprite_frame_name => {
                let sprite_frame_info = meta[sprite_frame_name];
                sprite_frame_info.name = sprite_frame_name;
                sprite_frame_info.texture_path = path_info.relative_path;
                sprite_frame_info.is_texture_packer = is_texture_packer;

                let sprite_frame_uuid = sprite_frame_info.uuid; 
                state._sprite_frames[sprite_frame_uuid] = sprite_frame_info;

                if (sprite_frame_uuid == uuid) {
                    if (is_texture_packer)
                        found_sprite_frame_name = sprite_frame_name;
                    else
                        found_sprite_frame_name = sprite_frame_info.texture_path;
                }
            });
            return found_sprite_frame_name;
        }
        else {
            module.exports.log('can not get sprite frame name of uuid ' + uuid);
            return null;
        }
    }
}

let get_font_path_by_uuid = function(uuid) {
    if (uuid in state._uuid)
        return state._uuid[uuid].relative_path;
    else {
        let jsonfile = uuidinfos[uuid];
        if (jsonfile) {
            let current_dir = path.basename(jsonfile, '.json');
            let contents = fs.readFileSync(jsonfile);
            let contents_json = JSON.parse(contents);
            let type = contents_json.__type__;
            // creator copy resources into the uuid folder
            let res_dir = path.join(path.dirname(jsonfile), uuid);

            if (type === 'cc.BitmapFont') {
                // png path
                let png_uuid = contents_json.spriteFrame.__uuid__;
                let json_png = JSON.parse(fs.readFileSync(uuidinfos[png_uuid]));
                let png_path_info = get_relative_full_path_by_uuid(json_png.content.texture);
                state._uuid[png_uuid] = png_path_info;

                // fnt path
                state._uuid[uuid] = {
                    fullpath: Utils.replaceExt(png_path_info.fullpath, '.fnt'),
                    relative_path: Utils.replaceExt(png_path_info.relative_path, '.fnt')
                }

                return state._uuid[uuid].relative_path;
            }
            else if (type === 'cc.TTFFont') {
                state._uuid[uuid] = {
                    fullpath: path.join(res_dir, contents_json._rawFiles[0]),
                    relative_path: current_dir + '/' + contents_json._rawFiles[0]
                }

                return state._uuid[uuid].relative_path;
            }
            else {
                return 'xxx';
            }
        }
        else {
            module.exports.log('can not get bmfont path of uuid ' + uuid);
            return 'xxx';
        }
    }
}

/**
 * return json file path and atlas path
 */
let get_spine_info_by_uuid = function (uuid) {
    if (uuid in state._uuid)
        return state._uuid[uuid];

    let jsonfile = uuidinfos[uuid];
    if (jsonfile) {
        let contents = fs.readFileSync(jsonfile);
        let contents_json = JSON.parse(contents);
        let current_dir = path.basename(jsonfile, '.json');
        
        let res_dir = path.join(path.dirname(jsonfile), uuid);
        
        let files = fs.readdirSync(res_dir);
        files.forEach(function(file) {
            let fullpath = path.join(res_dir, file);
            //FIXME: have more than one json file?
            state._uuid[uuid] = {fullpath: fullpath, relative_path: current_dir + '/' + file};
        });
        
        // get atlas path
        state._uuid[uuid].atlas_url = get_relative_full_path_by_uuid(contents_json.atlasUrl.__uuid__);
        // add to _uuid to copy resources
        state._uuid[uuid + '-atlas'] = state._uuid[uuid].atlas_url;

        // get textures path
        for (let i = 0, len = contents_json.textures.length; i < len; ++i) {
            let texture = contents_json.textures[i];
            // just create a unique key
            let new_key = uuid + '-texture-' + i;
            state._uuid[new_key] = get_relative_full_path_by_uuid(texture.__uuid__);
        }

        return state._uuid[uuid];
    }
}

let get_tiledmap_path_by_uuid = function (uuid) {
    if (uuid in state._uuid)
        return state._uuid.relative_path;

    // from the json file, we can only get texture path
    // so should use the texture path to get tmx path
    let jsonfile = uuidinfos[uuid];
    if (jsonfile) {
        let contents = fs.readFileSync(jsonfile);
        let contents_json = JSON.parse(contents);

        // record texture path
        let tmx_texture_info = {};
        contents_json.textures.forEach(function(texture_info) {
            state._uuid[texture_info.__uuid__] = get_relative_full_path_by_uuid(texture_info.__uuid__);
            tmx_texture_info = state._uuid[texture_info.__uuid__];
        });

        // get tmx path
        let tmx_relative_path = Utils.replaceExt(tmx_texture_info.relative_path, '.tmx');
        let tmx_fullpath = Utils.replaceExt(tmx_texture_info.fullpath, '.tmx');
        state._uuid[uuid] = {
            relative_path: tmx_relative_path,
            fullpath: tmx_fullpath
        };

        return tmx_relative_path;
    }
}

let get_particle_system_path_by_uuid = function (uuid) {
    if (uuid in state._uuid)
        return state._uuid[uuid].relative_path;

    let path_info = get_relative_full_path_by_uuid(uuid);
    state._uuid[uuid] = path_info;
    return path_info.relative_path;
}

let DEBUG = false;
log = function(s) {
    if (DEBUG)
        Utils.log(s);
}

let create_node = function (node_type, node_idx) {
    const Node = require('./Node');
    const Button = require('./Button');
    const Canvas = require('./Canvas');
    const EditBox = require('./EditBox');
    const Label = require('./Label');
    const ParticleSystem = require('./ParticleSystem');
    const ProgressBar = require('./ProgressBar');
    const RichText = require('./RichText');
    const ScrollView = require('./ScrollView');
    const SpineSkeleton = require('./SpineSkeleton');
    const Sprite = require('./Sprite');
    const TiledMap = require('./TiledMap');
    const VideoPlayer = require('./VideoPlayer');
    const WebView = require('./WebView');
    const Slider = require('./Slider');

    let n = null;
    if (node_type === 'cc.Sprite')
        n = new Sprite(state._json_data[node_idx]);
    else if (node_type === 'cc.Canvas')
        n = new Canvas(state._json_data[node_idx]);
    else if (node_type === 'cc.Label')
        n = new Label(state._json_data[node_idx]);
    else if (node_type === 'cc.RichText')
        n = new RichText(state._json_data[node_idx]);
    else if (node_type === 'cc.Button')
        n = new Button(state._json_data[node_idx]);
    else if (node_type === 'cc.ProgressBar')
        n = new ProgressBar(state._json_data[node_idx]);
    else if (node_type === 'cc.ScrollView')
        n = new ScrollView(state._json_data[node_idx]);
    else if (node_type === 'cc.EditBox')
        n = new EditBox(state._json_data[node_idx]);
    else if (node_type === 'cc.TiledMap')
        n = new TiledMap(state._json_data[node_idx]);
    else if (node_type === 'cc.ParticleSystem')
        n = new ParticleSystem(state._json_data[node_idx]);
    else if (node_type === 'sp.Skeleton')
        n = new SpineSkeleton(state._json_data[node_idx]);
    else if (node_type === 'cc.VideoPlayer')
        n = new VideoPlayer(state._json_data[node_idx])
    else if (node_type === 'cc.WebView')
        n = new WebView(state._json_data[node_idx]);
    else if (node_type === 'cc.Slider')
        n = new Slider(state._json_data[node_idx])

    if (n != null) {
        n.parse_properties();
        return n;
    }
    else
        return null;
}

/**
 * remove a child from node's children by child's id
 * @param {node} the Node that to be applied to 
 * @param {id} child's id
 */
let remove_child_by_id = function (node, id) {
    let children = node._node_data._children;
    for (let i = 0, len = children.length; i < len; ++i) {
        let child = children[i];
        if (child.__id__ === id) {
            children.splice(i, 1);
            break;
        }
    }
}

module.exports = {
    get_relative_full_path_by_uuid: get_relative_full_path_by_uuid,
    get_sprite_frame_name_by_uuid: get_sprite_frame_name_by_uuid,
    get_font_path_by_uuid: get_font_path_by_uuid,
    get_spine_info_by_uuid: get_spine_info_by_uuid,
    get_tiledmap_path_by_uuid: get_tiledmap_path_by_uuid,
    get_particle_system_path_by_uuid : get_particle_system_path_by_uuid,
    create_node: create_node,
    log: log,
    remove_child_by_id: remove_child_by_id
}
