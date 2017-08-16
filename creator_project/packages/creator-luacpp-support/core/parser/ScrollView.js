const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class ScrollView extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'ScrollView';
    }

    get_content_node() {
        /**
         * Node
         * +--> ScrollBar
         *     +--> Bar
         * +--> View
         *     +--> Content    <-- this is what we want
         */
        let content_node = null;
        let view_node = Node.get_node_component_of_type(this._node_data, 'cc.ScrollView');
        if (view_node) {
            let content_node_index = view_node.content.__id__;
            content_node = state._json_data[content_node_index];
        }

        if (content_node)
            return content_node;
        else
            throw 'ContentNode not found';
    }

    parse_properties() {
        super.parse_node_properties();

        this._properties = {node: this._properties};
        
        // data from 'node' component
        this.add_property_rgb('backgroundImageColor', '_color', this._node_data);

        // data from sprite component
        let compent_spr = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
        if (compent_spr) {
            let sprite_frame_uuid = compent_spr._spriteFrame.__uuid__;
            this._properties.backgroundImage = Utils.get_sprite_frame_name_by_uuid(sprite_frame_uuid);

            // Sliced?
            if (compent_spr._type === ScrollView.SLICED)
                this._properties.backgroundImageScale9Enabled = true;
            else
                this._properties.backgroundImageScale9Enabled = false;
        }
        
        // data from scroll view component
        let component_sv = Node.get_node_component_of_type(this._node_data, 'cc.ScrollView');
        if (component_sv.horizontal && component_sv.vertical)
            this._properties.direction = 'Both';
        else if (component_sv.horizontal)
            this._properties.direction = 'Horizontal';
        else if (component_sv.vertical)
            this._properties.direction = 'Vertical';
        else
            this._properties.direction = 'None';
        this.add_property_bool('bounceEnabled', 'elastic', component_sv);

        // content node
        let content_node = this.get_content_node();

        // get size from content (which must be >= view.size)
        let data = content_node;
        this.add_property_size('innerContainerSize', "_contentSize", data);
        this._content_size = data._contentSize;

        // FIXME: Container Node should honor these values, but it seems that ScrollView doesn't
        // take them into account... or perhaps CocosCreator uses a different anchorPoint
        // position is being adjusted in `adjust_child_parameters`
        this._content_ap = content_node._anchorPoint;

        this._content_pos = content_node._position;

        content_node._children.forEach(function(child_idx) {
            this.parse_child(child_idx.__id__);
        }.bind(this));
    }

    adjust_child_parameters(child) {
        // FIXME: adjust child position since innerContainer doesn't honor
        // position and anchorPoit.
        let properties = child._properties.node ? child._properties.node : child._properties;
        let pos = properties.position;
        let x = pos.x;
        let y = pos.y;
        properties.position = {
            x: x + this._content_size.width * this._content_ap.x,
            y: y + this._content_size.height * this._content_ap.y
        };
    }
}
ScrollView.SIMPLE = 0;
ScrollView.SLICED = 1;
ScrollView.TILED = 2;
ScrollView.FILLED = 3;

module.exports = ScrollView;