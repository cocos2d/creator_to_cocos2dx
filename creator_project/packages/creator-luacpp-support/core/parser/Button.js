const Node = require('./Node');
const Utils = require('../Utils');
const get_sprite_frame_name_by_uuid = require('./Utils').get_sprite_frame_name_by_uuid;

class Button extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Button';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};
        let spr_component = Node.get_node_component_of_type(this._node_data, 'cc.Sprite');
        let but_component = Node.get_node_component_of_type(this._node_data, 'cc.Button');

        this._properties.ignoreContentAdaptWithSize = false;

        // normal sprite: get from sprite component
        if (spr_component && spr_component._spriteFrame)
            this._properties.spriteFrameName = get_sprite_frame_name_by_uuid(spr_component._spriteFrame.__uuid__);
        
        // transition
        let transition = but_component.transition;
        this._properties.transition = transition;
        if (transition == 1) // COLOR transition
            Utils.log('Button COLOR transition is not supported');
        if (transition == 3) // SCALE transition
            this._properties.zoomScale = but_component.zoomScale;
        if (transition == 2) {
            // SRPITE transition
            // pressed sprite
            if (but_component.pressedSprite)
                this._properties.pressedSpriteFrameName = get_sprite_frame_name_by_uuid(but_component.pressedSprite.__uuid__);
            // disabled sprite
            if (but_component._N$disabledSprite)
                this._properties.disabledSpriteFrameName = get_sprite_frame_name_by_uuid(but_component._N$disabledSprite.__uuid__);
        }
    }
}

module.exports = Button;