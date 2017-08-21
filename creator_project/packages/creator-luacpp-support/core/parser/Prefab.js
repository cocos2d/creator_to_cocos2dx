const state = require('./Global').state;
const fs = require('fs');

class Prefab {
    // return nodes of Prefab
    static parse(data, scene_node) {
        let prefab_json = Prefab.get_json_of_prefab(data);

        let root_node_index = prefab_json[0].data.__id__;
        let old_node_data = scene_node._node_data;
        scene_node._node_data = prefab_json[root_node_index];

        // parse child, should change state._json_data to prefab's json data
        // it will be reset in Node.parse_child();
        state.set_json_data(prefab_json);

        // adjust some properties
        // _objFlags;
        // _parent;
        // _id;
        // _prefab;
        // _name;
        // _active;
        // _position;
        // _rotationX;
        // _rotationY;
        // _localZOrder;
        // _globalZOrder;
        scene_node.parse_node_properties();
        scene_node.add_property_size('contentSize', '_contentSize', old_node_data);
        scene_node.add_property_bool('enabled', '_active', old_node_data);
        scene_node.add_property_str('name', '_name', old_node_data);
        scene_node.add_property_int('globalZOrder', '_globalZOrder', old_node_data);
        scene_node.add_property_int('localZOrder', '_localZOrder', old_node_data);
        scene_node.add_property_vec2('position', '_position', old_node_data);
        scene_node.add_property_int('rotationSkewX', '_rotationX', old_node_data);
        scene_node.add_property_int('rotationSkewY', '_rotationY', old_node_data);

        scene_node.parse_children();
    }

    static guess_type_of_prefab_root(node_data) {
        const Node = require('./Node');

        let prefab = node_data._prefab;
        if (!prefab)
            return null;

        // get root node of prefab
        let prefab_node_data = state._json_data[prefab.__id__];
        let prefab_json = Prefab.get_json_of_prefab(prefab_node_data);
        let root_node_index = prefab_json[0].data.__id__;
        let root_node_data = prefab_json[root_node_index];

        let old_state_json_data = state._json_data;
        state._json_data = prefab_json;
        let components = Node.get_node_components(root_node_data)
        state._json_data = old_state_json_data;

        return Node.guess_type_from_components(components);
    }

    static get_json_of_prefab(prefab_node) {
        let prefab_file_path = Editor.remote.assetdb.uuidToFspath(prefab_node.asset.__uuid__);
        let contents = fs.readFileSync(prefab_file_path);
        return JSON.parse(contents);
    }
}

module.exports = Prefab;
