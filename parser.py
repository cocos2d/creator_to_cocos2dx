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

        self._contentSize = data.get("_contentSize", {'width':0, 'height':0})
        self._enabled = data.get("_enabled", True)
        self._name = data.get("_name", "")
        self._anchorPoint = data.get("_anchorPoint", {'x':0, 'y':0})
        self._cascadeOpacityEnabled= data.get("_cascadeOpacityEnabled", True)
        self._color = data.get("_color", {'r':255, 'g':255, 'b':255, 'a':255})
        self._globalZOrder = data.get("_globalZOrder", 0)
        self._localZOrder = data.get("_localZOrder", 0)
        self._opacity = data.get("_opacity", 255)
        self._opacityModifyRGB = data.get("_opacityModifyRGB", False)
        self._position = data.get("_position", {'x':0, 'y':0})
        self._rotationX = data.get("_rotationX", 0)
        self._rotationY = data.get("_rotationY", 0)
        self._scaleX = data.get("_scaleX", 0)
        self._scaleY = data.get("_scaleY", 0)
        self._skewX = data.get("_skewX", 0)
        self._tag = data.get("_tag", -1)


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


class Scene(Node):
    def __init__(self, data):
        super(Scene, self).__init__(data)


class Sprite(Node):
    def __init__(self, data):
        super(Sprite, self).__init__(data)
        self._sprite_frame = ""

    def parse_properties(self):
        super(Sprite, self).parse_properties()

        # search for sprite frame name
        component = Node.get_node_component_of_type(self._node_data, 'cc.Sprite')
        sprite_frame_uuid = component['_spriteFrame']['__uuid__']
        self._sprite_frame = g_sprite_frames[sprite_frame_uuid]

    def get_description(self, tab):
        return "%s%s('%s')" % ('-' * tab, type(self).__name__, self._sprite_frame['frameName'])


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


def help():
    print("%s v0.1 - parses Cocos Creator project files\n" % os.path.basename(sys.argv[0]))
    print("Example:\n%s assets/myscene.fire" % os.path.basename(sys.argv[0]))
    sys.exit(-1)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        help()

    for f in sys.argv[1:]:
        run(f)
