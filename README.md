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


#### How to use it:

./convert_fire_to_json.py \[--cocospath path\] \[--creatorassets\] fire_files_to_parse

* --cocospath: where the assets should be loaded in the cocos2d-x project. It will prepend this path to all the creator assets
* --creatorassets: where the default Creator assets are located. Usually they are in the `temp` directory of the project's root folder
* fire_files_to_parse: it could be one more multiple files. Glob patters are supported

Example:

```sh
# should load assets from Resources folder in the game
# Creator default assets are in temp
# The .fire files are located in assets
./convert_fire_to_json.py --cocospath Resources --creatorassets temp assets/*.fire
```

This Github respository also includes a Creator project that is used for testing. For example, this should work:

```
./convert_fire_to_json.py --cocospath Resources --creatorassets creator_project/temp creator_project/assets/*.fire
```

The generated .json files will be placed in a folder named "json"


### From .json to binary files

The JSON files are only generated as a temporary file format. It will not be efficient to parse JSON files
in a game.

Instead a binary file based on [Flatbuffers](https://google.github.io/flatbuffers/) will be used instead

In order to generate the binary files, the following are needed:

* the schema (.fbs) file
* that `flatc` (flatbuffer) compiler



