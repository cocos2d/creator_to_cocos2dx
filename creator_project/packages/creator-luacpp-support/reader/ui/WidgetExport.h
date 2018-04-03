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

// support export the creator widget component to cocos2d-x layout
class WidgetAdapter : public cocos2d::Ref
{

public:

    static WidgetAdapter* create();
    WidgetAdapter();
    virtual ~WidgetAdapter();

    bool init();
    void setIsAlignOnce(bool isAlignOnce);
    void setAdaptNode(cocos2d::Node* needAdaptNode);

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
    cocos2d::ui::Layout* _layoutNode;
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
    virtual void update(float dt);
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
