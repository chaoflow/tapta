define([
    'require',
    'jquery',
    // XXX: we currently use _.template and jquery templ. Should
    // settle for one.
    'cdn/jquery.tmpl',
    'cdn/underscore',
    'cdn/raphael.js',
    './base',
    './model',
    './settings',
    './stack',
    './panes'
], function(require) {
    var base = require('./base');
    var model = require('./model');
    var settings = require('./settings');
    var Stack = require('./stack');
    var panes = require('./panes');

    var App = base.View.extend({
        // XXX: the id should be unique
        el: $('#tapta_app'),
        initialize: function() {
            _.bindAll(this, 'render');
            this.name = "app";
            // the layers view piggy-backs on our model as
            // this.model.layers is not a collection but just a plain
            // list for now.
            this.layers = this.defchild(Layers, {
                // this element already exists in the App template
                // XXX: the id should be unique
                el: this.$('#layers'),
                model: this.model,
                name: "layers"
            });
        },
        render: function() {
            console.log("DEBUG: Rendering app");
            this.layers.render();
        }
    });

    var Layers = base.View.extend({
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
                var view = this.defchild(Layer, {
                    // at this point the elements exist in the DOM,
                    // created by the layers template
                    el: layers.$('#'+layer.name),
                    model: layer,
                    name: layer.name
                });
                view.render();
            }, this);
        }
    });

    var Layer = base.View.extend({
        // XXX: id should be unique
        template: _.template($("#layer-template").html()),
        initialize: function() {
            _.bindAll(this, 'render');
            this.model.bind("change:activity", this.render);
            // the stack catches our events and allows them to combine
            // themselves
            // XXX: it might be useful to have stacks on several
            // levels of the view hierarchy
            this.stack = new Stack(this, {consolelog: true});
        },
        render: function() {
            // XXX: We create a new activity view each time when
            // rendered, check whether/how we can change the model of
            // an existing activity.
            $(this.el).html(this.template());
            this.activity = this.defchild(Activity, {
                el: this.$('.activity'),
                model: this.model.activity,
                name: "activity"
            });
            this.activity.render();
            this.left_pane = this.defchild(panes.PaneManager, {
                el:this.$('.left-pane'),
                model:this.model,
                name: "leftpane"
            });
            this.right_pane = this.defchild(panes.PaneManager, {
                el:this.$('.right-pane'),
                model: this.model,
                name: "rightpane"
            });
            // XXX: create el beforehand
            this.left_pane.add(this.defchild(panes.PropertiesView, {
                model: this.model.activity,
                name: "props"
            }));
            // XXX: create el beforehand
            this.right_pane.add(this.defchild(panes.LibraryView, {
                model: this.model,
                name: "library"
            }));
            this.right_pane.add(this.defchild(panes.ActionbarView, { 
                model:this.model,
                name: "actionbar"
            }));
            this.left_pane.render();
            this.right_pane.render();
        }
    });

    var Activity = base.View.extend({
        initialize: function() {
            _.bindAll(this, 'render', 'getView');
            if (this.model) {
                this.model.bind("change:paths", this.render);
                // we have the same cid as our model. Therefore our child
                // views know which slot to take the ui info from.
                this.cid = this.model.cid;
            }
        },
        getView: function(element) {
            var proto;
            if (element instanceof model.Initial) {
                proto = Initial;
            } else if (element instanceof model.Final) {
                proto = Final;
            } else if (element instanceof model.Action) {
                proto = Action;
            } else if (element instanceof model.DecMer) {
                proto = DecMer;
            } else if (element instanceof model.ForkJoin) {
                proto = ForkJoin;
            } else if (element instanceof model.Edge) {
                proto = Edge;
            } else {
                throw "Unknown element";
            }
            // One node may be in several activities. Through the
            // parent relationship, the view knows from which slot
            // to take the ui info and where to render.
            return this.defchild(proto, {
                // XXX: parent should not be needed explicitly here
                parent: this,
                model: element,
                name: element.cid
            });
        },
        render: function() {
            $(this.el).html("");
            var height = settings.canvas.height;
            var width = settings.canvas.width;
            var canvas = this.canvas = Raphael(this.el[0], width, height);
            var rect = canvas.rect(0, 0, width, height, settings.canvas.r);
            if (this.model === undefined) {
                return;
            }
            var nodes = this.model.placeandroute();
            // create and render views for all nodes. the view will
            // store itself as node.ui[slot].view and is needed for drawing the
            // edges in the next step. slot is the activity.id
            var getView = this.getView;
            _.each(nodes, function(node) {
                getView(node).render();
            });

            // create and draw edges for all nodes
            var slot = this.cid;
            _.each(nodes, function(node) {
                _.each(node.ui[slot].edges, function(edge) {
                    // edges are not backbone models, we use the attr anyway
                    getView(edge).render();
                });
            });
            var layer = this.model.collection.parent;
            if (layer.next) {
                var raked = this.model.get('raked');
                layer.next.activity = raked && raked.get('activity');
                layer.next.trigger("change");
            }
        }
    });

    var xToPix = function(x) {
        return settings.gridsize.x * x;
    };
    var yToPix = function(y) {
        return settings.gridsize.y * y;
    };

    var ElementView = base.View.extend({
        constructor: function(opts) {
            this.parent = opts.parent;
            if (opts.model.ui === undefined) {
                // edges
                opts.model.view = this;
            } else {
                opts.model.ui[this.parent.cid].view = this;
            }
            base.View.apply(this, arguments);
            _.bindAll(this, "render");
            this.model.bind("change", this.render);
        }
    });

    var Node = ElementView.extend({
        initialize: function() {
            _.bindAll(this, "ui");
        },
        ui: function() {
            // return ui info for slot, grid coordinates translated
            // into pixel coordinates.
            var slot = this.parent.cid;
            return {
                x: xToPix(this.model.ui[slot].x),
                y: yToPix(this.model.ui[slot].y),
                dx: xToPix(this.model.ui[slot].dx),
                dy: yToPix(this.model.ui[slot].dy),
                edges: this.model.ui[slot].edges
            };
        }
    });

    var Initial = Node.extend({
        render: function(canvas) {
            this.canvas = canvas = canvas ? canvas : this.parent.canvas;
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
        render: function(canvas) {
            this.canvas = canvas = canvas ? canvas : this.parent.canvas;
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
        initialize: function() {
            _.bindAll(this, "rake");
            this.model.bind("change:label", this.render);
            this.model.bind("change:description", this.render);
        },
        render: function(canvas) {
            this.canvas = canvas = canvas ? canvas : this.parent.canvas;
            // calculate and draw box for action
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

            if(this.model.get("label")){
                var label = canvas.text(x + dx / 2, y + 5, this.model.get("label"));
            }
            node.push(label);

            // calculate and draw rake, lower right corner
            var rdx = dx / 3;
            var rdy = dy / 3;
            var rx = x + dx - rdx;
            var ry = y + dy - rdy;
            // XXX: make conditional, not for lowest layer - probably just a flag
            // something like getUtility would be nice, or even acquisition.
            // Did I say acquisition? yes! this.acquire(name) will go
            // up until it finds a value
            var rake = this.rake(rx, ry, rdx, rdy);
            node.push(rake);

            // XXX: should this really be here?
            var model = this.model;
            var parent = this.parent;
            rake.click(function() {
                var layer = model.collection.parent;
                if (model.get('activity') === undefined) {
                    var newact = layer.next.activities.create();
                    model.set({activity: newact});
                    model.save();
                }
                // this will trigger our layer's view and it will set
                // the correct activity for the next layer.
                // XXX: not really sure why it triggers it, but happy
                // about it.
                parent.model.set({raked: model});
                parent.model.save();
            });
            node.click(function(){
                parent.model.set({selected: this.model});
            }, this);
        },
        rake: function(x, y, dx, dy) {
            var canvas = this.canvas;
            var rect = canvas.rect(x, y, dx, dy);
            // XXX: draw rake symbol
            rect.attr({fill: "white",
                       stroke: "grey",
                       opacity: 10});
            return rect;
        }
    });

    var DecMer = Node.extend({
        render: function(canvas) {
            this.canvas = canvas = canvas ? canvas : this.parent.canvas;
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
        render: function(canvas) {
            this.canvas = canvas = canvas ? canvas : this.parent.canvas;
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

    var Edge = ElementView.extend({
        initialize: function(canvas) {
            _.bindAll(this, "insertNode");
        },
        render: function(canvas) {
            this.canvas = canvas = canvas ? canvas : this.parent.canvas;
            var sourceview = this.model.source.ui[this.parent.cid].view;
            var targetview = this.model.target.ui[this.parent.cid].view;

            // all space between nodes is allocated to edge areas.
            var x = sourceview.x_out;
            var dx = targetview.x_in - x;
            var sourceui = sourceview.ui();
            var targetui = targetview.ui();
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

            // bind to events
            area.click(this.insertNode);
        },
        insertNode: function(event) {
            var edge = this.model;
            this.parent.trigger("insert:node", [function(stack) {
                var prev = stack.last();
                if (prev === undefined) { return; }
                if (prev.event === "add") {
                    edge.insert(prev.elem);
                    stack.pop();
                }
            }]);
        }
    });

    return {
        App: App,
        Layer: Layer,
        Layers: Layers,
        Activity: Activity,
        Initial: Initial,
        Final: Final,
        Action: Action,
        DecMer: DecMer,
        ForkJoin: ForkJoin,
        Edge: Edge
    };
});