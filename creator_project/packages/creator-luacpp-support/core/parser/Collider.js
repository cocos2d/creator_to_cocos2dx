class Collider {
    static parse(data) {
        let result = {};

        let offset = data._offset;
        result.offset = {
            x: offset.x,
            y: offset.y
        };

        let type = data.__type__;
        if (type === 'cc.CircleCollider') {
            result.type = 'CircleCollider';
            result.radius = data._radius;
        }
        else if (type === 'cc.PolygonCollider') {
            result.type = 'PolygonCollider';

            let points = data.points;
            result.points = [];
            for (let i = 0, len = points.length; i < len; ++i) {
                let point = points[i];
                result.points.push({x: point.x, y: point.y});
            }
        }
        else if (type === 'cc.BoxCollider') {
            result.type = 'BoxCollider';

            let size = data._size;
            result.size = {w: size.width, h: size.height};
        }

        return result;
    }
}


module.exports = Collider;