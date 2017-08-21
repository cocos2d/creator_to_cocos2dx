/**
 * Singleton
 */
class State {
    constructor() {
        this.reset();
    }

    reset() {
        this._filename = '';

        // prefix path of all assets
        this._assetpath = '';

        // the .fire file being parsed
        this._json_data = [];

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

class SpriteTypes {

}
SpriteTypes.SIMPLE = 0;
SpriteTypes.SLICED = 1;
SpriteTypes.TILED = 2;
SpriteTypes.FILLED = 3;

module.exports.state = new State();
module.exports.SpriteTypes = SpriteTypes;