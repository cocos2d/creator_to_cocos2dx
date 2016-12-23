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
