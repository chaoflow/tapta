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

            this.layer = this.options.layer;

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

            // without a model we are finished
            if (model === undefined) return;

            this.graphview.bindToGraph(this.model.graph);

            // next level has to display another activity
            this.model.bind("change:raked", this.rake);
        },
        rake: function() {
            // tell the next layer whether and which activity to display
            var layer = this.layer;
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
            var editmode = this.layer.mode.name,
                width = this.canvaswidth,
                height = this.canvasheight;

            // initialize canvas
            if (!this.canvas) {
                this.canvas = Raphael(this.el, width, height);
                // draw rectangle around our canvas
                // XXX: if we are the toplayer it should not have round corners
                // XXX: for some reason this is not visible
                var rect = this.canvas.rect(0, 0, width, height, CFG.canvas.r_corner);
            }

            this.graphview.render(this.canvas, editmode);

            // tell next layer whether and which activity to display
            this.rake();

            return this;
        }
    });
    return {
        ActivityView: ActivityView
    };
});
