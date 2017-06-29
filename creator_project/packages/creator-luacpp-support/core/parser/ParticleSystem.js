const Node = require('./Node');
const state = require('./Global').state;
const get_particle_system_path_by_uuid = require('./Utils').get_particle_system_path_by_uuid;

class ParticleSystem extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'Particle';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.ParticleSystem');
        this._properties.particleFilename = state._assetpath + get_particle_system_path_by_uuid(component._file.__uuid__);
    }
}

module.exports = ParticleSystem;