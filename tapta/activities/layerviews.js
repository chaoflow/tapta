define([
    'require',
    'jquery',
    'vendor/underscore.js',
    './debug',
    './base',
    './controller',
    './model',
    './panes',
    './view'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        panes = require('./panes'),
        ActivityView = require('./view').ActivityView,

        model = require('./model'),
        Controller = require('./controller');

    var LayersView = base.View.extend({
        initialize: function() {
            // layers need to be initialized in reverse: XXX: why?
            // we reverse the order of our children afterwards
            // NOTE: reverse() reverse the array and returns it: concat()
            _.each(this.model.layers.concat().reverse(), function(layer) {
                this.append(LayerView, {
                    model: layer,
                    name: layer.name
                });
            }, this);
            this.children.reverse();
        }
    });

    var LayerView = panes.PaneManager.extend({
        // supported operations
        // new node:
        // - click lib, click edge
        // - drag from lib, drop on edge
        // move node (editmode: select):
        // - drag final, drop on MIMO
        // - drag action, drop on edge (cut and paste)
        extraClassNames: ["layer", "row"],
        logevents: true,
        panescfg: [
            {name: "left", content: [
            ], extraClassNames: ["cell", "width-2", "position-0"]},
            {name: "center", content: [
                {
                    ViewProto: ActivityView,
                    // will be evaluated in the context of the new LayerView
                    propscallback: function() {
                        // XXX: consider default name for views
                        return {name: "activity",
                                model: this.model.activity,
                                // XXX: consider only this.controller here
                                layer: this};
                    }
                }
            ], extraClassNames: ["cell", "width-8", "position-2"]},
            {name: "right", content: [
                {
                    ViewProto: panes.ToolbarView,
                    props: {name: "toolbar"}
                }
            ], extraClassNames: ["cell", "width-2", "position-10"]}
        ],
        init: function() {
            this.activityview = this.child.center.child.activity;

            this.mode = {name:"selecting"};
            _.bindAll(this, "activityChanged", "bindEvents");
            this.model.bind("change:activity", this.activityChanged);

            // initialize our child views
            // this.left_pane = this.defchild(panes.PaneManager_, {
            //     model:this.model,
            //     name: "leftpane"
            // });
            // this.right_pane = this.defchild(panes.PaneManager_, {
            //     model: this.model,
            //     name: "rightpane"
            // });

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
            this.activityview.bindToModel(this.model.activity);
            this.activityview.render();
        }
        // render: function() {
        //     $(this.el).html(this.template());
        //     this.activity.el = this.$('.activity');
        //     this.activity.render();
        //     this.left_pane.el = this.$('.left-pane');
        //     this.right_pane.el = this.$('.right-pane');

        //     // XXX: initialize beforehand?
        //     this.left_pane.add(this.defchild(panes.PropertiesView, {
        //         model: this.model.activity,
        //         name: "props"
        //     }));
        //     // XXX: initialzie beforehand?
        //     this.right_pane.add(this.defchild(panes.LibraryView, {
        //         model: this.model,
        //         name: "library"
        //     }));
        //     this.right_pane.add(this.defchild(panes.ActionbarView, {
        //         model:this.model,
        //         name: "actionbar"
        //     }));
        //     this.left_pane.render();
        //     this.right_pane.render();
        // }
    });
    Object.defineProperties(LayerView.prototype, {
        editmode: {
            get: function() { return this._editmode; },
            set: function(val) {
                if (val === this._editmode) return;
                this._editmode = val;
                this.triggerReverse("editmode", {name: val, view: this});
            }
        }
    });

    return {
        LayerView: LayerView,
        LayersView: LayersView
    };
});
