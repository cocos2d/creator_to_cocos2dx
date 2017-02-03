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

USING_NS_CCR;

AnimateClip* AnimateClip::createWithAnimationClip(AnimationClip* clip)
{
    AnimateClip* animate = new (std::nothrow) AnimateClip;
    if (animate && animate->initWithAnimationClip(clip)) {
        animate->autorelease();
        return animate;
    }
    return nullptr;
}

AnimateClip::AnimateClip()
: _clip(nullptr)
{
}

AnimateClip::~AnimateClip()
{
    CC_SAFE_RELEASE(_clip);
}

void AnimateClip::startWithTarget(cocos2d::Node *target)
{
    // probably nothing
    ActionInterval::startWithTarget(target);

    for (const auto& action: _actions) {
        action->startWithTarget(target);
    }
}

void AnimateClip::update(float time)
{
    for (const auto& action: _actions) {
        action->update(time);
    }
}

bool AnimateClip::initWithAnimationClip(AnimationClip* clip)
{
    bool ret = (clip != nullptr);
    if (!ret)
        return ret;

    const float framesPerSecond = 60.0f / clip->getSample();
    const float duration = clip->getDuration() * framesPerSecond;
    ret &= ActionInterval::initWithDuration(duration);
    if (ret) {
        if (_clip != clip) {
            CC_SAFE_RELEASE(_clip);
            _clip = clip;
            CC_SAFE_RETAIN(_clip);
        }

        auto animProperties = _clip->getAnimProperties();

        // position
        createAction<cocos2d::MoveTo>(animProperties.animPosition, framesPerSecond);

        // rotation
        createAction<cocos2d::RotateTo>(animProperties.animRotation, framesPerSecond);

        // scale
        createAction<cocos2d::ScaleTo>(animProperties.animSkewX, framesPerSecond);

        // color
        createAction<cocos2d::TintTo>(animProperties.animColor, framesPerSecond);

        // opacity
        createAction<cocos2d::FadeTo>(animProperties.animOpacity, framesPerSecond);
    }

    return ret;
}

template <class A, typename P>
void AnimateClip::createAction(const P &properties, const float framesPerSecond)
{
    cocos2d::Vector<cocos2d::FiniteTimeAction*> array;
    float prevFrame = 0;        // because it uses absolute values
    bool firstProcessed = false;
    for (const auto& prop: properties) {
        if (!firstProcessed) {
            if (prop.frame != 0) {
                // create pause until action start
                auto delay = cocos2d::DelayTime::create(prop.frame * framesPerSecond);
                array.pushBack(delay);
            }
            firstProcessed = true;
        }
        auto a = A::create((prop.frame - prevFrame) * framesPerSecond, prop.value);
        array.pushBack(a);

        prevFrame = prop.frame;
    }
    if (array.size() > 0) {
        auto seq = cocos2d::Sequence::create(array);
        _actions.pushBack(seq);
    }
}

AnimateClip* AnimateClip::clone() const
{
    // no copy constructor
    return AnimateClip::createWithAnimationClip(_clip);
}

AnimateClip* AnimateClip::reverse() const
{
    // FIXME: not implemented correclty
    // How to reverse it? use time reverse I guess since the actions are based on "To" and not "By"
    // otherwise a "reverse" of sequence could be done
    return AnimateClip::createWithAnimationClip(_clip);
}
