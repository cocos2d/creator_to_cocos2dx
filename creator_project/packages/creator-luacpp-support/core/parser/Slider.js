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

        // do nothing with `Background` child, just treat it as a child
        // only handle `Handle` child

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

        // remove Handle child from children
        
        Utils.remove_child_by_id(this, handle_id);

        // 2nd: parse children
        this._node_data._children.forEach(function(item) {
            this.parse_child(item.__id__);
        }.bind(this));
    }
}

module.exports = Slider;