#!/usr/bin/python
# ----------------------------------------------------------------------------
# Parses Cocos Creator projects
# ----------------------------------------------------------------------------
'''
Tool that converts Cocos Creator into cocos2d-x
'''
from __future__ import division, unicode_literals, print_function
import sys
import os
import json
import glob
from pprint import pprint
import getopt
from sets import Set
import re

DEBUG = False

def log(s):
    if DEBUG:
        print(s)


__docformat__ = 'restructuredtext'

class Singleton:
    """
    A non-thread-safe helper class to ease implementing singletons.
    This should be used as a decorator -- not a metaclass -- to the
    class that should be a singleton.

    The decorated class can define one `__init__` function that
    takes only the `self` argument. Also, the decorated class cannot be
    inherited from. Other than that, there are no restrictions that apply
    to the decorated class.

    To get the singleton instance, use the `Instance` method. Trying
    to use `__call__` will result in a `TypeError` being raised.

    """

    def __init__(self, decorated):
        self._decorated = decorated

    def Instance(self):
        """
        Returns the singleton instance. Upon its first call, it creates a
        new instance of the decorated class and calls its `__init__` method.
        On all subsequent calls, the already created instance is returned.

        """
        try:
            return self._instance
        except AttributeError:
            self._instance = self._decorated()
            return self._instance

    def __call__(self):
        raise TypeError('Singletons must be accessed through `Instance()`.')

    def __instancecheck__(self, inst):
        return isinstance(inst, self._decorated)


@Singleton
class State(object):
    # filename of the .fire file to parse
    def __init__(self):
        self._filename = ""

        # Needed resources
        self._resources_needed = set()

        # the .fire file being parsed
        self._json_data = []

        # the .meta files that contain sprite frame info and other data
        self._meta_data = {}

        # contains the sprite frames: customized version of _meta_data
        # key is the uuid. value is the json container
        self._sprite_frames = {}

        # sprites that don't belong to any atlas
        # should be added to the SpriteFrameCache manually
        self._sprite_without_atlas = {}

        # sprites that belong to atlas files
        # atlas file should be added to the SpriteFrameCache manually
        self._sprite_with_atlas = []

        # contains the textures used
        # key is the uuid. value is the json container
        self._textures = {}

        # contains the data from library/uuid-to-mtime.json
        self._uuid = {}

        self._design_resolution = None

        # path for the assets
        self._assetpath = ""

        # global unique id for nodes
        # it is just a number that gets incremented with each new node
        self._unique_id = 0


#
# Node
#
class Node(object):
    @classmethod
    def get_node_components(cls, node):
        idxs = node['_components']
        components = []
        for idx in idxs:
            idx_num = idx['__id__']
            components.append(State.Instance()._json_data[idx_num])
        return components

    @classmethod
    def get_node_component_of_type(cls, node, t):
        components = Node.get_node_components(node)
        for c in components:
            if c['__type__'] == t:
                return c
        return None

    @classmethod
    def guess_type_from_components(cls, components):
        # ScrollView, Button & ProgressBar should be before Sprite
        supported_components = ('cc.Button', 'cc.ProgressBar', 'cc.ScrollView', 'cc.EditBox', 'cc.Label', 'cc.Sprite', 'cc.ParticleSystem', 'cc.TiledMap', 'cc.Canvas')
        node_components = [x['__type__'] for x in components]
        for supported in supported_components:
            if supported in node_components:
                log("Choosen %s from %s" % (supported, node_components))
                return supported
        log("Unknown components: %s" % node_components)
        return 'unknown'

    @classmethod
    def create_node(cls, node_type, node_idx):
        state = State.Instance()
        n = None
        if node_type == 'cc.Sprite':
            n = Sprite(state._json_data[node_idx])
        elif node_type == 'cc.Label':
            n = Label(state._json_data[node_idx])
        elif node_type == 'cc.ParticleSystem':
            n = ParticleSystem(state._json_data[node_idx])
        elif node_type == 'cc.TiledMap':
            n = TiledMap(state._json_data[node_idx])
        elif node_type == 'cc.Canvas':
            n = Canvas(state._json_data[node_idx])
        elif node_type == 'cc.EditBox':
            n = EditBox(state._json_data[node_idx])
        elif node_type == 'cc.ProgressBar':
            n = ProgressBar(state._json_data[node_idx])
        elif node_type == 'cc.Button':
            n = Button(state._json_data[node_idx])
        elif node_type == 'cc.ScrollView':
            n = ScrollView(state._json_data[node_idx])
        if n is not None:
            n.parse_properties()
        return n

    @classmethod
    def get_filepath_from_uuid(self, uuid):
        state = State.Instance()
        filepath = None
        if uuid in state._uuid:
            filepath = state._uuid[uuid]['relativePath']
        elif uuid in state._sprite_frames:
            filepath = state._sprite_frames[uuid]['frameName']
        return filepath

    def __init__(self, data):
        self._node_data = data
        self._children = []
        self._jsonNode = {
                'object':None,
                'object_type':None,
                'children': []
                }
        self._properties = {}

        data = self._node_data
        self.add_property_size('contentSize', "_contentSize", data)
        self.add_property_bool('enabled', "_enabled", data)
        self.add_property_str('name', "_name", data)
        self.add_property_vec2('anchorPoint', "_anchorPoint", data)
        self.add_property_bool('cascadeOpacityEnabled', "_cascadeOpacityEnabled", data)
        self.add_property_rgb('color', "_color", data)
        self.add_property_int('globalZOrder', "_globalZOrder", data)
        self.add_property_int('localZOrder', "_localZOrder", data)
        self.add_property_int('opacity', "_opacity" , data)
        self.add_property_bool('opacityModifyRGB', "_opacityModifyRGB", data)
        self.add_property_vec2('position', "_position", data)
        self.add_property_int('rotationSkewX', "_rotationX", data)
        self.add_property_int('rotationSkewY', "_rotationY", data)
        self.add_property_int('scaleX', "_scaleX", data)
        self.add_property_int('scaleY', "_scaleY", data)
        self.add_property_int('skewX', "_skewX", data)
        self.add_property_int('skewY', "_skewY", data)
        self.add_property_int('tag', "_tag", data)

    def add_property_str(self, newkey, value, data):
        if value in data:
            new_value = data.get(value)
            self._properties[newkey] = new_value

    def add_property_size(self, newkey, value, data):
        if value in data:
            w = data.get(value)['width']
            h = data.get(value)['height']
            self._properties[newkey] = {'w':w, 'h':h}

    def add_property_int(self, newkey, value, data):
        if value in data:
            i = data.get(value)
            self._properties[newkey] = i

    def add_property_vec2(self, newkey, value, data):
        if value in data:
            x = data.get(value)['x']
            y = data.get(value)['y']
            self._properties[newkey] = {'x':x, 'y':y}

    def add_property_rgb(self, newkey, value, data):
        if value in data:
            r = data.get(value)['r']
            g = data.get(value)['g']
            b = data.get(value)['b']
            self._properties[newkey] = {'r':int(r), 'g':int(g), 'b':int(b)}

    def add_property_bool(self, newkey, value, data):
        if value in data:
            self._properties[newkey] = data.get(value)

    def get_class_name(self):
        return type(self).__name__

    def parse_properties(self):
        for child_idx in self._node_data["_children"]:
            self.parse_child(child_idx['__id__'])

    def parse_child(self, node_idx):
        node = State.Instance()._json_data[node_idx]
        if node['__type__'] == 'cc.Node':
            components = Node.get_node_components(node)
            node_type = Node.guess_type_from_components(components)
            if node_type is not None:
                n = Node.create_node(node_type, node_idx)
                self.adjust_child_parameters(n)
                if n is not None:
                    self.add_child(n)

    def add_child(self, node):
        self._children.append(node)

    def print_scene_graph(self, tab):
        log(self.get_description(tab))
        for child in self._children:
            child.print_scene_graph(tab+2)

    def get_description(self, tab):
        return "%s%s" % ('-' * tab, self.get_class_name())

    #-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    #
    # JSON
    #
    #-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    def to_json(self, depth, sibling_idx):
        self.to_json_begin(depth, sibling_idx)
        self.to_json_properties()

        for idx, child in enumerate(self._children):
            jsonChild = child.to_json(depth+1, idx)
            if jsonChild is not None:
                self._jsonNode['children'].append(jsonChild)

        return self._jsonNode

    def to_json_begin(self, depth, sibling_idx):
        pass

    def to_json_properties(self):
        self._jsonNode['object'] = self._properties

    def adjust_child_parameters(self, child):
        '''Only useful when a parent wants to override some child parameter
           As an example, ScrollView needs to adjust its children position
        '''


################################################################################
#
# Special Nodes: Scene, Canvas
#
################################################################################
class Scene(Node):
    def __init__(self, data):
        super(Scene, self).__init__(data)

        self._jsonNode['object_type'] = 'Scene'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}


class Canvas(Node):
    def __init__(self, data):
        super(Canvas, self).__init__(data)

        state = State.Instance()

        component = Node.get_node_component_of_type(self._node_data, 'cc.Canvas')

        state._design_resolution = component['_designResolution']
        state._fit_width = component['_fitWidth']
        state._fit_height = component['_fitHeight']

        # Canvas... treat it as a Node
        self._jsonNode['object_type'] = 'Node'


################################################################################
#
# Built-in Renderer Node
# Sprite, Label, TMX, Particle
#
################################################################################
class Sprite(Node):

    SPRITE_TYPES = ('Simple', 'Sliced', 'Tiled', 'Filled')

    def __init__(self, data):
        super(Sprite, self).__init__(data)
        self._jsonNode['object_type'] = 'Sprite'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}

    def parse_properties(self):
        super(Sprite, self).parse_properties()

        state = State.Instance()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.Sprite')
        sprite_frame_uuid = component['_spriteFrame']['__uuid__']

#        atlas = component['_atlas']

        # add name between ""
        log(state._sprite_frames[sprite_frame_uuid])
        self.add_property_str('spriteFrameName', 'frameName', state._sprite_frames[sprite_frame_uuid])
        log(state._sprite_frames[sprite_frame_uuid])

        self._properties['spriteType'] = Sprite.SPRITE_TYPES[component['_type']]

    def get_description(self, tab):
        return "%s%s('%s')" % ('-' * tab, self.get_class_name(), self._properties['spriteFrame'])


class Label(Node):

    H_ALIGNMENTS = ('Left', 'Center', 'Right')
    V_ALIGNMENTS = ('Top', 'Center', 'Bottom')

    def __init__(self, data):
        super(Label, self).__init__(data)
        self._label_text = ""
        self._jsonNode['object_type'] = 'Label'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}

        self._properties['fontType'] = 'System'

    def parse_properties(self):
        super(Label, self).parse_properties()

        state = State.Instance()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.Label')

        is_system_font = component["_isSystemFontUsed"]
        self._properties['fontSize'] = component['_fontSize']
        self._properties['labelText'] = component['_N$string']

        # replace new lines with \n
        self._label_text = self._label_text.replace('\n','\\n')

        # alignments
        self._properties['horizontalAlignment'] = Label.H_ALIGNMENTS[component['_N$horizontalAlign']]
        self._properties['verticalAlignment'] = Label.V_ALIGNMENTS[component['_N$verticalAlign']]

        if is_system_font:
            self._properties['fontType'] = 'System'
            self._properties['fontName'] = 'arial'
        else:
            fontName = Node.get_filepath_from_uuid(component['_N$file']['__uuid__'])
            self._properties['fontName'] = state._assetpath + fontName
            if fontName.endswith('.ttf'):
                self._properties['fontType'] = 'TTF'
            elif fontName.endswith('.fnt'):
                self._properties['fontType'] = 'BMFont'
                self.add_property_int('fontSize','_fontSize', component)
            else:
                raise Exception("Invalid label file: %s" % filename)

            # needed for multiline. lineHeight not supported in SystemFONT
            self.add_property_int('lineHeight' ,'_lineHeight', component)

    def get_description(self, tab):
        return "%s%s('%s')" % ('-' * tab, self.get_class_name(), self._label_text)


class ParticleSystem(Node):
    def __init__(self, data):
        super(ParticleSystem, self).__init__(data)

        component = Node.get_node_component_of_type(self._node_data, 'cc.ParticleSystem')

        self._particle_system_file = Node.get_filepath_from_uuid(component['_file']['__uuid__'])

        # tag it as needed resourse
        State.Instance()._resources_needed.add(self._particle_system_file)

        self._jsonNode['object_type'] = 'Particle'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node':self._properties}

    def get_class_name(self):
        return 'ParticleSystemQuad'


class TiledMap(Node):
    def __init__(self, data):
        super(TiledMap, self).__init__(data)

        component = Node.get_node_component_of_type(self._node_data, 'cc.TiledMap')
        self._tmx_file = Node.get_filepath_from_uuid(component['_tmxFile']['__uuid__'])

        # tag it as needed resourse
        State.Instance()._resources_needed.add(self._tmx_file)

        # for some reason, changing the contentSize breaks the TMX
        del self._properties['contentSize']
        self._jsonNode['object_type'] = 'TileMap'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}

    def get_class_name(self):
        return 'TMXTiledMap'


################################################################################
#
# Built-in UI Nodes
# Button, EditBox, ProgressBar, ScrollView
#
################################################################################
class Button(Node):
    #  Composition:
    #  - Sprite component
    #  - Button component
    #  - Label child
    #    - Label component
    #
    # custom properties
    # "_N$normalSprite": { "__uuid__": }
    # "_N$disabledSprite": { "__uuid__": }
    # "_N$interactable": true,
    # "_N$normalColor": { "__type__": "cc.Color"}
    # "_N$disabledColor": { "__type__": "cc.Color",
    # "transition": 2, (NONE, COLOR, SPRITE)
    # "pressedColor": { "__type__": "cc.Color",
    # "hoverColor": { "__type__": "cc.Color",
    # "duration": 0.1,
    # "pressedSprite": { "__uuid__":
    # "hoverSprite": { "__uuid__":

    def __init__(self, data):
        super(Button, self).__init__(data)
        self._jsonNode['object_type'] = 'Button'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}

    def parse_properties(self):
        super(Button, self).parse_properties()

        # search for sprite frame name
        spr_component = Node.get_node_component_of_type(self._node_data, 'cc.Sprite')
        but_component = Node.get_node_component_of_type(self._node_data, 'cc.Button')

        self._properties['spriteFrameName'] = Node.get_filepath_from_uuid(but_component['_N$normalSprite']['__uuid__'])
        self._properties['ignoreContentAdaptWithSize'] = False


    def get_class_name(self):
        return 'ui::Button'


class EditBox(Node):
    # custom properties
    # "_N$backgroundImage": { "__uuid__": }
    # "_N$returnType": 0,
    # "_N$inputFlag": 3,
    # "_N$inputMode": 6,
    # "_N$fontSize": 29,
    # "_N$lineHeight": 40,
    # "_N$fontColor": { "__type__": "cc.Color",}
    # "_N$placeholder": "Enter text here...",
    # "_N$placeholderFontSize": 20,
    # "_N$placeholderFontColor": { "__type__": "cc.Color" }
    # "_N$maxLength": 8

    INPUT_MODE = ('Any', 'EmailAddress', 'Numeric', 'PhoneNumber', 'URL', 'Decime', 'SingleLine')
    INPUT_FLAG = ('Password', 'Sensitive', 'InitialCapsWord', 'InitialCapsSentence', 'InitialCapsAllCharacters', 'LowercaseAllCharacters')
    RETURN_TYPE = ('Default', 'Done', 'Send', 'Search', 'Go')

    def __init__(self, data):
        super(EditBox, self).__init__(data)
        self._jsonNode['object_type'] = 'EditBox'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}

    def parse_properties(self):
        super(EditBox, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.EditBox')
        self._properties['backgroundImage'] = Node.get_filepath_from_uuid(component['_N$backgroundImage']['__uuid__'])
        self._properties['returnType'] = EditBox.RETURN_TYPE[component['_N$returnType']]
        self._properties['inputFlag'] = EditBox.INPUT_FLAG[component['_N$inputFlag']]
        self._properties['inputMode'] = EditBox.INPUT_MODE[component['_N$inputMode']]
        self.add_property_int('fontSize', '_N$fontSize', component)
#        self.add_property_int('setLineHeight', '_N$lineHeight', component)
        self.add_property_rgb('fontColor', '_N$fontColor', component)
        self.add_property_str('placeholder', '_N$placeholder', component)
        self.add_property_int('placeholderFontSize', '_N$placeholderFontSize', component)
        self.add_property_rgb('placeholderFontColor', '_N$placeholderFontColor', component)
        self.add_property_int('maxLength', '_N$maxLength', component)
        self.add_property_str('text', '_string', component)

    def get_class_name(self):
        return 'ui::EditBox'


class ProgressBar(Node):
    # custom properties
    # "_N$barSprite": { "__id__" }
    # "_N$mode": 0,
    # "_N$totalLength": 100,
    # "_N$progress": 0.5,
    # "_N$reverse": false

    def __init__(self, data):
        super(ProgressBar, self).__init__(data)
        self._jsonNode['object_type'] = 'ProgressBar'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}

    def parse_properties(self):
        super(ProgressBar, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.ProgressBar')
        self._properties['percent'] = component['_N$progress'] * 100


    def get_class_name(self):
        return 'ui::LoadingBar'


class ScrollView(Node):
    # custom properties
    # "horizontal": false,
    # "vertical": true,
    # "inertia": true,
    # "brake": 0.75,
    # "elastic": true,
    # "bounceDuration": 0.23,
    # "scrollEvents": [],
    # "cancelInnerEvents": true,
    # "_N$horizontalScrollBar": null,
    # "_N$verticalScrollBar": { "__id__": 23 }

    # for the sprites used internally
    SIMPLE, SLICED, TILED, FILLED = range(4)

    def __init__(self, data):
        super(ScrollView, self).__init__(data)
        self._jsonNode['object_type'] = 'ScrollView'

        # Move Node properties into 'node' and clean _properties
        self._properties = {'node': self._properties}

    def get_content_node(self):
        state = State.Instance()

        # Node
        #  +--> ScrollBar
        #       +--> Bar
        #  +--> View
        #       +--> Content    <-- this is what we want
        view_node = None
        content_node = None

        # find the "view" node
        for child_idx in self._node_data["_children"]:
            node_idx = child_idx['__id__']
            node = state._json_data[node_idx]

            if node["_name"] == "view":
                view_node = node

        # then find the "content" node
        if view_node is not None:
            for child_idx in view_node["_children"]:
                node_idx = child_idx['__id__']
                node = state._json_data[node_idx]

                if node["_name"] == "content":
                    content_node = node

        if content_node is not None:
            return content_node
        else:
            raise Exception("ContentNode not found")

    def parse_properties(self):
        state = State.Instance()

        # Don't call super since it will parse all its children
        # We only care about the "content" child
        # super(ScrollView, self).parse_properties()

        # data from 'node' component
        self.add_property_rgb('backgroundImageColor', '_color', self._node_data)

        # data from sprite component
        component_spr = Node.get_node_component_of_type(self._node_data, 'cc.Sprite')
        sprite_frame_uuid = component_spr['_spriteFrame']['__uuid__']
        self._properties['backgroundImage'] =  state._sprite_frames[sprite_frame_uuid]['frameName']

        # Sliced ?
        if component_spr['_type'] == ScrollView.SLICED:
            self._properties['backgroundImageScale9Enabled'] = True
        else:
            self._properties['backgroundImageScale9Enabled'] = False

        # data from scroll view component
        component_sv = Node.get_node_component_of_type(self._node_data, 'cc.ScrollView')
        if component_sv['horizontal'] and component_sv['vertical']:
            self._properties['direction'] = 'Both'
        elif component_sv['horizontal']:
            self._properties['direction'] = 'Horizontal'
        elif component_sv['vertical']:
            self._properties['direction'] = 'Vertical'
        else:
            self._properties['direction'] = 'None'
        self.add_property_bool('bounceEnabled', 'elastic', component_sv)

        # content node
        content_node = self.get_content_node()

        # get size from content (which must be >= view.size)
        data = content_node
        self.add_property_size('innerContainerSize', "_contentSize", data)
        self._content_size = data['_contentSize']

        # FIXME: Container Node should honor these values, but it seems that ScrollView doesn't
        # take them into account... or perhaps CocosCreator uses a different anchorPoint
        # position is being adjusted in `adjust_child_parameters`
        self._content_ap = content_node['_anchorPoint']

        #self._properties['getInnerContainer()->setAnchorPoint'] = 'Vec2(%g,%g)' % (self._content_ap['x'], self._content_ap['y'])
        self._content_pos = content_node['_position']
        #self._properties['getInnerContainer()->setPosition'] = 'Vec2(%g,%g)' % (self._content_pos['x'], self._content_pos['y'])

        # add its children
        for child_idx in content_node["_children"]:
            self.parse_child(child_idx['__id__'])

    def get_class_name(self):
        return 'ui::ScrollView'

    def adjust_child_parameters(self, child):
        # FIXME: adjust child position since innerContainer doesn't honor
        # position and anchorPoit.
        pos = child._properties['node']['position']
        x = pos['x']
        y = pos['y']
        child._properties['node']['position'] = {
                'x': x + self._content_size['width'] * self._content_ap['x'],
                'y': y + self._content_size['height'] * self._content_ap['y'] }


################################################################################
#
# bootstrap + helper functions
#
################################################################################
class FireParser(object):
    def __init__(self):
        self._state = State.Instance()
        self._json_file = None
        self._json_output = {'version':'1.0', 'root':{}}

    def populate_meta_files(self, path):
        metas1 = glob.glob(path + '/*.meta')
        metas2 = glob.glob('temp/*/*/*.meta')
        metas = metas1 + metas2
        log(metas)
        for meta_filename in metas:
            with open(meta_filename) as fd:
                basename = os.path.basename(meta_filename)
                j_data = json.load(fd)
                self._state._meta_data[basename] = j_data

                meta_uuid = j_data['uuid']

                # is this a sprite (.png) file ?
                if 'type' in j_data and (j_data['type'] == 'sprite' or j_data['type'] == 'Texture Packer'):
                    # subMetas seems to contain all the sprite frame definitions
                    submetas = j_data['subMetas']
                    for spriteframename in submetas:
                        # uuid will be used as the key
                        uuid = submetas[spriteframename]['uuid']
                        submetas[spriteframename]['frameName'] = spriteframename

                        # populate State.Instance()._sprite_frames
                        self._state._sprite_frames[uuid] = submetas[spriteframename]

                        # populate State.Instance()._textures. The name is meta_filename - '.meta' (5 chars)
                        if 'rawTextureUuid' in submetas[spriteframename]:
                            texture_uuid = submetas[spriteframename]['rawTextureUuid']
                            self._state._textures[texture_uuid] = os.path.basename(meta_filename[:-5])
                        else:
                            log('Framename "%s" doesn\'t have rawTextureUuid. Ignoring it...' % submetas[spriteframename]['frameName'])

                        if j_data['type'] == 'sprite':
                            self._state._sprite_without_atlas[uuid] = submetas[spriteframename]
                        elif j_data['type'] == 'Texture Packer':
                            self._state._sprite_with_atlas.append(Node.get_filepath_from_uuid(meta_uuid))
                            self._state._sprite_without_atlas[uuid] = submetas[spriteframename]
                        else:
                            raise Exception("Invalid type: %s" % j_data['type'])


    def populate_uuid_file(self, path):
        with open(path + '/../library/uuid-to-mtime.json') as data:
            State.Instance()._uuid = json.load(data)


    def to_json_setup(self):
        self.to_json_setup_design_resolution()
        self.to_json_setup_sprite_frames()


    def to_json_setup_design_resolution(self):
        self._json_output['designResolution'] = {'w': self._state._design_resolution['width'],
                                                 'h': self._state._design_resolution['height']}
        self._json_output['resolutionFitWidth'] = self._state._fit_width
        self._json_output['resolutionFitHeight'] = self._state._fit_height


    def to_json_setup_sprite_frames(self):
        sprite_frames = []

        state = State.Instance()

        for k in state._sprite_without_atlas:
            sprite_frame = state._sprite_frames[k]
            if 'rawTextureUuid' in sprite_frame:
                texture_filename = Node.get_filepath_from_uuid(sprite_frame['rawTextureUuid'])

                original_frame_name = sprite_frame['frameName']
                sprite_frame_name = original_frame_name.replace('-','_')
                sprite_frame_name = sprite_frame_name.replace('.','_')

                # name:string;
                # texturePath:string;
                # rect:Rect;
                # offset:Vec2;
                # rotated:bool;
                # originalSize:Size;
                frame = {}
                frame['name'] = original_frame_name
                frame['texturePath'] = state._assetpath + texture_filename
                frame['rect'] = {'x':sprite_frame['trimX'], 'y':sprite_frame['trimY'], 'w': sprite_frame['width'], 'h': sprite_frame['height'] }
                frame['offset'] = {'x': sprite_frame['offsetX'], 'y': sprite_frame['offsetY']}
                frame['rotated'] = sprite_frame['rotated']
                frame['originalSize'] = {'w': sprite_frame['rawWidth'], 'h': sprite_frame['rawHeight'] }

                # does it have a capInsets?
                if sprite_frame['borderTop'] != 0 or sprite_frame['borderBottom'] != 0 or sprite_frame['borderLeft'] != 0 or sprite_frame['borderRight'] != 0:
                    x = sprite_frame['borderLeft']
                    y = sprite_frame['borderTop']
                    w = sprite_frame['width'] - sprite_frame['borderRight'] - x
                    h = sprite_frame['height'] - sprite_frame['borderBottom'] - y
                    frame['centerRect'] = {'x':x, 'y':y, 'w':w, 'h':h }

                sprite_frames.append(frame)
            else:
                log("Ignoring '%s'... No rawTextureUuid" % sprite_frame['frameName'])

        self._json_output['spriteFrames'] = sprite_frames


    def create_file(self, filename):
        if not os.path.exists(os.path.dirname(filename)):
            try:
                os.makedirs(os.path.dirname(filename))
            except OSError as exc: # Guard against race condition
                if exc.errno != errno.EEXIST:
                    raise
        return open(filename, "w")


    def run(self, filename, assetpath):

        self._state._assetpath = assetpath
        self._state._filename = os.path.splitext(os.path.basename(filename))[0]
        json_name = "json/%s.json" % self._state._filename

        self._json_file = self.create_file(json_name)

        path = os.path.dirname(filename)
        # 1st
        self.populate_uuid_file(path)
        # 2nd
        self.populate_meta_files(path)

        with open(filename) as data_file:
            self._state._json_data = json.load(data_file)

        log("total elements: %d" % len(self._state._json_data))
        for i,obj in enumerate(self._state._json_data):
            if obj["__type__"] == "cc.SceneAsset":
                scenes = obj["scene"]
                scene_idx = scenes["__id__"]
                scene_obj = Scene(self._state._json_data[scene_idx])
                scene_obj.parse_properties()
    #            scene_obj.print_scene_graph(0)

                self.to_json_setup()
                jsonNode = scene_obj.to_json(0,0)
                self._json_output['root'] = jsonNode

        dump = json.dumps(self._json_output,
                sort_keys=True,
                indent=4,
                separators=(',', ': '))
        self._json_file.write(dump)


def help():
    print("%s v0.1 - parses Cocos Creator project files\n" % os.path.basename(sys.argv[0]))
    print("Example:\n%s --assetpath creator/assets assets/*.fire" % os.path.basename(sys.argv[0]))
    sys.exit(-1)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        help()

    assetpath = ""
    argv = sys.argv[1:]
    try:
        opts, args = getopt.getopt(argv, "p:", ["assetpath="])
        for opt, arg in opts:
            if opt in ("-p", "--assetpath"):
                assetpath = arg
                if assetpath[-1] != '/':
                    assetpath += '/'

        for f in args:
            parser = FireParser()
            parser.run(f, assetpath)
    except getopt.GetoptError, e:
        print(e)

