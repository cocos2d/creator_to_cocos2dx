const Node = require('./Node');
const Utils = require('./Utils');

const SpriteTypes = require('./Global').SpriteTypes;
const log = require('../Utils').log;
const state = require('./Global').state;

/**
 * 
 */
class PageView extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'PageView';
    }

    parse_properties() {
        super.parse_node_properties();
        this._properties = {node: this._properties};

        let pageview_component = Node.get_node_component_of_type(this._node_data, 'cc.PageView');
        this.add_property_bool('inertia', 'inertia', pageview_component);
        this.add_property_bool('bounceEnabled', 'elastic', pageview_component);

        let direction = pageview_component._N$direction;
        if (direction == 0)
            this._properties.direction = 'Horizontal';
        else
            this._properties.direction = 'Vertical';

        let indicator_id = this.initilizeIndicator(pageview_component);
        let view_id = this.initializePages(pageview_component);
        let background_id = this.initBackground(pageview_component);

        // remove background, view and idicator from children
        Utils.remove_child_by_id(this, indicator_id);
        Utils.remove_child_by_id(this, view_id);
        Utils.remove_child_by_id(this, background_id);

        this._node_data._children.forEach(function(child_idx) {
            this.parse_child(child_idx.__id__);
        }.bind(this));
    }

    /**
     * @return indicator node id
     */
    initilizeIndicator(pageview_component) {
        let indicator_component = state._json_data[pageview_component._N$indicator.__id__]
        let indicator_node = state._json_data[indicator_component.node.__id__];
        let indicator = {_properties:{}};
        
        this.add_property_int.bind(indicator)('space', 'spacing', indicator_component);

        let pageview_size = this._properties.node.contentSize;
        indicator._properties.positionAnchor = {x: 0.5 + indicator_node._position.x / pageview_size.w,
                                             y: 0.5 + indicator_node._position.y / pageview_size.h};

        if (indicator_component.spriteFrame) {
            let sprite_frame_uuid = indicator_component.spriteFrame.__uuid__;
            indicator._properties.spriteFrame = Utils.get_sprite_frame_name_by_uuid(sprite_frame_uuid);
            indicator._properties.spriteFrameFromTP = Utils.is_sprite_frame_from_texture_packer(sprite_frame_uuid);
            if (!indicator.spriteFrameFromTP)
                indicator._properties.spriteFrame = state._assetpath + indicator._properties.spriteFrame;
        }
        else
            log('indicator name(' + indicator_node._name  + ') does not have sprite frame');

        indicator = indicator._properties;
        delete indicator._properties;
        this._properties.indicator = indicator;

        return indicator_component.node.__id__;
    }

    /**
     * @return view node id
     */
    initializePages(pageview_component) {
        let content_id = pageview_component.content.__id__;
        let content_node = state._json_data[content_id];
        
        // all children of content should be a page
        let pages = [];
        content_node._children.forEach(function(child) {
            let page_id = child.__id__;
            let page_node = state._json_data[page_id];
            let page = {_properties:{}};

            let page_sprite_component = Node.get_node_component_of_type(page_node, 'cc.Sprite');
            page._properties.scale9Enabled = page_sprite_component._type == SpriteTypes.SLICED;

            if (page_sprite_component._spriteFrame) {
                let sprite_frame_uuid = page_sprite_component._spriteFrame.__uuid__;
                page._properties.spriteFrame = Utils.get_sprite_frame_name_by_uuid(sprite_frame_uuid);
                page._properties.spriteFrameFromTP = Utils.is_sprite_frame_from_texture_packer(sprite_frame_uuid);
                if (!page._properties.spriteFrameFromTP)
                    page._properties.spriteFrame = state._assetpath + page._properties.spriteFrame;
            }
            else
                log('page name(' + page._name + ') does not have sprite frame');

            page = page._properties;
            delete page._properties;

            let node_page = new Node(page_node);
            node_page.parse_node_properties();
            page.node = node_page._properties;

            pages.push(page);
        }.bind(this));
        this._properties.pages = pages;

        return content_node._parent.__id__;
    }

    /**
     * FIXME: we treat the first child of `pageview` as background
     * @return background id
     */
    initBackground(pageview_component) {
        let pageview_node_id = pageview_component.node.__id__;
        let pageview_node = state._json_data[pageview_node_id];
        let background_id = pageview_node._children[0].__id__;
        let background_node = state._json_data[background_id];
        let background_sprite_component = Node.get_node_component_of_type(background_node, 'cc.Sprite');
        if (background_sprite_component._spriteFrame) {
            let background = {};
            let uuid = background_sprite_component._spriteFrame.__uuid__;
            background.spriteFrame = Utils.get_sprite_frame_name_by_uuid(uuid);
            background.spriteFrameFromTP = Utils.is_sprite_frame_from_texture_packer(uuid);
            if (!background.spriteFrameFromTP)
                background.spriteFrame = state._assetpath + background.spriteFrame;

            this._properties.background = background;
        }

        return background_id;
    }
}

module.exports = PageView;