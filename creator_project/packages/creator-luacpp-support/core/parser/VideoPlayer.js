const Node = require('./Node');
const Utils = require('./Utils');
const state = require('./Global').state;

class VideoPlayer extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'VideoPlayer';
    }

    parse_properties() {
        super.parse_properties();

        // Move Node properties into 'node' and clean _properties
        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.VideoPlayer');

        this._properties.isLocal = component._resourceType === VideoPlayer.RESOURCE_TYPE_LOCAL;
        this._properties.fullScreen = component._N$isFullscreen;
        this._properties.keepAspect = component._N$keepAspectRatio;
        if (this._properties.isLocal) {
            // get local path by uuid
            let pathInfo = Utils.get_relative_full_path_by_uuid(component._clip.__uuid__);
            this._properties.url = state._assetpath + pathInfo.relative_path;
        }
        else
            this._properties.url = component._remoteURL;
    }
}
VideoPlayer.RESOURCE_TYPE_REMOTE = 0;
VideoPlayer.RESOURCE_TYPE_LOCAL = 1;

module.exports = VideoPlayer;
