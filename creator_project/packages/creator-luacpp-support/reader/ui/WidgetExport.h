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
#include "CreatorReader_generated.h"

#include "Macros.h"

NS_CCR_BEGIN

// name of extra layout Node
#define PLUGIN_EXTRA_LAYOUT_NAME "Creator Widget to Cocos2d-x Layout"

// creator align flag, see: https://github.com/cocos-creator/engine/blob/master/cocos2d/core/base-ui/CCWidgetManager.js
#define CREATOR_ALIGN_TOP    (1 << 0)
#define CREATOR_ALIGN_MID    (1 << 1)
#define CREATOR_ALIGN_BOT    (1 << 2)
#define CREATOR_ALIGN_LEFT   (1 << 3)
#define CREATOR_ALIGN_CENTER (1 << 4)
#define CREATOR_ALIGN_RIGHT  (1 << 5)

// support export the creator widget component to cocos2d-x layout
class WidgetAdapter : public cocos2d::Ref
{

public:
    // only 9 creator align combinations are supported by cocos2d-x
    enum class AlignComb
    {
        TOP_LEFT = CREATOR_ALIGN_LEFT | CREATOR_ALIGN_TOP,
        TOP_CENTER_HORIZONTAL = CREATOR_ALIGN_CENTER | CREATOR_ALIGN_TOP,
        TOP_RIGHT = CREATOR_ALIGN_TOP | CREATOR_ALIGN_RIGHT,
        LEFT_CENTER_VERTICAL = CREATOR_ALIGN_MID | CREATOR_ALIGN_LEFT,

        CENTER_IN_PARENT = CREATOR_ALIGN_CENTER | CREATOR_ALIGN_MID,

        RIGHT_CENTER_VERTICAL = CREATOR_ALIGN_MID | CREATOR_ALIGN_RIGHT,
        LEFT_BOTTOM = CREATOR_ALIGN_BOT | CREATOR_ALIGN_LEFT,
        BOTTOM_CENTER_HORIZONTAL = CREATOR_ALIGN_CENTER | CREATOR_ALIGN_BOT,
        RIGHT_BOTTOM = CREATOR_ALIGN_RIGHT | CREATOR_ALIGN_BOT
    };

    static WidgetAdapter* create();
    WidgetAdapter();
    virtual ~WidgetAdapter();

    bool init();
    void setIsAlignOnce(bool isAlignOnce);
    void setAdaptNode(cocos2d::Node* needAdaptNode);


	void setLayoutParameter(cocos2d::ui::RelativeLayoutParameter *parameter);

    // TODO: support the align target of a widget component, default target is parent Node
    void setLayoutTarget(cocos2d::Node* layoutTarget);
private:
    friend class WidgetManager;
    // only do layout align once if true
    bool _isAlignOnce;
    // widget layout target, it's a Node, default target is _needAdaptNode's parent
    cocos2d::Node* _layoutTarget;
    // the node include a widget component, it must be a UI Widget?
    cocos2d::Node* _needAdaptNode;
    // insert the _layout between _nodeNeedWidget and its parent
   // cocos2d::ui::Layout* _layoutNode;

	cocos2d::ui::RelativeLayoutParameter *_parameter;

    // insert Layout Node to support widget component.
    void setupLayout();
    // adapt layout property depend on _layoutTarget
    void syncLayoutProperty();
};

// manager all the widget component align
class WidgetManager : public cocos2d::Node
{
public:
    // check widget component property AlignOnce every frame, update align if this property set to false
    virtual void update(float dt) override;
    // do layout align manually, you should call it when you make layout content size different from scene in Creator.
    void forceDoAlign();
private:
    friend class CreatorReader;

    WidgetManager();
    virtual ~WidgetManager();
    void setupWidgets();
    void doAlign();
    bool _forceAlignDirty;
    cocos2d::Vector<WidgetAdapter*> _needAdaptWidgets;
};
NS_CCR_END
