#pragma once

#include <string>
#include <stack>
#include "cocos2d.h"

class RichtextStringVisitor : public cocos2d::SAXDelegator
{
public:
    RichtextStringVisitor();
    
    virtual void startElement(void *ctx, const char *name, const char **atts) override;
    virtual void endElement(void *ctx, const char *name) override;
    virtual void textHandler(void *ctx, const char *s, size_t len) override;
    
    std::string getOutput() const;
    
private:
    
    std::string convertColorString2Hex(const std::string& colorString) const;
    std::string convertAttributeName(const std::string& tagName, const std::string& attributeName) const;
    std::string convertAttributeValue(const std::string& attributeName, const std::string& attributeValue) const;
    
    const static std::string COLOR_FLAG;
    const static std::string SIZE_FLAG;
    const static std::map<std::string, std::string> COLOR_MAP;
    
    std::string _outputXML;
    std::stack<bool> _addFontEndFlags;
};
