define([
    'require',
    './debug'
], function(require) {
    var DEBUG = require('./debug').controller;

    // will run in the context of the one using it: layer
    var controller = function(event, info) {
        debugger;
    };
    return controller;
});
