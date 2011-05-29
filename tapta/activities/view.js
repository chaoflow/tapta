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
    './panes'
], function(require) {
    var base = require('./base');
    var model = require('./model');
    var settings = require('./settings');
    var panes = require('./panes');

    var App = base.View.extend({
        // XXX: the id should be unique
        el: $('#tapta_app'),
        initialize: function() {
            _.bindAll(this, 'render');
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
            var app = this;
            this.$("#destroyall").click(function() {
                localStorage.clear();
                app.model.fetch();
                app.render();
            });
        },
        render: function() {
            // we were not defined by defchild, no render wrapper
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
            this.children = _.map(
                this.model.layers.concat().reverse(),
                function(layer) { 
                    var child = this.defchild(Layer, {
                        model: layer,
                        name: layer.name
                    });
                    return child;
                }, this
            );           
        },
        render: function() {
            var layers = this;
            $(this.el).html(this.template({layers: this.model.layers}));
            _.each(this.children, function(child) { 
                // at this point the elements exist in the DOM,
                // created by the layers template
                child.el = layers.$('#'+child.name);
                child.render();
            }, this);
        }
    });

    var Layer = base.View.extend({
        logevents: true,
        template: _.template($("#layer-template").html()),
        initialize: function() {
            this.mode = {name:"selecting"};
            _.bindAll(this, "activityChanged", 'render', "bindEvents");
            this.model.bind("change:activity", this.activityChanged);

            // initialize our child views
            this.activity = this.defchild(Activity, {
                model: this.model.activity,
                name: "activity"
            });
            this.left_pane = this.defchild(panes.PaneManager, {
                model:this.model,
                name: "leftpane"
            });
            this.right_pane = this.defchild(panes.PaneManager, {
                model: this.model,
                name: "rightpane"
            });

            this.bindEvents();
        },
        bindEvents: function() {
            // The element views catch DOM events and translate them
            // into user acts, they are executed here.
            // 
            // XXX: In case the whole act processing is moved to app level
            // it is the responsibility of the layer to catch all events
            // and enrich them with layermodel:this.model.
            //
            // XXX: the whole thing still feels rough. If we are in
            // delete mode and a rake is clicked, should it rake or the
            // node be delete. Currently it would rake, as the the
            // rake.click event handler already makes the decision
            // what the click means.
            this.bind("act:rake", function(load) {
                var actionmodel = load[0];
                var layermodel = this.model;
                // If the action model does not point to an activity
                // yet, create an activity in the next layer and assign
                // it.
                if (actionmodel.get('activity') === undefined) {
                    var newact = layermodel.next.activities.create();
                    actionmodel.set({activity: newact});
                    actionmodel.save();
                }
                // remember for the activity being displayed on the
                // current layer which activity to display on the next
                // layer.
                this.activity.model.set({raked: actionmodel});
                this.activity.model.save();
            });
            this.bind("act:select:node", function(load) {
                var actionmodel = load[0];
                this.model.set({selected: actionmodel});
            });

            // Events that have no immediate effect, but are used to
            // change the mode. The mode influences rendering of
            // ctrlareas.
            this.bind("mode:selecting", function(load) {
                this.mode = _.extend({name: "selecting"});
                this.trigger("change:mode");
            });
            this.bind("mode:addingnewnode", function(load) {
                this.mode = _.extend({name: "addingnewnode"}, load[0]);
                this.trigger("change:mode");
            });
            this.bind("mode:removing", function(load) {
                this.mode = {name: "removing"};
                this.trigger("change:mode");
            });

            // rerender activity on mode change
            this.bind("change:mode", this.activity.render);
            
            // Events that need a mode to be processed
            this.bind("act:addtoedge", function(load) {
                if (this.mode.name !== "addingnewnode") { return; }
                var edgemodel = load[0];
                var node = this.mode.collection.create();
                edgemodel.insert(node);
            });
            this.bind("act:addnewpath", function(load) {
                if (this.mode.name !== "addingnewnode") { return; }
                var node = this.mode.collection.create();
                this.activity.model.paths.newpath(_.extend(load, {
                    nodes: [node]
                }));
                // XXX: workaround: we currently don't catch the model event
                this.activity.render();
            });
            this.bind("act:remove", function(load) {
                var nodemodel = load[0];
                this.activity.model.remove(nodemodel);
                this.activity.render();
            });
        },
        activityChanged: function() {
            this.activity.bindToModel(this.model.activity);
            this.activity.render();
        },
        render: function() {
            $(this.el).html(this.template());
            this.activity.el = this.$('.activity');
            this.activity.render();
            this.left_pane.el = this.$('.left-pane');
            this.right_pane.el = this.$('.right-pane');

            // XXX: initialize beforehand?
            this.left_pane.add(this.defchild(panes.PropertiesView, {
                model: this.model.activity,
                name: "props"
            }));
            // XXX: initialzie beforehand?
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
            _.bindAll(this,
                      'render',
                      'bindToModel',
                      'rake',
                      'getView'
                     );
            this.bindToModel(this.model);
        },
        bindToModel: function(model) {
            this.model = model;
            
            // without a model we are finished
            if (model === undefined) { return; }

            // we have the same cid as our model. Therefore our child
            // views know which slot to take the ui info from.
            this.cid = this.model.cid;

            // adding a node to a path triggers a change event for
            // the path which is caught on its collection
            this.model.paths.bind("change", this.render);

            // next level has to display another activity
            this.model.bind("change:raked", this.rake);
        },
        rake: function() {
            // tell the next layer whether and which activity to display
            var layer = this.parent.model;
            if (layer.next) {
                var raked = this.model && this.model.get('raked');
                var activity = raked && raked.get('activity');
                if (layer.next.activity !== activity) {
                    layer.next.activity = activity;
                    layer.next.trigger("change:activity");
                }
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
            var mode = this.parent.mode;
            // reset element
            $(this.el).html("");

            // initialize canvas
            var height = settings.canvas.height;
            var width = settings.canvas.width;
            var canvas = this.canvas = Raphael(this.el[0], width, height);
            var rect = canvas.rect(0, 0, width, height, settings.canvas.r);

            this.rake();

            // finished if we have no model, i.e. the upper level did not rake one
            if (this.model === undefined) { return; }

            // get nodes with ui information
            var nodes = this.model.placeandroute();

            // create and render views for all nodes. the view will
            // store itself as node.ui[slot].view and is needed for drawing the
            // edges in the next step. slot is the activity.cid
            _.each(nodes, function(node) {
                this.getView(node).render(mode);
            }, this);

            // create and draw edges for all nodes
            _.each(nodes, function(node) {
                _.each(node.ui[this.cid].outgoing, function(edge) {
                    this.getView(edge).render(mode);
                }, this);
            }, this);
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
        render: function(mode) {
            var canvas = this.parent.canvas;
            // ui contains position and size of the whole available area
            var ui = this.ui();
            var set = this.set = canvas.set();
            _.each([
                "outgoingEdges",
                "symbol",
                "removearea",
                "ctrlareas"
            ], function(item) {
                var elem = this[item](canvas, ui, mode);
                if (elem) {
                    set.push(elem);
                    this.elems = this.elems || {};
                    this.elems[item] = elem;
                }
            }, this);
        },
        outgoingEdges: function(canvas, ui) {
            //
        },
        removable: function() { return false; },
        removearea: function(canvas, ui, mode) {
            var area;
            if ((mode.name === "removing") && this.removable(mode)) {
                area = canvas.rect(ui.x, ui.y, ui.dx, ui.dy);
                area.attr({fill: "red", opacity:"0.15"});
                area.click(function() {
                    this.trigger("act:remove", [this.model]);
                }, this);
            }
            return area;
        },
        ctrlareas: function() {},
        ui: function() {
            // return ui info for slot, grid coordinates translated
            // into pixel coordinates.
            var slot = this.parent.cid;
            return {
                x: xToPix(this.model.ui[slot].x),
                y: yToPix(this.model.ui[slot].y),
                dx: xToPix(this.model.ui[slot].dx),
                dy: yToPix(this.model.ui[slot].dy),
                incoming: this.model.ui[slot].incoming,
                outgoing: this.model.ui[slot].outgoing
            };
        }
    });

    var Initial = Node.extend({
        symbol: function(canvas, ui, mode) {
            // get ui position and size in pixels
            var r = settings.node.initial.r;

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
        removable: function() {
            var slot = this.parent.cid;
            var previousnode = this.ui().incoming[0].source;
            return previousnode instanceof model.MIMO
                && previousnode.ui[slot].outgoing.length > 1;
        },
        symbol: function(canvas, ui, mode) {
            // get ui position and size in pixels
            var r = settings.node.final.r;

            // calculate pixel size and position of circle, vertically
            // centered, horizontally left-aligned in the ui of the
            // node.
            var x = ui.x + r + (xToPix(1) - 2*r) / 2;
            var y = ui.y + r + (ui.dy - 2*r) / 2;

            this.x_in = ui.x + xToPix(1) / 2 - r;

            var symbol = canvas.set();
            var outer = canvas.circle(x, y, r);
            outer.attr({fill: settings.node.fillcolor,
                        stroke: settings.node.bordercolor,
                        "stroke-width": settings.node.borderwidth});
            symbol.push(outer);

            var inner = canvas.circle(x, y, r - settings.node.final.dr);
            inner.attr({fill: settings.node.bordercolor,
                        stroke: settings.node.bordercolor,
                        "stroke-width": settings.node.borderwidth});
            symbol.push(inner);
            return symbol;
        }
    });

    var Action = Node.extend({
        initialize: function() {
            this.model.bind("change:label", this.render);
        },
        removable: function() { return true; },
        symbol: function(canvas, ui, mode) {
            // calculate and draw box for action
            var dx = settings.node.action.dx;
            var dy = settings.node.action.dy;
            var x = ui.x + (ui.dx - dx) / 2;
            var y = ui.y + (ui.dy - dy) / 2;
            this.x_in = x;
            this.x_out = x + dx;
            // XXX: what are we using / going to use sets for?
            var node = canvas.set();
            var rect = canvas.rect(x, y, dx, dy, settings.node.action.r);
            rect.attr({fill: settings.node.fillcolor,
                       stroke: settings.node.bordercolor,
                       "stroke-width": settings.node.borderwidth});
            node.push(rect);

            if(this.model.get("label")){
                var label = canvas.text(x + dx / 2,
                                        y + 5,
                                        this.model.get("label"));
                node.push(label);
            }
            return node;
        },
        ctrlareas: function(canvas, ui, mode) {
            var ctrl;
            if (mode.name === "selecting") {
                ctrl = this.rakeArea(canvas, ui);
            }
            return ctrl;
        },
        rakeArea: function(canvas, ui) {
            var symbol = this.elems.symbol[0].attrs;
            // calculate and draw rake, lower right corner
            var rdx = symbol.width / 3;
            var rdy = symbol.height / 3;
            var rx = symbol.x + symbol.width - rdx;
            var ry = symbol.y + symbol.height - rdy;
            // XXX: make conditional, not for lowest layer - probably just a flag
            // something like getUtility would be nice, or even acquisition.
            // Did I say acquisition? yes! this.acquire(name) will go
            // up until it finds a value
            var rake = canvas.set();
            var rect = canvas.rect(rx, ry, rdx, rdy);
            rect.attr({fill: "white",
                       stroke: "grey",
                       opacity: 10});
            // XXX: draw rake symbol
            rake.push(rect);

            // translate DOM events to user acts
            rake.click(function() {
                this.trigger("act:rake", [this.model]);
            }, this);
            this.elems.symbol.click(function(){
                this.trigger("act:select:node", [this.model]);
            }, this);
            return rake;
        }
    });

    var MIMO = Node.extend({
        removable: function() {
            var ui = this.ui();
            return ui.incoming.length === 1 && ui.outgoing.length === 1;
        },
        ctrlareas: function(canvas, ui, mode) {
            var ctrlarea;
            // XXX: introduce mode classes:
            // draggingnode, addingnewnode, addinglibnode
            if (mode.name === "addingnewnode") {
                var N = ui.outgoing.length + 1;
                var cy = ui.y;
                for (var i=0; i<N; i++) {
                    // dy for the control area
                    var cdy = ui.dy / (N - 1);
                    if ((i === 0) || (i === N -1)) {
                        cdy = cdy / 2;
                    }
                    ctrlarea = canvas.rect(ui.x, cy, ui.dx, cdy);
                    cy += cdy;
                    ctrlarea.attr({fill: "yellow",
                                   stroke: "grey",
                                   "fill-opacity": "0.2"});
                    ctrlarea.click(function(idx) {
                        return function() {
                            this.trigger("act:addnewpath", {
                                start: this.model,
                                idx: idx
                            });
                        };
                    }(i), this);
                }
            }
            return ctrlarea;
        }
    });

    var DecMer = MIMO.extend({
        symbol: function(canvas, ui) {
            // we draw a rect and then rotate it 45 degress
            var dx = settings.node.action.dx;
            dx = Math.sqrt((Math.pow((dx / 2), 2) * 2));
            var x = ui.x + (ui.dx - dx) / 2;
            var y = ui.y + (ui.dy - dx) / 2;
            this.x_in = ui.x + (ui.dx - settings.node.action.dx) / 2;
            this.x_out = ui.x + ui.dx / 2 + settings.node.action.dx / 2;
            var node = canvas.set();
            var rect = canvas.rect(x, y, dx, dx, 0);
            // XXX: can we do that in CSS and just add a class here?
            rect.attr({fill: settings.node.fillcolor,
                       stroke: settings.node.bordercolor,
                       "stroke-width": settings.node.borderwidth});
            rect.rotate(45);
            return rect;
        }
    });
    
    var ForkJoin = MIMO.extend({
        symbol: function(canvas, ui, mode) {
            var dx = settings.node.forkjoin.dx;
            var pad = settings.node.forkjoin.pad;
            var x = ui.x + (ui.dx - dx) / 2;
            var y = ui.y + pad;
            var dy = ui.dy - 2 * pad;
            this.x_in = x;
            this.x_out = x + dx;
            var rect = canvas.rect(x, y, dx, dy, 0);
            rect.attr({fill: settings.node.fillcolor,
                       stroke: settings.node.bordercolor,
                       "stroke-width": settings.node.borderwidth});
            return rect;
        }
    });

    var Edge = ElementView.extend({
        // XXX: unify with node rendering?
        render: function(mode) {
            var canvas = this.parent.canvas;
            var ui = this.ui();

            // The edge is drawn as an SVG path, see:
            // http://www.w3.org/TR/SVG/paths.html#PathData
            // the line
            var x0 = ui.x;
            var y0 = ui.y + ui.dy / 2;
            var x1 = ui.x + ui.dx;
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

            var droparea = canvas.set();
            // edge area, depending on the mode we
            // make it visible as a drop target.
            // XXX: use css with classes .droptarget and set class here
            var rect = canvas.rect(ui.x, ui.y, ui.dx, ui.dy);
            if (mode.name === "addingnewnode") {
                rect.attr({fill: "green", stroke: "grey", "fill-opacity":"0.2"});
            } else {
                rect.attr({fill: "white", opacity: 0});
            }
            droparea.push(rect);

            // draw the arrow
            var arrow = canvas.path(svgpath);
            arrow.attr({stroke: settings.edge.color,
                        "stroke-width": settings.edge.strokewidth});
            droparea.push(arrow);

            // translate DOM events to user acts
            droparea.click(function() {
                // we only know that something is added to an edge a
                // previous event defined what is going to be added.
                this.trigger("act:addtoedge", [this.model]);
            }, this);
        },
        ui: function() {
            // return ui info, grid coordinates translated
            // into pixel coordinates.
            var ui = this.model.get('ui');
            return {
                x: xToPix(ui.x),
                y: yToPix(ui.y),
                dx: xToPix(ui.dx),
                dy: yToPix(ui.dy)
            };
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
