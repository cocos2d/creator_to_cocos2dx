/****************************************************************************
 Copyright (c) 2017 Chukong Technologies Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

#pragma once

#include "cocos2d.h"
#include "ui/CocosGUI.h"
#include "AnimationClip.h"
#include <spine/spine-cocos2dx.h>

#include "CreatorReader_generated.h"

#ifdef __cplusplus
#define NS_CCR_BEGIN                     namespace creator {
#define NS_CCR_END                       }
#define USING_NS_CCR                     using namespace creator
#else
#define NS_CC_BEGIN
#define NS_CC_END
#define USING_NS_CC
#define NS_CC
#endif

NS_CCR_BEGIN

class CreatorReader: public cocos2d::Ref
{
public:
    static CreatorReader* createWithFilename(const std::string& filename);


    /**
     Returns the scenegraph contained in the .ccreator file
     @return A `Scene*`
     */
    cocos2d::Scene* getSceneGraph() const;


    /**
     Returns the FlatBuffers Schema version.
     @return a string containing the flatbuffer's schema version
     */
    std::string getVersion() const;

    /**
     Setup the needed spritesheets and change the design resolution if needed.
     Call it before getting the Scene graph
     */
    void setup();

protected:
    CreatorReader();
    ~CreatorReader();
    bool initWithFilename(const std::string& filename);

    cocos2d::Node* createTree(const buffers::NodeTree* treeBuffer) const;

    cocos2d::Scene* createScene(const buffers::Scene* sceneBuffer) const;
    void parseScene(cocos2d::Scene* scene, const buffers::Scene* sceneBuffer) const;

    cocos2d::Node* createNode(const buffers::Node* nodeBuffer) const;
    void parseNode(cocos2d::Node* node, const buffers::Node* nodeBuffer) const;

    cocos2d::Sprite* createSprite(const buffers::Sprite* spriteBuffer) const;
    void parseSprite(cocos2d::Sprite* sprite, const buffers::Sprite* spriteBuffer) const;

    cocos2d::TMXTiledMap* createTileMap(const buffers::TileMap* tilemapBuffer) const;
    void parseTilemap(cocos2d::TMXTiledMap* tilemap, const buffers::TileMap* tilemapBuffer) const;

    cocos2d::Label* createLabel(const buffers::Label* labelBuffer) const;
    void parseLabel(cocos2d::Label* label, const buffers::Label* labelBuffer) const;

    cocos2d::ui::RichText* createRichText(const buffers::RichText* richTextBuffer) const;
    void parseRichText(cocos2d::ui::RichText* richText, const buffers::RichText* richTextBuffer) const;

    cocos2d::ParticleSystemQuad* createParticle(const buffers::Particle* particleBuffer) const;
    void parseParticle(cocos2d::ParticleSystemQuad* partile, const buffers::Particle* particleBuffer) const;

    cocos2d::ui::ScrollView* createScrollView(const buffers::ScrollView* scrollViewBuffer) const;
    void parseScrollView(cocos2d::ui::ScrollView* scrollView, const buffers::ScrollView* scrollViewBuffer) const;

    cocos2d::ui::LoadingBar* createProgressBar(const buffers::ProgressBar* progressBarBuffer) const;
    void parseProgressBar(cocos2d::ui::LoadingBar* progressBar, const buffers::ProgressBar* progressBarBuffer) const;

    cocos2d::ui::EditBox* createEditBox(const buffers::EditBox* editBoxBuffer) const;
    void parseEditBox(cocos2d::ui::EditBox* editBox, const buffers::EditBox* editBoxBuffer) const;

    cocos2d::ui::Button* createButton(const buffers::Button* buttonBuffer) const;
    void parseButton(cocos2d::ui::Button* button, const buffers::Button* buttonBuffer) const;

    spine::SkeletonAnimation* createSpineSkeleton(const buffers::SpineSkeleton* spineBuffer) const;
    void parseSpineSkeleton(spine::SkeletonAnimation* button, const buffers::SpineSkeleton* spineBuffer) const;

    void setupSpriteFrames();
    void setupAnimClips();

    template <typename T, typename U>
    void setupAnimClipsPropVec2(T fbPropList, U& proplist);
    
    template <typename T, typename U>
    void setupAnimClipsPropValue(T fbPropList, U& proplist);

    template <typename T, typename U>
    void setupAnimClipsPropColor(T fbPropList, U& proplist);


    /** Creator uses parent's anchorpoint for child positioning.
     cocos2d-x uses parent's (0,0) for child positioning
     this function adjust that */
    void adjustPosition(cocos2d::Node* node) const;

    // variables
    cocos2d::Scene* _scene;
    cocos2d::Data _data;
    std::string _version;

    cocos2d::Map<std::string, AnimationClip*> _clips;
};

NS_CCR_END
