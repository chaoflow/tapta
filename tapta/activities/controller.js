define([
    'require',
    './base',
    './debug'
], function(require) {
    var DEBUG = require('./debug').controller,
        base = require('./base');

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

                // current arc needs to be rerendered
                //
                // view for new vertex needs to be created and rendered
                // --> eg. via add
                //
                // arc between new vertex and old target needs to be created and rendered
                // target has new geometry and needs to be moved


            DEBUG && console.groupEnd();
        }
    });

    return LayerController;
});
