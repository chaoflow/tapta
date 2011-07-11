// XXX: we currently use _.template and jquery templ. Should
// settle for one.
define([
    'require',
    'jquery',
    'vendor/jquery.tmpl',
    'vendor/underscore.js',
    'vendor/raphael.js',
    './debug',
    './base',
    './controller',
    './model',
    './graphviews',
    './settings',
    './panes'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        GraphView = require('./graphviews').GraphView,
        model = require('./model'),
        panes = require('./panes'),
        CFG = require('./settings'),
        Controller = require('./controller');

    var Layers = base.View.extend({
        template: _.template(
            '<% _.each(layers, function(layer) {%>'
                + '<div id="<%= layer.name %>" class="layer"></div>'
                + '<%});%>'
        ),
        initialize: function() {
            _.bindAll(this, 'render');
            // this.children = _.map(
            //     this.model.layers.concat().reverse(),
            //     function(layer) {
            //         var child = this.defchild(Layer, {
            //             model: layer,
            //             name: layer.name
            //         });
            //         return child;
            //     },
            //     this
            // ).reverse();
            // for (var i=0; i<this.children.length; i++) {
            //     this[i] = this.children[i];
            // }
        }
//        render: function() {
            // var layers = this;
            // $(this.el).html(this.template({layers: this.model.layers}));
            // _.each(this.children, function(child) {
            //     // at this point the elements exist in the DOM,
            //     // created by the layers template
            //     child.el = layers.$('#'+child.name);
            //     child.render();
            // }, this);
//        }
    });

    var Layer = base.View.extend({
        logevents: true,
        template: _.template($("#layer-template").html()),
        initialize: function() {
            this.mode = {name:"selecting"};
            _.bindAll(this, "activityChanged", 'render', "bindEvents");
            this.model.bind("change:activity", this.activityChanged);

            // initialize our child views
            this.activity = this.defchild(ActivityView, {
                model: this.model.activity,
                name: "activity"
            });
            this.left_pane = this.defchild(panes.PaneManager_, {
                model:this.model,
                name: "leftpane"
            });
            this.right_pane = this.defchild(panes.PaneManager_, {
                model: this.model,
                name: "rightpane"
            });

            var controller = new Controller(this);
            this.bind("all", controller.handler);

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
//            this.bind("change:mode", this.activity.render);

            // Events that need a mode to be processed
            this.bind("act:addtoedge", function(load) {
                if (this.mode.name !== "addingnewnode") { return; }
                var edgemodel = load[0];
                var node = this.mode.collection.create();
                edgemodel.insert(node);
            });
            this.bind("act:addnewpath", function(load) {
                if (this.mode.name !== "addingnewnode") { return; }
                // XXX: confusing; this.mode vs this.model
                var node = this.mode.collection.create();
                var final = this.model.finals.create();
                this.activity.model.paths.newpath(_.extend(load, {
                    nodes: [node, final]
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

    // An activity view creates a canvas. Its graph is drawn by a graph view.
    // XXX: needs to be reworked as a pane manager
    var ActivityView = base.View.extend({
        initialize: function() {
            _.bindAll(this,
                      'bindToModel',
                      'rake',
                      'render'
                     );
            var graph = this.model && this.model.graph;

            // XXX: will change a bit once we are a pane manager
            // will be used as base for our children and to render the canvas
            this.height = CFG.canvas.height;
            this.width = CFG.canvas.width;

            this.graphview = this.defchild(GraphView, {
                name: "graph",
                geometry: {
                    x: 10,
                    y: 10,
                    width: this.width - 20,
                    height: this.height - 20
                }
            });

            this.bindToModel(this.model);
        },
        bindToModel: function(model) {
            this.model = model;

            // without a model we are finished
            if (model === undefined) return;

            this.graphview.bindToGraph(this.model.graph);

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
        render: function() {
            // XXX: where to get flavour (mode) from? how is it changed?
            var editmode = this.parent.mode.name,
                width = this.canvaswidth,
                height = this.canvasheight;

            // initialize canvas
            if (!this.canvas) {
                this.canvas = Raphael(this.el[0], width, height);
                // draw rectangle around our canvas
                // XXX: if we are the toplayer it should not have round corners
                // XXX: for some reason this is not visible
                var rect = this.canvas.rect(0, 0, width, height, CFG.canvas.r_corner);
            }

            // tell next layer whether and which activity to display
            this.rake();
            this.graphview.render(this.canvas, editmode);
        }
    });
    return {
        Layer: Layer,
        Layers: Layers,
        Activity: ActivityView
    };
});
