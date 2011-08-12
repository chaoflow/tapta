define([
    'require',
    './debug',
    './base'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base');

    var SVGElement = base.View.extend({
        xmlns: "http://www.w3.org/2000/svg"
    });

    // XXX:
    // the name is used as a CSS class but feels rather pointless here.
    // The whole "what classes are set on an element" is still a bit
    // rough, also check base.View for that

    var SVG = SVGElement.extend({
        name: "svg",
        tagName: "svg",
        attrs: {
            version: "1.1"
        }
    });

    var Circle = SVGElement.extend({
        name: "circle",
        tagName: "circle"
    });

    var Group = SVGElement.extend({
        name: "group",
        tagName: "g"
    });

    var Rect = SVGElement.extend({
        name: "rectangle",
        tagName: "rect"
    });

    var Diamond = Rect.extend({
        name: "diamond"
    });
    Object.defineProperties(Diamond.prototype, {
        attrs: {get: function() {
            var edgelength = this.options.r * Math.sqrt(2);
            return {
                x: this.options.cx - edgelength / 2,
                y: this.options.cy - edgelength / 2,
                width: edgelength,
                height: edgelength
            };
        }}
    });

    // http://www.w3.org/TR/SVG/paths.html#PathData
    // capital L/M are absolute, lowercase they are relative
    var Path = SVGElement.extend({
        tagName: "path",
        render: function() {
            var path = 'M' + map('p.join()', this.options.points).join('L');
            if (this.arrowhead) {
                path += this.arrowhead;
            }
            this.el.setAttribute("d", path);
            return this;
        }
    });
    Object.defineProperties(Path.prototype, {
        arrowhead: {get: function() {
            var a = this.options.arrowhead;
            return a ? "m" + map('p.join()', [[-a.dx, -a.dy],
                                              [a.dx, a.dy],
                                              [-a.dx, a.dy]]).join("l") : "";
        }}
    });

    return {
        Circle: Circle,
        Diamond: Diamond,
        Group: Group,
        Path: Path,
        Rect: Rect,
        SVG: SVG
    };
});
