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
    './l10n',
    './panes'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        panes = require('./panes'),
        svg = require('./svgviews'),
        GraphView = require('./graphviews').GraphView,
        model = require('./model'),
        l10n = require('./l10n'),
        CFG = require('./settings');

    // An activity view creates a canvas. Its graph is drawn by a graph view.
    var ActivityView = base.View.extend({
        initialize: function() {
            _.bindAll(this, 'bindToModel');
            this.layerview = this.options.layerview;

            // an svg drawing area - should ActivityView inherit from
            // SVG or do we have some non-svg activity things to display?
            this.svg = new svg.SVG();
            this.append(this.svg);

            // construct the layer label
            var activityview = this,
                layer = this.layerview.model;
            this.layerlabel = Object.defineProperties(
                new svg.Text({
                    name: "layerlabel"
                }), {
                    attrs: {get: function() { return {
                        x: 5,
                        y: 16
                    }; }},
                    text: {get: function() {
                        var action = activityview.model &&
                                activityview.model.action;
                        return l10n(layer.name) + ": " + (
                            action ? (action.get("label") || "unnamed")
                                .replace(/\n/gm, " ") : ""
                        );
                    }}
                }
            );
            this.svg.append(this.layerlabel);

            this.graphview = new GraphView({geometry: {x: 10, y: 20}});
            this.svg.append(this.graphview);

            this.bindToModel(this.model);
        },
        bindToModel: function(activity) {
            // unbind layerlabel from old activities action
            if (this.model && this.model.action) {
                this.model.action.unbind(this.layerlabel.render);
            }

            this.model = activity;

            this.graphview.bindToGraph(activity && activity.graph);
            this.select();

            if (activity === undefined) return;

            var action = activity.action;
            if (action) {
                action.bind("change:label", this.layerlabel.render, this);
            }

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
            var activity;
            if (selected && (selected.type === "action")) {
                activity = selected.get('activity');
                if (activity === undefined) {
                    activity = layer.next.activities.create();
                    selected.set({activity: activity}).save();
                    activity.action = selected;
                }
            }
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
