const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class Layout extends Node {
    // Example Layout structure
    /* {
        "__type__": "cc.Layout",
        "_name": "",
        "_objFlags": 0,
        "node": {
            "__id__": 4
        },
        "_enabled": true,
        "_layoutSize": {
            "__type__": "cc.Size",
            "width": 200,
            "height": 150
        },
        "_resize": 0,
        "_N$layoutType": 0,
        "_N$padding": 0,
        "_N$cellSize": {
            "__type__": "cc.Size",
            "width": 40,
            "height": 40
        },
        "_N$startAxis": 0,
        "_N$paddingLeft": 0,
        "_N$paddingRight": 0,
        "_N$paddingTop": 0,
        "_N$paddingBottom": 0,
        "_N$spacingX": 0,
        "_N$spacingY": 0,
        "_N$verticalDirection": 1,
        "_N$horizontalDirection": 0
    } */
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Layout';
    }

    parse_properties() {
        super.parse_properties();
        this._properties = {node: this._properties};

        let spr_component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');

        let lay_component = Node.get_node_component_of_type(this._node_data, 'cc.Layout');
        this._properties.layoutType = lay_component._N$layoutType;
        this._properties.resizeMode = lay_component._resize;

    }
}

module.exports = Layout;
