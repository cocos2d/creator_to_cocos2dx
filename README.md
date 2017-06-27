<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Creator support for Cocos2d-x](#creator-support-for-cocos2d-x)
  - [Requirements](#requirements)
  - [Limitations](#limitations)
  - [How to generate the needed files](#how-to-generate-the-needed-files)
  - [Using it from C++](#using-it-from-c)
  - [Using it from lua](#using-it-from-lua)
  - [Use the plugin in your Cocos Creator project](#use-the-plugin-in-your-cocos-creator-project)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Creator support for Cocos2d-x

## Requirements

* cocos2d-x: v3.14+
* Cocos Creator: v1.4+

## Limitations

Given that Creator uses a component based model to create its objects, and
cocos2d-x has its monolithic structure, it is only possible to support a limited
subset of Creator features.

Supported nodes:

* `Scene`
* `Sprite`
* `Canvas` (but only one per scene)
* `ScrollView`
* `Label`
* `EditBox`
* `ParticleSystem`
* `TiledMap`
* `Button`
* `ProgressBar`
* `RichText`: img tag is not supported
* `SpineSkeleton`
* `Widget`: only supports `AlignOnce`
* `Animations`: only supports linear animation


Supporting JavaScript scripts would be overkill. If you need JavaScript scripting
support, just use Creator.


## How to generate the needed files

* download and install [Cocos Creator](http://www.cocos2d-x.org/download)
* use Cocos Creator to open __creator_project__
* click __Project -> LuaCPP Support -> Setup Target Project__
* fill in __Project Path__, it is a c++ or lua project created by cocos2d-x(3.14+) console
* click __Build__

You will find:

* all needed source codes are generated into `NATIVE_PROJECT_ROOT/Classes/reader(it is NATIVE_PROJECT_ROOT/frameworks/runtime-src/Classes/reader for lua project)`
* all needed resources are generated into `NATIVE_PROJECT_ROOT/Resources/creator(it is NATIVE_PROJECT_ROOT/frameworks/runtime-src/Resources/creator for lua project)`

## Using it from C++

```c++
// mygame.cpp

#include "reader/CreatorReader.h"

void some_function()
{
    creator::CreatorReader* reader = creator::CreatorReader::createWithFilename("creator/CreatorSprites.ccreator");

    // will create the needed spritesheets + design resolution
    reader->setup();

    // get the scene graph
    Scene* scene = reader->getSceneGraph();

    // ...and use it
    Director::getInstance()->replaceScene(scene);
}
```


A working example can be found here:

* https://github.com/ricardoquesada/cocos2d-x/tree/creator_reader

Just run "cpp-tests" and select "CreatorTest"

## Using it from lua

Register creator binding codes in c++

```c++
#include "reader/CreatorReaderBinding.h"

...

register_all_creator_reader_manual(L);
```

Use in lua

```lua
local creatorReader = cc.CreatorReader:createWithFilename('creator/CreatorSprites.ccreator')
creatorReader:setup()
local scene = creatorReader:getSceneGraph()
cc.Director:getInstance():replaceScene(scene)
```

## Use the plugin in your Cocos Creator project

Currently, the plugin is not completed enough, so we don't put it into Cocos Creator plugin store. But you can copy `creator_project/packages/creator_luacpp_support` into `Cocos Creator project/packages`, then you will see the plugin in __Project -> LuaCPP Support__. 
