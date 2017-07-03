const Node = require('./Node');
const state = require('./Global').state;
const Utils = require('./Utils');

class ProgressBar extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'ProgressBar';
    }

    parse_properties() {
        // 1st: parse self
        this.parse_node_properties();
        this._properties = {node: this._properties};

        // background sprite
        let bg_component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
        if (bg_component._spriteFrame)
            this._properties.backgroundSpriteFrameName = state._assetpath + Utils.get_sprite_frame_name_by_uuid(bg_component._spriteFrame.__uuid__);

        let bar_component = Node.get_node_component_of_type(this._node_data, 'cc.ProgressBar');
        this._properties.percent = bar_component._N$progress * 100;

        // texture of progress bar
        let bar_sprite = bar_component._N$barSprite;
        if (bar_sprite) {
            let bar_sprite_data = state._json_data[bar_sprite.__id__];
            let bar_sprite_uuid = bar_sprite_data._spriteFrame.__uuid__;
            this._properties.barSpriteFrameName = state._assetpath + Utils.get_sprite_frame_name_by_uuid(bar_sprite_uuid);
            this._properties.barSpriteType = bar_sprite_data._type;

            // should remove the child: bar sprite node
            let bar_sprite_node_id = state._json_data[bar_sprite.__id__].node.__id__;
            Utils.remove_child_by_id(this, bar_sprite_node_id);
        }

        this._properties.reverse = bar_component._N$reverse;

        // 2nd: parse children
        this._node_data._children.forEach(function(item) {
            this.parse_child(item.__id__);
        }.bind(this));
    }
}

module.exports = ProgressBar;