const Node = require('./Node');
const Utils = require('./Utils');

class EditBox extends Node {
    constructor(data) {
        super(data);
        this._jsonNode.object_type = 'EditBox';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.EditBox');

        // background image is needed by cocos2d-x's EditBox
        if (!component._N$backgroundImage)
            Utils.log("Error:EditBox background image is needed by cocos2d-x!");
        this._properties.backgroundImage = Utils.get_sprite_frame_name_by_uuid(component._N$backgroundImage.__uuid__);

        this._properties.returnType = EditBox.RETURN_TYPE[component._N$returnType];
        this._properties.inputFlag = EditBox.INPUT_FLAG[component._N$inputFlag];
        this._properties.inputMode = EditBox.INPUT_MODE[component._N$inputMode];
        this.add_property_int('fontSize', '_N$fontSize', component);
        this.add_property_rgb('fontColor', '_N$fontColor', component);
        this.add_property_str('placeholder', '_N$placeholder', component);
        this.add_property_int('placeholderFontSize', '_N$placeholderFontSize', component);
        this.add_property_rgb('placeholderFontColor', '_N$placeholderFontColor', component);
        this.add_property_int('maxLength', '_N$maxLength', component);
        this.add_property_str('text', '_string', component);
    }
}
EditBox.INPUT_MODE = ['Any', 'EmailAddress', 'Numeric', 'PhoneNumber', 'URL', 'Decime', 'SingleLine'];
EditBox.INPUT_FLAG = ['Password', 'Sensitive', 'InitialCapsWord', 'InitialCapsSentence', 'InitialCapsAllCharacters', 'LowercaseAllCharacters'];
EditBox.RETURN_TYPE = ['Default', 'Done', 'Send', 'Search', 'Go'];

module.exports = EditBox;