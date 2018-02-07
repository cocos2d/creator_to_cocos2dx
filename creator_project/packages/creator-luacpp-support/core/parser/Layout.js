const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class Layout extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Layout';
    }

    parse_properties() {
        // Don't have to parse children.
        super.parse_node_properties();

        let spr_component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
    }
}

module.exports = Layout;
