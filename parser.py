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

# Some globals (yeah!)
__components_idx = []
__nodes_idx = []
__filename = ""
__json_data = []

class Node(object):
    def __init__(self, data):
        self._node_data = data
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

    def parse_properties(self):
        for child in self._node_data["_children"]:
            print(child)

class Scene(Node):
    def __init__(self, data):
        super(Scene, self).__init__(data)

class Sprite(Node):
    def __init__(self, data):
        super(Sprite, self).__init__(data)


def run(filename):
    with open(filename) as data_file:
        __json_data = json.load(data_file)

    print("total elements: %d" % len(__json_data))
    for i,obj in enumerate(__json_data):
        if obj["__type__"] == "cc.SceneAsset":
            scenes = obj["scene"]
            scene_idx = scenes["__id__"]
            scene_obj = Scene(__json_data[scene_idx])
            scene_obj.parse_properties()


def help():
    print("%s v0.1 - parses Cocos Creator project files\n" % os.path.basename(sys.argv[0]))
    print("Example:\n%s assets/myscene.fire" % os.path.basename(sys.argv[0]))
    sys.exit(-1)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        help()

    for f in sys.argv[1:]:
        run(f)
