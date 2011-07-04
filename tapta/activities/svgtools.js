define([
    'require',
    'vendor/raphael.js',
    './functional'
], function(require) {
    // Draw a line connecting the given points with an arrow head at the end
    // points is a list of tuples [[x0, y0], [x1, y1]]
    // The edge is drawn as an SVG path, see:
    // http://www.w3.org/TR/SVG/paths.html#PathData
    var svgarrow = function(canvas, points, adx, ady) {
        if (points.length < 2) throw "Need at least two points!";
        // svgpath = "M x0 y0 L x1 y1 L x2 y2 ..."
        var svgpath = ["M"]
                .concat(foldl1("acc, p -> acc.concat('L', p[0], p[1])", points))
                .concat("m", -adx, -ady, "l", adx, ady, "l", -adx, ady)
                .join(" "),
            symbol = canvas.path(svgpath);
        return symbol;
    };

    return {
        svgarrow: svgarrow
    };
});
