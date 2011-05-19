define([
    'require',
    'jquery',
    'cdn/jquery.tmpl', // XXX: what's that?
    'cdn/underscore',
    'cdn/backbone.js',
    './model',
    './settings'
], function(require) {
    var model = require('./model');
    var settings = require('./settings');

    var App = Backbone.View.extend({
        el: $('#tapta_app'),
        initialize: function() {
            _.bindAll(this, 'render');
            // the layers view piggy-backs on our model as
            // this.model.layers is not a collection but just a plain
            // list for now.
            this.layers = new Layers({
                // this element already exists in the index.html
                el: this.$('#layers'),
                model: this.model
            });
        },
        render: function() {
            this.layers.render();
        }
    });

    var Layers = Backbone.View.extend({
        template: _.template(
            '<% _.each(layers, function(layer) {%>'
                + '<div id="<%= layer.name %>" class="layer"></div>'
                + '<%});%>'
        ),
        initialize: function() {
            _.bindAll(this, 'render');
        },
        render: function() {
            var layers = this;
            $(this.el).html(this.template({layers: this.model.layers}));
            _.each(this.model.layers, function(layer) { 
                var view = new Layer({
                    // at this point the elements exist in the DOM, created 3 lines above
                    el: layers.$('#'+layer.name),
                    model: layer
                });
                view.render();
            });
        }
    });

    var Layer = Backbone.View.extend({
        template: _.template($("#layer-template").html()),
        initialize: function() {
            _.bindAll(this, 'render');
        },
        render: function() {
            // XXX: We create a new activity view each time when
            // rendered, check whether/how we can change the model of
            // an existing activity.
            $(this.el).html(this.template());
            this.activity = new Activity({
                el: this.$('#activity'),
                model: this.model.activity || this.model.get('activity')
            });
            this.activity.render();
        }
    });

    var Activity = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this, 'render');
        },
        render: function() {
            height = settings.canvas.height;
            width = settings.canvas.width;
            var canvas = this.canvas = Raphael(this.el[0], width, height);
            var rect = canvas.rect(0, 0, width, height, settings.canvas.r);
            var nodes = this.model.placeandroute();
            // create and render views for all nodes. the view will
            // store itself as node.view and is needed for drawing the
            // edges in the next step.
            _.each(nodes, function(node) {
                getView(node).render(canvas);
            });

            // create and draw edges for all nodes
            _.each(nodes, function(node) {
                _.each(node.edges, function(edge) {
                    // edges are not backbone models, we use the attr anyway
                    view = new Edge({model: edge});
                    view.render(canvas);
                });
            });
        }
    });

    var getView = function(node) {
        var proto;
        if (node instanceof model.Initial) {
            proto = Initial;
        } else if (node instanceof model.Final) {
            proto = Final;
        } else if (node instanceof model.Action) {
            proto = Action;
        } else if (node instanceof model.DecMer) {
            proto = DecMer;
        } else if (node instanceof model.ForkJoin) {
            proto = ForkJoin;
        } else {
            throw "Unknown node";
        }
        return new proto({model: node});
    };

    var xToPix = function(x) {
        return settings.gridsize.x * x;
    };
    var yToPix = function(y) {
        return settings.gridsize.y * y;
    };

    var Node = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this, 'render', 'renderNode', 'ui');
            this.model.view = this;
        },
        render: function(canvas) {
            // render the node
            this.renderNode(canvas);
        },
        renderNode: function(canvas) {},
        ui: function() {
            // translate the grid coordinates into pixel coordinates
            return {
                x: xToPix(this.model.ui.x),
                y: yToPix(this.model.ui.y),
                dx: xToPix(this.model.ui.dx),
                dy: yToPix(this.model.ui.dy)
            };
        }
    });

    var Edge = Backbone.View.extend({
        render: function(canvas) {
            // all space between nodes is allocated to edge areas.
            var x = this.model.source.view.x_out;
            var dx = this.model.target.view.x_in - x;
            sourceui = this.model.source.view.ui();
            targetui = this.model.target.view.ui();
            var y = sourceui.y > targetui.y ? sourceui.y : targetui.y;
            var dy = sourceui.dy < targetui.dy ? sourceui.dy : targetui.dy;
           
            // The edge is drawn as an SVG path, see:
            // http://www.w3.org/TR/SVG/paths.html#PathData
            // the line
            var x0 = x;
            var y0 = y + dy / 2;
            var x1 = x + dx;
            var y1 = y0;
            var svgpath = _.template(
                "M <%= x0 %> <%= y0 %> L <%= x1 %> <%= y1 %>")({
                x0:x0, y0:y0, x1:x1, y1:y1});
         
            // and the arrow head 
            var adx = settings.edge.arrow.dx;
            var ady = settings.edge.arrow.dy;
            // xl/yl left - xr/yr right when looking in direction of arrow
            var xl = x1 - adx;
            var yl = y1 - ady / 2;
            var xr = xl;
            var yr = y1 + ady / 2;
            svgpath += _.template(
                " L <%= xl %> <%= yl %> M <%= x1 %> <%= y1 %>"
                    + " L <%= xr %> <%= yr %>"
            )({xl:xl, yl:yl, x1:x1, y1:y1, xr:xr, yr:yr});

            // draw the arrow
            var arrow = canvas.path(svgpath);
            arrow.attr({stroke: settings.edge.color,
                        "stroke-width": settings.edge.strokewidth});

            // and the edge area above it
            var area = canvas.rect(x, y, dx, dy);
            area.attr({fill: "#F0F0F0",
                       stroke: "grey",
                       opacity: 0});

            // XXX: dummy action
            area.click(function() { area.attr({
                stroke: "red",
                opacity:50});});
        }
    });

    var Initial = Node.extend({
        renderNode: function(canvas) {
            // get ui position and size in pixels
            var r = settings.node.initial.r;
            var ui = this.ui();

            // calculate pixel size and position of circle, centered
            // in the ui of the node.
            var x = ui.x + r + (ui.dx - 2*r) / 2;
            var y = ui.y + r + (ui.dy - 2*r) / 2;

            this.x_out = ui.x + ui.dx / 2 + r;

            // draw the circle - XXX: only one thing in the set?
            var node = canvas.set();
            var circle = canvas.circle(x, y, r);
            circle.attr({fill: settings.node.bordercolor,
                         stroke: settings.node.bordercolor,
                         "stroke-width": settings.node.borderwidth});
            node.push(circle);
        }
    });

    var Final = Node.extend({
        renderNode: function(canvas) {
            // get ui position and size in pixels
            var r = settings.node.final.r;
            var ui = this.ui();

            // calculate pixel size and position of circle, vertically
            // centered, horizontally left-aligned in the ui of the
            // node.
            var x = ui.x + r + (xToPix(1) - 2*r) / 2;
            var y = ui.y + r + (ui.dy - 2*r) / 2;

            this.x_in = ui.x + xToPix(1) / 2 - r;

            var node = canvas.set();
            var outer = canvas.circle(x, y, r);
            outer.attr({fill: settings.node.fillcolor,
                        stroke: settings.node.bordercolor,
                        "stroke-width": settings.node.borderwidth});
            node.push(outer);

            var inner = canvas.circle(x, y, r - settings.node.final.dr);
            inner.attr({fill: settings.node.bordercolor,
                        stroke: settings.node.bordercolor,
                        "stroke-width": settings.node.borderwidth});
            node.push(inner);
        }        
    });

    var Action = Node.extend({
        renderNode: function(canvas) {
            var dx = settings.node.action.dx;
            var dy = settings.node.action.dy;
            var ui = this.ui();
            var x = ui.x + (ui.dx - dx) / 2;
            var y = ui.y + (ui.dy - dy) / 2;
            this.x_in = x;
            this.x_out = x + dx;
            var node = canvas.set();
            var rect = canvas.rect(x, y, dx, dy, settings.node.action.r);
            rect.attr({fill: settings.node.fillcolor,
                        stroke: settings.node.bordercolor,
                        "stroke-width": settings.node.borderwidth});
            node.push(rect);
        }
    });

    var DecMer = Node.extend({
        renderNode: function(canvas) {
            var dx = settings.node.action.dx;
            var ui = this.ui();
            dx = Math.sqrt((Math.pow((dx / 2), 2) * 2));
            var x = ui.x + (ui.dx - dx) / 2;
            var y = ui.y + (ui.dy - dx) / 2;
            this.x_in = ui.x + (ui.dx - settings.node.action.dx) / 2;
            this.x_out = ui.x + ui.dx / 2 + settings.node.action.dx / 2;
            var node = canvas.set();
            var rect = canvas.rect(x, y, dx, dx, 0);
            rect.attr({fill: settings.node.fillcolor,
                       stroke: settings.node.bordercolor,
                       "stroke-width": settings.node.borderwidth});
            rect.rotate(45);
            node.push(rect);
        }
    });
    
    var ForkJoin = Node.extend({
        renderNode: function(canvas) {
            var dx = settings.node.forkjoin.dx;
            var pad = settings.node.forkjoin.pad;
            var ui = this.ui();
            var x = ui.x + (ui.dx - dx) / 2;
            var y = ui.y + pad;
            var dy = ui.dy - 2 * pad;
            this.x_in = x;
            this.x_out = x + dx;
            var node = canvas.set();
            var rect = canvas.rect(x, y, dx, dy, 0);
            rect.attr({fill: settings.node.fillcolor,
                       stroke: settings.node.bordercolor,
                       "stroke-width": settings.node.borderwidth});
            node.push(rect);
        }
    });

    return {
        App: App,
        Layer: Layer,
        Layers: Layers,
        Activity: Activity,
        getView: getView,
        Initial: Initial,
        Final: Final,
        Action: Action,
        DecMer: DecMer,
        ForkJoin: ForkJoin
    };
});
