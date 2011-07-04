define([
    'require',
    './debug'
], function(require) {
    var DEBUG = require('./debug').controller;

    // XXX: work with abspath and stuff?
    // a controller that attaches to a layer
    var LayerController = function(layer) {
        this.layer = layer;
    };
    _(LayerController.prototype).extend({
        handler: function(event, info) {
            DEBUG && console.group(
                "controller:" +this.abspath() + ": "
                    + [event, info.view.name].join(", ")
            );


            DEBUG && console.groupEnd();
        }
    });

    return LayerController;
});
