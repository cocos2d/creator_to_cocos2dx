const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;
const fs = require('fs');
const path = require('path');

class DragonBones extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'DragonBones';
    }

    parse_properties() {
        super.parse_properties();
        this._properties = {node: this._properties};

        let dragonbones_armature_display = Node.get_node_component_of_type(this._node_data, 'dragonBones.ArmatureDisplay');
        this.add_property_str('armature', '_armatureName', dragonbones_armature_display);
        this.add_property_str('animation', '_animationName', dragonbones_armature_display);
        this.add_property_int('timeScale', '_N$timeScale', dragonbones_armature_display);
        this.add_property_int('playTimes', 'playTimes', dragonbones_armature_display);

        // bones data path and bone data name
        let bone_asset = dragonbones_armature_display._N$dragonAsset;
        if (bone_asset) {
            let bone_data_path_info = Utils.get_relative_full_path_by_uuid(bone_asset.__uuid__);
            this._properties.boneDataPath = state._assetpath + bone_data_path_info.relative_path;

            // bone data name
            let bone_data = fs.readFileSync(bone_data_path_info.fullpath);
            let bone_data_json = JSON.parse(bone_data);
            this._properties.boneDataName = bone_data_json.name;
        }
        
        // texture data path and texture path
        let texture_atlas_asset = dragonbones_armature_display._N$dragonAtlasAsset;
        if (texture_atlas_asset) {
            // texture data
            let texture_atlas_data_path_info = Utils.get_relative_full_path_by_uuid(texture_atlas_asset.__uuid__);
            this._properties.textureDataPath = state._assetpath + texture_atlas_data_path_info.relative_path;

            // add image path to copy resources vector
            let texture_atlas_data = fs.readFileSync(texture_atlas_data_path_info.fullpath);
            let texture_atlas_data_json = JSON.parse(texture_atlas_data);
            let image_file_name = texture_atlas_data_json.imagePath;
            let image_relative_path = path.join(path.dirname(texture_atlas_data_path_info.relative_path), image_file_name);
            let image_full_path = path.join(path.dirname(texture_atlas_data_path_info.fullpath), image_file_name);
            // image uuid means nothing, just need it in state._uuid
            let image_uuid = texture_atlas_asset.__uuid__ + '_image';
            state._uuid[image_uuid] = {fullpath: image_full_path,
                                       relative_path: image_relative_path};
        }
    }
}

module.exports = DragonBones;