const fs = require('fs');
const fire_fs = require('fire-fs');
const path = require('path');
const Utils = require('./Utils');

let DEBUG = false;

function log(s) {
    if (DEBUG)
        console.log(s);
}

/**
 * Singleton
 */
class State {
    constructor() {
        this.reset();
    }

    reset() {
        this._filename = '';

        // the .fire file being parsed
        this._json_data = [];

        // FIXME: it is useless
        this._meta_data = {};

        // record all sprite frames
        // key is uuid, value is the information of the sprite frame
        this._sprite_frames = {};

        // contains all resource paths
        // key is uuid, value is { relative_path: '', full_path: '' }
        // need to use the information to copy resources
        this._uuid = {};

        this._design_resolution = null;

        // clips
        // key is the uuid, value is the animation
        this._clips = {};
    }
}

let state = new State();

/**
 * Node related
 */

/**
 * Node
 */
class Node {

    static get_node_components(node) {
        if ('_components' in node) {
            let idxs = node._components;
            let components = [];
            idxs.forEach( idx => {
                let idx_num = idx.__id__;
                components.push(state._json_data[idx_num]);
            });
            return components;
        }
        return null;
    }

    static get_node_component_of_type(node, t) {
        let components = Node.get_node_components(node);
        if (components != null) {
            for (let i = 0, len = components.length; i < len; ++i) {
                let c = components[i];
                if (c.__type__ === t)
                    return c;
            }
        }
        return null;
    }

    static guess_type_from_components(components) {
        // ScrollView, Button & ProgressBar should be before Sprite
        let supported_components = ['cc.Button', 'cc.ProgressBar', 'cc.ScrollView',
            'cc.EditBox', 'cc.Label', 'sp.Skeleton', 'cc.Sprite',
            'cc.ParticleSystem', 'cc.TileMap', 'cc.Canvas', 'cc.RichText'];
        let node_components = components.map(x => x.__type__);
        // special case for object without components
        if (node_components.length == 0)
            return 'cc.Node';

        for (let i = 0, len = node_components.length; i < len; ++i) {
            let supported = node_components[i];
            if (node_components.includes(supported)) {
                log('Choose ' + supported + ' from ' + node_components);
                return supported;
            }
        }
        log('Unknown components ' + node_components);
        return 'unknown';
    }

    static create_node(node_type, node_idx, cb) {
        let n = null;
        if (node_type === 'cc.Node')
            n = new Node(state._json_data[node_idx]);
        else if (node_type === 'cc.Sprite')
            n = new Sprite(state._json_data[node_idx]);
        else if (node_type === 'cc.Canvas')
            n = new Canvas(state._json_data[node_idx])
        // TODO: other types

        if (n != null)
            n.parse_properties(() => {
                cb(n);
            });
        else
            cb(null);
    }

    static get_filepath_from_uuid(uuid, cb) {
        let filepath = null;
        if (uuid in state._uuid)
            filepath = state._uuid[uuid].relative_path;

        if (filepath == null)
            console.log('can not find filepath of uuid ' + uuid);
        return filepath;
    }

    static get_sprite_frame_name_by_uuid(uuid, cb) {
        if (uuid in state._sprite_frames) {
            cb(null, state._sprite_frames[uuid].name)
        }
        else {
            Editor.Ipc.sendToMain('scene:query-asset-info-by-uuid', uuid, function (err, info) {
                let information = info;
                if (information) {
                    let jsonfile = information.url;
                    let contents = fs.readFileSync(jsonfile);
                    let contents_json = JSON.parse(contents);

                    let metauuid;
                    let texture_uuid = contents_json.content.texture;
                    if (contents_json.content.atlas !== '') {
                        // texture packer
                        metauuid = contents_json.content.atlas;
                    }
                    else {
                        // a single picture
                        metauuid = texture_uuid;
                    }

                    // handle texture path

                    let fullpath = Editor.remote.assetdb.uuidToFspath(texture_uuid);
                    let mountInfo = Editor.remote.assetdb.mountInfoByUuid(texture_uuid);
                    // get texture path information, which is used to copy resources
                    let root = mountInfo.path;
                    let relative_path = fullpath.substring(root.length + 1);
                    state._uuid[texture_uuid] = {fullpath:fullpath, relative_path:relative_path};

                    // get texture frames information
                    let meta = Editor.remote.assetdb._uuid2meta[metauuid].__subMetas__;
                    let found_sprite_frame_name = null;
                    Object.keys(meta).forEach(sprite_frame_name => {
                        let sprite_frame_info = meta[sprite_frame_name];
                        sprite_frame_info.name = sprite_frame_name;
                        sprite_frame_info.texture_path = relative_path;

                        let sprite_frame_uuid = sprite_frame_info.uuid; 
                        state._sprite_frames[sprite_frame_uuid] = sprite_frame_info;

                        if (sprite_frame_uuid == uuid)
                            found_sprite_frame_name = sprite_frame_name;
                    });
                    cb(null, found_sprite_frame_name);
                }
                else {
                    log('can not get sprite frame name of uuid ' + uuid);
                    cb();
                }
            });
        }
    }

    constructor(data) {
        this._node_data = data;
        this._children = [];
        this._jsonNode = {
            object: null,
            object_type: 'Node',
            children: []
        }
        this._properties = {}
    }

    add_property_str(newkey, value, data) {
        if (value in data) {
            let new_value = data[value];
            this._properties[newkey] = new_value;
        }
    }

    add_property_size(newkey, value, data) {
        if (value in data) {
            let w = data[value].width;
            let h = data[value].height;
            this._properties[newkey] = {w:w, h:h};
        }
    }

    add_property_int(newkey, value, data) {
        if (value in data) {
            let i = data[value];
            this._properties[newkey] = i;
        }
    }

    add_property_vec2(newkey, value, data) {
        if (value in data) {
            let x = data[value].x;
            let y = data[value].y;
            this._properties[newkey] = {x:x, y:y};
        }
    }

    add_property_rgb(newkey, value, data) {
        if (value in data) {
            let r = data[value].r;
            let g = data[value].g;
            let b = data[value].b;
            this._properties[newkey] = {r:parseInt(r), g:parseInt(g), b:parseInt(b)};
        }
    }

    add_property_bool(newkey, value, data) {
        if (value in data)
            this._properties[newkey] = data[value];
    }

    get_class_name() {
        return this.constructor.name;
    }

    parse_properties(cb) {
        // 1st: parse self
        this.parse_node_properties();
        this.parse_clip();
        
        // 2nd: parse children
        Utils.eachSeries(this._node_data._children, 
            (item, cb) => {
                this.parse_child(item.__id__, cb);
            },
            () => {
                cb();
            }
       );

    //    for (child_idx in this._node_data._children)
    //        this.parse_child(child_idx.__id__);
    }

    parse_node_properties() {
        let data = this._node_data;
        this.add_property_size('contentSize', '_contentSize', data);
        this.add_property_bool('enabled', '_enabled', data);
        this.add_property_str('name', '_name', data);
        this.add_property_vec2('anchorPoint', '_anchorPoint', data);
        this.add_property_bool('cascadeOpacityEnabled', '_cascadeOpacityEnabled', data);
        this.add_property_rgb('color', '_color', data);
        this.add_property_int('globalZOrder', '_globalZOrder', data);
        this.add_property_int('localZOrder', '_localZOrder', data);
        this.add_property_int('opacity', '_opacity', data);
        this.add_property_bool('opacityModifyRGB', '_opacityModifyRGB', data);
        this.add_property_vec2('position', '_position', data);
        this.add_property_int('rotationSkewX', '_rotationX', data);
        this.add_property_int('rotationSkewY', '_rotationY', data);
        this.add_property_int('scaleX', '_scaleX', data);
        this.add_property_int('scaleY', '_scaleY', data);
        this.add_property_int('skewX', '_skewX', data);
        this.add_property_int('skewY', '_skewY', data);
        this.add_property_int('tag', '_tag', data);
    }

    parse_child(node_idx, cb) {
        let node = state._json_data[node_idx];
        if (node.__type__ === 'cc.Node') {
            let components = Node.get_node_components(node);
            let node_type = Node.guess_type_from_components(components);
            if (node_type != null) {
                Node.create_node(node_type, node_idx, function(n){
                    this.adjust_child_parameters(n);
                    if (n != null)
                        this.add_child(n);
                    cb();
                }.bind(this));
            }
            else
                cb();
        }
        else
            cb();
    }

    parse_clip() {
        // TODO
    }

    add_child(node) {
        this._children.push(node);
    }

    print_scene_graph(tab) {
        // TODO
    }

    get_description(tab) {
        return ('-' * tab + this.get_class_name);
    }

    /**
     * JSON stuff
     */
    to_json(depth, sibling_idx) {
        this.to_json_begin(depth, sibling_idx);
        this.to_json_properties();

        for (let idx = 0, len = this._children.length; idx < len; ++idx) {
            let child = this._children[idx];
            let jsonChild = child.to_json(depth + 1, idx);
            if (jsonChild != null)
                this._jsonNode.children.push(jsonChild);
        }

        return this._jsonNode;
    }

    to_json_begin(depth, sibling_idx) {

    }

    to_json_properties() {
        this._jsonNode.object = this._properties;
    }

    adjust_child_parameters(child) {
        // Only useful when a parent wants to override some child parameter
        // As an example, ScrollView needs to adjust its children position
    }
}

/**
 * Special Nodes: Scene, Canvas
 */

/**
 * Node: Scene
 */
class Scene extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Scene';
    }

    parse_properties(cb) {
        super.parse_properties(function() {
            // Move Node properties into 'node' and clean _properties
            this._properties = {node: this._properties};
            cb();
        }.bind(this));
    }
}

/**
 * Canvas
 */
class Canvas extends Node {
    constructor(data) {
        super(data);

        let component = Node.get_node_component_of_type(this._node_data, 'cc.Canvas');
        state._design_resolution = component._designResolution;
        state._fit_width = component._fitWidth;
        state._fit_height = component._fitHeight;

        this._jsonNode.object_type = 'Node';
    }
}

/**
 * Canvase
 * TODO
 */

/**
 * Built-in Renderer Node
 * Sprite, Label, TMX, Particle
 */
class Sprite extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Sprite';
    }

    parse_properties(cb) {
        super.parse_properties(() => {
            // Move Node properties into 'node' and clean _properties
            this._properties = {node: this._properties};

            let component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
            let sprite_frame_uuid = component._spriteFrame.__uuid__;
            
            Node.get_sprite_frame_name_by_uuid(sprite_frame_uuid, function(err, name) {
                this._properties['spriteFrameName'] = name
                this._properties.spriteType = Sprite.SPRITE_TYPES[component._type];
                this.add_property_int('srcBlend', '_srcBlendFactor', component);
                this.add_property_int('dstBlend', '_dstBlendFactor', component);
                this.add_property_bool('trimEnabled', '_isTrimmedMode', component);
                this._properties.sizeMode = Sprite.SIZE_MODES[component._sizeMode];

                cb();
            }.bind(this));
        });
    }
}
Sprite.SPRITE_TYPES = ['Simple', 'Sliced', 'Tiled', 'Filled'];
Sprite.SIZE_MODES = ['Custom', 'Trimmed', 'Raw'];

/**
 * bootstrap + helper functions
 */
class FireParser {
    constructor() {
        this._state = state;
        this._json_file = null;
        this._json_output = {version: '1.0', root: {}};
        this._assetpath = '';
        this._creatorassets = null;
    }

    to_json_setup() {
        this.to_json_setup_design_resolution();
        this.to_json_setup_sprite_frames();
        this.to_json_setup_clips();
    }

    to_json_setup_design_resolution() {
        this._json_output.designResolution = {
            w: this._state._design_resolution.width,
            h: this._state._design_resolution.height
        }

        this.resolutionFitWidth = state._fit_width;
        this.resolutionFitHeight = state._fit_height;
    }

    to_json_setup_sprite_frames() {
        let sprite_frames = [];

        for (let sprite_frame_uuid in state._sprite_frames) {
            let sprite_frame = state._sprite_frames[sprite_frame_uuid];

            let frame = {
                name: sprite_frame.name,
                texturePath: this._assetpath + sprite_frame.texture_path,
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

    to_json_setup_clips() {
        // TODO
    }

    create_file(filename) {
        fire_fs.ensureDirSync(path.dirname(filename));
        return fs.openSync(filename, 'w');
    }

    run(filename, assetpath, path_to_json_files, cb) {
        state._filename = path.basename(filename, '.fire');
        let json_name = path.join(path_to_json_files, state._filename) + '.json';
        this._json_file = this.create_file(json_name);
        this._assetpath = assetpath;

        state._json_data = JSON.parse(fs.readFileSync(filename));

        state._json_data.forEach(obj => {
            if (obj.__type__ === 'cc.SceneAsset') {
                let scene = obj.scene;
                let scene_idx = scene.__id__;
                let scene_obj = new Scene(state._json_data[scene_idx]);

                scene_obj.parse_properties(function() {
                    this.to_json_setup();
                    let jsonNode = scene_obj.to_json(0, 0);
                    this._json_output.root = jsonNode;
                    let dump = JSON.stringify(this._json_output, null, '\t');
                    fs.writeSync(this._json_file, dump);
                    fs.close(this._json_file);
                    cb();
                }.bind(this));
            }
        });
    }
}

function parse_fire(filenames, assetpath, path_to_json_files, cb) {
    if (assetpath[-1] != '/')
        assetpath += '/';

    let uuid = {};
    Utils.eachSeries(filenames, function(filename, cb) {
        state.reset();
        let parse = new FireParser();
        parse.run(filename, assetpath, path_to_json_files, function() {
            for(let key in state._uuid) {
                if (state._uuid.hasOwnProperty(key))
                    uuid[key] = state._uuid[key];
            }
            cb();
        });
    },
    function() {
        cb(uuid);
    });
}

module.exports = parse_fire;