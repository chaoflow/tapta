// XXX: we currently use _.template and jquery templ. Should
// settle for one.
define([
    'require',
    'jquery',
    'vendor/jquery.tmpl',
    'vendor/underscore.js',
    './debug',
    './base',
    './controller',
    './model',
    './graphviews',
    './settings',
    './svgviews',
    './panes'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        panes = require('./panes'),
        SVG = require('./svgviews').SVG,
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

            // an svg drawing area - should ActivityView inherit from SVG?
            this.svg = this.append(SVG, {
                attrs: {
                    width: CFG.canvas.width,
                    height: CFG.canvas.height
                }
            });

            this.graphview = this.svg.append(GraphView, {
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
            // XXX: rethink whether this should be the layerview or model
            // tell the next layer whether and which activity to display
            var layer = this.layerview.model;
            if (layer.next) {
                var raked = this.model && this.model.get('raked');
                var activity = raked && raked.get('activity');
                if (layer.next.activity !== activity) {
                    layer.next.activity = activity;
                    layer.next.trigger("change:activity");
                }
            }
        },
        // render: function() {
        //     // XXX: normally handled by base.View
        //     this.svg.render();

        //     //this.graphview.render(this.canvas, this.layerview.editmode);
        //     // var graph = $(this.canvas.canvas).children().detach();
        //     // $(this.canvas.canvas).append("<g></g>");
        //     // $(this.canvas.canvas).children(0).append(graph);

        //     // tell next layer whether and which activity to display
        //     this.rake();

        //     return this;
        // },
        renderPan: function() {
            if (this.pan) this.pan.remove();
            // this.pan = this.canvas.rect(0, 0,
            //                             this.canvaswidth,
            //                             this.canvasheight);
            // this.pan.drag(
            //     // dndmove
            //     function(dx, dy) {
            //         // var ogeo = this.original_geometry;
            //         // this.graphview.geometry = Object.create(ogeo, {
            //         //     x: {value: 
            //         // });
            //         this.graphview.
            //     },
            //     // dndstart
            //     function() {
            //         // remember initial geometry
            //         this.original_geo = this.graphview.geometry;
            //     },
            //     // dndstop
            //     function() {
            //         delete this.original_geometry;
            //         this.renderPan();
            //     },
            //     this
            // );
        }
    });
    return {
        ActivityView: ActivityView
    };
});
