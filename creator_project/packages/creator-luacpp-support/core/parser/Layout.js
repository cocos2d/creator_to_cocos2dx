const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class Layout extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Layout';
    }

    parse_properties() {
        super.parse_properties();
        this._properties = {node: this._properties};

        let spr_component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');

        //TODO use these components in this._properties ie vertical layout
        let lay_component = Node.get_node_component_of_type(this._node_data, 'cc.Layout');
        this._properties.type = lay_component._N$layoutType;

    }
}

module.exports = Layout;
