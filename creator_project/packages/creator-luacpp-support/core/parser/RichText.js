const Node = require('./Node');
const Label = require('./Label');
const get_font_path_by_uuid = require('./Utils').get_font_path_by_uuid;

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
        var match = text.match(regex);
        text = text.replace(regex, "$1='$2' $3='$4'");

        // <br/> -> \n
        text = text.replace('<br/>', '\n');

        // add <font></font> if the text starts with charactor
        if (text[0] !== '<')
            text = '<font>' + text + '</font>';

        this._properties.text = text;

        this._properties.horizontalAlignment = Label.H_ALIGNMENTS[component._N$horizontalAlign];
        this._properties.fontSize = component._N$fontSize;
        this._properties.maxWidth = component._N$maxWidth;
        this._properties.lineHeight = component._N$lineHeight;
        let f = component._N$font;
        if (f)
            this._properties.fontFilename = get_font_path_by_uuid(f.__uuid__);
    }
}
RichText.H_ALIGNMENTS = ['Left', 'Center', 'Right'];

module.exports = RichText;