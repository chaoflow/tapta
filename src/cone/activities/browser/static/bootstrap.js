"use strict";
require(["activities/core", "test_activities"], function(){
    require.ready(function(){
        var ats = activities;
        var model = ats.model;
        var ui = ats.ui;
        
        // initialie activities globals
        ats.glob.initialize();
        $('#demo_editor').activities({width: 1200,
                                      height: 450});
    });
});

