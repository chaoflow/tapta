define(["jquery", "./settings"], function(){
    activities.strategy = {};
    
    $.extend(activities.strategy, {
        simple: function(activity){
            return {
                activity: activity,
                add_new_element: function(event, type, position){
                    var elem = this.activity.create(type, {ui_data: position});
                }

            };
        }
    });
});
