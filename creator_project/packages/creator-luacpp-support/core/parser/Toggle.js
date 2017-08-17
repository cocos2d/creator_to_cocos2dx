const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class Toggle extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Toggle';
    }

    parse_properties() {
        // 1st: parse self
        this.parse_node_properties();
        this._properties = {node: this._properties};

        let toggle_component = Node.get_node_component_of_type(this._node_data, 'cc.Toggle');
        this.add_property_bool('interactable', '_N$interactable', toggle_component);
        this.add_property_bool('enableAutoGrayEffect', '_N$enableAutoGrayEffect', toggle_component);
        this.add_property_bool('isChecked', '_N$isChecked', toggle_component);
        this.add_property_int('zoomScale', 'zoomScale', toggle_component);

        // Background sprite
        let background_node_id = toggle_component._N$target.__id__;
        let background_node_data = state._json_data[background_node_id];
        let background_component_id = background_node_data._components[0].__id__;
        let background_component = state._json_data[background_component_id];
        if (background_component._spriteFrame)
            this._properties.backgroundSpritePath = state._assetpath + Utils.get_sprite_frame_name_by_uuid(background_component._spriteFrame.__uuid__);
        
        // CheckMark
        let checkmark_component_id = toggle_component.checkMark.__id__;
        let checkmark_component = state._json_data[checkmark_component_id];
        if (checkmark_component._spriteFrame) {
            this._properties.checkMarkSpritePath = state._assetpath + Utils.get_sprite_frame_name_by_uuid(checkmark_component._spriteFrame.__uuid__);

            // adjust node content size
            let checkmark_node_data = state._json_data[checkmark_component.node.__id__];
            let current_properties = this._properties;
            this._properties = this._properties.node;
            this.add_property_size('contentSize', '_contentSize', checkmark_node_data);
            this._properties = current_properties;
        }

        // remove Background and CheckMark
        Utils.remove_child_by_id(this, background_node_id);

        // 2nd: parse children
        this._node_data._children.forEach(function(item) {
            this.parse_child(item.__id__);
        }.bind(this));
    }
}

module.exports = Toggle;