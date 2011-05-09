"use strict";
require(["jquery", "activities/core", "test_activities"], function(){
    require.ready(function(){
        (function($){
            new ActivitiesView({el: jQuery("#demo_editor")});
        })(jQuery);
    });
});

