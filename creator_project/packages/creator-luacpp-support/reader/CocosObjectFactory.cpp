#include "CocosObjectFactory.h"

FACTORY_MAP CocosObject::factories;

void CocosObject::registerFactory(const std::string& classname_str, CocosObjectFactory *factory) {
    CocosObject::factories[classname_str] = factory;
}

FACTORY_MAP CocosObject::getFactoryMap() { 
	return CocosObject::factories;
}