# Creator support for Cocos2d-x

## Limitations

Given that Creator uses a component based model to create its objects, and
cocos2d-x has its monolithic structure, it is only possible to support a limited
subset of Creator features.

Supported nodes:

* Scene
* Sprites
* Canvas (but only one per scene)
* ScrollView
* Label
* EditBox
* Particles
* Tiled maps
* Button
* ProgressBar (experimental support: unfinished)
* RichText (experimental support: unfinished)


Animations and other nodes are planned.

Supporting JavaScript scripts would be overkill. If you need JavaScript scripting
support, just use Creator.


## How to generate the needed files


1. Convert the .fire files into .json files
2. Compile the newly generated .json files into flatbuffer files
3. Copy the generated files to your project
4. Copy the needed assets to your project


### From .fire to .json

The Python script to convert .fire to .json is called:

* [convert_fire_to_json.py](https://github.com/ricardoquesada/creator_to_cocos2d/blob/master/convert_fire_to_json.py)

And can be downloaded from this repository:

* https://github.com/ricardoquesada/creator_to_cocos2d

<small>The respository also includes a Creator project that is used for testing</small>


How to use it:

./convert_fire_to_json.py \[--cocospath path\] \[--creatorassets\] fire_files_to_parse





