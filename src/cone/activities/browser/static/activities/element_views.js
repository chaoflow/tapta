require(["jquery", "activities/settings", "cdn/backbone.js", "cdn/underscore.js"], 
        function(){
            this.activities.ui = {};

            $.extend(this.activities.ui, {
                action_view: Backbone.View.extend({
                    initialize: function(){
                        this.defaults = $.extend(activities.settings.rendering,
                                                 activities.settings.node);

                        _.bindAll(this, "translate_event");
                        this.model.bind("change:ui_data", this.translate_event);
                    },
                    render: function(){

                        var args = $.extend(this.defaults, this.model.get("ui_data"));
                        var c = this.options.canvas;
                        var elem = c.set();
                        var frame = c.rect(args.x, args.y, 
                                           args.width, args.height, 
                                           args.rounding);
                        frame.attr({fill: args.fillColor,
                                   stroke: args.borderColor,
                                   "stroke-width": args.borderWidth});
                        elem.push(frame);

                        var activity = c.set();
                        activity.activity = true;
                        var activity_button_size = 10;
                        var a_b_c = {
                            x: args.x + 3,
                            y: args.y + args.height - 10 - 7,
                            height: 14,
                            width: 14};
                        var activity_button = c.rect(a_b_c.x,
                                                     a_b_c.y,                   
                                                     a_b_c.width,  
                                                     a_b_c.height);
                        activity_button.attr({fill: args.fillColor,
                                             stroke: args.fillColor});
                        activity.push(activity_button);
                        var path = _([["M", 0, 0],
                                      ["L", 0, 1], 
                                      ["L", 2, 1],
                                      ["L", 2, 0],
                                      ["M", 1, 0],
                                      ["L", 1, 2]])
                            .chain()
                            .map(function(row){
                                return [row[0], row[1] * 4, row[2] * 4];
                            }).map(function(row){
                                return [row[0], row[1] + a_b_c.x + 3, row[2] + a_b_c.y + 3];
                            }).reduce(function(memo, row){
                                return memo + row[0] + row[1] + " " + row[2] + " ";
                            }, "")
                            .value();
                        var activity_fork = c.path(path);
                        activity.push(activity_fork);
                        elem.push(activity);

                        this.model.name = "test";
                        if(this.model.name){
                            var name = c.text(args.x + args.width / 2, args.y + 10, this.model.name);
                            elem.push(name);
                        }
                        this.elem = elem;
                        this.activity = activity;

                        activity.click(this.eventPropagator("activity_click"), this);
                        elem.click(function(evt){
                            // Event bubbling is not stopped in svg
                            if(_.detect(this.activity, function(elem){
                                return evt.target == elem.node;
                                })){
                                return;
                            }
                            this.model.trigger("elem_click", this.model);
                            evt.stopPropagation();
                        }, this);
                        elem.dblclick(this.eventPropagator("elem_dblclick"), this);
                        elem.mousedown(function(evt){
                            this.drag_start = [evt.offsetX, evt.offsetY];
                            this.drag_progress = [evt.offsetX, evt.offsetY];
                            this.elem.mousemove(this.drag, this);
                            this.elem.mouseout(function(evt){
                                this.elem.unmousemove(this.drag);
                            }, this);
                        }, this);
                        elem.mouseout(function(evt){
                            this.elem.unmousemove(this.drag);
                        }, this);
                        elem.mouseup(function(evt){
                            this.elem.unmousemove(this.drag);
                        }, this);
                    },
                    translate_event: function(node){
                        var new_ui = node.get("ui_data");
                        var old_ui = node.previous("ui_data");
                        this.translate(new_ui.x - old_ui.x,
                                       new_ui.y - old_ui.y);
                    },
                    drag: function(evt){
                        console.log('drag');
                        var drag_x = evt.offsetX - this.drag_start[0];
                        var drag_y = evt.offsetY - this.drag_start[1];
                        var rel_x = evt.offsetX - this.drag_progress[0];
                        var rel_y = evt.offsetY - this.drag_progress[1];
                        this.drag_progress = [evt.offsetX, evt.offsetY];
                        this.model.trigger("elem_drag", {context: this.model, 
                                                         abs_movement: {x: drag_x,
                                                                        y: drag_y},
                                                         rel_movement: {x: rel_x,
                                                                        y: rel_y}});
                    },
                        
                    eventPropagator: function(name){
                        return function(evt){
                            this.model.trigger(name, this.model);
                            evt.stopPropagation();
                        };
                    },
                    translate: function(x, y){
                        if(this.elem){
                            var elem = this.elem;
                            while(elem){
                                elem.translate(x, y);
                                elem = elem.next;
                            }
                        }
                    }
                })
            });
        });

