let Utils = require('./Utils');

class Widget {
    static parse(data) {
        let result = {};

        result.isAlignOnce = data.isAlignOnce;

        // margin value, only support pixel, didn't support percentage
        result.left = data._left;
        result.right = data._right;
        result.top = data._top;
        result.bottom = data._bottom;
        result.verticalCenter = data._verticalCenter;
        result.horizontalCenter = data._horizontalCenter;

        // If true, value is pixel, otherwise is percentage (0 - 1)
        // invalid value in cocos2d-x
        result.isAbsLeft = data._isAbsLeft;
        result.isAbsRight = data._isAbsRight;
        result.isAbsTop = data._isAbsTop;
        result.isAbsBottom = data._isAbsBottom;
        result.isAbsHorizontalCenter = data._isAbsHorizontalCenter;
        result.isAbsVerticalCenter = data._isAbsVerticalCenter;

        Utils.log("parse widget result value:" + JSON.stringify(result));

        return result;
    }
}


module.exports = Widget;