define([
    'require',
    './base',
    './debug',
    './graphviews'
], function(require) {
    var DEBUG = require('./debug').controller,
        base = require('./base'),
        g = require('./graph'),
        gv = require('./graphviews');

    // a controller that attaches to a layer
    var LayerController = function(layerview) {
        this.name = "controller";
        this.parent = layerview;
        this.layerview = layerview;
        _.bindAll(this, "handler");
    };
    _(LayerController.prototype).extend({
        abspath: base.abspath,
        location: base.location,
        handler: function(event, info) {
            DEBUG && console.group(
                "controller:" +this.abspath() + ": "
                    + [event, info.view.name].join(", ")
            );

            switch (event) {
            case "editmode":
                // switch to editmode
                this.layerview.editmode = info;
                break;
            }

            // supported operations
            //
            // add node: (click/drag)
            // sources:
            // - new node icon
            // - lib element
            // targets:
            // - edge
            // - ctrl area right of mimo
            //
            // move node (editmode: select):
            // - drag final, drop on ctrl area left of MIMO
            // - drag action, drop on edge (cut and paste)

            if (info.view instanceof gv.ArcView) {
                var source = info.view.srcview.model,
                    target = info.view.tgtview.model;

                // create action
                var node = this.layerview.model.actions.create();

                // create new vertex with action as payload
                var graph = this.layerview.model.activity.graph,
                    // XXX: this triggers already spaceOut and
                    // silent:true seems not to work
                    newvert = new graph.model({payload: node});

                // change next of source without triggering an event
                source.next.splice(source.next.indexOf(target), 1, newvert);
                newvert.next.push(target);
                graph.add(newvert, {silent:true});
                target.save();
                newvert.save();
                source.save();
                // XXX: this currently triggers rebinding of the graphview
                graph.trigger("rebind");

                // current arc needs to be rerendered
                //
                // view for new vertex needs to be created and rendered
                // --> eg. via add
                //
                // arc between new vertex and old target needs to be created and rendered
                // target has new geometry and needs to be moved

            }

            DEBUG && console.groupEnd();
        }
    });

    return LayerController;
});
