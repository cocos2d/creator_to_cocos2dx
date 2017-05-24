
#include "AnimationManager.h"
#include "AnimateClip.h"

NS_CCR_BEGIN

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

void AnimationManager::playActionClip(cocos2d::Node *target, const std::string &animationClipName) const
{
    for (auto& animationInfo : _animations)
        if (animationInfo.target == target)
        {
            for (auto& animClip : animationInfo.clips)
                if (animClip->getName() == animationClipName)
                    runAnimationClip(animationInfo.target, animClip);
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
