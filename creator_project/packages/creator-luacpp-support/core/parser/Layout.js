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

        let spr_component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
        let lay_component = Node.get_node_component_of_type(this._node_data, 'cc.Layout');

        this._properties = {node: this._properties};
    }
}

module.exports = Layout;
