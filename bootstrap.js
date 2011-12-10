"use strict";
define([
    'require',
    'jquery',
    'activities/model',
    'activities/app'
], function(require) {
    require.ready(function(){
        // create an application
        var App = require('./activities/model').App;
        var AppView = require('./activities/app').AppView;
        var app = new App();
        var appview = new AppView({model: app, name:"tapta"});
        $("#tapta_app").html(appview.render().el);
        window.tapta = appview;
    });
});
