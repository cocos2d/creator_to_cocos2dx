#!/usr/bin/python
# ----------------------------------------------------------------------------
# Parses Cocos Creator projecs
# ----------------------------------------------------------------------------
'''
Little tool to display SID info
'''
from __future__ import division, unicode_literals, print_function
import sys
import os
import json
from pprint import pprint


__docformat__ = 'restructuredtext'


class Node:
    def __init__(self, data, parser):
        self._position = data["_position"]
        self._anchor_point = data["_anchorPoint"]
        self._color = data["_color"]
        self._content_size = data["_contentSize"]

    def parse_properties(self, data):
        pass

class Scene(Node):
    def __init__(self, data, parser):
        super.__init__(self, data, parser)

class Sprite(Node):
    def __init__(self, data, parser):
        super.__init__(self, data, parser)

class ParticleSystem(Node):
    def __init__(self, data, parser):
        super.__init__(self, data, parser)

class Label(Node):
    def __init__(self, data, parser):
        super.__init__(self, data, parser)

class TiledMap(Node):
    def __init__(self, data, parser):
        super.__init__(self, data, parser)


class FireParser:
    def __init__(self, filename)
        self.components_idx = []
        self.nodes_idx = []
        self.filename = filename
        self.json_data = []

    def parse(self):
        with open(self.filename) as data_file:
            self.json_data = json.load(data_file)

        print("total elements: %d" % len(data))
        for i,obj in enumerate(self.json_data):
            if obj["__type__"] == "cc.SceneAsset":
                scene_idx = parse_scene_asset(obj)
                self.create_scene(scene_idx)

    def parse_scene_asset(self, obj):
        scenes = obj["scene"]
        return scenes["__id__"]

    def create_scene(self, scene_idx):
        scene = Scene(self.json_data[scene_idx], self)


def run(filename):
    a = FileParser(filename)
    a.parse()


def help():
    print("%s v0.1 - parses Cocos Creator project files\n" % os.path.basename(sys.argv[0]))
    print("Example:\n%s assets/myscene.fire" % os.path.basename(sys.argv[0]))
    sys.exit(-1)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        help()

    for f in sys.argv[1:]:
        run(f)
