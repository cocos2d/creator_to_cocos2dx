all:
	-./creator_project/packages/creator-luacpp-support/convert_fire_to_json.py --cocospath creator/assets --creatorassets creator_project/temp creator_project/assets/*.fire
	-./creator_project/packages/creator-luacpp-support/bin/flatc -c -b ./creator_project/packages/creator-luacpp-support/CreatorReader.fbs json/*.json
	mv *.h ~/progs/cocos2d-x/tests/cpp-tests/Classes/CreatorReaderTest/
	mv *.ccreator ~/progs/cocos2d-x/tests/cpp-tests/Resources/creator/
