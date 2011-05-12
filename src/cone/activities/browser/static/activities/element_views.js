require(["jquery", "activities/settings", "cdn/backbone.js", "cdn/underscore.js"], 
        function(){
            activities.ui = {};

            var base_view = Backbone.View.extend({
                initialize: function(){
                    this.defaults = $.extend(activities.settings.rendering,
                                             activities.settings.node);
                    _.bindAll(this, "translate_event", "drag");
                    this.model.bind("change:ui_data", this.translate_event);
                },
                translate_event: function(node){
                    var new_ui = node.get("ui_data");
                    var old_ui = node.previous("ui_data");
                    this.translate((new_ui.x - old_ui.x) * this.defaults.gridsize,
                                   (new_ui.y - old_ui.y) * this.defaults.gridsize);
                },
                translate: function(x, y){
                    if(this.elem){
                        var elem = this.elem;
                        while(elem){
                            elem.translate(x, y);
                            elem = elem.next;
                        }
                    }
                },
                eventPropagator: function(name){
                    return function(evt){
                        this.model.trigger(name, this.model);
                        evt.stopPropagation();
                    };
                },
                drag: function(evt){
                    var drag_x = evt.screenX - this.drag_start[0];
                    var drag_y = evt.screenY - this.drag_start[1];
                    var rel_x = evt.screenX - this.drag_progress[0];
                    var rel_y = evt.screenY - this.drag_progress[1];
                    this.drag_progress = [evt.screenX, evt.screenY];
                    this.model.trigger("elem_drag", {context: this.model, 
                                                     abs_movement: {x: drag_x,
                                                                    y: drag_y},
                                                     rel_movement: {x: rel_x,
                                                                    y: rel_y}});
                }


            });

            $.extend(this.activities.ui, {
                action_view: base_view.extend({
                    render: function(){
                        if(this.elem){
                            this.elem.remove();
                        }
                        // Setup
                        var args = $.extend(this.defaults, {x: this.defaults.gridsize * this.model.get("ui_data").x,
                                                            y: this.defaults.gridsize * this.model.get("ui_data").y,
                                                            width: this.defaults.gridsize * this.model.get("ui_data").width,
                                                            height: this.defaults.gridsize * this.model.get("ui_data").height});
                        var c = this.options.canvas;
                        var elem = c.set();

                        // Draw outer border
                        var frame = c.rect(args.x, args.y, 
                                           args.width, args.height, 
                                           args.rounding);
                        frame.attr({fill: args.fillColor,
                                   stroke: args.borderColor,
                                   "stroke-width": args.borderWidth});
                        elem.push(frame);

                        // Draw activity symbol with outer frame for catching
                        // click events
                        var activity_button_size = 10;
                        var a_b_c = {
                            x: args.x + 3,
                            y: args.y + args.height - 10 - 7,
                            height: 14,
                            width: 14};
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
                        elem.push(activity_fork);

                        if(this.model.get("name")){

                            var name = c.text(args.x + args.width / 2, 
                                               args.y + 7, 
                                               this.model.get("name"));
                            elem.push(name);
                        }
                        var glass = c.rect(args.x, args.y, args.width, args.height);
                        glass.attr({fill: 'white',
                                   opacity: 0});
                        elem.push(glass);
                        var activity_button = c.rect(a_b_c.x,
                                                     a_b_c.y,                   
                                                     a_b_c.width,  
                                                     a_b_c.height);
                        activity_button.attr({fill: 'red',
                                              opacity: 0});
                        elem.push(activity_button);
                        this.activity_button = activity_button;

                        this.glass = glass;
                        this.elem = elem;
                        this.bind();
                    },
                    bind: function(){
                        this.activity_button.click(this.eventPropagator("activity_click"), this);
                        this.glass.click(function(evt){
                            this.model.trigger("elem_click", this.model);
                            evt.stopPropagation();
                        }, this);
                        this.glass.dblclick(this.eventPropagator("elem_click_right_drop_target"), this);
                        this.glass.mousedown(function(evt){
                            this.glass.toFront();
                            this.drag_start = [evt.screenX, evt.screenY];
                            this.drag_progress = [evt.screenX, evt.screenY];
                            $(document).mousemove(this.drag, this);
                        }, this);
                        this.glass.mouseup(function(evt){
                            try{
                                $(document).unbind("mousemove");
                                $(document).unbind("mousemove");
                                $(document).unbind("mousemove");
                                }
                            catch(e){};
                        }, this);
                    }
                    
                }),
                fork_join_view: base_view.extend({
                    render: function(){
                        var args = $.extend(this.defaults, this.model.get("ui_data"),
                                            {width: 10});
                        var c = this.options.canvas;
                        var elem = c.set();
                        
                        var frame = c.rect(args.x, args.y, 
                                           args.width, args.height,
                                           0);
                        frame.attr({fill: args.fillColor,
                                   stroke: args.borderColor,
                                   "stroke-width": args.borderWidth});
                        elem.push(frame);
                        this.elem = elem;
                        this.bind();
                    },
                    bind: function(){
                        this.elem.click(function(evt){
                            this.model.trigger("elem_click", this.model);
                            evt.stopPropagation();
                        }, this);
                        this.elem.dblclick(this.eventPropagator("elem_dblclick"), this);
                        this.elem.mousedown(function(evt){
                            this.drag_start = [evt.screenX, evt.screenY];
                            this.drag_progress = [evt.screenX, evt.screenY];
                            this.elem.mousemove(this.drag, this);
                            this.elem.mouseout(function(evt){
                                this.elem.unmousemove(this.drag);
                            }, this);
                        }, this);
                        this.elem.mouseout(function(evt){
                            this.elem.unmousemove(this.drag);
                        }, this);
                        this.elem.mouseup(function(evt){
                            this.elem.unmousemove(this.drag);
                        }, this);
                    }

                }),
                decision_merge_view: base_view.extend({
                    render: function(){
                        var args = $.extend(this.defaults, this.model.get("ui_data"));
                        var c = this.options.canvas;
                        var elem = c.set();
                        var square = Math.sqrt(Math.pow(Math.min(args.height, args.width), 2) / 2);
                         
                        var frame = c.rect(args.x, args.y, 
                                           square, square, 0);
                        frame.attr({fill: args.fillColor,
                                   stroke: args.borderColor,
                                   "stroke-width": args.borderWidth});
                        frame.rotate(45);
                        elem.push(frame);
                        this.elem = elem;
                        this.bind();
                    },

                    bind: function(){
                        this.elem.click(function(evt){
                            this.model.trigger("elem_click", this.model);
                            evt.stopPropagation();
                        }, this);
                        this.elem.dblclick(this.eventPropagator("elem_dblclick"), this);
                        this.elem.mousedown(function(evt){
                            this.drag_start = [evt.screenX, evt.screenY];
                            this.drag_progress = [evt.screenX, evt.screenY];
                            this.elem.mousemove(this.drag, this);
                            this.elem.mouseout(function(evt){
                                this.elem.unmousemove(this.drag);
                            }, this);
                        }, this);
                        this.elem.mouseout(function(evt){
                            this.elem.unmousemove(this.drag);
                        }, this);
                        this.elem.mouseup(function(evt){
                            this.elem.unmousemove(this.drag);
                        }, this);
                    }
                })
            });
        });

