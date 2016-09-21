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
from pprint import pprint


__docformat__ = 'restructuredtext'

# Some globals (yeah!)
g_json_data = []


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
        try:
            self._position = data["_position"]
        except KeyError, e:
            self._position = {'x':0, 'y':0}

        try:
            self._anchor_point = data["_anchorPoint"]
        except KeyError, e:
            self._anchor_point = {'x':0, 'y':0}
        try:
            self._color = data["_color"]
        except KeyError, e:
            self._color = {'r':255, 'g':255, 'b':255, 'a':255}

        try:
            self._content_size = data["_contentSize"]
        except KeyError, e:
            self._content_size = {'width':0, 'height':0}

        try:
            self._local_z_order = data["_localZOrder"]
        except KeyError, e:
            self._local_z_order = 0

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
        self.print_description(tab)
        for child in self._children:
            child.print_scene_graph(tab+2)

    def print_description(self, tab):
        print('-' * tab, end="")
        print(type(self).__name__)


class Scene(Node):
    def __init__(self, data):
        super(Scene, self).__init__(data)


class Sprite(Node):
    def __init__(self, data):
        super(Sprite, self).__init__(data)


class Label(Node):
    def __init__(self, data):
        super(Label, self).__init__(data)


class ParticleSystem(Node):
    def __init__(self, data):
        super(ParticleSystem, self).__init__(data)


class TiledMap(Node):
    def __init__(self, data):
        super(TiledMap, self).__init__(data)


class Canvas(Node):
    def __init__(self, data):
        super(Canvas, self).__init__(data)


def run(filename):
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
