const Node = require('./Node');
const get_sprite_frame_name_by_uuid = require('./Utils').get_sprite_frame_name_by_uuid;

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

        if (component && component._spriteFrame) {
            let sprite_frame_uuid = component._spriteFrame.__uuid__;
            
            name = get_sprite_frame_name_by_uuid(sprite_frame_uuid);
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
}
Sprite.SPRITE_TYPES = ['Simple', 'Sliced', 'Tiled', 'Filled'];
Sprite.SIZE_MODES = ['Custom', 'Trimmed', 'Raw'];

module.exports = Sprite;