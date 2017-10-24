const Node = require('./Node');
const Label = require('./Label');
const Utils = require('./Utils');
const state = require('./Global').state;

class RichText extends Node {
    constructor(data) {
        super(data);
        this._label_text = '';
        this._jsonNode.object_type = 'RichText';
    }

    parse_properties() {
        super.parse_properties();

        this._properties = {node: this._properties};

        let component = Node.get_node_component_of_type(this._node_data, 'cc.RichText');
 
        // <outline xxx=yyy ...> -> <outline xxx='yyy' ...>
        var text = component._N$string;
        let regex = /(<outline color|width)=(\w*) (color|width)=(\w*)/;
        text = text.replace(regex, "$1='$2' $3='$4'");

        // add <font></font> for raw strings
        text = '<font>' + text + '</font>';

        // add sprite frames if there is img component
        if (component._N$imageAtlas) {
            // find sprite frame name
            regex = /<img src=\'(\w+)\'/;
            let resource = text.match(regex)[1];

            // add sprite frames
            let json_uuid = component._N$imageAtlas.__uuid__;
            let json_content = Utils.get_sprite_frame_json_by_uuid(json_uuid);
            let resource_uuid = json_content._spriteFrames[resource].__uuid__;
            Utils.get_sprite_frame_name_by_uuid(resource_uuid);

            // <img src='xx'/> -> <img scr='xxx' width='yyy' height='zzz'/>
            let resource_json_content = Utils.get_sprite_frame_json_by_uuid(resource_uuid);
            let resource_size = {width: resource_json_content.content.originalSize[0],
                                 height: resource_json_content.content.originalSize[1]};
            text = text.replace(/(<img\s+src=\'\w+\')/, "$1 width='" + resource_size.width + "' height='" + resource_size.height + "'");
        }

        this._properties.text = text;

        this._properties.horizontalAlignment = Label.H_ALIGNMENTS[component._N$horizontalAlign];
        this._properties.fontSize = component._N$fontSize;
        this._properties.maxWidth = component._N$maxWidth;
        this._properties.lineHeight = component._N$lineHeight;
        let f = component._N$font;
        if (f)
            this._properties.fontFilename = state._assetpath + Utils.get_font_path_by_uuid(f.__uuid__);
        else
            this._properties.fontFilename = 'Arial';

        // should floor the content size, or it may cause to create a new line
        let contentSize = this._properties.node.contentSize;
        let newContentSize = {w:Math.ceil(contentSize.w), h:Math.ceil(contentSize.h)};
        this._properties.node.contentSize = newContentSize;
    }
}
RichText.H_ALIGNMENTS = ['Left', 'Center', 'Right'];

module.exports = RichText;