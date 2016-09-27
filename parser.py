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


__docformat__ = 'restructuredtext'

# Some globals (yeah!)

# the .fire file being parsed
g_json_data = []

# the .meta files that contain sprite frame info and other data
g_meta_data = {}

# contains the sprite frames: customized version of g_meta_data
# key is the uuid. value is the json container
g_sprite_frames = {}

# contains the textures used
# key is the uuid. value is the json container
g_textures = {}

# contains the data from library/uuid-to-mtime.json
g_uuid = {}



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
        known_components = ['cc.Label', 'cc.Sprite', 'cc.ParticleSystem', 'cc.TiledMap', 'cc.Canvas']
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

        self.add_property_size('setContentSize', "_contentSize")
        self.add_property_bool('setEnabled', "_enabled")
        self.add_property_str('setName', "_name")
        self.add_property_vec2('setAnchorPoint', "_anchorPoint")
        self.add_property_bool('setCascadeOpacityEnabled', "_cascadeOpacityEnabled")
        self.add_property_rgba('setColor', "_color")
        self.add_property_int('setGlobalZOrder', "_globalZOrder")
        self.add_property_int('setLocalZOrder', "_localZOrder")
        self.add_property_int('setOpacity', "_opacity" )
        self.add_property_bool('setOpacityModifyRGB', "_opacityModifyRGB" )
        self.add_property_vec2('setPosition', "_position")
        self.add_property_int('setRotationX', "_rotationX")
        self.add_property_int('setRotationY', "_rotationY")
        self.add_property_int('setScaleX', "_scaleX")
        self.add_property_int('setScaleY', "_scaleY")
        self.add_property_int('setSkewX', "_skewX")
        self.add_property_int('setSkewY', "_skewY")
        self.add_property_int('setTag', "_tag")


        self._cpp_node_name = ""
        self._cpp_parent_name = ""

    def add_property(self, newkey, value, keys_to_parse):
        if value in self._node_data:
            new_value = self._node_data.get(value)
            if keys_to_parse is not None:
                new_value = [new_value[k] for k in keys_to_parse]
            self._properties[newkey] = new_value

    def add_property_str(self, newkey, value):
        if value in self._node_data:
            new_value = self._node_data.get(value)
            self._properties[newkey] = '"' + new_value + '"'

    def add_property_size(self, newkey, value):
        if value in self._node_data:
            w = self._node_data.get(value)['width']
            h = self._node_data.get(value)['height']
            self._properties[newkey] = '%ff, %ff' % (w,h)

    def add_property_int(self, newkey, value):
        if value in self._node_data:
            i = self._node_data.get(value)
            self._properties[newkey] = i

    def add_property_vec2(self, newkey, value):
        if value in self._node_data:
            x = self._node_data.get(value)['x']
            y = self._node_data.get(value)['y']
            self._properties[newkey] = '%ff, %ff' % (x,y)

    def add_property_rgba(self, newkey, value):
        if value in self._node_data:
            r = self._node_data.get(value)['r']
            g = self._node_data.get(value)['g']
            b = self._node_data.get(value)['b']
            a = self._node_data.get(value)['a']
            self._properties[newkey] = '%d, %d, %d, %d' %(r,g,b,a)

    def add_property_bool(self, newkey, value):
        if value in self._node_data:
            b = str(self._node_data.get(value)).lower()
            self._properties[newkey] = b

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
        return "%s%s" % ('-' * tab, type(self).__name__)

    def to_cpp(self, parent, depth, sibling_idx):
        self.to_cpp_begin(depth, sibling_idx)
        self.to_cpp_properties()
        self.to_cpp_end(parent)

        for idx, child in enumerate(self._children):
            child.to_cpp(self, depth+1, idx)

    def to_cpp_begin(self, depth, sibling_idx):
        print("    // New node")
        self._cpp_node_name = "%s_%d_%d" % (type(self).__name__.lower(), depth, sibling_idx)
        print("    auto %s = %s::create();" % (self._cpp_node_name, type(self).__name__))

    def to_cpp_properties(self):
        for p in self._properties:
            value = self._properties[p]
            if type(value) == type([]):
                # if it is a list, remove the "[" and "]" from it before printing it
                value = str(value)[1:-1]
            elif type(value) == type(False):
                # convert True,False -> true,false
                value = str(value).lower()
            print("    %s->%s(%s);" % (self._cpp_node_name, p, value))

    def to_cpp_end(self, parent):
        if parent is not None:
            print("    %s->addChild(%s);" % (parent._cpp_node_name, self._cpp_node_name))
        print("")


class Scene(Node):
    def __init__(self, data):
        super(Scene, self).__init__(data)


class Sprite(Node):
    def __init__(self, data):
        super(Sprite, self).__init__(data)

    def parse_properties(self):
        super(Sprite, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.Sprite')
        sprite_frame_uuid = component['_spriteFrame']['__uuid__']
        # add name between ""
        self._properties['setSpriteFrame'] = '"' + g_sprite_frames[sprite_frame_uuid]['frameName'] + '"'

    def get_description(self, tab):
        return "%s%s('%s')" % ('-' * tab, type(self).__name__, self._properties['setSpriteFrame'])


class Label(Node):
    def __init__(self, data):
        super(Label, self).__init__(data)
        self._label_text = ""

    def parse_properties(self):
        super(Label, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.Label')
        self._label_text= component['_N$string']

    def get_description(self, tab):
        return "%s%s('%s')" % ('-' * tab, type(self).__name__, self._label_text)


class ParticleSystem(Node):
    def __init__(self, data):
        super(ParticleSystem, self).__init__(data)


class TiledMap(Node):
    def __init__(self, data):
        super(TiledMap, self).__init__(data)


class Canvas(Node):
    def __init__(self, data):
        super(Canvas, self).__init__(data)


def populate_meta_files(path):
    global g_meta_data, g_sprite_frames, g_textures
    metas = glob.glob(path + '/*.meta')
    for meta_filename in metas:
        with open(meta_filename) as fd:
            basename = os.path.basename(meta_filename)
            j_data = json.load(fd)
            g_meta_data[basename] = j_data

            # is this a sprite (.png) file ?
            if 'type' in j_data and j_data['type'] == 'sprite':
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


def populate_uuid_file(path):
    global g_uuid
    with open(path + '/../library/uuid-to-mtime.json') as data:
        g_uuid = json.load(data)


def run(filename):
    path = os.path.dirname(filename)
    populate_meta_files(path)
    populate_uuid_file(path)

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
            scene_obj.print_scene_graph(0)
            scene_obj.to_cpp(None,0,0)


def help():
    print("%s v0.1 - parses Cocos Creator project files\n" % os.path.basename(sys.argv[0]))
    print("Example:\n%s assets/myscene.fire" % os.path.basename(sys.argv[0]))
    sys.exit(-1)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        help()

    for f in sys.argv[1:]:
        run(f)
