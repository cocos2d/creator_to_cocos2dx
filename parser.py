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


__docformat__ = 'restructuredtext'

# Some globals (yeah!)

# filename of the .fire file to parse
g_filename = ""
# File objects to dump the cpp/h data
g_file_cpp = None
g_file_h = None

# Needed resources
g_resources_needed = set()

# the .fire file being parsed
g_json_data = []

# the .meta files that contain sprite frame info and other data
g_meta_data = {}

# contains the sprite frames: customized version of g_meta_data
# key is the uuid. value is the json container
g_sprite_frames = {}

# sprites that don't belong to any atlas
# should be added to the SpriteFrameCache manually
g_sprite_without_atlas = {}

# sprites that belong to atlas files
# atlas file should be added to the SpriteFrameCache manually
g_sprite_with_atlas = []

# contains the textures used
# key is the uuid. value is the json container
g_textures = {}

# contains the data from library/uuid-to-mtime.json
g_uuid = {}

g_design_resolution = None

# path for the assets
g_assetpath = ""



def globals_init():
    global g_filename, g_json_data, g_meta_data
    global g_file_cpp, g_file_h
    global g_sprite_frames, g_textures, g_uuid
    global g_sprite_without_atlas, g_sprite_with_atlas
    global g_design_resolution, g_resources_needed
    global g_assetpath

    g_filename = ""
    g_json_data = []
    g_meta_data = {}
    g_sprite_frames = {}
    g_sprite_without_atlas = {}
    g_sprite_with_atlas = []
    g_textures = {}
    g_uuid = {}
    g_design_resolution = None
    g_file_cpp = None
    g_file_h = None
    g_resources_needed = set()
    g_assetpath = ""


class Node(object):
    @classmethod
    def get_node_components(cls, node):
        idxs = node['_components']
        components = []
        for idx in idxs:
            idx_num = idx['__id__']
            components.append(g_json_data[idx_num])
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
        # Button should be before Sprite
        known_components = ['cc.Button', 'cc.EditBox', 'cc.Label', 'cc.Sprite', 'cc.ParticleSystem', 'cc.TiledMap', 'cc.Canvas']
        for component in components:
            t = component['__type__']
            if t in known_components:
                l = [x['__type__'] for x in components]
                print("Choosen %s from %s" % (t,l))
                return t
            else:
                print("Component not found: %s" % component['__type__'])
        return 'unknown'

    @classmethod
    def create_node(cls, node_type, node_idx):
        n = None
        if node_type == 'cc.Sprite':
            n = Sprite(g_json_data[node_idx])
        elif node_type == 'cc.Label':
            n = Label(g_json_data[node_idx])
        elif node_type == 'cc.ParticleSystem':
            n = ParticleSystem(g_json_data[node_idx])
        elif node_type == 'cc.TiledMap':
            n = TiledMap(g_json_data[node_idx])
        elif node_type == 'cc.Canvas':
            n = Canvas(g_json_data[node_idx])
        if n is not None:
            n.parse_properties()
        return n

    def __init__(self, data):
        self._node_data = data
        self._children = []
        self._properties = {}

#        self.add_property_size('setContentSize', "_contentSize")
        data = self._node_data
        self.add_property_bool('setEnabled', "_enabled", data)
        self.add_property_str('setName', "_name", data)
        self.add_property_vec2('setAnchorPoint', "_anchorPoint", data)
        self.add_property_bool('setCascadeOpacityEnabled', "_cascadeOpacityEnabled", data)
        self.add_property_rgb('setColor', "_color", data)
        self.add_property_int('setGlobalZOrder', "_globalZOrder", data)
        self.add_property_int('setLocalZOrder', "_localZOrder", data)
        self.add_property_int('setOpacity', "_opacity" , data)
        self.add_property_bool('setOpacityModifyRGB', "_opacityModifyRGB", data)
        self.add_property_vec2('setPosition', "_position", data)
        self.add_property_int('setRotationSkewX', "_rotationX", data)
        self.add_property_int('setRotationSkewY', "_rotationY", data)
        self.add_property_int('setScaleX', "_scaleX", data)
        self.add_property_int('setScaleY', "_scaleY", data)
        self.add_property_int('setSkewX', "_skewX", data)
        self.add_property_int('setSkewY', "_skewY", data)
        self.add_property_int('setTag', "_tag", data)


        self._cpp_node_name = ""
        self._cpp_parent_name = ""

    def add_property(self, newkey, value, keys_to_parse):
        if value in self._node_data:
            new_value = self._node_data.get(value)
            if keys_to_parse is not None:
                new_value = [new_value[k] for k in keys_to_parse]
            self._properties[newkey] = new_value

    def add_property_str(self, newkey, value, data):
        if value in data:
            new_value = data.get(value)
            self._properties[newkey] = '"' + new_value + '"'

    def add_property_size(self, newkey, value, data):
        if value in data:
            w = data.get(value)['width']
            h = data.get(value)['height']
            self._properties[newkey] = 'Size(%g, %g)' % (w,h)

    def add_property_int(self, newkey, value, data):
        if value in data:
            i = data.get(value)
            self._properties[newkey] = i

    def add_property_vec2(self, newkey, value, data):
        if value in data:
            x = data.get(value)['x']
            y = data.get(value)['y']
            self._properties[newkey] = 'Vec2(%g, %g)' % (x,y)

    def add_property_rgb(self, newkey, value, data):
        if value in data:
            r = data.get(value)['r']
            g = data.get(value)['g']
            b = data.get(value)['b']
            self._properties[newkey] = 'Color3B(%d, %d, %d)' %(r,g,b)

    def add_property_bool(self, newkey, value, data):
        if value in data:
            b = str(data.get(value)).lower()
            self._properties[newkey] = b

    def get_class_name(self):
        return type(self).__name__

    def parse_properties(self):
        for child_idx in self._node_data["_children"]:
            self.parse_child(child_idx['__id__'])

    def parse_child(self, node_idx):
        node = g_json_data[node_idx]
        if node['__type__'] == 'cc.Node':
            components = Node.get_node_components(node)
            node_type = Node.guess_type_from_components(components)
            if node_type is not None:
                n = Node.create_node(node_type, node_idx)
                if n is not None:
                    self.add_child(n)

    def add_child(self, node):
        self._children.append(node)

    def print_scene_graph(self, tab):
        print(self.get_description(tab))
        for child in self._children:
            child.print_scene_graph(tab+2)

    def get_description(self, tab):
        return "%s%s" % ('-' * tab, self.get_class_name())

    def to_cpp(self, parent, depth, sibling_idx):
        self.to_cpp_begin(depth, sibling_idx)
        self.to_cpp_properties()
        self.to_cpp_end(parent)

        for idx, child in enumerate(self._children):
            child.to_cpp(self, depth+1, idx)

    def to_cpp_begin(self, depth, sibling_idx):
        g_file_cpp.write("    // New node\n")
        self._cpp_node_name = "%s_%d_%d" % (self.get_class_name().lower(), depth, sibling_idx)
        g_file_cpp.write("    auto %s = %s::%s;\n" % (self._cpp_node_name, self.get_class_name(), self.to_cpp_create_params()))


    def to_cpp_properties(self):
        for p in self._properties:
            value = self._properties[p]
            g_file_cpp.write("    %s->%s(%s);\n" % (self._cpp_node_name, p, value))

    def to_cpp_end(self, parent):
        if parent is not None:
            g_file_cpp.write("    %s->addChild(%s);\n" % (parent._cpp_node_name, self._cpp_node_name))
        g_file_cpp.write("")

    def to_cpp_create_params(self):
        return "create()"


################################################################################
#
# Special Nodes: Scene, Canvas
#
################################################################################
class Scene(Node):
    def __init__(self, data):
        super(Scene, self).__init__(data)


class Canvas(Node):
    def __init__(self, data):
        super(Canvas, self).__init__(data)

        component = Node.get_node_component_of_type(self._node_data, 'cc.Canvas')

        global g_design_resolution, g_fit_height, g_fit_width
        g_design_resolution = component['_designResolution']
        g_fit_width = component['_fitWidth']
        g_fit_height = component['_fitHeight']


    # Canvas should be part of the big init
    # but as as part of the scene graph
    # since cocos2d-x doesn't have this concept
    def to_cpp(self, parent, depth, sibling_idx):
        pass

################################################################################
#
# Built-in Renderer Node
# Sprite, Label, TMX, Particle
#
################################################################################
class Sprite(Node):
    def __init__(self, data):
        super(Sprite, self).__init__(data)

    def parse_properties(self):
        super(Sprite, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.Sprite')
        sprite_frame_uuid = component['_spriteFrame']['__uuid__']

#        atlas = component['_atlas']

        # add name between ""
        print(g_sprite_frames[sprite_frame_uuid])
        self.add_property_str('setSpriteFrame', 'frameName', g_sprite_frames[sprite_frame_uuid])
        print(g_sprite_frames[sprite_frame_uuid])

    def get_description(self, tab):
        return "%s%s('%s')" % ('-' * tab, self.get_class_name(), self._properties['setSpriteFrame'])


class Label(Node):

    FONT_SYSTEM, FONT_TTF, FONT_BM = range(3)
    H_ALIGNMENTS = ('TextHAlignment::LEFT', 'TextHAlignment::CENTER', 'TextHAlignment::RIGHT')
    V_ALIGNMENTS = ('TextVAlignment::TOP', 'TextVAlignment::CENTER', 'TextVAlignment::BOTTOM')

    def __init__(self, data):
        super(Label, self).__init__(data)
        self._label_text = ""
        self._font_type = Label.FONT_SYSTEM
        self._font_filename = None

    def parse_properties(self):
        super(Label, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.Label')

        is_system_font = component["_isSystemFontUsed"]
        self._font_size = component['_fontSize']
        self._label_text = component['_N$string']

        # replace new lines with \n
        self._label_text = self._label_text.replace('\n','\\n')

        # alignments
        self._properties['setHorizontalAlignment'] = Label.H_ALIGNMENTS[component['_N$horizontalAlign']]
        self._properties['setVerticalAlignment'] = Label.V_ALIGNMENTS[component['_N$verticalAlign']]

        if is_system_font:
            self._font_type = Label.FONT_SYSTEM
        else:
            file_uuid = component['_N$file']['__uuid__']
            self._font_filename = g_uuid[file_uuid]['relativePath']
            if self._font_filename.endswith('.ttf'):
                self._font_type = Label.FONT_TTF
            elif self._font_filename.endswith('.fnt'):
                self._font_type = Label.FONT_BM
                self.add_property_int('setBMFontSize','_fontSize', component)
            else:
                raise Exception("Invalid label file: %s" % filename)

            # needed for multiline. lineHeight not supported in SystemFONT
            self.add_property_int('setLineHeight' ,'_lineHeight', component)

    def to_cpp_create_params(self):
        if self._font_type == Label.FONT_SYSTEM:
            return 'createWithSystemFont("' + self._label_text + '", "arial", ' + str(self._font_size) + ')'
        elif self._font_type == Label.FONT_BM:
            return 'createWithBMFont("' + g_assetpath + self._font_filename + '", "' + self._label_text + '")'
        elif self._font_type == Label.FONT_TTF:
            return 'createWithTTF("' + self._label_text + '", "'+ g_assetpath + self._font_filename + '", ' + str(self._font_size) + ')'

    def get_description(self, tab):
        return "%s%s('%s')" % ('-' * tab, self.get_class_name(), self._label_text)


class ParticleSystem(Node):
    def __init__(self, data):
        super(ParticleSystem, self).__init__(data)

        component = Node.get_node_component_of_type(self._node_data, 'cc.ParticleSystem')
        file_uuid = component['_file']['__uuid__']

        # add name between ""
        self._particle_system_file = g_uuid[file_uuid]['relativePath']

        # tag it as needed resourse
        g_resources_needed.add(self._particle_system_file)

    def get_class_name(self):
        return 'ParticleSystemQuad'

    def to_cpp_create_params(self):
        return 'create("' + g_assetpath + self._particle_system_file + '")'

class TiledMap(Node):
    def __init__(self, data):
        super(TiledMap, self).__init__(data)

        component = Node.get_node_component_of_type(self._node_data, 'cc.TiledMap')
        file_uuid = component['_tmxFile']['__uuid__']
        # add name between ""
        self._tmx_file = g_uuid[file_uuid]['relativePath']

        # tag it as needed resourse
        g_resources_needed.add(self._tmx_file)

    def get_class_name(self):
        return 'TMXTiledMap'

    def to_cpp_create_params(self):
        return 'create("' + g_assetpath + self._tmx_file + '")'

################################################################################
#
# Built-in UI Nodes
# Button, EditBox, etc.
#
################################################################################
class Button(Node):
    pass

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

    def parse_properties(self):
        super(EditBox, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.EditBox')
        self.add_property_int('setReturnType', '_N$returnType', component)
        self.add_property_int('setInputFlag', '_N$inputFlag', component)
        self.add_property_int('setInputMode', '_N$inputMode', component)
        self.add_property_int('setFontSize', '_N$fontSize', component)
        self.add_property_int('setLineHeight', '_N$lineHeight', component)
        self.add_property_rgb('setFontColor', '_N$fontColor', component)
        self.add_property_str('setPlaceholder', '_N$placeholder', component)
        self.add_property_int('setPlaceholderFontSize', '_N$placeholderFontSize', component)
        self.add_property_rgb('setPlaceholderFontColor', '_N$placeholderFontColor', component)
        self.add_property_int('setMaxLength', '_N$maxLength', component)

    def get_class_name(self):
        return 'ui::EditBox'


################################################################################
#
# bootstrap + helper functions
#
################################################################################
def populate_meta_files(path):
    global g_meta_data, g_sprite_frames, g_textures
    global g_sprite_with_atlas, g_sprite_without_atlas
    metas = glob.glob(path + '/*.meta')
    for meta_filename in metas:
        with open(meta_filename) as fd:
            basename = os.path.basename(meta_filename)
            j_data = json.load(fd)
            g_meta_data[basename] = j_data

            meta_uuid = j_data['uuid']

            # is this a sprite (.png) file ?
            if 'type' in j_data and (j_data['type'] == 'sprite' or j_data['type'] == 'Texture Packer'):
                # subMetas seems to contain all the sprite frame definitions
                submetas = j_data['subMetas']
                for spriteframename in submetas:
                    # uuid will be used as the key
                    uuid = submetas[spriteframename]['uuid']
                    submetas[spriteframename]['frameName'] = spriteframename

                    # populate g_sprite_frames
                    g_sprite_frames[uuid] = submetas[spriteframename]

                    # populate g_textures. The name is meta_filename - '.meta' (5 chars)
                    texture_uuid = submetas[spriteframename]['rawTextureUuid']
                    g_textures[texture_uuid] = os.path.basename(meta_filename[:-5])

                    if j_data['type'] == 'sprite':
                        g_sprite_without_atlas[uuid] = submetas[spriteframename]
                    elif j_data['type'] == 'Texture Packer':
                        g_sprite_with_atlas.append(g_uuid[meta_uuid]['relativePath'])
                    else:
                        raise Exception("Invalid type: %s" % j_data['type'])


def populate_uuid_file(path):
    global g_uuid
    with open(path + '/../library/uuid-to-mtime.json') as data:
        g_uuid = json.load(data)


def to_cpp_setup():
    header = """
USING_NS_CC;

bool %s_init()
{""" % g_filename

    footer = """
    return true;
}
"""
    g_file_cpp.write(header)
    to_cpp_setup_design_resolution()
    to_cpp_setup_sprite_frames()
    g_file_cpp.write(footer)


def to_cpp_setup_design_resolution():
    design_resolution_exact_fit = """
    auto director = Director::getInstance();
    auto glview = director->getOpenGLView();
    glview->setDesignResolutionSize(%d, %d, ResolutionPolicy::EXACT_FIT);
""" % ( g_design_resolution['width'], g_design_resolution['height'])

    design_resolution = """
    auto director = Director::getInstance();
    auto glview = director->getOpenGLView();
    auto frameSize = glview->getFrameSize();
    glview->setDesignResolutionSize(%s, %s, ResolutionPolicy::NO_BORDER);
"""

    if g_fit_height and g_fit_width:
        g_file_cpp.write(design_resolution_exact_fit)
    elif g_fit_height:
        expanded = design_resolution % (
                "frameSize.width / (frameSize.height / %d)" % g_design_resolution['height'],
                "frameSize.height / (frameSize.height / %d)" % g_design_resolution['height'])
        g_file_cpp.write(expanded)
    elif g_fit_width:
        expanded = design_resolution % (
                "frameSize.width / (frameSize.width / %d)" % g_design_resolution['width'],
                "frameSize.height / (frameSize.width / %d)" % g_design_resolution['width'])
        g_file_cpp.write(expanded)
    else:
        expanded = design_resolution % (
                str(g_design_resolution['width']), 
                str(g_design_resolution['height']))
        g_file_cpp.write(expanded)


def to_cpp_setup_sprite_frames():
    for k in Set(g_sprite_with_atlas):
        g_file_cpp.write('    SpriteFrameCache::getInstance()->addSpriteFramesWithFile("%s");\n' % (g_assetpath + k))

    for k in g_sprite_without_atlas:
        sprite_frame = g_sprite_frames[k]
        texture_uuid = sprite_frame['rawTextureUuid']
        texture_filename = g_uuid[texture_uuid]['relativePath']
        sprite_frame_name = sprite_frame['frameName']
        sprite_frame_name = sprite_frame_name.replace('-','_')
        cpp_sprite_frame = '    auto sf_%s = SpriteFrame::create("%s", Rect(%g, %g, %g, %g), %s, Vec2(%g, %g), Size(%g, %g));\n' % (
                sprite_frame_name,
                g_assetpath + texture_filename,
                sprite_frame['trimX'], sprite_frame['trimY'], sprite_frame['width'], sprite_frame['height'],
                str(sprite_frame['rotated']).lower(),
                sprite_frame['offsetX'], sprite_frame['offsetY'],
                sprite_frame['rawWidth'], sprite_frame['rawHeight'])
        g_file_cpp.write(cpp_sprite_frame)
        g_file_cpp.write('    SpriteFrameCache::getInstance()->addSpriteFrame(sf_%s, "%s");\n' % (sprite_frame_name, sprite_frame_name))


def create_file(filename):

    if not os.path.exists(os.path.dirname(filename)):
        try:
            os.makedirs(os.path.dirname(filename))
        except OSError as exc: # Guard against race condition
            if exc.errno != errno.EEXIST:
                raise
    return open(filename, "w")


def run(filename, assetpath):
    global g_filename, g_file_cpp, g_file_h, g_assetpath

    globals_init()

    g_assetpath = assetpath
    g_filename = os.path.splitext(os.path.basename(filename))[0]
    cpp_name = "cpp/%s.cpp" % g_filename
    h_name = "cpp/%s.h" % g_filename

    g_file_cpp = create_file(cpp_name)
    g_file_h = create_file(h_name)

    path = os.path.dirname(filename)
    # 1st
    populate_uuid_file(path)
    # 2nd
    populate_meta_files(path)

    global g_json_data
    with open(filename) as data_file:
        g_json_data = json.load(data_file)

    print("total elements: %d" % len(g_json_data))
    for i,obj in enumerate(g_json_data):
        if obj["__type__"] == "cc.SceneAsset":
            scenes = obj["scene"]
            scene_idx = scenes["__id__"]
            scene_obj = Scene(g_json_data[scene_idx])
            scene_obj.parse_properties()
#            scene_obj.print_scene_graph(0)

            # cpp file
            g_file_cpp.write("////// AUTOGENERATED:BEGIN //////\n")
            g_file_cpp.write("////// DO     NOT     EDIT //////\n")
            to_cpp_setup()
            g_file_cpp.write("Node* %s_create()\n{\n" % g_filename)
            scene_obj.to_cpp(None,0,0)
            g_file_cpp.write("    return scene_0_0;\n}\n")
            g_file_cpp.write("////// AUTOGENERATED:END//////\n")

            # header file
            header = """
////// AUTOGENERATED:BEGIN //////
////// DO     NOT     EDIT //////
#pragma once

#include <cocos2d.h>

bool %s_init();
cocos2d::Node* %s_create();

////// AUTOGENERATED:END//////
""" % (g_filename, g_filename)
            g_file_h.write(header)


def help():
    print("%s v0.1 - parses Cocos Creator project files\n" % os.path.basename(sys.argv[0]))
    print("Example:\n%s --assetpath assets assets/myscene.fire" % os.path.basename(sys.argv[0]))
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
            run(f, assetpath)
    except getopt.GetoptError, e:
        print(e)

