define([
    'require',
    'jquery',
    'vendor/underscore.js',
    './debug',
    './base',
    './model',
    './panes',
    './editmodes',
    './view'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        panes = require('./panes'),
        editmodes = require('./editmodes'),
        ActivityView = require('./view').ActivityView,
        model = require('./model');

    var LayersView = base.View.extend({
        initialize: function() {
            // layers need to be initialized in reverse: XXX: why?
            // we reverse the order of our children afterwards
            // NOTE: reverse() reverse the array and returns it: concat()
            _.each(this.model.layers.concat().reverse(), function(layer) {
                var view = new LayerView({model: layer, name: layer.name});
                this.append(view);
            }, this);
            this.children.reverse();
        }
    });

    var LayerView = panes.PaneManager.extend({
        extraClassNames: ["layer", "row"],
        panescfg: [
            {name: "left", content: [
                {
                    ViewProto: panes.PropertiesView,
                    propscallback: function() {
                        return {name: "properties",
                                layer: this.model};
                    }
                },
                {
                    ViewProto: panes.DebugInfo,
                    propscallback: function() {
                        return {layer: this.model};
                    }
                }
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
                                layerview: this};
                    }
                }
            ], extraClassNames: ["cell", "width-8", "position-2"]},
            {name: "right", content: [
                {
                    ViewProto: panes.ToolbarView,
                    propscallback: function() {
                        return {name: "toolbar",
                                layerview: this};
                    }
                // },
                // {
                //     ViewProto: panes.LibraryView,
                //     propscallback: function() {
                //         return {name: "actions",
                //                 layer: this.model};
                //     }
                }
            ], extraClassNames: ["cell", "width-2", "position-10"]}
        ],
        init: function() {
            if (this.model.prev === undefined) $(this.el).addClass("top");
            if (this.model.next === undefined) $(this.el).addClass("bottom");

            this.model.bind("change:activity", function() {
                this.activityview.bindToModel(this.model.activity);
                this.activityview.render();
            }, this);

            // this will also initialize properties:
            // - this.editmode
            // - this.editmodename
            this.editmodes = new editmodes.EditModes(this);
            this.editmodename = "select";
        }
    });
    Object.defineProperties(LayerView.prototype, {
        activityview: {get: function() { return this.child.center.child.activity; }}
    });

    return {
        LayerView: LayerView,
        LayersView: LayersView
    };
});
