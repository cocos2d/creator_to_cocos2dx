const Node = require('./Node');
const Utils = require('./Utils');
const Toggle = require('./Toggle');
const state = require('./Global').state;

class ToggleGroup extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'ToggleGroup';
    }

    parse_properties() {
        // 1st: parse self
        this.parse_node_properties();
        this._properties = {node: this._properties};

        let toggle_component = Node.get_node_component_of_type(this._node_data, 'cc.ToggleGroup');
        this.add_property_bool('allowSwitchOff', 'allowSwitchOff', toggle_component)

        // parse toggles
        let toggle_ids = [];
        let toggles = [];
        this._node_data._children.forEach(function(child) {
            if (this.isToggleChild(child.__id__)) {
                toggle_ids.push(child.__id__);

                // parse toggle
                let toggle = new Toggle(state._json_data[child.__id__]);
                toggle.parse_properties();
                toggles.push(toggle._properties);
            }
        }.bind(this));
        this._properties.toggles = toggles;

        // remove all toggle children
        toggle_ids.forEach(function(child_id) {
            Utils.remove_child_by_id(this, child_id);
        }.bind(this));

        // 2nd: parse children
        this._node_data._children.forEach(function(item) {
            this.parse_child(item.__id__);
        }.bind(this));
    }

    isToggleChild(child_id) {
        let child_data = state._json_data[child_id];
        let toggle_component = Node.get_node_component_of_type(child_data, 'cc.Toggle');
        if (toggle_component)
            return true;
        else
            return false;
    }
}

module.exports = ToggleGroup;