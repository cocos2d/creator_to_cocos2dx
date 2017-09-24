<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Creator support for Cocos2d-x](#creator-support-for-cocos2d-x)
  - [Requirements](#requirements)
  - [Limitations](#limitations)
  - [Sample Project](#sample-project)
  - [How to generate the needed files](#how-to-generate-the-needed-files)
  - [Using it from C++](#using-it-from-c)
  - [Using it from lua](#using-it-from-lua)
  - [How to use CollisionManager](#how-to-use-collisionmanager)
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
* `RichText`: need cocos2d-x 3.16+ to support img tag, refer to [this issue](https://github.com/cocos2d/creator_to_cocos2dx/issues/41) for detail information
* `SpineSkeleton`
* `Widget`: only supports `AlignOnce`
* `Animations`: only supports linear animation
* `VideoPlayer`: iOS should add `MediaPlayer.framework` to the project
* `WebView`
* `Slider`
* `Toggle`
* `ToggleGroup`
* `PageView`
* `Mask`
* `Collider`
* `Prefab`

Supporting JavaScript scripts would be overkill. If you need JavaScript scripting
support, just use Creator.

## Sample project

Can fetch [this branch](https://github.com/minggo/cocos2d-x/tree/creator-cpp-support-test-v315) and run `cpp-empty-test`. The branch based on v3.15, don't forget to update external libraries.

Currently support on Mac, iOS and Android, will support more platforms quickly. Can just  modify project file to add cpp files in `reader` to support other platforms.


## How to generate the needed files

* download and install [Cocos Creator](http://www.cocos2d-x.org/download)
* use Cocos Creator to open __creator_project__
* click __Project -> LuaCPP Support -> Setup Target Project__
* fill in __Project Path__, it is a c++ or lua project created by cocos2d-x(3.14+) console
* click __Build__

You will find:

* all needed source codes are generated into `NATIVE_PROJECT_ROOT/Classes/reader(it is NATIVE_PROJECT_ROOT/frameworks/runtime-src/Classes/reader for lua project)`
* all needed resources are generated into `NATIVE_PROJECT_ROOT/Resources/creator(it is NATIVE_PROJECT_ROOT/frameworks/runtime-src/Resources/creator for lua project)`

## Header search path

Should add `reader` into header search path. If developing for Android, can just use existing `Android.mk`, for example, use the `Android.mk` into your game's `Android.mk` like this:

```
LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := MyGame_shared

LOCAL_MODULE_FILENAME := libMyGame

LOCAL_SRC_FILES := hellocpp/main.cpp \
                   ../../Classes/AppDelegate.cpp \
                   ../../Classes/HelloWorldScene.cpp

LOCAL_C_INCLUDES := $(LOCAL_PATH)/../../Classes

# _COCOS_HEADER_ANDROID_BEGIN
# _COCOS_HEADER_ANDROID_END


LOCAL_STATIC_LIBRARIES := cocos2dx_static
LOCAL_STATIC_LIBRARIES += creator_reader   # add dependence

# _COCOS_LIB_ANDROID_BEGIN
# _COCOS_LIB_ANDROID_END

include $(BUILD_SHARED_LIBRARY)

$(call import-module,.)
$(call import-module, ./../../Classes/reader)  # import module path
```

__If developing with Lua, then need to add `CreatorReaderBinding.cpp` into [plugin's Android.mk](https://github.com/cocos2d/creator_to_cocos2dx/blob/master/creator_project/packages/creator-luacpp-support/reader/Android.mk)__.

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

## How to use CollisionManager

`CollisionManager` is used to manage collisions. Every scene has an instance of `CollisionManager`. You can use it like this to listen collision events:

```c++
creator::CreatorReader* reader = creator::CreatorReader::createWithFilename("creator/CreatorSprites.ccreator");

// will create the needed spritesheets + design resolution
reader->setup();

// get the scene graph
Scene* scene = reader->getSceneGraph();

auto collisionManager = scene->getCollisionManager();
collisionManager->registerCollitionCallback([=](creator::Contract::CollisionType type,
                                                             creator::Collider* collider1,
                                                             creator::Collider* collider2) {
        if (type == creator::Contract::CollisionType::ENTER)
            colliderManager->enableDebugDraw(true);
        
        if (type == creator::Contract::CollisionType::EXIT)
            colliderManager->enableDebugDraw(false);
        
}, "");
```

More features of `CollisionManager` can refer to [the header file](https://github.com/cocos2d/creator_to_cocos2dx/tree/master/creator_project/packages/creator-luacpp-support/reader/collider/ColliderManager.h).

## Use the plugin in your Cocos Creator project

Currently, the plugin is not completed enough, so we don't put it into Cocos Creator plugin store. But you can copy `creator_project/packages/creator_luacpp_support` into `Cocos Creator project/packages`, then you will see the plugin in __Project -> LuaCPP Support__. 
