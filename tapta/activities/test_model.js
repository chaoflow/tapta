define([
    'require',
    'vendor/qunit.js',
    './model'
], function(require) {
    // dependencies we need a handle for
    var model = require('./model');

    module('TaPTa Model');
    var app = new model.App({name: "test_app"});

    test("App model init", function() {
        equal(app.name, "test_app", "App name made it");
        equal(app.layers.length, 6, "6 layers exist");
    });

    test("Layer init", function() {
        i = 0;
        app.layers.forEach(function(layer) {
            var action = layer.actions.create();
            var decmer = layer.decmers.create();
            var activity = layer.activities.create();
            ok(action instanceof model.Action,
               "layer.actions creates correct model "+i);
            ok(decmer instanceof model.DecMer,
               "layer.decmers creates correct model "+i);
            ok(activity instanceof model.Activity,
               "layer.activities creates correct model "+i);
            i++;
        });
        var activity = app.layers[0].activities.first();
    });
});
