#pragma once

#include <iostream>

class CocosObjectFactory;

typedef std::map<std::string, CocosObjectFactory*> FACTORY_MAP;
class CocosObject {
private:
    static FACTORY_MAP factories;

public:
    static void registerFactory(const std::string& classname_str, CocosObjectFactory *factory);
    static FACTORY_MAP getFactoryMap();
};

class CocosObjectFactory {
public:
	virtual CocosObject* createFactoryNode() = 0;
};