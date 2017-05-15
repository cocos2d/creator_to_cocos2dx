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

NS_CCR_BEGIN

class AnimationClip;
struct AnimProperties;

class AnimateClip : public cocos2d::Node {
public:
    static AnimateClip* createWithAnimationClip(cocos2d::Node* rootTarget, AnimationClip* clip);
    void start();
    
    virtual ~AnimateClip();

    //
    // Overrides
    //
    virtual void update(float dt) override;
    
CC_CONSTRUCTOR_ACCESS:
    AnimateClip();
    bool initWithAnimationClip(cocos2d::Node* rootTarget, AnimationClip* clip);
    void doUpdate(const AnimProperties& animProperties) const;
    cocos2d::Node* getTarget(const std::string &path) const;


    AnimationClip* _clip;
    
    float _elapsed;
    float _duration;
    cocos2d::Node *_rootTarget; // weak reference
};

NS_CCR_END
