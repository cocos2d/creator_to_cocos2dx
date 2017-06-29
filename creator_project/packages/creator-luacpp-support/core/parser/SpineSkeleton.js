const Node = require('./Node');
const get_spine_info_by_uuid = require('./Utils').get_spine_info_by_uuid;
const state = require('./Global').state;

class SpineSkeleton extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'SpineSkeleton';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        // search for spine file
        let component = Node.get_node_component_of_type(this._node_data, 'sp.Skeleton');

        let path_info = get_spine_info_by_uuid(component._N$skeletonData.__uuid__);
        this._properties.jsonFile = state._assetpath + path_info.relative_path;
        this._properties.atlasFile = state._assetpath + path_info.atlas_url.relative_path;
        this.add_property_str('defaultSkin', 'defaultSkin', component);
        this.add_property_str('defaultAnimation', 'defaultAnimation', component);
        this.add_property_bool('loop', 'loop', component);
        this.add_property_bool('premultipliedAlpha', '_premultipliedAlpha', component);
        this.add_property_int('timeScale', '_N$timeScale', component);
        this.add_property_bool('debugSlots', '_N$debugSlots', component);
        this.add_property_bool('debugBones', '_N$debugBones', component);
    }
}

module.exports = SpineSkeleton;