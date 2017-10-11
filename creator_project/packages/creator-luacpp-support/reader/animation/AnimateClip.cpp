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


#include "AnimateClip.h"
#include "AnimationClip.h"
#include "AnimationClipProperties.h"

namespace  {
    
    // -1: invalid index
    // -2: haven't reached first frame, so it should be the same as first frame
    template<typename P>
    int getValidIndex(const P &properties, float elapsed)
    {
        if (properties.empty())
            return -1;
        
        if (properties.front().frame > elapsed)
            return -2;

        if (properties.back().frame <= elapsed)
            return properties.size() - 1;
        
        for (int i = 0, len = properties.size(); i < len; ++i)
        {
            const auto& prop = properties[i];
            if (prop.frame > elapsed)
                return i - 1;
        }
        
        return -1;
    }
    
    template<typename P>
    float getPercent(const P& p1, const P& p2, float elapsed)
    {
        return (elapsed - p1.frame) / (p2.frame - p1.frame);
    }
    
    void assignValue(float src, float& dst)
    {
        dst = src;
    }
    
    void assignValue(const cocos2d::Color3B& src, cocos2d::Color3B& dst)
    {
        dst.r = src.r;
        dst.g = src.g;
        dst.b = src.b;
    }
    
    void assignValue(const cocos2d::Vec2& src, cocos2d::Vec2& dst)
    {
        dst.x = src.x;
        dst.y = src.y;
    }
    
    template<typename T>
    void computeNextValue(T start, T end, float percent, T &out)
    {
        out = start + percent * (end - start);
    }
    
    void computeNextValue(const cocos2d::Color3B& start, const cocos2d::Color3B& end, float percent, cocos2d::Color3B& out)
    {
        computeNextValue(start.r, end.r, percent, out.r);
        computeNextValue(start.g, end.g, percent, out.g);
        computeNextValue(start.b, end.b, percent, out.b);
    }
    
    void computeNextValue(const cocos2d::Vec2& start, const cocos2d::Vec2& end, float percent, cocos2d::Vec2& out)
    {
        computeNextValue(start.x, end.x, percent, out.x);
        computeNextValue(start.y, end.y, percent, out.y);
    }
    
    template<typename P, typename T>
    bool getNextValue(const P & properties, float elapsed, T &out)
    {
        int index = getValidIndex(properties, elapsed);
        if (index == -1)
            return false;
        
        if (index == -2)
        {
            assignValue(properties.front().value, out);
            return true;
        }
        
        if (index == properties.size() -1)
        {
            assignValue(properties.back().value, out);
            return true;
        }
        
        const auto& prop = properties[index];
        const auto& nextProp = properties[index+1];
        float percent = getPercent(prop, nextProp, elapsed);
        computeNextValue(prop.value, nextProp.value, percent, out);
        
        return true;
    }
}

USING_NS_CCR;

AnimateClip* AnimateClip::createWithAnimationClip(cocos2d::Node* rootTarget, AnimationClip* clip)
{
    AnimateClip* animate = new (std::nothrow) AnimateClip;
    if (animate && animate->initWithAnimationClip(rootTarget, clip))
        animate->autorelease();
    else {
        delete animate;
        animate = nullptr;
    }

    return animate;
}

AnimateClip::AnimateClip()
: _clip(nullptr)
, _elapsed(0)
, _rootTarget(nullptr)
{
}

AnimateClip::~AnimateClip()
{
    CC_SAFE_RELEASE(_clip);
    CC_SAFE_RELEASE(_rootTarget);
}

void AnimateClip::startAnimate()
{
    _running = true;
    scheduleUpdate();
}

void AnimateClip::stopAnimate()
{
    unscheduleUpdate();
    // release self
    _running = false;
}

void AnimateClip::pauseAnimate()
{
    unscheduleUpdate();
}

void AnimateClip::resumeAnimate()
{
    scheduleUpdate();
}

void AnimateClip::setCallbackForEndevent(const AnimateEndCallback &callback)
{
    _endCallback = std::move(callback);
}

bool AnimateClip::initWithAnimationClip(cocos2d::Node* rootTarget, AnimationClip* clip)
{
    _clip = clip;
    _rootTarget = rootTarget;
    CC_SAFE_RETAIN(_rootTarget);
    
    if (_clip)
    {
        _clip->retain();
        _duration = _clip->getDuration();
    }
    

    return clip != nullptr;
}

void AnimateClip::update(float dt) {
    _elapsed += dt;
    
    const auto& animPropertiesVec = _clip->getAnimPropertiesVec();
    
    for (const auto& animProperties : animPropertiesVec)
        doUpdate(animProperties);

    if (_elapsed >= _duration)
    {
        stopAnimate();
        if (_endCallback)
            _endCallback();
    }
}

void AnimateClip::doUpdate(const AnimProperties& animProperties) const
{
    auto target = getTarget(animProperties.path);
    if (target)
    {
        // update position
        cocos2d::Vec2 nextPos;
        if (getNextValue(animProperties.animPosition, _elapsed, nextPos))
            target->setPosition(nextPos);

        // update color
        cocos2d::Color3B nextColor;
        if (getNextValue(animProperties.animColor, _elapsed, nextColor))
            target->setColor(nextColor);

        // update scaleX
        float nextValue;
        if (getNextValue(animProperties.animScaleX, _elapsed, nextValue))
            target->setScaleX(nextValue);

        // update scaleY
        if (getNextValue(animProperties.animScaleY, _elapsed, nextValue))
            target->setScaleY(nextValue);

        // rotation
        if (getNextValue(animProperties.animRotation, _elapsed, nextValue))
            target->setRotation(nextValue);

        // SkewX
        if (getNextValue(animProperties.animSkewX, _elapsed, nextValue))
            target->setSkewX(nextValue);

        // SkewY
        if (getNextValue(animProperties.animSkewY, _elapsed, nextValue))
            target->setSkewY(nextValue);

        // Opacity
        if (getNextValue(animProperties.animOpacity, _elapsed, nextValue))
            target->setOpacity(nextValue);

        // anchor x
        if (getNextValue(animProperties.animAnchorX, _elapsed, nextValue))
            target->setAnchorPoint(cocos2d::Vec2(nextValue, target->getAnchorPoint().y));

        // anchor y
        if (getNextValue(animProperties.animAnchorY, _elapsed, nextValue))
            target->setAnchorPoint(cocos2d::Vec2(target->getAnchorPoint().x, nextValue));

        // positoin x
        if (getNextValue(animProperties.animPositionX, _elapsed, nextValue))
            target->setPositionX(nextValue);
        
        // position y
        if (getNextValue(animProperties.animPositionY, _elapsed, nextValue))
            target->setPositionY(nextValue);
    }
}

cocos2d::Node* AnimateClip::getTarget(const std::string &path) const
{
    if (path.empty())
        return _rootTarget;
    
    cocos2d::Node *ret = nullptr;
    _rootTarget->enumerateChildren(path, [&ret](cocos2d::Node* result) -> bool {
        ret = result;
        return true;
    });
    return ret;
}
