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
#include "WidgetExport.h"


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
    _layoutNode->setLayoutType(cocos2d::ui::Layout::Type::RELATIVE);

    CC_SAFE_RETAIN(_layoutNode);
    return true;
}

WidgetAdapter::WidgetAdapter()
: _isAlignOnce(true)
, _layoutTarget(nullptr)
, _needAdaptNode(nullptr)
{

}

WidgetAdapter::~WidgetAdapter()
{
    CC_SAFE_RELEASE(_layoutNode);
}

void WidgetAdapter::setIsAlignOnce(bool isAlignOnce)
{
    _isAlignOnce = isAlignOnce;
}
void WidgetAdapter::setAdaptNode(cocos2d::Node* needAdaptNode)
{
    _needAdaptNode = needAdaptNode;
}

void WidgetAdapter::setLayoutTarget(cocos2d::Node* layoutTarget)
{
    _layoutTarget = layoutTarget;
}

void WidgetAdapter::syncLayoutProperty()
{
    if (_layoutTarget == nullptr) {
        _layoutTarget = _needAdaptNode->getParent();
    }
    CCASSERT(_layoutTarget != nullptr, "layout target can't be null");

    _layoutNode->setContentSize(_layoutTarget->getContentSize());
    _layoutNode->setAnchorPoint(_layoutTarget->getAnchorPoint());
    _layoutNode->setPosition(_layoutTarget->getPosition());
}

void WidgetAdapter::insertLayoutNode()
{
    auto parent = _needAdaptNode->getParent();
    CCASSERT(parent != nullptr, "adaptNode's parent can't be null");

    _needAdaptNode->removeFromParentAndCleanup(false);
    _layoutNode->setName(PLUGIN_EXTRA_LAYOUT_NAME);
    _layoutNode->addChild(_needAdaptNode);
    parent->addChild(_layoutNode);
}

WidgetManager::WidgetManager()
: _forceAlignDirty(false)
{

}

WidgetManager::~WidgetManager()
{
    
}

void WidgetManager::update(float dt)
{
    doAlign();
}

void WidgetManager::forceDoAlign()
{
    _forceAlignDirty = true;
    doAlign();
}

void WidgetManager::doAlign()
{
    for (auto& adapter:_needAdaptWidgets) {
        if((_forceAlignDirty || !(adapter->_isAlignOnce)))
        {
            adapter->syncLayoutProperty();
        }
    }
    _forceAlignDirty = false;
}

void WidgetManager::setupWidgets()
{
    for (auto& adapter:_needAdaptWidgets) {
        adapter->syncLayoutProperty();
        adapter->insertLayoutNode();
    }
    scheduleUpdate();
}
NS_CCR_END
