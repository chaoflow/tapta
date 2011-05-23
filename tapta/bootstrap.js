"use strict";
define([
    'require',
    'activities/model',
    'activities/view'
], function(require) {
    require.ready(function(){
        // create an application
        var model = require('./activities/model');
        var view = require('./activities/view');
        var app = new model.App();
        var appview = new view.App({model: app, name:"app"});
        appview.render();
    });
});
