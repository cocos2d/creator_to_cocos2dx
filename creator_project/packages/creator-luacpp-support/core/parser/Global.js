/**
 * Singleton
 */
class State {
    constructor() {
        this.reset();
    }

    reset() {
        this._filename = '';

        // the .fire file being parsed
        this._json_data = [];

        // FIXME: it is useless
        this._meta_data = {};

        // record all sprite frames
        // key is uuid, value is the information of the sprite frame
        this._sprite_frames = {};

        // contains all resource paths
        // key is uuid, value is { relative_path: '', full_path: '' }
        // need to use the information to copy resources
        this._uuid = {};

        this._design_resolution = null;

        // clips
        // key is the uuid, value is the animation
        this._clips = {};
    }
}

module.exports.state = new State();