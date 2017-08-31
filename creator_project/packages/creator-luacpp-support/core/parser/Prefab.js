const state = require('./Global').state;
const fs = require('fs');
const Node = require('./Node');

/**
 * Prefab is not a real Node type. The real type will be changed by parsing prefab files.
 */
class Prefab extends Node {
    constructor(data) {
        super(data);
        // real type will be changed later
        this._jsonNode.object_type = 'Prefab';
    }

    parse_properties() {
        super.parse_properties();
        
        // parse content in prefab file

        let prefab = this._node_data._prefab;

        // get root node of prefab
        let prefab_node_data = state._json_data[prefab.__id__];
        let prefab_json = this._get_json_of_prefab(prefab_node_data);
        let root_node_index = prefab_json[0].data.__id__;
        let root_node_data = prefab_json[root_node_index];

        // get type of root node, should modify state._json_data to prefab file content
        // when parsing prefab files
        let old_state_json_data = state._json_data;
        state._json_data = prefab_json;
        let components = Node.get_node_components(root_node_data)
        let type = Node.guess_type_from_components(components);

        // create corresponding object for root node
        const Utils = require('./Utils');
        let prefab_root_node_obj = Utils.create_node(type, root_node_data);

        // modify the object_type to real type
        this._jsonNode.object_type = prefab_root_node_obj._jsonNode.object_type;

        // reset this._properties and adjust some properties
        let original_properties = this._properties;
        this._properties = prefab_root_node_obj._properties;
        this._adjust_properties(original_properties, 'contentSize');
        this._adjust_properties(original_properties, 'enabled');
        this._adjust_properties(original_properties, 'name');
        this._adjust_properties(original_properties, 'globalZOrder');
        this._adjust_properties(original_properties, 'localZOrder');
        this._adjust_properties(original_properties, 'position');
        this._adjust_properties(original_properties, 'rotationSkewX');
        this._adjust_properties(original_properties, 'rotationSkewY');

        this._node_data = root_node_data;
        super.parse_children();

        // reset state._json_data
        state._json_data = old_state_json_data;
    }

    _adjust_properties(original_properties, name) {
        // if root node is an empty Node, then its Node properties is `this._properties`
        let node_properties = this._properties.node || this._properties;
        node_properties[name] = original_properties[name];
    }

    _get_json_of_prefab(prefab_node) {
        let prefab_file_path = Editor.remote.assetdb.uuidToFspath(prefab_node.asset.__uuid__);
        let contents = fs.readFileSync(prefab_file_path);
        return JSON.parse(contents);
    }
}

module.exports = Prefab;
