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
        extraClassNames: ["layer", "row"],
        propagateEvents: false,
        panescfg: [
            {name: "left", content: [
                {
                    ViewProto: panes.PropertiesView,
                    propscallback: function() {
                        return {name: "properties",
                                activity: this.model.activity};
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
                    props: {name: "toolbar"}
                }
            ], extraClassNames: ["cell", "width-2", "position-10"]}
        ],
        init: function() {
            this.activityview = this.child.center.child.activity;

            _.bindAll(this, "activityChanged");
            this.model.bind("change:activity", this.activityChanged);

            var controller = new Controller(this);
            this.bind("all", controller.handler);

            // set default editmode, a bit hackish
            this.child.right.child.toolbar.child.select.clicked();
        },
        activityChanged: function() {
            this.activityview.bindToModel(this.model.activity);
            this.activityview.render();
        }
    });
    Object.defineProperties(LayerView.prototype, {
        editmode: {
            get: function() { return this._editmode; },
            set: function(editmode) {
                if (this._editmode) {
                    // Do nothing if we are already in the "new" edit mode
                    if (this._editmode.name === editmode.name) return;

                    // Tell old editmode not to listen to our events anymore
                    // XXX: should the view be the editmode?
                    // XXX: if not, should it carry the editmode and
                    // we just store that?
                    this._editmode.view.deactivate(this);

                    // remove old editmode's CSS classes
                    var oldname = this._editmode.name,
                        oldview = this._editmode.view,
                        oldclasses = [oldname].concat(oldview.extraClassNames);
                    _.each(oldclasses, function(cls) {
                        $(this.el).removeClass("editmode-"+cls);
                    }, this);
                }

                // set new editmode's CSS classes
                var newname = editmode.name,
                    newview = editmode.view,
                    newclasses = [newname].concat(newview.extraClassNames);
                _.each(newclasses, function(cls) {
                    $(this.el).addClass("editmode-"+cls);
                }, this);

                // remember the editmode we are in now and tell it to
                // listen to our events, it will handle events its
                // interested in
                this._editmode = editmode;
                this._editmode.view.activate(this);

                // XXX: If this is only used to change style it could
                // be replaced by CSS rules.
                this.triggerReverse("editmode", editmode);
            }
        }
    });

    return {
        LayerView: LayerView,
        LayersView: LayersView
    };
});
