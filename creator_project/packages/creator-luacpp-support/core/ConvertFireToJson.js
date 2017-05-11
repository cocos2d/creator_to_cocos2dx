const fs = require('fs');
const fire_fs = require('fire-fs');
const path = require('path');
const Utils = require('./Utils');
const Constants = require('./Constants');

let DEBUG = false;
let uuidInfos = null;

function log(s) {
    if (DEBUG)
        Utils.log(s);
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
            'cc.ParticleSystem', 'cc.TiledMap', 'cc.Canvas', 'cc.RichText'];
        let node_components = components.map(x => x.__type__);
        // special case for object without components
        if (node_components.length == 0)
            return 'cc.Node';

        for (let i = 0, len = supported_components.length; i < len; ++i) {
            let supported = supported_components[i];
            if (node_components.includes(supported)) {
                log('Choose ' + supported + ' from ' + node_components);
                return supported;
            }
        }
        log('Unknown components ' + node_components);
        return 'unknown';
    }

    static create_node(node_type, node_idx) {
        let n = null;
        if (node_type === 'cc.Node')
            n = new Node(state._json_data[node_idx]);
        else if (node_type === 'cc.Sprite')
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

        if (n != null) {
            n.parse_properties();
            return n;
        }
        else
            return null;
    }

    static get_sprite_frame_name_by_uuid(uuid) {
        if (uuid in state._sprite_frames) {
            return state._sprite_frames[uuid].name;
        }
        else {
            let jsonfile = uuidinfos[uuid];
            if (jsonfile) {
                let contents = fs.readFileSync(jsonfile);
                let contents_json = JSON.parse(contents);

                let metauuid;
                let texture_uuid = contents_json.content.texture;
                if (contents_json.content.atlas !== '')
                    // texture packer
                    metauuid = contents_json.content.atlas;
                else
                    // a single picture
                    metauuid = texture_uuid;

                // handle texture path

                let path_info = Node.get_relative_full_path_by_uuid(texture_uuid);
                state._uuid[texture_uuid] = path_info;

                // get texture frames information
                let meta = Editor.remote.assetdb._uuid2meta[metauuid].__subMetas__;
                let found_sprite_frame_name = null;
                Object.keys(meta).forEach(sprite_frame_name => {
                    let sprite_frame_info = meta[sprite_frame_name];
                    sprite_frame_info.name = sprite_frame_name;
                    sprite_frame_info.texture_path = path_info.relative_path;

                    let sprite_frame_uuid = sprite_frame_info.uuid; 
                    state._sprite_frames[sprite_frame_uuid] = sprite_frame_info;

                    if (sprite_frame_uuid == uuid)
                        found_sprite_frame_name = sprite_frame_name;
                });
                return found_sprite_frame_name;
            }
            else {
                log('can not get sprite frame name of uuid ' + uuid);
                return null;
            }
        }
    }

    static get_relative_full_path_by_uuid(uuid) {
        let fullpath = Editor.remote.assetdb.uuidToFspath(uuid);
        let mountInfo = Editor.remote.assetdb.mountInfoByUuid(uuid);
        // get texture path information, which is used to copy resources
        let root = mountInfo.path;
        let relative_path = fullpath.substring(root.length + 1);

        return {
            fullpath: fullpath,
            relative_path: relative_path
        };
    }

    static get_font_path_by_uuid(uuid) {
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
                    let png_path_info = Node.get_relative_full_path_by_uuid(json_png.content.texture);
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
                log('can not get bmfont path of uuid ' + uuid);
                return 'xxx';
            }
        }
    }

    /**
     * return json file path and atlas path
     */
    static get_spine_info_by_uuid(uuid) {
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
            state._uuid[uuid].atlas_url = Node.get_relative_full_path_by_uuid(contents_json.atlasUrl.__uuid__);
            // add to _uuid to copy resources
            state._uuid[uuid + '-atlas'] = state._uuid[uuid].atlas_url;

            // get textures path
            for (let i = 0, len = contents_json.textures.length; i < len; ++i) {
                let texture = contents_json.textures[i];
                // just create a unique key
                let new_key = uuid + '-texture-' + i;
                state._uuid[new_key] = Node.get_relative_full_path_by_uuid(texture.__uuid__);
            }

            return state._uuid[uuid];
        }
    }

    static get_tiledmap_path_by_uuid(uuid) {
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
                state._uuid[texture_info.__uuid__] = Node.get_relative_full_path_by_uuid(texture_info.__uuid__);
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

    static get_particle_system_path_by_uuid(uuid) {
        if (uuid in state._uuid)
            return state._uuid[uuid].relative_path;

        let path_info = Node.get_relative_full_path_by_uuid(uuid);
        state._uuid[uuid] = path_info;
        return path_info.relative_path;
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

    parse_properties() {
        // 1st: parse self
        this.parse_node_properties();
        this.parse_clip();
        
        // 2nd: parse children
        this._node_data._children.forEach(function(item) {
            this.parse_child(item.__id__);
        }.bind(this));
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

    parse_child(node_idx) {
        let node = state._json_data[node_idx];
        if (node.__type__ === 'cc.Node') {
            let components = Node.get_node_components(node);
            let node_type = Node.guess_type_from_components(components);
            if (node_type != null) {
                let n = Node.create_node(node_type, node_idx);
                this.adjust_child_parameters(n);
                if (n != null)
                    this.add_child(n);
            }
        }
    }

    parse_clip() {
        let component = Node.get_node_component_of_type(this._node_data, 'cc.Animation');
        if (component) {
            let anim = {
                playOnLoad: component.playOnLoad,
                name: component._name,
                objFlags: component._objFlags,
                defaultClip: component._defaultClip.__uuid__,
                clips: []
            };
            component._clips.forEach(function(clips) {
                let clip_uuid = clips.__uuid__;
                anim.clips.push(clip_uuid);

                let clip_content = fs.readFileSync(uuidinfos[clip_uuid]);
                state._clips[clips.__uuid__] = JSON.parse(clip_content);
            });
            this._properties.anim = anim;
        }
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

    parse_properties() {
        super.parse_properties();
        this._properties = {node: this._properties};
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
 * Built-in Renderer Node
 * Sprite, Label, TMX, Particle
 */

/**
 * Node: Sprite
 */
class Sprite extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Sprite';
    }

    parse_properties() {
        super.parse_properties();

        // Move Node properties into 'node' and clean _properties
        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
        let sprite_frame_uuid = component._spriteFrame.__uuid__;
        
        name = Node.get_sprite_frame_name_by_uuid(sprite_frame_uuid);
        if (name) {
            this._properties['spriteFrameName'] = name
            this._properties.spriteType = Sprite.SPRITE_TYPES[component._type];
            this.add_property_int('srcBlend', '_srcBlendFactor', component);
            this.add_property_int('dstBlend', '_dstBlendFactor', component);
            this.add_property_bool('trimEnabled', '_isTrimmedMode', component);
            this._properties.sizeMode = Sprite.SIZE_MODES[component._sizeMode];
        }
    }
}
Sprite.SPRITE_TYPES = ['Simple', 'Sliced', 'Tiled', 'Filled'];
Sprite.SIZE_MODES = ['Custom', 'Trimmed', 'Raw'];

/**
 * Node: Label
 */
class Label extends Node {
    constructor(data) {
        super(data);
        this._label_text = '';
        this._jsonNode.object_type = 'Label';
    }

    parse_properties() {
        super.parse_properties();

        // Move Node properties into 'node' and clean _properties
        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.Label');

        let is_system_font = component._isSystemFontUsed;
        this._properties.fontSize = component._fontSize;
        this._properties.labelText = component._N$string;

        // alignments
        this._properties.horizontalAlignment = Label.H_ALIGNMENTS[component._N$horizontalAlign];
        this._properties.verticalAlignment = Label.V_ALIGNMENTS[component._N$verticalAlign];

        this._properties.overflowType = Label.OVERFLOW_TYPE[component._N$overflow];
        this.add_property_bool('enableWrap', '_enableWrapText', component);

        if (is_system_font) {
            this._properties.fontType = 'System';
            this._properties.fontName = 'arial';
        }
        else {
            let fontName = Node.get_font_path_by_uuid(component._N$file.__uuid__);
            this._properties.fontName = state._assetpath + fontName;
            if (fontName.endsWith('.ttf'))
                this._properties.fontType = 'TTF';
            else if (fontName.endsWith('.fnt')) {
                this._properties.fontType = 'BMFont';
                this.add_property_int('fontSize', '_fontSize', component);
            }
            else
                throw 'can not find font file for uuid: ' + component._N$file.__uuid__;

            this.add_property_int('lineHeight' ,'_lineHeight', component);
        }
    }
}
Label.H_ALIGNMENTS = ['Left', 'Center', 'Right'];
Label.V_ALIGNMENTS = ['Top', 'Center', 'Bottom'];
Label.OVERFLOW_TYPE = ['None', 'Clamp', 'Shrink', 'ResizeHeight'];

/**
 * Node: RichText
 */
class RichText extends Node {
    constructor(data) {
        super(data);
        this._label_text = '';
        this._jsonNode.object_type = 'RichText';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.RichText');

        this._properties.text = component._N$string;
        this._properties.horizontalAlignment = Label.H_ALIGNMENTS[component._N$horizontalAlign];
        this._properties.fontSize = component._N$fontSize;
        this._properties.maxWidth = component._N$maxWidth;
        this._properties.lineHeight = component._N$lineHeight;
        let f = component._N$font;
        if (f)
            this._properties.fontFilename = Node.get_font_path_by_uuid(f.__uuid__);
    }
}
RichText.H_ALIGNMENTS = ['Left', 'Center', 'Right'];

/**
 * Node: Tilemap
 */
class TiledMap extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'TileMap';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        // changing the contentSize doesn't change the size
        // but it will affect the anchorPoint, so, it should not be set
        // instead, create a new property `desiredContentSize` and manually 
        // scale the tmx from there
        let cs = this._properties.node.contentSize;
        delete this._properties.node.contentSize;

        let component = Node.get_node_component_of_type(this._node_data, 'cc.TiledMap');
        this._properties.tmxFilename = state._assetpath + Node.get_tiledmap_path_by_uuid(component._tmxFile.__uuid__);
        this._properties.desiredContentSize = cs;
    }
}

/**
 * Node: ParticleSystem
 */
class ParticleSystem extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Particle';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.ParticleSystem');
        this._properties.particleFilename = state._assetpath + Node.get_particle_system_path_by_uuid(component._file.__uuid__);
    }
}

/**
 * Built-in UI Nodes
 * Button, EditBox, ProgressBar, ScrollView
 */

/**
 * Node: Button
 */
class Button extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Button';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};
        let spr_component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
        let but_component = Node.get_node_component_of_type(this._node_data, 'cc.Button');

        this._properties.ignoreContentAdaptWithSize = false;

        // normal sprite: get from sprite component
        if (spr_component)
            this._properties.spriteFrameName = Node.get_sprite_frame_name_by_uuid(spr_component._spriteFrame.__uuid__);
        
        // transition
        let transition = but_component.transition;
        this._properties.transition = transition;
        if (transition == 1) // COLOR transition
            Util.log('Button COLOR transition is not supported');
        if (transition == 3) // SCALE transition
            this._properties.zoomScale = but_component.zoomScale;
        if (transition == 2) {
            // SRPITE transition
            // pressed sprite
            if (but_component.pressedSprite)
                this._properties.pressedSpriteFrameName = Node.get_sprite_frame_name_by_uuid(but_component.pressedSprite.__uuid__);
            // disabled sprite
            if (but_component._N$disabledSprite)
                this._properties.disabledSpriteFrameName = Node.get_sprite_frame_name_by_uuid(but_component._N$disabledSprite.__uuid__);
        }
    }
}

/**
 * Node: ProgressBar
 */
class ProgressBar extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'ProgressBar';

        Utils.log('WARNING: ProgressBar support is an experimental feature');
    }

    parse_properties() {
        super.parse_properties();
        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.ProgressBar');
        this._properties.percent = component._N$progress * 100;
    }
}

/**
 * Node: ScrollView
 */
class ScrollView extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'ScrollView';
    }

    get_content_node() {
        /**
         * Node
         * +--> ScrollBar
         *     +--> Bar
         * +--> View
         *     +--> Content    <-- this is what we want
         */
        let view_node = null;
        let content_node = null;

        // find the "view" node
        this._node_data._children.forEach(function(child_idx) {
            let node_idx = child_idx.__id__;
            let node = state._json_data[node_idx];

            if (node._name === 'view')
                view_node = node;
        });

        // then find the "content" node
        if (view_node) {
            view_node._children.forEach(function(child_idx) {
                let node_idx = child_idx.__id__;
                let node = state._json_data[node_idx];

                if (node._name === 'content')
                    content_node = node;
            });
        }

        if (content_node)
            return content_node;
        else
            throw 'ContentNode not found';
    }

    parse_properties() {
        super.parse_node_properties();

        this._properties = {node: this._properties};
        
        // data from 'node' component
        this.add_property_rgb('backgroundImageColor', '_color', this._node_data);

        // data from sprite component
        let compent_spr = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
        let sprite_frame_uuid = compent_spr._spriteFrame.__uuid__;
        this._properties.backgroundImage = Node.get_sprite_frame_name_by_uuid(sprite_frame_uuid);

        // Sliced?
        if (compent_spr._type === ScrollView.SLICED)
            this._properties.backgroundImageScale9Enabled = true;
        else
            this._properties.backgroundImageScale9Enabled = false;
        
        // data from scroll view component
        let component_sv = Node.get_node_component_of_type(this._node_data, 'cc.ScrollView');
        if (component_sv.horizontal && component_sv.vertical)
            this._properties.direction = 'Both';
        else if (component_sv.horizontal)
            this._properties.direction = 'Horizontal';
        else if (component_sv.vertical)
            this._properties.direction = 'Vertical';
        else
            this._properties.direction = 'None';
        this.add_property_bool('bounceEnabled', 'elastic', component_sv);

        // content node
        let content_node = this.get_content_node();

        // get size from content (which must be >= view.size)
        let data = content_node;
        this.add_property_size('innerContainerSize', "_contentSize", data);
        this._content_size = data._contentSize;

        // FIXME: Container Node should honor these values, but it seems that ScrollView doesn't
        // take them into account... or perhaps CocosCreator uses a different anchorPoint
        // position is being adjusted in `adjust_child_parameters`
        this._content_ap = content_node._anchorPoint;

        this._content_pos = content_node._position;

        content_node._children.forEach(function(child_idx) {
            this.parse_child(child_idx.__id__);
        }.bind(this));
    }

    adjust_child_parameters(child) {
        // FIXME: adjust child position since innerContainer doesn't honor
        // position and anchorPoit.
        let pos = child._properties.node.position;
        let x = pos.x;
        let y = pos.y;
        child._properties.node.position = {
            x: x + this._content_size.width * this._content_ap.x,
            y: y + this._content_size.height * this._content_ap.y
        };
    }
}
ScrollView.SIMPLE = 0;
ScrollView.SLICED = 1;
ScrollView.TILED = 2;
ScrollView.FILLED = 3;

/**
 * Node: EditBox
 */
class EditBox extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'EditBox';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.EditBox');
        this._properties.backgroundImage = Node.get_sprite_frame_name_by_uuid(component._N$backgroundImage.__uuid__);
        this._properties.returnType = EditBox.RETURN_TYPE[component._N$returnType];
        this._properties.inputFlag = EditBox.INPUT_FLAG[component._N$inputFlag];
        this._properties.inputMode = EditBox.INPUT_MODE[component._N$inputMode];
        this.add_property_int('fontSize', '_N$fontSize', component);
        this.add_property_rgb('fontColor', '_N$fontColor', component);
        this.add_property_str('placeholder', '_N$placeholder', component);
        this.add_property_int('placeholderFontSize', '_N$placeholderFontSize', component);
        this.add_property_rgb('placeholderFontColor', '_N$placeholderFontColor', component);
        this.add_property_int('maxLength', '_N$maxLength', component);
        this.add_property_str('text', '_string', component);
    }
}
EditBox.INPUT_MODE = ['Any', 'EmailAddress', 'Numeric', 'PhoneNumber', 'URL', 'Decime', 'SingleLine'];
EditBox.INPUT_FLAG = ['Password', 'Sensitive', 'InitialCapsWord', 'InitialCapsSentence', 'InitialCapsAllCharacters', 'LowercaseAllCharacters'];
EditBox.RETURN_TYPE = ['Default', 'Done', 'Send', 'Search', 'Go'];

/**
 * Misc Nodes
 */

/**
 * Node: SpineSkeleton
 */
class SpineSkeleton extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'SpineSkeleton';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        // search for spine file
        let component = Node.get_node_component_of_type(this._node_data, 'sp.Skeleton');

        let path_info = Node.get_spine_info_by_uuid(component._N$skeletonData.__uuid__);
        this._properties.jsonFile = state._assetpath + path_info.relative_path;
        this._properties.atlasFile = state._assetpath + path_info.atlas_url.relative_path;
        this.add_property_str('defaultSkin', 'defaultSkin', component);
        this.add_property_str('defaultAnimation', 'defaultAnimation', component);
        this.add_property_bool('loop', 'loop', component);
        this.add_property_bool('premultipliedAlpha', '_premultipliedAlpha', component);
        this.add_property_int('timeScale', '_N$timeScale', component);
        this.add_property_bool('debugSlots', '_N$debugSlots', component);
        this.add_property_bool('debugBones', '_N$debugBones', component);
    }
}

/**
 * bootstrap + helper functions
 */
class FireParser {
    constructor() {
        this._state = state;
        this._json_file = null;
        this._json_output = {version: 'alpha1', root: {}};
        this._creatorassets = null;
    }

    to_json_setup() {
        this.to_json_setup_design_resolution();
        this.to_json_setup_sprite_frames();
        this.to_json_setup_clips();
    }

    to_json_setup_design_resolution() {
        if (this._state._design_resolution)
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

    to_json_setup_clips() {
        let clips = [];
        
        let pop = function(obj, prop) {
            let ret = obj[prop];
            delete obj[prop];
            return ret;
        }

        // convert dictionary to list
        for (let key in state._clips) {
            let value = state._clips[key];
            value.uuid = key;
            delete value.__type__;
            delete value._rawFiles;

            // FIXME: comps should be supported
            if ('curveData' in value && 'comps' in value.curveData)
                delete value.curveData.comps;

            // sanitize
            value.duration = pop(value, '_duration');
            value.objFlags = pop(value, '_objFlags');
            value.name = pop(value, '_name');

            // remove __type__ from color frames
            if ('curveData' in value && 'props' in value.curveData && 'color' in value.curveData.props) {
                let color_frames = value.curveData.props.color;
                color_frames.forEach(function(frame) {
                    delete frame.value.__type__;
                });
            }

            // convert position [] to x, y
            if ('curveData' in value && 'props' in value.curveData && 'position' in value.curveData.props) {
                let pos_frames = value.curveData.props.position;
                pos_frames.forEach(function(frame){
                    let pos_value = frame.value;
                    frame.value = {x: pos_value[0], y: pos_value[1]};
                });
            }

            // convert 'x' to 'positionX'
            if ('curveData' in value && 'props' in value.curveData && 'x' in value.curveData.props)
                value.curveData.props.positionX = pop(value.curveData.props, 'x');

            // convert 'y' to 'positionY'
            if ('curveData' in value && 'props' in value.curveData && 'y' in value.curveData.props)
                value.curveData.props.positionY = pop(value.curveData.props, 'y');

            clips.push(value);
        }
        this._json_output.animationClips = clips;
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
                let dump = JSON.stringify(this._json_output, null, '\t');
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