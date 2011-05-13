"use strict";
require(["jquery", "activities/core", "test_activities"], function(){
    require.ready(function(){
        (function($){
            window.demo = new ActivitiesView({el: jQuery("#demo_editor")});
            window.canvas = demo.diagrams[0].canvas;
            window.ui_data = {x:0,y:0,width:1,height:4};
            window.views = activities.ui;
            window.models = activities.model;
            var initial = new views.initial_view({canvas: canvas, ui_data: ui_data});
            initial.render();

            ui_data = {x:1, y:0, width: 1, height: 4};
            var fork_1 = new views.fork_join_view({canvas: demo.diagrams[0].canvas, model:new models.ForkJoin({ui_data: ui_data}), end_points: 1, start_points: 3});
            fork_1.render();
            ui_data = {x:2, y:1, width: 1, height: 2};
            var decision_1 = new views.decision_merge_view({canvas: demo.diagrams[0].canvas, model: new models.DecisionMerge({ui_data: ui_data}), end_points: 1, start_points: 2});
            decision_1.render();
            ui_data = {x:2, y:3, width: 1, height: 1};
            var end_point_3 = new views.final_view({canvas: canvas, ui_data: ui_data});
            end_point_3.render();

            ui_data = {x:3, y: 1, width: 1, height: 1};
            var action_1 = new views.action_view({canvas: demo.diagrams[0].canvas, model: new models.Action({ui_data: ui_data})});
            action_1.render();
            ui_data = {x:3, y: 2, width: 2, height: 1};
            var action_2 = new views.action_view({canvas: demo.diagrams[0].canvas, model: new models.Action({ui_data: ui_data})});
            action_2.render();
            ui_data = {x:4, y: 1, width: 1, height: 1};
            var action_3 = new views.action_view({canvas: demo.diagrams[0].canvas, model: new models.Action({ui_data: ui_data})});
            action_3.render();

            ui_data = {x:5, y:1, width: 2, height:2};
            var decision_2 = new views.decision_merge_view({canvas: demo.diagrams[0].canvas, model: new models.DecisionMerge({ui_data: ui_data}), end_points: 2, start_points: 1});
            decision_2.render();

            ui_data = {x:7, y:0, width: 2, height: 3};
            var fork_2 = new views.fork_join_view({canvas: demo.diagrams[0].canvas, model:new models.ForkJoin({ui_data: ui_data}), end_points: 2, start_points: 1});
            fork_2.render();


            ui_data = {x:9, y:0, width: 2, height: 3};
            var end_point_2 = new views.final_view({canvas: canvas, ui_data: ui_data}); 
            end_point_2.render();

            var arrows = [];
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: initial.getStartPoint(),
                                             end: fork_1.getEndPoint(0, 4)}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: fork_1.getStartPoint(0, 1),
                                             end: fork_2.getEndPoint(0, 1)}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: fork_1.getStartPoint(1, 2),
                                             end: decision_1.getEndPoint(0, 2)}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: fork_1.getStartPoint(3, 1),
                                             end: end_point_3.getEndPoint()}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: decision_1.getStartPoint(0, 1),
                                             end: action_1.getEndPoint()}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: decision_1.getStartPoint(1, 1),
                                             end: action_2.getEndPoint()}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: action_1.getStartPoint(),
                                             end: action_3.getEndPoint()}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: action_3.getStartPoint(1),
                                             end: decision_2.getEndPoint(0, 1)}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: action_2.getStartPoint(1),
                                             end: decision_2.getEndPoint(1, 1)}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: decision_2.getStartPoint(0, 2),
                                             end: fork_2.getEndPoint(1, 2)}));
            arrows.push(new views.edge_view({canvas: canvas, 
                                             start: fork_2.getStartPoint(0, 3),
                                             end: end_point_2.getEndPoint()}));

            _.each(arrows, function(arrow){
                arrow.render();
            });
        })(jQuery);
    });
});
