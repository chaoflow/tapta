"use strict";
define([
    'require',
    'activities/model',
    'activities/view'
], function(require) {
    require.ready(function(){
        // create an application
        var App = require('./activities/model').App;
        var AppView = require('./activities/view').AppView;
        var app = new App();
        var appview = new AppView({model: app, name:"app"});
        $("#tapta_app").html(appview.render().el);
        window.tapta = appview;
    });
});
