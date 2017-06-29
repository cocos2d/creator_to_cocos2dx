const Node = require('./Node');
let state = require('./Global').state;

class Canvas extends Node {
    constructor(data) {
        super(data);

        let component = Node.get_node_component_of_type(this._node_data, 'cc.Canvas');
        state._design_resolution = component._designResolution;
        state._fit_width = component._fitWidth;
        state._fit_height = component._fitHeight;

        this._jsonNode.object_type = 'Node';
    }
}

module.exports = Canvas;
