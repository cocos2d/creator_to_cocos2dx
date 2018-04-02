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

#define PLUGIN_EXTRA_LAYOUT_NAME "Creator Widget to Cocos2d-x Layout"

class WidgetAdapter : public cocos2d::Ref
{

public:

    static WidgetAdapter* create();
    WidgetAdapter();
    virtual ~WidgetAdapter();

    bool init();
    void setIsAlignOnce(bool isAlignOnce);
    void setAdaptNode(cocos2d::Node* needAdaptNode);
    // set after known AdaptNode's parent
    void setLayoutTarget(cocos2d::Node* layoutTarget);
    // adapt layout depend and _layoutTarget
    void configLayoutNode();
private:
    friend class WidgetManager;
    // only do layout once if true
    bool _isAlignOnce;
    // widget layout target, it's a Node
    cocos2d::Node* _layoutTarget;
    // _layoutTarget must existed, the default target is _needAdaptNode's parent
    cocos2d::Node* _needAdaptNode;
    // insert the _layout between _nodeNeedWidget and its parent
    cocos2d::ui::Layout* _layoutNode;
    // insert Layout to support widget component.
    void insertLayoutNode();
};

class WidgetManager : public cocos2d::Node
{
public:
    void update(float dt);
private:
    friend class CreatorReader;

    void setupWidgets();
    cocos2d::Vector<WidgetAdapter*> _needAdaptWidgets;
};
NS_CCR_END
