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

#include "CreatorReader.h"
#include "AnimationClip.h"
#include "AnimateClip.h"

#include "CreatorReader_generated.h"

using namespace cocos2d;
using namespace creator;
using namespace creator::buffers;

USING_NS_CCR;

static void setSpriteQuad(V3F_C4B_T2F_Quad* quad, const cocos2d::Size& origSize, const int x, const int y, float x_factor, float y_factor);
static void tileSprite(cocos2d::Sprite* sprite);

//
// CreatorReader main class
//
CreatorReader::CreatorReader()
: _scene(nullptr)
, _version("")
{
}

CreatorReader::~CreatorReader()
{
    CC_SAFE_RELEASE(_scene);
}

CreatorReader* CreatorReader::createWithFilename(const std::string& filename)
{
    CreatorReader* reader = new(std::nothrow) CreatorReader;
    if (reader && reader->initWithFilename(filename)) {
        reader->autorelease();
        return reader;
    }
    return nullptr;
}

bool CreatorReader::initWithFilename(const std::string& filename)
{
    FileUtils* fileUtils = FileUtils::getInstance();

    const std::string& fullpath = fileUtils->fullPathForFilename(filename);
    if (fullpath.size() == 0)
    {
        CCLOG("CreatorReader: file not found: %s", filename.c_str());
        return false;
    }

    _data = fileUtils->getDataFromFile(fullpath);

    const void* buffer = _data.getBytes();
    auto sceneGraph = GetSceneGraph(buffer);
    _version = sceneGraph->version()->str();
    return true;
}

void CreatorReader::setup()
{
    const void* buffer = _data.getBytes();
    auto sceneGraph = GetSceneGraph(buffer);

    const auto& designResolution = sceneGraph->designResolution();
    const auto& fitWidth = sceneGraph->resolutionFitWidth();
    const auto& fitHeight = sceneGraph->resolutionFitHeight();

    auto director = cocos2d::Director::getInstance();
    auto glview = director->getOpenGLView();
    const auto& frameSize = glview->getFrameSize();

    if (fitWidth && fitHeight) {
        glview->setDesignResolutionSize(designResolution->w(), designResolution->h(), ResolutionPolicy::EXACT_FIT);
    } else if (fitHeight) {
        const float w = frameSize.width / (frameSize.height / designResolution->h());
        const float h = frameSize.height / (frameSize.height / designResolution->h());
        glview->setDesignResolutionSize(w, h, ResolutionPolicy::NO_BORDER);
    } else if (fitWidth) {
        const float w = frameSize.width / (frameSize.width / designResolution->w());
        const float h = frameSize.height / (frameSize.width / designResolution->w());
        glview->setDesignResolutionSize(w, h, ResolutionPolicy::NO_BORDER);
    }else {
        if (designResolution)
            glview->setDesignResolutionSize(designResolution->w(), designResolution->h(), ResolutionPolicy::NO_BORDER);
    }

    setupSpriteFrames();
    setupAnimClips();
}

void CreatorReader::setupAnimClips()
{
    const void* buffer = _data.getBytes();
    const auto& sceneGraph = GetSceneGraph(buffer);
    const auto& animationClips = sceneGraph->animationClips();

    for (const auto& fbAnimationClip: *animationClips) {
        auto animClip = AnimationClip::create();

        const auto& duration = fbAnimationClip->duration();
        animClip->setDuration(duration);

        const auto& speed = fbAnimationClip->speed();
        animClip->setSpeed(speed);

        const auto& sample = fbAnimationClip->sample();
        animClip->setSample(sample);

        const auto& name = fbAnimationClip->name();
        animClip->setName(name->str());

        const auto& uuid = fbAnimationClip->uuid();
        animClip->setUUID(uuid->str());

        const AnimCurveData* fbCurveData = fbAnimationClip->curveData();
        if (fbCurveData) {
            const AnimProps* fbAnimProps = fbCurveData->props();
            if (fbAnimProps) {

                AnimProperties properties;

                // position
                setupAnimClipsPropVec2(fbAnimProps->position(), properties.animPosition);

                // position X
                setupAnimClipsPropValue(fbAnimProps->positionX(), properties.animPositionX);

                // position Y
                setupAnimClipsPropValue(fbAnimProps->positionY(), properties.animPositionY);

                // rotation
                setupAnimClipsPropValue(fbAnimProps->rotation(), properties.animRotation);

                // skew X
                setupAnimClipsPropValue(fbAnimProps->skewX(), properties.animSkewX);

                // skew Y
                setupAnimClipsPropValue(fbAnimProps->skewY(), properties.animSkewY);

                // scaleX
                setupAnimClipsPropValue(fbAnimProps->scaleX(), properties.animScaleX);
                
                // scaleY
                setupAnimClipsPropValue(fbAnimProps->scaleY(), properties.animScaleY);

                // Color
                setupAnimClipsPropColor(fbAnimProps->color(), properties.animColor);
                
                // opacity
                 setupAnimClipsPropValue(fbAnimProps->opacity(), properties.animOpacity);
                
                // anchor x
                setupAnimClipsPropValue(fbAnimProps->anchorX(), properties.animAnchorX);
                
                // anchor y
                setupAnimClipsPropValue(fbAnimProps->anchorY(), properties.animAnchorY);

                animClip->setAnimProperties(properties);
                // using UUID intead of Name for key
                _clips.insert(animClip->getUUID(), animClip);
            }
        }
    }
}

template <typename T, typename U>
void CreatorReader::setupAnimClipsPropValue(T fbPropList, U& proplist)
{
    if (fbPropList) {
        for(const auto fbProp: *fbPropList) {
            const auto fbFrame = fbProp->frame();
            const auto fbValue = fbProp->value();
            proplist.push_back(
                               {fbFrame,
                                   fbValue
                               });
        }
    }
}

template <typename T, typename U>
void CreatorReader::setupAnimClipsPropVec2(T fbPropList, U& proplist)
{
    if (fbPropList) {
        for(const auto fbProp: *fbPropList) {
            const auto fbFrame = fbProp->frame();
            const auto fbValue = fbProp->value();
            proplist.push_back(
                               {fbFrame,
                                cocos2d::Vec2(fbValue->x(), fbValue->y())
                               });
        }
    }
}

template <typename T, typename U>
void CreatorReader::setupAnimClipsPropColor(T fbPropList, U& proplist)
{
    if (fbPropList) {
        for(const auto fbProp: *fbPropList) {
            const auto fbFrame = fbProp->frame();
            const auto fbValue = fbProp->value();
            proplist.push_back(
                               {fbFrame,
                                cocos2d::Color3B(fbValue->r(), fbValue->g(), fbValue->b())
                               });
        }
    }
}

void CreatorReader::setupSpriteFrames()
{
    const void* buffer = _data.getBytes();
    const auto& sceneGraph = GetSceneGraph(buffer);
    const auto& spriteFrames = sceneGraph->spriteFrames();
    auto frameCache = cocos2d::SpriteFrameCache::getInstance();

    if (spriteFrames) {
        for (const auto& spriteFrame: *spriteFrames) {
            const auto& name = spriteFrame->name()->str();
            const auto& filename = spriteFrame->texturePath()->str();
            const auto& rect = spriteFrame->rect();
            const auto& rotated = spriteFrame->rotated();
            const auto& offset = spriteFrame->offset();
            const auto& originalSize = spriteFrame->originalSize();

            auto sf = cocos2d::SpriteFrame::create(filename,
                                                   cocos2d::Rect(rect->x(), rect->y(), rect->w(), rect->h()),
                                                   rotated,
                                                   cocos2d::Vec2(offset->x(), offset->y()),
                                                   cocos2d::Size(originalSize->w(), originalSize->h())
                                                   );

            const auto& centerRect = spriteFrame->centerRect();
            if (sf && centerRect) {
                sf->setCenterRectInPixels(cocos2d::Rect(centerRect->x(), centerRect->y(), centerRect->w(), centerRect->h()));
            }

            if (sf) {
                frameCache->addSpriteFrame(sf, name);
                CCLOG("Adding sprite frame: %s", name.c_str());
            }
        }
    }
}

cocos2d::Scene* CreatorReader::getSceneGraph() const
{
    const void* buffer = _data.getBytes();

    auto sceneGraph = GetSceneGraph(buffer);
    auto nodeTree = sceneGraph->root();
    CCLOG("NodeTree: %p", nodeTree);

    cocos2d::Node* node = createTree(nodeTree);

    return static_cast<cocos2d::Scene*>(node);
}

std::string CreatorReader::getVersion() const
{
    return _version;
}

cocos2d::Node* CreatorReader::createTree(const buffers::NodeTree* tree) const
{
    cocos2d::Node *node = nullptr;
    bool treat_child_as_label = false;

    const void* buffer = tree->object();
    buffers::AnyNode bufferType = tree->object_type();
    
    switch (bufferType) {
        case buffers::AnyNode_NONE:
            break;
        case buffers::AnyNode_Node:
            node = createNode(static_cast<const buffers::Node*>(buffer));
            break;
        case buffers::AnyNode_Label:
            node = createLabel(static_cast<const buffers::Label*>(buffer));
            break;
        case buffers::AnyNode_RichText:
            node = createRichText(static_cast<const buffers::RichText*>(buffer));
            break;
        case buffers::AnyNode_Sprite:
            node = createSprite(static_cast<const buffers::Sprite*>(buffer));
            break;
        case buffers::AnyNode_TileMap:
            node = createTileMap(static_cast<const buffers::TileMap*>(buffer));
            break;
        case buffers::AnyNode_Particle:
            node = createParticle(static_cast<const buffers::Particle*>(buffer));
            break;
        case buffers::AnyNode_Scene:
            node = createScene(static_cast<const buffers::Scene*>(buffer));
            break;
        case buffers::AnyNode_ScrollView:
            node = createScrollView(static_cast<const buffers::ScrollView*>(buffer));
            break;
        case buffers::AnyNode_ProgressBar:
            node = createProgressBar(static_cast<const buffers::ProgressBar*>(buffer));
            break;
        case buffers::AnyNode_Button:
            node = createButton(static_cast<const buffers::Button*>(buffer));
            treat_child_as_label = true;
            break;
        case buffers::AnyNode_EditBox:
            node = createEditBox(static_cast<const buffers::EditBox*>(buffer));
            break;
        case buffers::AnyNode_CreatorScene:
            break;
        case buffers::AnyNode_SpineSkeleton:
            node = createSpineSkeleton(static_cast<const buffers::SpineSkeleton*>(buffer));
            break;
    }

    // recursively add its children
    const auto& children = tree->children();
    for(const auto& childBuffer: *children) {
        cocos2d::Node* child = createTree(childBuffer);
        if (child && node)  {
            if (!treat_child_as_label) {
                // every node should do this
                node->addChild(child);
                adjustPosition(child);
            } else {
                // ...except if for Buttons
                auto button = static_cast<cocos2d::ui::Button*>(node);
                auto label = static_cast<cocos2d::Label*>(child);
                button->setTitleLabel(label);
            }
        }
    }

    return node;
}

/*=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
 *
 * Render Nodes
 *
 *=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
cocos2d::Scene* CreatorReader::createScene(const buffers::Scene* sceneBuffer) const
{
    cocos2d::Scene* scene = cocos2d::Scene::create();
    return scene;
}

void CreatorReader::parseScene(cocos2d::Scene* scene, const buffers::Scene* sceneBuffer) const
{

}

cocos2d::Node* CreatorReader::createNode(const buffers::Node* nodeBuffer) const
{
    cocos2d::Node* node = cocos2d::Node::create();
    if (node)
        parseNode(node, nodeBuffer);
    return node;
}

void CreatorReader::parseNode(cocos2d::Node* node, const buffers::Node* nodeBuffer) const
{
    //contentSize:Size;
    //enabled:bool = true;
    //name:string;
    //anchorPoint:Vec2;
    //cascadeOpacityEnabled:bool = true;
    //color:ColorRGB;
    //globalZorder:int = 0;
    //localZorder:int = 0;
    //opacity:ubyte = 255;
    //opacityModifyRGB:bool = true;
    //position:Vec2;
    //rotationSkew:Vec2;
    //scale:Vec2;
    //tag:int = 0;
    //anim:AnimationRef

//    auto enabled = nodeBuffer->enabled();
    const auto& globalZOrder = nodeBuffer->globalZOrder();
    node->setGlobalZOrder(globalZOrder);
    const auto& localZOrder = nodeBuffer->localZOrder();
    node->setLocalZOrder(localZOrder);
    const auto& name = nodeBuffer->name();
    if (name) node->setName(name->str());
    const auto& anchorPoint = nodeBuffer->anchorPoint();
    if (anchorPoint) node->setAnchorPoint(cocos2d::Vec2(anchorPoint->x(), anchorPoint->y()));
    const auto& color = nodeBuffer->color();
    if (color) node->setColor(cocos2d::Color3B(color->r(), color->g(), color->b()));
    const auto& opacity = nodeBuffer->opacity();
    node->setOpacity(opacity);
    const auto& cascadeOpacityEnabled = nodeBuffer->cascadeOpacityEnabled();
    node->setCascadeOpacityEnabled(cascadeOpacityEnabled);
    const auto& opacityModifyRGB = nodeBuffer->opacityModifyRGB();
    node->setOpacityModifyRGB(opacityModifyRGB);
    const auto position = nodeBuffer->position();
    if (position) node->setPosition(position->x(), position->y());
    node->setRotationSkewX(nodeBuffer->rotationSkewX());
    node->setRotationSkewY(nodeBuffer->rotationSkewY());
    node->setScaleX(nodeBuffer->scaleX());
    node->setScaleY(nodeBuffer->scaleY());
    node->setSkewX(nodeBuffer->skewX());
    node->setSkewY(nodeBuffer->skewY());
    const auto& tag = nodeBuffer->tag();
    node->setTag(tag);
    const auto contentSize = nodeBuffer->contentSize();
    if (contentSize) node->setContentSize(cocos2d::Size(contentSize->w(), contentSize->h()));

    // animation?
    const auto animRef = nodeBuffer->anim();
    if (animRef) {
        const auto def = animRef->defaultClip();
        const auto autoplay = animRef->playOnLoad();
        if (def && autoplay) {
            const auto& key = def->str();
            AnimationClip* animationClip = _clips.at(key);
            if (animationClip) {
                AnimateClip* animateClip = AnimateClip::createWithAnimationClip(animationClip);
                node->runAction(animateClip);
            } else {
                CCLOG("CreatorReader: AnimationClip key not found: %s", key.c_str());
            }
        }
    }
}

cocos2d::Sprite* CreatorReader::createSprite(const buffers::Sprite* spriteBuffer) const
{
    cocos2d::Sprite* sprite = cocos2d::Sprite::create();
    if (sprite)
        parseSprite(sprite, spriteBuffer);
    return sprite;
}

void CreatorReader::parseSprite(cocos2d::Sprite* sprite, const buffers::Sprite* spriteBuffer) const
{
    // order is important:
    // 1st: set sprite frame
    const auto& frameName = spriteBuffer->spriteFrameName();
    if (frameName)
        sprite->setSpriteFrame(frameName->str());

    
    // 2nd: node properties
    const auto& nodeBuffer = spriteBuffer->node();
    parseNode(sprite, nodeBuffer);


    // 3rd: sprite type
    const auto& spriteType = spriteBuffer->spriteType();
    switch (spriteType) {
        case buffers::SpriteType_Simple:
            sprite->setCenterRectNormalized(cocos2d::Rect(0,0,1,1));
            break;
        case buffers::SpriteType_Tiled:
            tileSprite(sprite);
            break;
        case buffers::SpriteType_Filled:
        case buffers::SpriteType_Sliced:
            break;
    }

    const auto& srcBlend = spriteBuffer->srcBlend();
    const auto& dstBlend = spriteBuffer->dstBlend();
    cocos2d::BlendFunc blendFunc;
    blendFunc.src = srcBlend;
    blendFunc.dst = dstBlend;
    sprite->setBlendFunc(blendFunc);

#if 0
    // FIXME: do something with these values
    const auto& isTrimmed = spriteBuffer->trimEnabled();
    const auto& sizeMode = spriteBuffer->sizeMode();
#endif
}

cocos2d::TMXTiledMap* CreatorReader::createTileMap(const buffers::TileMap* tilemapBuffer) const
{
    const auto& tmxfilename = tilemapBuffer->tmxFilename();
    cocos2d::TMXTiledMap* tilemap = TMXTiledMap::create(tmxfilename->str());
    if (tilemap)
        parseTilemap(tilemap, tilemapBuffer);
    return tilemap;
}

void CreatorReader::parseTilemap(cocos2d::TMXTiledMap* tilemap, const buffers::TileMap* tilemapBuffer) const
{
    const auto& nodeBuffer = tilemapBuffer->node();
    parseNode(tilemap, nodeBuffer);

    // calculate scale. changing the contentSize in TMX doesn't affect its visual size
    // so we have to re-scale the map
    const auto& desiredSize = tilemapBuffer->desiredContentSize();
    const auto& currentSize = tilemap->getContentSize();

    float wr = desiredSize->w() / currentSize.width;
    float hr = desiredSize->h() / currentSize.height;

    float sx = tilemap->getScaleX();
    float sy = tilemap->getScaleY();

    tilemap->setScaleX(wr * sx);
    tilemap->setScaleY(hr * sy);
}

cocos2d::Label* CreatorReader::createLabel(const buffers::Label* labelBuffer) const
{
    cocos2d::Label* label = nullptr;
    auto text = labelBuffer->labelText();
    auto fontSize = labelBuffer->fontSize();
    auto fontName = labelBuffer->fontName();

    auto fontType = labelBuffer->fontType();
    switch (fontType) {
        case buffers::FontType_TTF:
            label = cocos2d::Label::createWithTTF(text->str(), fontName->str(), fontSize);
            break;
        case buffers::FontType_BMFont:
            label = cocos2d::Label::createWithBMFont(fontName->str(), text->str());
            if (label)
                label->setBMFontSize(fontSize);
            break;
        case buffers::FontType_System:
            label = cocos2d::Label::createWithSystemFont(text->str(), fontName->str(), fontSize);
            break;
    }

    if (label)
        parseLabel(label, labelBuffer);
    return label;
}

void CreatorReader::parseLabel(cocos2d::Label* label, const buffers::Label* labelBuffer) const
{
    const auto& nodeBuffer = labelBuffer->node();
    parseNode(label, nodeBuffer);

    const auto& lineHeight = labelBuffer->lineHeight();
    const auto& verticalA = labelBuffer->verticalAlignment();
    const auto& horizontalA = labelBuffer->horizontalAlignment();
    const auto& overflowType = labelBuffer->overflowType();
    const auto& enableWrap = labelBuffer->enableWrap();

    if (labelBuffer->fontType() != FontType_System)
        label->setLineHeight(lineHeight);
    label->setVerticalAlignment(static_cast<cocos2d::TextVAlignment>(verticalA));
    label->setHorizontalAlignment(static_cast<cocos2d::TextHAlignment>(horizontalA));
    label->setOverflow(static_cast<cocos2d::Label::Overflow>(overflowType));
    label->enableWrap(enableWrap);
}

cocos2d::ui::RichText* CreatorReader::createRichText(const buffers::RichText* richTextBuffer) const
{
    cocos2d::ui::RichText* richText = nullptr;
    const auto& text = richTextBuffer->text();
    if (text)
        richText = cocos2d::ui::RichText::createWithXML(text->str());
    else
        richText = cocos2d::ui::RichText::create();
    parseRichText(richText, richTextBuffer);
    return richText;
}

void CreatorReader::parseRichText(cocos2d::ui::RichText* richText, const buffers::RichText* richTextBuffer) const
{
    // FIXME: EXPERIMENTAL SUPPORT
    // Creator's RichText uses a different format than Cocos2d-x's RichText
    // Having 100% compatibility is feaseble, but not easy.

    const auto& nodeBuffer = richTextBuffer->node();
    parseNode(richText, nodeBuffer);

    // text:string;
    // horizontalAlignment:HorizontalAlignment;
    // fontSize:int;
    // maxWidth:int;
    // lineHeight:int;
    // fontFilename:string;

    const auto& fontSize = richTextBuffer->fontSize();
    richText->setFontSize(fontSize);
    const auto& lineHeight = richTextBuffer->lineHeight();
    richText->setVerticalSpace(lineHeight);
    const auto& fontFilename = richTextBuffer->fontFilename();
    if (fontFilename) richText->setFontFace(fontFilename->str());

//    richText->ignoreContentAdaptWithSize(false);
}

cocos2d::ParticleSystemQuad* CreatorReader::createParticle(const buffers::Particle* particleBuffer) const
{
    const auto& particleFilename = particleBuffer->particleFilename();
    cocos2d::ParticleSystemQuad* particle = cocos2d::ParticleSystemQuad::create(particleFilename->str());
    if (particle)
        parseParticle(particle, particleBuffer);
    return particle;
}

void CreatorReader::parseParticle(cocos2d::ParticleSystemQuad* particle, const buffers::Particle* particleBuffer) const
{
    const auto& nodeBuffer = particleBuffer->node();
    parseNode(particle, nodeBuffer);
}

/*=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
 *
 * UI Nodes
 *
 *=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
cocos2d::ui::ScrollView* CreatorReader::createScrollView(const buffers::ScrollView* scrollViewBuffer) const
{
    auto scrollView = ui::ScrollView::create();
    parseScrollView(scrollView, scrollViewBuffer);
    return scrollView;
}

void CreatorReader::parseScrollView(cocos2d::ui::ScrollView* scrollView, const buffers::ScrollView* scrollViewBuffer) const
{
    const auto& nodeBuffer = scrollViewBuffer->node();
    parseNode(scrollView, nodeBuffer);

    // backgroundImage:string;
    // backgroundImageScale9Enabled:bool;
    // backgroundImageColor:ColorRGB;
    // direction:ScrollViewDirection;
    // bounceEnabled:bool;
    // innerContainerSize:Size;

    const auto& backgroundImage = scrollViewBuffer->backgroundImage();
    const auto& backgroundImageScale9Enabled = scrollViewBuffer->backgroundImageScale9Enabled();
    const auto& backgroundImageColor = scrollViewBuffer->backgroundImageColor();
    const auto& direction = scrollViewBuffer->direction();
    const auto& bounceEnabled = scrollViewBuffer->bounceEnabled();
    const auto& innerContainerSize = scrollViewBuffer->innerContainerSize();

    scrollView->setBackGroundImage(backgroundImage->str(), cocos2d::ui::Widget::TextureResType::PLIST);
    scrollView->setBackGroundImageScale9Enabled(backgroundImageScale9Enabled);
    scrollView->setBackGroundImageColor(cocos2d::Color3B(backgroundImageColor->r(), backgroundImageColor->g(), backgroundImageColor->b()));
    scrollView->setDirection(static_cast<cocos2d::ui::ScrollView::Direction>(direction));
    scrollView->setBounceEnabled(bounceEnabled);
    scrollView->setInnerContainerSize(cocos2d::Size(innerContainerSize->w(), innerContainerSize->h()));

    // FIXME: Call setJumpToPercent at the end, because it depens on having the contentSize correct
    // FIXME: uses the anchorPoint for the percent in the bar, but this migh break if it changes the position of the bar content node
    const auto& anchorPoint = scrollViewBuffer->node()->anchorPoint();
    scrollView->jumpToPercentHorizontal(anchorPoint->x() * 100.0f);
    scrollView->jumpToPercentVertical((1-anchorPoint->y() * 100.0f));
}

cocos2d::ui::LoadingBar* CreatorReader::createProgressBar(const buffers::ProgressBar* progressBarBuffer) const
{
    auto progressBar = ui::LoadingBar::create();
    parseProgressBar(progressBar, progressBarBuffer);
    return progressBar;
}
void CreatorReader::parseProgressBar(cocos2d::ui::LoadingBar* progressBar, const buffers::ProgressBar* progressBarBuffer) const
{
    const auto& nodeBuffer = progressBarBuffer->node();
    parseNode(progressBar, nodeBuffer);
}

cocos2d::ui::EditBox* CreatorReader::createEditBox(const buffers::EditBox* editBoxBuffer) const
{
    const auto& contentSize = editBoxBuffer->node()->contentSize();
    const auto& spriteFrameName = editBoxBuffer->backgroundImage();
    auto editBox = ui::EditBox::create(cocos2d::Size(contentSize->w(), contentSize->h()),
                                       spriteFrameName->str(),
                                       cocos2d::ui::Widget::TextureResType::PLIST);
    parseEditBox(editBox, editBoxBuffer);
    return editBox;
}

void CreatorReader::parseEditBox(cocos2d::ui::EditBox* editBox, const buffers::EditBox* editBoxBuffer) const
{
    const auto& nodeBuffer = editBoxBuffer->node();
    parseNode(editBox, nodeBuffer);

    // backgroundImage:string;
    // returnType:EditBoxReturnType;
    // inputFlag:EditBoxInputFlag;
    // inputMode:EditBoxInputMode;
    // fontSize:int;
    // fontColor:ColorRGB;
    // placeholder:string;
    // placeholderFontSize:int;
    // placeholderFontColor:ColorRGB;
    // maxLength:int;
    // text:string;
    const auto& returnType = editBoxBuffer->returnType();
    const auto& inputFlag = editBoxBuffer->inputFlag();
    const auto& inputMode = editBoxBuffer->inputMode();
    const auto& fontSize = editBoxBuffer->fontSize();
    const auto& fontColor = editBoxBuffer->fontColor();
    const auto& placerholder = editBoxBuffer->placeholder();
    const auto& placerholderFontSize = editBoxBuffer->placeholderFontSize();
    const auto& placerholderFontColor = editBoxBuffer->placeholderFontColor();
    const auto& maxLen = editBoxBuffer->maxLength();
    const auto& text = editBoxBuffer->text();

    editBox->setReturnType(static_cast<cocos2d::ui::EditBox::KeyboardReturnType>(returnType));
    editBox->setInputFlag(static_cast<cocos2d::ui::EditBox::InputFlag>(inputFlag));
    editBox->setInputMode(static_cast<cocos2d::ui::EditBox::InputMode>(inputMode));
    editBox->setFontSize(fontSize);
    editBox->setFontColor(cocos2d::Color3B(fontColor->r(), fontColor->g(), fontColor->b()));
    editBox->setPlaceHolder(placerholder->c_str());
    editBox->setPlaceholderFontSize(placerholderFontSize);
    editBox->setPlaceholderFontColor(cocos2d::Color3B(placerholderFontColor->r(), placerholderFontColor->g(), placerholderFontColor->b()));
    editBox->setMaxLength(maxLen);
    editBox->setText(text->c_str());
}

cocos2d::ui::Button* CreatorReader::createButton(const buffers::Button* buttonBuffer) const
{
    
    ui::Button* button = nullptr;
    
    const auto& spriteFrameName = buttonBuffer->spriteFrameName();
    const auto& pressedSpriteFrameName = buttonBuffer->pressedSpriteFrameName();
    const auto& disabledSpriteFrameName = buttonBuffer->disabledSpriteFrameName();
    if (spriteFrameName)
        button = ui::Button::create(spriteFrameName->str(),
                                    pressedSpriteFrameName ? pressedSpriteFrameName->str() : "",
                                    disabledSpriteFrameName ? disabledSpriteFrameName->str() : "",
                                    cocos2d::ui::Widget::TextureResType::PLIST);
    else
        button = ui::Button::create();

    parseButton(button, buttonBuffer);
    return button;
}

void CreatorReader::parseButton(cocos2d::ui::Button* button, const buffers::Button* buttonBuffer) const
{
    const auto& nodeBuffer = buttonBuffer->node();
    parseNode(button, nodeBuffer);

    const auto& ignoreContentAdaptWithSize = buttonBuffer->ignoreContentAdaptWithSize();
    button->ignoreContentAdaptWithSize(ignoreContentAdaptWithSize);
    
    if (buttonBuffer->transition() == 3)
    {
        button->setZoomScale(buttonBuffer->zoomScale() - 1);
        button->setPressedActionEnabled(true);
    }
}

/*=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
 *
 * Misc Nodes
 *
 *=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
spine::SkeletonAnimation* CreatorReader::createSpineSkeleton(const buffers::SpineSkeleton* spineBuffer) const
{
    const auto& jsonFile = spineBuffer->jsonFile()->str();
    const auto& atlasFile = spineBuffer->atlasFile()->str();
    const auto& timeScale = spineBuffer->timeScale();

    auto spine = spine::SkeletonAnimation::createWithJsonFile(jsonFile, atlasFile, timeScale);

    if (spine)
        parseSpineSkeleton(spine, spineBuffer);
    return spine;
}

void CreatorReader::parseSpineSkeleton(spine::SkeletonAnimation* spine, const buffers::SpineSkeleton* spineBuffer) const
{
    const auto& nodeBuffer = spineBuffer->node();
    parseNode(spine, nodeBuffer);

    // defaultSkin:string;
    // defaultAnimation:string;
    // loop:bool;
    // premultipliedAlpha:bool;
    // timeScale:float = 1;
    // debugSlots:bool;
    // debugBones:bool;

    const auto& defaultSkin = spineBuffer->defaultSkin()->str();
    const auto& defaultAnimation = spineBuffer->defaultAnimation()->str();
    const auto& loop = spineBuffer->loop();
//    const auto& premultipledAlpha = spineBuffer->premultipliedAlpha();
    const auto& debugSlots = spineBuffer->debugSlots();
    const auto& debugBones = spineBuffer->debugBones();

    spine->setSkin(defaultSkin);
    spine->setAnimation(0, defaultAnimation, loop);
    spine->setDebugSlotsEnabled(debugSlots);
    spine->setDebugBonesEnabled(debugBones);
}


//
// Helper methods
//
void CreatorReader::adjustPosition(cocos2d::Node* node) const
{
    const cocos2d::Node* parent = node->getParent();
    // only adjust position if there is a parent, and the parent is no the root scene
    if (parent && dynamic_cast<const cocos2d::Scene*>(parent) == nullptr) {
        const auto p_ap = parent->getAnchorPoint();
        const auto p_cs = parent->getContentSize();

        const auto offset = cocos2d::Vec2(p_ap.x * p_cs.width, p_ap.y * p_cs.height);
        const auto new_pos = node->getPosition() + offset;
        node->setPosition(new_pos);
    }
}

//
// Helper free functions
//
static void setSpriteQuad(cocos2d::V3F_C4B_T2F_Quad* quad, const cocos2d::Size& origSize, const int x, const int y, float x_factor, float y_factor)
{
    float offset_x = origSize.width * x;
    float offset_y = origSize.height * y;

    quad->bl.vertices.set(cocos2d::Vec3(offset_x, offset_y, 0));
    quad->br.vertices.set(cocos2d::Vec3(offset_x + (origSize.width * x_factor), offset_y, 0));
    quad->tl.vertices.set(cocos2d::Vec3(offset_x, offset_y + (origSize.height * y_factor), 0));
    quad->tr.vertices.set(cocos2d::Vec3(offset_x + (origSize.width * x_factor), offset_y + (origSize.height * y_factor), 0));

    if (x_factor != 1.0f || y_factor != 1.0f) {
        float x_size = (quad->br.texCoords.u - quad->bl.texCoords.u) * x_factor;
        float y_size = (quad->tl.texCoords.v - quad->bl.texCoords.v) * y_factor;

        quad->br.texCoords = Tex2F(quad->bl.texCoords.u + x_size, quad->bl.texCoords.v);
        quad->tl.texCoords = Tex2F(quad->tl.texCoords.u, quad->bl.texCoords.v + y_size);
        quad->tr.texCoords = Tex2F(quad->bl.texCoords.u + x_size, quad->bl.texCoords.v + y_size);
    }
}

static void tileSprite(cocos2d::Sprite* sprite)
{
    const auto new_s = sprite->getContentSize();
    const auto frame = sprite->getSpriteFrame();
    const auto orig_s_pixel = frame->getOriginalSizeInPixels();
    const auto orig_rect = frame->getRectInPixels();

    // cheat: let the sprite calculate the original Quad for us.
    sprite->setContentSize(orig_s_pixel);
    V3F_C4B_T2F_Quad origQuad = sprite->getQuad();

    // restore the size
    sprite->setContentSize(new_s);

    const float f_x = new_s.width / orig_rect.size.width;
    const float f_y = new_s.height / orig_rect.size.height;
    const int n_x = std::ceil(f_x);
    const int n_y = std::ceil(f_y);

    const int totalQuads = n_x * n_y;

    // use new instead of malloc, since Polygon info will release them using delete
    V3F_C4B_T2F_Quad* quads = new (std::nothrow) V3F_C4B_T2F_Quad[totalQuads];
    unsigned short* indices = new (std::nothrow) unsigned short[totalQuads * 6];

    // populate the vertices
    for (int y=0; y<n_y; ++y) {
        for (int x=0; x<n_x; ++x) {
            quads[y * n_x + x] = origQuad;
            float x_factor = (orig_rect.size.width * (x+1) <= new_s.width) ? 1 : f_x - (long)f_x;
            float y_factor = (orig_rect.size.height * (y+1) <= new_s.height) ? 1 : f_y - (long)f_y;
            CCLOG("x=%g, y=%g", x_factor, y_factor);
            setSpriteQuad(&quads[y * n_x + x], orig_rect.size, x, y, x_factor, y_factor);
        }
    }

    // populate the indices
    for( int i=0; i < totalQuads; i++)
    {
        indices[i*6+0] = (GLushort) (i*4+0);
        indices[i*6+1] = (GLushort) (i*4+1);
        indices[i*6+2] = (GLushort) (i*4+2);
        indices[i*6+3] = (GLushort) (i*4+3);
        indices[i*6+4] = (GLushort) (i*4+2);
        indices[i*6+5] = (GLushort) (i*4+1);
    }

    TrianglesCommand::Triangles triangles;
    triangles.vertCount = 4 * totalQuads;
    triangles.indexCount = 6 * totalQuads;
    triangles.verts = (V3F_C4B_T2F*) quads;
    triangles.indices = indices;

    PolygonInfo poly;
    poly.setTriangles(triangles);

    // FIXME: setPolygonInfo will create new arrays and copy the recently alloced one
    // there should be a way to pass ownership so that it is not needed to copy them
    sprite->setPolygonInfo(poly);
}
