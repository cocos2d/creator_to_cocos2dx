const Node = require('./Node');

class WebView extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'WebView';
    }

    parse_properties() {
        super.parse_properties();

        // Move Node properties into 'node' and clean _properties
        this._properties = {node: this._properties};
        let component = Node.get_node_component_of_type(this._node_data, 'cc.WebView');
        this._properties.url = component._url;
    }
}

module.exports = WebView;