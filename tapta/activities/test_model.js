define([
    'require',
    'cdn/qunit.js',
    './model'
], function(require) {
    // dependencies we need a handle for
    var model = require('./model');

    module('Model');
    var app = new model.App({name: "test_app"});

    test("App model init", function() {
        equal(app.name, "test_app", "App name made it");
        equal(app.layers.length, 6, "6 layers exist");
    });

    test("Layer init", function() {
        i = 0;
        _.each(app.layers, function(layer) {
            var initial = layer.initials.create();
            var final = layer.finals.create();
            var action = layer.actions.create();
            var decmer = layer.decmers.create();
            var forkjoin = layer.forkjoins.create();
            var activity = layer.activities.create();
            ok(initial instanceof model.Initial,
               "layer.initials creates correct model "+i);
            ok(final instanceof model.Final,
               "layer.finals creates correct model "+i);
            ok(action instanceof model.Action,
               "layer.actions creates correct model "+i);
            ok(decmer instanceof model.DecMer,
               "layer.decmers creates correct model "+i);
            ok(forkjoin instanceof model.ForkJoin,
               "layer.forkjoins creates correct model "+i);
            ok(activity instanceof model.Activity,
               "layer.activities creates correct model "+i);
            i++;
        });
        var activity = app.layers[0].activities.first();
        activity.placeandroute();
    });
}); 
