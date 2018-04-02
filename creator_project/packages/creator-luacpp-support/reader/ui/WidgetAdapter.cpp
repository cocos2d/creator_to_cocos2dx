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
#include "WidgetAdapter.h"


NS_CCR_BEGIN

WidgetAdapter* WidgetAdapter::create()
{
    auto adapter = new (std::nothrow) WidgetAdapter;
    if (adapter && adapter->init()) {
        adapter->autorelease();
        return adapter;
    }
    return nullptr;
}

bool WidgetAdapter::init()
{
    _layoutNode = cocos2d::ui::Layout::create();
    CC_SAFE_RETAIN(_layoutNode);

    return true;
}

WidgetAdapter::WidgetAdapter()
: _layoutTarget(nullptr)
, _needAdaptNode(nullptr)
, _widgetData(nullptr)
{

}

WidgetAdapter::~WidgetAdapter()
{
    CC_SAFE_RELEASE(_layoutNode);
}

void WidgetAdapter::setAdaptNode(cocos2d::Node* needAdaptNode)
{
    _needAdaptNode = needAdaptNode;
}

void WidgetAdapter::setWidgetData(const creator::buffers::Widget *const widgetData)
{
//    _widgetData = widgetData;
}

void WidgetAdapter::setLayoutTarget(cocos2d::Node* layoutTarget)
{
    _layoutTarget = layoutTarget;
}

void WidgetAdapter::doAlignOnce()
{
    if (_layoutTarget == nullptr) {
        _layoutTarget = _needAdaptNode->getParent();
    }
    CCASSERT(_layoutTarget != nullptr, "layout target can't be null");

    _layoutNode->setLayoutType(cocos2d::ui::Layout::Type::HORIZONTAL);
    _layoutNode->setContentSize(_layoutTarget->getContentSize());
    _layoutNode->setBackGroundColorType(cocos2d::ui::Layout::BackGroundColorType::SOLID);
    _layoutNode->setAnchorPoint(_layoutTarget->getAnchorPoint());
    _layoutNode->setPosition(_layoutTarget->getPosition());
    _layoutNode->setName(_needAdaptNode->getName() + " Layout");

    // debug info
    _layoutNode->setBackGroundColor(cocos2d::Color3B(128, 128, 128));
    _layoutNode->setOpacity(128);

    insertLayoutNode();
}

void WidgetAdapter::insertLayoutNode()
{
    auto parent = _needAdaptNode->getParent();
    CCASSERT(parent != nullptr, "adaptNode's parent can't be null");

    _needAdaptNode->removeFromParentAndCleanup(false);
    _layoutNode->addChild(_needAdaptNode);
    parent->addChild(_layoutNode);
}
NS_CCR_END
