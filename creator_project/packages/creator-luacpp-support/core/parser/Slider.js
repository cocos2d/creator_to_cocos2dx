const Node = require('./Node');
const state = require('./Global').state;
const Utils = require('./Utils');

class Slider extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Slider';
    }

    parse_properties() {
        // 1st: parse self
        this.parse_node_properties();
        this._properties = {node: this._properties};

        let slider_component = Node.get_node_component_of_type(this._node_data, 'cc.Slider');
        this._properties.percent = slider_component._N$progress * 100;

        let handle_button_id = slider_component._N$handle.__id__;
        let handle_button_data = state._json_data[handle_button_id];
 
        // normal sprite
        if (handle_button_data._N$normalSprite) {
            let path = Utils.get_sprite_frame_name_by_uuid(handle_button_data._N$normalSprite.__uuid__);
            this._properties.normalTexturePath = state._assetpath + path ;
        }
        
        // disabled sprite
        if (handle_button_data._N$disabledSprite) {
            let path = Utils.get_sprite_frame_name_by_uuid(handle_button_data._N$disabledSprite.__uuid__);
            this._properties.disabledTexturePath = state._assetpath + path ;
        }
 
        // pressed sprite
        if (handle_button_data.pressedSprite) {
            let path = Utils.get_sprite_frame_name_by_uuid(handle_button_data.pressedSprite.__uuid__);
            this._properties.pressedTexturePath = state._assetpath + path ;
        }

        let handle_id = handle_button_data._N$target.__id__;
        let handle_data = state._json_data[handle_id];
        this.add_property_size('ballSize', '_contentSize', handle_data);

        // bar sprite
        let background_node_id = this.get_background_node_id(handle_id);
        if (background_node_id) {
            let background_node_data = state._json_data[background_node_id];
            let background_sprite_data = Node.get_node_component_of_type(background_node_data, 'cc.Sprite');

            if (background_sprite_data._spriteFrame) {
                let path = Utils.get_sprite_frame_name_by_uuid(background_sprite_data._spriteFrame.__uuid__);
                this._properties.barTexturePath = state._assetpath + path;

                // size
                this.add_property_size('barSize', '_contentSize', background_node_data);
            }
        }

        // remove Backgournd and Handle from children
        Utils.remove_child_by_id(this, handle_id);
        Utils.remove_child_by_id(this, background_node_id);

        // 2nd: parse children
        this._node_data._children.forEach(function(item) {
            this.parse_child(item.__id__);
        }.bind(this));
    }

    get_background_node_id(handle_id) {
        // Background and Handle are children of Slider
        // and Background is before Handle, we use this feature to get Background id
        let background_id = null;
        for(let child_idx in this._node_data._children) {
            let child = this._node_data._children[child_idx];
            if (child.__id__ === handle_id)
                break;

            background_id = child.__id__;
        }
        return background_id;
    }
}

module.exports = Slider;