const Node = require('./Node');

class Scene extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Scene';
    }

    parse_properties() {
        super.parse_properties();
        this._properties = {node: this._properties};
    }
}

module.exports = Scene;
