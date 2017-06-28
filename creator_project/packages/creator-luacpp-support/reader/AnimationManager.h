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

#include <vector>
#include <tuple>

#include "AnimationClip.h"


NS_CCR_BEGIN

class AnimateClip;

struct AnimationInfo
{
    AnimationClip* defaultClip;
    cocos2d::Vector<AnimationClip*> clips;
    bool playOnLoad;
    cocos2d::Node* target; // will retain the target
};

class AnimationManager : public cocos2d::Ref
{
public:
    static AnimationManager* create();
    ~AnimationManager();
    
    void playAnimationClip(cocos2d::Node *target, const std::string &animationClipName);
    // if AnimationClip is stopped, can not run it again.
    void stopAnimationClip(cocos2d::Node *target, const std::string &animationClipName);
    void pauseAnimationClip(cocos2d::Node *target, const std::string &animationClipName);
    void resumeAnimationClip(cocos2d::Node *target, const std::string &animationClipName);
private:
    friend class CreatorReader;
    
    // functions invoked by CreatorReader only
    void addAnimation(const AnimationInfo& animationInfo);
    void playOnLoad();
    
    void runAnimationClip(cocos2d::Node *target, AnimationClip* animationClip);
    // AnimateClip will be released
    void removeAnimateClip(cocos2d::Node *target, const std::string &animationClipName);
    AnimateClip* getAnimateClip(cocos2d::Node *target, const std::string &animationClipName) const;
    
    std::vector<AnimationInfo> _animations;
    std::vector<std::tuple<cocos2d::Node*, std::string, AnimateClip*>> _cachedAnimates;
};

NS_CC_END
