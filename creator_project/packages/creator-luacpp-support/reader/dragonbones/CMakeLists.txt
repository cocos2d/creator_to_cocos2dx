set(LIB_NAME dragonbones)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/..
)

set(DRAGONBONES_HEADER
    DragonBonesHeaders.h
    textures/TextureData.h
    parsers/JSONDataParser.h
    parsers/DataParser.h
    core/BaseObject.h
    core/DragonBones.h
    armature/TransformObject.h
    armature/Bone.h
    armature/Armature.h
    armature/Slot.h
    armature/IArmatureDisplay.h
    animation/Animation.h
    animation/IAnimateble.h
    animation/BaseTimelineState.h
    animation/WorldClock.h
    animation/TimelineState.h
    animation/AnimationState.h
    cocos2dx/CCArmatureDisplay.h
    cocos2dx/CCTextureData.h
    cocos2dx/CCDragonBonesHeaders.h
    cocos2dx/CCFactory.h
    cocos2dx/CCSlot.h
    geom/Point.h
    geom/Matrix.h
    geom/Transform.h
    geom/Rectangle.h
    geom/ColorTransform.h
    factories/BaseFactory.h
    model/ArmatureData.h
    model/AnimationData.h
    model/TimelineData.h
    model/FrameData.h
    model/DragonBonesData.h
    events/EventObject.h
)

set(DRAGONBONES_SOURCE
    animation/Animation.cpp
    animation/AnimationState.cpp
    animation/TimelineState.cpp
    animation/WorldClock.cpp
    armature/Armature.cpp
    armature/Bone.cpp
    armature/Slot.cpp
    core/BaseObject.cpp
    events/EventObject.cpp
    factories/BaseFactory.cpp
    model/AnimationData.cpp
    model/ArmatureData.cpp
    model/DragonBonesData.cpp
    model/FrameData.cpp
    model/TimelineData.cpp
    parsers/DataParser.cpp
    parsers/JSONDataParser.cpp
    textures/TextureData.cpp
    cocos2dx/CCArmatureDisplay.cpp
    cocos2dx/CCFactory.cpp
    cocos2dx/CCSlot.cpp
    cocos2dx/CCTextureData.cpp
)

add_library(${LIB_NAME} ${DRAGONBONES_SOURCE} ${DRAGONBONES_HEADER})

set_target_properties(${LIB_NAME}
    PROPERTIES
    ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib"
    FOLDER "Internal"
)

if(XCODE OR VS)
    cocos_mark_code_files(${LIB_NAME})
endif()
