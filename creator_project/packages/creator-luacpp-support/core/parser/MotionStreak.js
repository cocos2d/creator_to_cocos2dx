const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class MotionStreak extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'MotionStreak';
    }

    parse_properties() {
        // Don't have to parse children.
        super.parse_node_properties();

        // Move Node properties into 'node' and clean _properties.
        this._properties = {node: this._properties};

        let motion_streak_comp = Node.get_node_component_of_type(this._node_data, 'cc.MotionStreak');
        this.add_property_int('timeToFade', '_fadeTime', motion_streak_comp);
        this.add_property_int('minSeg', '_minSeg', motion_streak_comp);
        this.add_property_int('strokeWidth', '_stroke', motion_streak_comp);
        this.add_property_rgb('strokeColor', '_color', motion_streak_comp);
        this.add_property_bool('fastMode', '_fastMode', motion_streak_comp);

        if (motion_streak_comp._texture.__uuid__) {
            let path = Utils.get_relative_full_path_by_uuid(motion_streak_comp._texture.__uuid__);
            this._properties.texturePath = state._assetpath + path.relative_path;
        }
        else
            Utils.log('Error: MotionStreak: missing texture.');
    }
}

module.exports = MotionStreak;