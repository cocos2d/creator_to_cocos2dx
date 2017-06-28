
#include "AnimationManager.h"
#include "AnimateClip.h"

NS_CCR_BEGIN

AnimationManager* AnimationManager::create()
{
    auto self = new (std::nothrow)AnimationManager;
    if (self)
        self->autorelease();
    return self;
}

AnimationManager::~AnimationManager()
{
    for (auto&& animationInfo : _animations)
        animationInfo.target->release();
}

void AnimationManager::addAnimation(const AnimationInfo& animationInfo)
{
    _animations.push_back(animationInfo);
}

void AnimationManager::playOnLoad() const
{
    for (auto& animationInfo : _animations)
        if (animationInfo.playOnLoad && animationInfo.defaultClip)
            runAnimationClip(animationInfo.target, animationInfo.defaultClip);
}

void AnimationManager::playAnimationClip(cocos2d::Node *target, const std::string &animationClipName) const
{
    bool foundTarget = false;
    bool foundAnimationClip = false;
    
    for (auto& animationInfo : _animations)
        if (animationInfo.target == target)
        {
            for (auto& animClip : animationInfo.clips)
                if (animClip->getName() == animationClipName)
                {
                    runAnimationClip(animationInfo.target, animClip);
                    foundAnimationClip = true;
                    break;
                }
            
            foundTarget = true;
            break;
        }
    
    if (!foundTarget)
        CCLOG("can not found target: %p", target);
    else
    {
        if (!foundAnimationClip)
            CCLOG("can not found animation clip name %s of target %p", animationClipName.c_str(), target);
    }
}

void AnimationManager::runAnimationClip(cocos2d::Node *target, AnimationClip* animationClip) const
{
    // animate will release itself when it is done
    auto animate = AnimateClip::createWithAnimationClip(target, animationClip);
    animate->retain();
    animate->start();
}

NS_CCR_END
