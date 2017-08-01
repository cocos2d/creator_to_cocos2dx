const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class Mask extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Mask';
    }

    parse_properties() {
        super.parse_properties();

        // Move Node properties into 'node' and clean _properties
        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.Mask');

        this._properties.type = Mask.MASK_TYPES[component._type];
        this.add_property_bool('inverted', '_N$inverted', component);

        if (this._properties.type === 'Ellipse')
            this.add_property_int('segments', '_segements', component);

        if (this._properties.type === 'ImageStencil') {
            this.add_property_int('alphaThreshold', '_N$alphaThreshold', component);
            this._properties.spriteFrame = Utils.get_sprite_frame_name_by_uuid(component._N$spriteFrame.__uuid__);
        }
    }
}
Mask.MASK_TYPES = ['Rect', 'Ellipse', 'ImageStencil'];

module.exports = Mask;