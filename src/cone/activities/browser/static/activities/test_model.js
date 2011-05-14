define([
    'require',
    'cdn/qunit.js',
    './model'
], function(require) {
    // dependencies we need a handle for
    var model = require('./model');

    module('Model');

    test("App model", function() {
        var app = new model.App({name: "test_app"});
        equal(app.name, "test_app", "App name made it");
        equal(app.layers.length, 6, "6 layers exist");
    });
}); 
