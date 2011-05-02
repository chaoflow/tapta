"use strict";
require(["activities/core", "test_activities"], function(){
    require.ready(function(){
        // initialie activities child factories 
        var ats = activities;
        var model = ats.model;
        var ui = ats.ui;
        var factories = ats.settings.diagram.childFactories;
        factories[new activities.model.Initial().constructor.display_name] = ui.Initial;
        factories[new activities.model.Final().constructor.display_name] = ui.Final;
        factories[new activities.model.Action().constructor.display_name] = ui.Action;
        factories[new activities.model.Decision().constructor.display_name] = ui.Decision;
        factories[new activities.model.Merge().constructor.display_name] = ui.Merge;
        factories[new activities.model.Fork().constructor.display_name] = ui.Fork;
        factories[new activities.model.Join().constructor.display_name] = ui.Join;
        
        // initialie activities globals
        ats.glob.initialize();
        $('#demo_editor').activities({width: 1200,
                                      height: 450});
    });
});

