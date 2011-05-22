define([
    'require',
    'jquery',
    'cdn/jquery.tmpl', // jquery templates
    'cdn/underscore',
    'cdn/backbone.js',
    'cdn/raphael.js',
    './model',
    './settings',
    './stack'
], function(require) {
    var model = require('./model');
    var settings = require('./settings');
    var Stack = require('./stack');

    var BaseView = Backbone.View.extend({
        constructor: function() {
            _.bindAll(this, "eventForwarder");
            Backbone.View.apply(this, arguments);
        },
        defchild: function(View, props) {
            if (!props) {
                props = {};
            }
            if (props.parent === undefined) {
                props.parent = this;
            }
            var child = new View(props);
            child.bind("all", this.eventForwarder);
            return child;
        },
        eventForwarder: function() {
            // call with exact same arguments as we were called
            this.trigger.apply(this, arguments);
        }
    });

    var App = BaseView.extend({
        el: $('#tapta_app'),
        initialize: function() {
            _.bindAll(this, 'render');
            // the layers view piggy-backs on our model as
            // this.model.layers is not a collection but just a plain
            // list for now.
            this.layers = this.defchild(Layers, {
                // this element already exists in the index.html
                el: this.$('#layers'),
                model: this.model
            });
        },
        render: function() {
            this.layers.render();
        }
    });

    var Layers = BaseView.extend({
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
                    // created 3 lines above
                    el: layers.$('#'+layer.name),
                    model: layer
                });
                view.render();
            }, this);
        }
    });

    var Layer = BaseView.extend({
        template: _.template($("#layer-template").html()),
        initialize: function() {
            _.bindAll(this, 'render');
            this.model.bind("change", this.render);
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
                model: this.model.activity
            });
            this.activity.render();
            this.left_pane = new PaneManager({
                model:this.model,
                el:this.$('.left-pane')
            });
            this.right_pane = new PaneManager({
                model: this.model,
                el:this.$('.right-pane')
            });
            this.left_pane.add(this.defchild(
                PropertiesView, {model: this.model.activity}
            ));
            this.left_pane.render();
            this.right_pane.add(this.defchild(
                LibraryView, {model: this.model}
            ));
            this.right_pane.add(this.defchild(ActionbarView, 
                                {model:this.model}));
            this.right_pane.render();
        }
    });

    var Activity = BaseView.extend({
        initialize: function() {
            _.bindAll(this, 'render', 'getView');
            if (this.model) {
                this.model.bind("change", this.render);
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
            return this.defchild(proto, {model: element, parent: this});
        },
        render: function() {
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

    var PaneManager = BaseView.extend({
        template: $.template(null, $("#pane_template")),
        initialize: function(){
            this.keys = [];
            this.panes = {};
            this.pane_elems = {};
        },
        add: function(view){
            var id = _.uniqueId("pane_");
            var pane_elem = $.tmpl(this.template, {id: id});
            view.el = pane_elem;
            this.keys.push(id);
            this.panes[id] = view;
            this.pane_elems[id] = pane_elem;
        },
        render: function(){
            this.el.empty();
            _(this.keys).each(function(key){
                this.el.append(this.pane_elems[key]);
                this.panes[key].render();
            }, this);
        }
    });

    var PropertiesView = Backbone.View.extend({
        template: $.template($("#properties_template")),
        initialize: function(){
            _.bindAll(this, "handle_update");
        },
        handle_update: function(){
            if(this.elem instanceof model.Action){
                this.elem.set({
                    label: this.el.find("input[name=label]").val(),
                    description: this.el.find("input[name=description]").val()
                });
                this.elem.save();
            }
        },
        render: function(){
            if(this.model === undefined){
                return;
            }
            if(this.model.get("selected") === undefined) {
                return;
            }
            var elem = this.model.get("selected");
            this.elem = elem;
            this.el.empty();
            var attrs = {};
            if(elem instanceof model.Action){
                attrs.hidden = {
                    id: elem.id,
                    cid: elem.cid
                };
                attrs.singleline = {
                    label: elem.get("label") || ""
                };
                attrs.multiline = {
                    description: elem.get("description") || ""
                };
            }
            $.tmpl(this.template, attrs).appendTo(this.el);
            this.el.find('input[type=button]').unbind().bind("click", this.handle_update);
        }
    });

    var LibraryView = BaseView.extend({
        template: $.template($("#library_template")),
        events: {
            "click li" : "clicked"
        },
        render: function(){
            if(this.model === undefined){
                return;
            }
            var attrs = {};
            attrs.id = this.id; 
            this.id = _.uniqueId();
            var actions = _(
                _(this.model.actions.models).map(function(action){
                    return {id: action.id, label: action.get("label")};
                })).filter(function(action){
                    return action.label !== undefined;
                });
            attrs.action = actions;
            $.tmpl(this.template, attrs).appendTo(this.el);
            this.delegateEvents(this.events);
        },
        clicked: function(event){
            var node = this.model.actions.get(event.target.id);
            if(this.model.activity.indexOf(node) == -1){
                this.model.activity.actions.add(node);
                $(event.target).addClass("highlight");
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "library_add",
                                node: node,
                                activity: this.model.activity});
                }]);;
            }
        }
    });

    var ActionbarView = BaseView.extend({
        template: $.template($("#actionbar_template")),
        events: {
            "click li" : "clicked"
        },
        render: function(){
            $.tmpl(this.template, {}).appendTo(this.el);
            this.delegateEvents(this.events);
        },
        clicked: function(event){
            var key = event.target.getAttribute('class');
            $(event.target).addClass("highlight");
            var node = undefined;
            var activity = this.model.activity;
            if(key == "add_action"){
                node = new this.model.actions.model();
                this.model.actions.add(node);
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "actionbar:add_action",
                                elem: node,
                                activity: activity});
                }]);
            }else if(key == "add_dec"){
                node = new this.model.decmers.model();
                this.model.decmers.add(node);
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "actionbar:add_dec",
                                elem: node,
                                activity: activity});
                }]);
            }else if(key == "add_fork"){
                node = new this.model.forkjoins.model();
                this.model.forkjoins.add(node);
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "actionbar:add_fork",
                                elem: node,
                                activity: activity});
                }]);
            }else if(key == "delete"){
                this.trigger("add", [function (stack){
                    stack.push({event: "delete",
                                detailed_event: "actionbar:delete",
                                activity: activity});
                }]);
            }
        }
    });

    var xToPix = function(x) {
        return settings.gridsize.x * x;
    };
    var yToPix = function(y) {
        return settings.gridsize.y * y;
    };

    var ElementView = BaseView.extend({
        constructor: function(opts) {
            this.parent = opts.parent;
            if (opts.model.ui === undefined) {
                // edges
                opts.model.view = this;
            } else {
                opts.model.ui[this.parent.cid].view = this;
            }
            BaseView.apply(this, arguments);
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
        initialize: function() {
            _.bindAll(this, "render");
        },
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
        initialize: function() {
            _.bindAll(this, "render");
        },
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
            _.bindAll(this, "render", "rake");
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
        initialize: function() {
            _.bindAll(this, "render");
        },
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
        initialize: function() {
            _.bindAll(this, "render");
        },
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
            _.bindAll(this, "render", "insertNode");
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
