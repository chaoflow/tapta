// XXX: we currently use _.template and jquery templ. Should
// settle for one.
define([
    'require',
    'jquery',
    'vendor/jquery.tmpl',
    'vendor/underscore.js',
    './debug',
    './base',
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
        CFG = require('./settings');

    // An activity view creates a canvas. Its graph is drawn by a graph view.
    var ActivityView = base.View.extend({
        initialize: function() {
            _.bindAll(this, 'bindToModel');
            this.layerview = this.options.layerview;

            // an svg drawing area - should ActivityView inherit from
            // SVG or do we have some non-svg activity things to display?
            this.svg = new SVG();
            this.append(this.svg);

            this.graphview = new GraphView({
                geometry: {
                    x: 10,
                    y: 10
                }
            });
            this.svg.append(this.graphview);

            this.bindToModel(this.model);
        },
        bindToModel: function(activity) {
            this.model = activity;

            this.graphview.bindToGraph(activity && activity.graph);
            this.select();

            if (activity === undefined) return;

            // XXX: for now we just rebind if the graph changes
            var graph = this.model.graph;
            var redrawGraph = _.bind(function() {
                this.graphview.bindToGraph(graph);
                this.graphview.render();
                this.select();
            }, this);
            // new node was added
            graph.bind("rebind", redrawGraph);
            // node was removed
            graph.bind("remove", redrawGraph);

            this.model.bind("change:selected", this.select, this);

            // XXX: do not suppress add event in ops.AddNode, catch
            // here and select the node if it is selectable.
        },
        select: function() {
            // XXX: rethink whether this should be the layerview or model
            var layer = this.layerview.model;
            if (!layer.next) return;
            var selected = this.model && this.model.get('selected');

            // tell the graphview who is selected
            this.graphview.selected = selected;

            // tell the next layer whether and which activity to display
            var activity = selected && (
                selected.get('activity') ||
                    selected.set({activity: layer.next.activities.create()})
                    .save().get("activity")
            );
            if (layer.next.activity !== activity) {
                layer.next.activity = activity;
                layer.next.trigger("change:activity");
            }
        }
    });

    return {
        ActivityView: ActivityView
    };
});
