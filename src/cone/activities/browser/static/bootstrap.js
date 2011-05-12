"use strict";
require(["jquery", "activities/core", "test_activities"], function(){
    require.ready(function(){
        (function($){
            var demo = new ActivitiesView({el: jQuery("#demo_editor")});
        })(jQuery);
    });
});

