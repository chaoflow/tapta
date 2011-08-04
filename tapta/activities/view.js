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
        panes = require('./panes'),

        GraphView = require('./graphviews').GraphView,
        model = require('./model'),
        CFG = require('./settings'),
        Controller = require('./controller');

    // An activity view creates a canvas. Its graph is drawn by a graph view.
    var ActivityView = base.View.extend({
        initialize: function() {
            _.bindAll(this,
                      'bindToModel',
                      'rake',
                      'render'
                     );
            // XXX: w00t?
            var graph = this.model && this.model.graph;

            this.layerview = this.options.layerview;

            // will be used as base for our children and to render the canvas
            this.canvasheight = CFG.canvas.height;
            this.canvaswidth = CFG.canvas.width;

            this.graphview = this.defchild(GraphView, {
                name: "graph",
                geometry: {
                    x: 10,
                    y: 10,
                    width: this.canvaswidth - 20,
                    height: this.canvasheight - 20
                }
            });

            this.bindToModel(this.model);
        },
        bindToModel: function(model) {
            this.model = model;

            this.graphview.bindToGraph(model && this.model.graph);

            if (model === undefined) return;

            // XXX: for now we just rebind if the graph changes
            var graph = this.model.graph;
            var redrawGraph = _.bind(function() {
                this.graphview.bindToGraph(graph);
                this.graphview.render(this.canvas, this.layerview.editmode);
            }, this);
            // new node was added
            graph.bind("rebind", redrawGraph);
            // node was removed
            graph.bind("remove", redrawGraph);

            // next level has to display another activity
            this.model.bind("change:raked", this.rake);
        },
        rake: function() {
            console.group("rake: "+this.abspath());
            // XXX: rethink whether this should be the layerview or model
            // tell the next layer whether and which activity to display
            var layer = this.layerview.model;
            if (layer.next) {
                var raked = this.model && this.model.get('raked');
                var activity = raked && raked.get('activity');
                console.log("Setting activity: ", activity);
                if (layer.next.activity !== activity) {
                    console.log("really");
                    layer.next.activity = activity;
                    layer.next.trigger("change:activity");
                }
            }
            console.groupEnd();
        },
        render: function() {
            // XXX: where to get flavour (mode) from? how is it changed?
            var width = this.canvaswidth,
                height = this.canvasheight;

            // initialize canvas
            if (!this.canvas) {
                this.canvas = Raphael(this.el, width, height);
                // draw rectangle around our canvas
                // XXX: if we are the toplayer it should not have round corners
                // XXX: for some reason this is not visible
                var rect = this.canvas.rect(0, 0, width, height, CFG.canvas.r_corner);
            }

            this.graphview.render(this.canvas, this.layerview.editmode);

            // tell next layer whether and which activity to display
            this.rake();

            return this;
        }
    });
    return {
        ActivityView: ActivityView
    };
});
