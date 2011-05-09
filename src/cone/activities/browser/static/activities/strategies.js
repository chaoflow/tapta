define(["jquery", "./settings"], function(){
    activities.strategy = {};
    
    $.extend(activities.strategy, {
        simple: function(activity){
            return {
                activity: activity,
                add_new_element: function(event, type, position){
                    var elem = this.activity.create(type, {ui_data: position});
                },
                dragging: function(element, rel_movement, abs_movement){
                    var old_ui = element.get("ui_data");
                    element.set({ui_data: 
                                 {x: old_ui.x + rel_movement.x,
                                  y: old_ui.y + rel_movement.y}});
                }
            };
        }
    });
});
