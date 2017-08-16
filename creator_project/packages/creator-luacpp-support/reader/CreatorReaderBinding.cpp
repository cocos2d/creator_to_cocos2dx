#include "CreatorReaderBinding.h"

#include "scripting/lua-bindings/manual/tolua_fix.h"
#include "scripting/lua-bindings/manual/LuaBasicConversions.h"
#include "scripting/lua-bindings/manual/CCLuaValue.h"
#include "scripting/lua-bindings/manual/CCLuaEngine.h"

#include "CreatorReader.h"

namespace{

int lua_creator_reader_createWithFilename(lua_State* L)
{
#if COCOS2D_DEBUG > 1
    tolua_Error tolua_error;
    if (!tolua_isuertable(L, 1, "cc.CreatorReader"), 0 &tolua_error)
        goto tolua_lerror;
#endif
    
    int argc = lua_gettop(L) - 1;
    bool ok = true;

    do
    {
        if (argc == 1)
        {
            std::string arg0;
            ok &= luaval_to_std_string(L, 2, &arg0, "cc.CreatorReader");
            if (!ok)
                break;
            
            auto ret = creator::CreatorReader::createWithFilename(arg0);
            object_to_luaval<creator::CreatorReader>(L, "cc.CreatorReader", ret);
            return 1;
        }
    } while(0);

    

#if COCOS2D_DEBUG > 1
    tolua_lerror(L, "#feeror in function 'lua_creator_reader_createWithFilename'.", &tolua_lerror);
#endif
    return 0;
}

int lua_creator_reader_getSceneGraph(lua_State* L)
{
#if COCOS2D_DEBUG > 1
    tolua_Error tolua_error;
    if (!tolua_isuertable(L, 1, "cc.CreatorReader"), 0 &tolua_error)
        goto tolua_lerror;
#endif
    
    auto cobj = static_cast<creator::CreatorReader*>(tolua_tousertype(L, 1, 0));
#if COCOS2D_DEBUG > 1
    if (!cobj)
    {
        tolua_error(L, "invalid 'cobj' in function 'lua_creator_reader_getSceneGraph'", nullptr);
        return 0;
    }
#endif
    
    int argc = lua_gettop(L) - 1;
    if (argc == 0)
    {
        auto ret = cobj->getSceneGraph();
        object_to_luaval<cocos2d::Scene>(L, "cc.Scene", ret);
        return 1;
    }
    
#if COCOS2D_DEBUG > 1
    tolua_lerror(L, "#feeror in function 'lua_creator_reader_getSceneGraph'.", &tolua_lerror);
#endif
    return 0;
}
    
int lua_creator_reader_setup(lua_State* L)
{
#if COCOS2D_DEBUG > 1
    tolua_Error tolua_error;
    if (!tolua_isuertable(L, 1, "cc.CreatorReader"), 0 &tolua_error)
        goto tolua_lerror;
#endif
    
    auto cobj = static_cast<creator::CreatorReader*>(tolua_tousertype(L, 1, 0));
#if COCOS2D_DEBUG > 1
    if (!cobj)
    {
        tolua_error(L, "invalid 'cobj' in function 'lua_creator_reader_setup'", nullptr);
        return 0;
    }
#endif
    
    int argc = lua_gettop(L) - 1;
    if (argc == 0)
    {
        cobj->setup();
        return 1;
    }
    
#if COCOS2D_DEBUG > 1
    tolua_lerror(L, "#feeror in function 'lua_creator_reader_getSceneGraph'.", &tolua_lerror);
#endif
    return 0;
}
    
int lua_creator_reader_getVersion(lua_State* L)
{
#if COCOS2D_DEBUG > 1
    tolua_Error tolua_error;
    if (!tolua_isuertable(L, 1, "cc.CreatorReader"), 0 &tolua_error)
        goto tolua_lerror;
#endif
    
    auto cobj = static_cast<creator::CreatorReader*>(tolua_tousertype(L, 1, 0));
#if COCOS2D_DEBUG > 1
    if (!cobj)
    {
        tolua_error(L, "invalid 'cobj' in function 'lua_creator_reader_setup'", nullptr);
        return 0;
    }
#endif
    
    int argc = lua_gettop(L) - 1;
    if (argc == 0)
    {
        auto version = cobj->getVersion();
        lua_pushlstring(L, version.c_str(), version.length());
        return 1;
    }
    
#if COCOS2D_DEBUG > 1
    tolua_lerror(L, "#feeror in function 'lua_creator_reader_getSceneGraph'.", &tolua_lerror);
#endif
    return 0;
}

} // end of namespace

int register_all_creator_reader_manual(lua_State* L)
{
    tolua_open(L);

    tolua_module(L, "cc", 0);
    tolua_beginmodule(L, "cc");

    tolua_usertype(L, "cc.CreatorReader");
    tolua_cclass(L, "CreatorReader", "cc.CreatorReader", "cc.Ref", nullptr);

    // CreatorReader module
    tolua_beginmodule(L, "CreatorReader");
    tolua_function(L, "createWithFilename", lua_creator_reader_createWithFilename);
    tolua_function(L, "getSceneGraph", lua_creator_reader_getSceneGraph);
    tolua_function(L, "getVersion", lua_creator_reader_getVersion);
    tolua_function(L, "setup", lua_creator_reader_setup);
    tolua_endmodule(L);

    tolua_endmodule(L); // end of cc module
    
    return 1;
}
