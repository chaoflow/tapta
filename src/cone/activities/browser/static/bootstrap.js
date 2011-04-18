"use strict";
require(["activities", "test_activities"], function(){
    require.ready(function(){
        // initialie activities child factories 
        var ats = activities;
        var model = ats.model;
        var ui = ats.ui;
        var factories = ats.settings.diagram.childFactories;
        factories[model.INITIAL] = ui.Initial;
        factories[model.FINAL] = ui.Final;
        factories[model.ACTION] = ui.Action;
        factories[model.DECISION] = ui.Decision;
        factories[model.MERGE] = ui.Merge;
        factories[model.FORK] = ui.Fork;
        factories[model.JOIN] = ui.Join;
        
        // initialie activities globals
        ats.glob.initialize();
        $('#demo_editor').activities({width: 1200,
                                      height: 450});
    });
});

