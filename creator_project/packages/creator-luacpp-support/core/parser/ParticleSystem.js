const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class ParticleSystem extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Particle';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.ParticleSystem');
        this._properties.particleFilename = state._assetpath + this.get_particle_system_path_by_uuid(component._file.__uuid__);

        // creator may change the texture
        if (component._texture)
            this._properties.texturePath = state._assetpath + this.get_particle_system_path_by_uuid(component._texture.__uuid__);
    }

    get_particle_system_path_by_uuid(uuid) {
        let path_info = Utils.get_relative_full_path_by_uuid(uuid);
        return path_info.relative_path;
    }
}

module.exports = ParticleSystem;