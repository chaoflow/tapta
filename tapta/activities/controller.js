define([
    'require',
    './debug',
    './graphviews'
], function(require) {
    var DEBUG = require('./debug').controller,
        g = require('./graph');
        gv = require('./graphviews');

    // a controller that attaches to a layer
    var LayerController = function() {
        // will run in the context of the layer using it
    };
    _(LayerController.prototype).extend({
        handler: function(event, info) {
            DEBUG && console.group(
                "controller:" +this.abspath() + ": "
                    + [event, info.view.name].join(", ")
            );

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
                var node = this.model.actions.create();

                // create new vertex with action as payload
                var graph = this.model.activity.graph,
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
