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
    //_layoutNode = cocos2d::ui::Layout::create();
   // _layoutNode->setLayoutType(cocos2d::ui::Layout::Type::RELATIVE);

    //CC_SAFE_RETAIN(_layoutNode);
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
   // CC_SAFE_RELEASE(_layoutNode);
	CC_SAFE_RELEASE(_parameter);
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

void WidgetAdapter::setLayoutParameter(cocos2d::ui::RelativeLayoutParameter *parameter)
{
	CC_SAFE_RETAIN(parameter);
	_parameter = parameter;
}

void WidgetAdapter::syncLayoutProperty()
{
	auto sDesignSize = cocos2d::Director::getInstance()->getOpenGLView()->getDesignResolutionSize();
	auto adaptSize   = _needAdaptNode->getContentSize();
	auto anchorPoint = _needAdaptNode->getAnchorPoint();
	auto targetSize  = _layoutTarget->getContentSize();


	if (_needAdaptNode->getName().compare("root") == 0){
		_needAdaptNode->setContentSize(sDesignSize);
		return;
	}

	float x = 0.0f, y = 0.0f;
	
	const auto& margin = _parameter->getMargin();
	auto alignComb = _parameter->getAlign();
	
	switch (alignComb) {
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_TOP_LEFT:
		x = margin.left + adaptSize.width*anchorPoint.x;
		y = targetSize.height - (margin.top + adaptSize.height*(1.0 - anchorPoint.y));
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_TOP_RIGHT:
		x = targetSize.width - (margin.right + adaptSize.width*(1.0 - anchorPoint.x));
		y = targetSize.height - (margin.top + adaptSize.height*(1.0 - anchorPoint.y));
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_RIGHT_BOTTOM:
		x = targetSize.width - (margin.right + adaptSize.width*(1.0 - anchorPoint.x));
		y = margin.bottom + adaptSize.height*anchorPoint.y;
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_LEFT_BOTTOM:
		x = margin.left + adaptSize.width*anchorPoint.x;
		y = margin.bottom + adaptSize.height*anchorPoint.y;
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_LEFT_CENTER_VERTICAL:
		x = margin.left + adaptSize.width*anchorPoint.x;
		y = targetSize.height*0.5 + ((anchorPoint.y - 0.5)*adaptSize.height);
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_RIGHT_CENTER_VERTICAL:
		x = targetSize.width - (margin.right + adaptSize.width*(1.0 - anchorPoint.x));
		y = targetSize.height*0.5 + ((anchorPoint.y - 0.5)*adaptSize.height);
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_TOP_CENTER_HORIZONTAL:

		x = targetSize.width*0.5 + ((anchorPoint.x - 0.5)*adaptSize.width);
		y = targetSize.height - (margin.top + adaptSize.height*(1.0 - anchorPoint.y));
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::PARENT_BOTTOM_CENTER_HORIZONTAL:
		x = targetSize.width*0.5 + ((anchorPoint.x - 0.5)*adaptSize.width);
		y = margin.bottom + adaptSize.height*anchorPoint.y;
		break;
	case cocos2d::ui::RelativeLayoutParameter::RelativeAlign::CENTER_IN_PARENT:
		x = targetSize.width*0.5 + ((anchorPoint.x - 0.5)*adaptSize.width);
		y = targetSize.height*0.5+ ((anchorPoint.y - 0.5)*adaptSize.height);
		break;
	default:

		break;
	}

	_needAdaptNode->setPosition(x, y);
}

void WidgetAdapter::setupLayout()
{
    auto parent = _needAdaptNode->getParent();
    CCASSERT(parent != nullptr, "adaptNode's parent can't be null");

    // set default layout target to parent node
    if (_layoutTarget == nullptr) {
        _layoutTarget = parent;
    }
   // _needAdaptNode->removeFromParentAndCleanup(false);
   // _layoutNode->setName(PLUGIN_EXTRA_LAYOUT_NAME);
   // _layoutNode->addChild(_needAdaptNode);
   // parent->addChild(_layoutNode);
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
        if(_forceAlignDirty || !(adapter->_isAlignOnce))
        {
            adapter->syncLayoutProperty();
        }
    }
    _forceAlignDirty = false;
}

void WidgetManager::setupWidgets()
{
    for (auto& adapter:_needAdaptWidgets) {
        adapter->setupLayout();
        adapter->syncLayoutProperty();
    }
    scheduleUpdate();
}
NS_CCR_END
