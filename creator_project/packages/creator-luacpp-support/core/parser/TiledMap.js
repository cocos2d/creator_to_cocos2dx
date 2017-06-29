const Node = require('./Node');
const state = require('./Global').state;
const get_tiledmap_path_by_uuid = require('./Utils').get_tiledmap_path_by_uuid;

class TiledMap extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'TileMap';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        // changing the contentSize doesn't change the size
        // but it will affect the anchorPoint, so, it should not be set
        // instead, create a new property `desiredContentSize` and manually 
        // scale the tmx from there
        let cs = this._properties.node.contentSize;
        delete this._properties.node.contentSize;

        let component = Node.get_node_component_of_type(this._node_data, 'cc.TiledMap');
        this._properties.tmxFilename = state._assetpath + get_tiledmap_path_by_uuid(component._tmxFile.__uuid__);
        this._properties.desiredContentSize = cs;
    }
}

module.exports = TiledMap;
