define([
    'require',
    'jquery',
    'vendor/backbone.js',
    'vendor/underscore.js',
    './settings'
], function(require) {
    activities.ui = {};

    var base_view = Backbone.View.extend({
        initialize: function(){
            this.defaults = $.extend({opacity: 0},
                                     activities.settings.rendering,
                                     activities.settings.node);
            _.bindAll(this, "translate_event", "drag");
            if(this.model !== undefined){
                this.model.bind("change:ui_data", this.translate_event);
            }
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
            initialize: function(){
                base_view.prototype.initialize.call(this);
                this.args = $.extend({},
                                     this.defaults, 
                                     {x: this.defaults.gridsize * this.model.get("ui_data").x,
                                      y: this.defaults.gridsize * this.model.get("ui_data").y,
                                      activity_button_size: 28,
                                      fork_size: 8,
                                      width: this.defaults.gridsize * this.model.get("ui_data").width,
                                      height: this.defaults.gridsize * this.model.get("ui_data").height});
            },
            render: function(){
                if(this.elem){
                    this.elem.remove();
                }
                var args = this.args;
                // Setup
                var c = this.options.canvas;
                var elem = c.set();

                // Draw outer border
                var frame = c.rect(args.x + (args.gridsize - args.element_size) / 2 + (args.width - args.gridsize) / 2, 
                                   args.y + (args.gridsize - args.element_size) / 2, 
                                   args.element_size, args.element_size, 
                                   args.rounding);
                frame.attr({fill: args.fillColor,
                            stroke: args.borderColor,
                            "stroke-width": args.borderWidth});
                elem.push(frame);

                // Draw activity symbol with outer frame for catching
                // click events
                var a_b_c = {
                    x: args.x + (args.width - args.gridsize) / 2 + (args.gridsize - args.element_size) / 2 + args.activity_button_size / 4,
                    y: args.y + (args.gridsize - args.element_size) / 2 + args.element_size - args.activity_button_size - args.activity_button_size / 4,
                    height: args.activity_button_size,
                    width: args.activity_button_size};
                var path = _([["M", 0, 0],
                              ["L", 0, 1], 
                              ["L", 2, 1],
                              ["L", 2, 0],
                              ["M", 1, 0],
                              ["L", 1, 2]])
                        .chain()
                        .map(function(row){
                            return [row[0], row[1] * args.fork_size, row[2] * args.fork_size];
                        }).map(function(row){
                            return [row[0], 
                                    // Despite its name the fork_size is actually only half the forksize
                                    row[1] + a_b_c.x + (args.activity_button_size - args.fork_size * 2) / 2, 
                                    row[2] + a_b_c.y + (args.activity_button_size - args.fork_size * 2) / 2];
                        }).reduce(function(memo, row){
                            return memo + row[0] + row[1] + " " + row[2] + " ";
                        }, "")
                    .value();
                var activity_fork = c.path(path);
                elem.push(activity_fork);

                if(this.model.get("name")){

                    var name = c.text(args.x + args.width / 2, 
                                      args.y + (args.height / 2) - args.element_size / 2 + 12, 
                                      this.model.get("name"));
                    elem.push(name);
                }
                console.log(args.width, args.height);
                var glass = c.rect(args.x, args.y, args.width, args.height);
                glass.attr({fill: 'white',
                            opacity: args.opacity});
                elem.push(glass);
                var activity_button = c.rect(a_b_c.x,
                                             a_b_c.y,                   
                                             a_b_c.width,  
                                             a_b_c.height);
                activity_button.attr({fill: 'red',
                                      opacity: args.opacity});
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
            },
            getStartPoint: function(){
                return {x: this.args.x + this.args.width / 2 + this.args.element_size / 2,
                        y: this.args.y + this.args.height / 2};
            },
            getEndPoint: function(){
                return {x: this.args.x + this.args.width / 2 - this.args.element_size / 2,
                        y: this.args.y + this.args.height / 2};
            }

            
        }),
        fork_join_view: base_view.extend({
            initialize: function(){
                base_view.prototype.initialize.call(this);
                this.args = $.extend({},
                                     this.defaults, this.model.get("ui_data"),
                                     {x: this.defaults.gridsize * this.model.get("ui_data").x,
                                      y: this.defaults.gridsize * this.model.get("ui_data").y,
                                      elem_width: 10,
                                      padding: 10,
                                      width: this.defaults.gridsize * this.model.get("ui_data").width,
                                      height: this.defaults.gridsize * this.model.get("ui_data").height});

            },
            render: function(){
                var c = this.options.canvas;
                var elem = c.set();
                
                var frame = c.rect(this.args.x + (this.args.width) / 2 - this.args.elem_width / 2, 
                                   this.args.y + this.args.padding, 
                                   this.args.elem_width, 
                                   this.args.height - this.args.padding * 2,
                                   0);
                frame.attr({fill: this.args.fillColor,
                            stroke: this.args.borderColor,
                            "stroke-width": this.args.borderWidth});
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
            },
            getStartPoint: function(position, height){
                return {x: this.args.x + this.args.width / 2 + this.args.elem_width / 2, 
                        y: this.args.y + position * this.args.gridsize + (height * this.args.gridsize) / 2};
            },
            getEndPoint: function(position, height){
                return {x: this.args.x + this.args.width / 2 - this.args.elem_width / 2, 
                        y: this.args.y + position * this.args.gridsize + (height * this.args.gridsize) / 2};
            }

        }),
        decision_merge_view: base_view.extend({
            initialize: function(){
                base_view.prototype.initialize.call(this);
                this.args = $.extend({},
                                     this.defaults, 
                                     {x: this.defaults.gridsize * this.model.get("ui_data").x,
                                      y: this.defaults.gridsize * this.model.get("ui_data").y,
                                      width: this.defaults.gridsize * this.model.get("ui_data").width,
                                      height: this.defaults.gridsize * this.model.get("ui_data").height});
                this.args.rect_size = this.args.element_size;
                this.square = Math.sqrt(Math.pow(this.args.rect_size, 2) / 2);
            },
            render: function(){
                var c = this.options.canvas;
                var elem = c.set();
                
                var frame = c.rect(this.args.x + (this.args.gridsize - this.args.element_size) / 2 + (this.args.rect_size - this.square) / 2 + (this.args.width - this.args.gridsize) / 2, 
                                   this.args.y + (this.args.gridsize - this.args.element_size) / 2 + (this.args.rect_size - this.square) / 2 + (this.args.height - this.args.gridsize) / 2, 
                                   this.square, this.square, 0);
                frame.attr({fill: this.args.fillColor,
                            stroke: this.args.borderColor,
                            "stroke-width": this.args.borderWidth});
                frame.rotate(45);
                elem.push(frame);
                if(this.options.end_points > 1){
                    var left_path = "M " + (this.args.x + this.args.width / 2 - this.args.element_size / 2) + " " + (this.args.y + this.args.gridsize / 2);
                    left_path +=   " L " + (this.args.x + this.args.width / 2 - this.args.element_size / 2) + " " + (this.args.y + this.args.height - this.args.gridsize / 2);
                    var left_path_elem = c.path(left_path);
                    left_path_elem.attr({fill: this.args.fillColor,
                                         stroke: this.args.borderColor,
                                         "stroke-width": this.args.borderWidth});
                    elem.push(left_path_elem);
                }
                if(this.options.start_points > 1){
                    var right_path = "M " + (this.args.x + this.args.width - (this.args.gridsize - this.args.element_size) / 2) + " " + (this.args.y + this.args.gridsize / 2);
                    right_path +=   " L " + (this.args.x + this.args.width - (this.args.gridsize - this.args.element_size) / 2) + " " + (this.args.y + this.args.height - this.args.gridsize / 2);
                    var right_path_elem = c.path(right_path);
                    right_path_elem.attr({fill: this.args.fillColor,
                                          stroke: this.args.borderColor,
                                          "stroke-width": this.args.borderWidth});
                    elem.push(right_path_elem);
                }
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
            },
            getStartPoint: function(position, height){
                return {x: this.args.x + this.args.width / 2 + this.args.element_size / 2, 
                        y: this.args.y + position * this.args.gridsize + (height * this.args.gridsize) / 2};
            },
            getEndPoint: function(position, height){
                return {x: this.args.x + this.args.width / 2 - this.args.element_size / 2, 
                        y: this.args.y + position * this.args.gridsize + (height * this.args.gridsize) / 2};
            }
        }),
        initial_view: base_view.extend({
            initialize: function(){
                base_view.prototype.initialize.call(this);
                this.args = $.extend({}, 
                                     this.defaults, {x: this.defaults.gridsize * this.options.ui_data.x,
                                                     y: this.defaults.gridsize * this.options.ui_data.y,
                                                     width: this.defaults.gridsize * this.options.ui_data.width,
                                                     height: this.defaults.gridsize * this.options.ui_data.height});
                this.x = this.args.x + this.args.width / 2;
                this.y = this.args.y + this.args.height / 2;
            },
            render: function(){
                var c = this.options.canvas;
                var elem = c.set();
                var frame = c.circle(this.x, this.y, this.args.element_size / 2);
                frame.attr({fill: this.args.borderColor,
                            stroke: this.args.borderColor,
                            "stroke-width": this.args.borderWidth});
                elem.push(frame);
            },
            getStartPoint: function(){
                return {x: this.x + this.args.element_size / 2,
                        y: this.y};
            }
            
        }),
        final_view: base_view.extend({
            initialize: function(){
                base_view.prototype.initialize.call(this);
                this.args = $.extend({},
                                     this.defaults, {x: this.defaults.gridsize * this.options.ui_data.x,
                                                     y: this.defaults.gridsize * this.options.ui_data.y,
                                                     width: this.defaults.gridsize * this.options.ui_data.width,
                                                     height: this.defaults.gridsize * this.options.ui_data.height});
                this.x = this.args.x + this.args.width / 2;
                this.y = this.args.y + this.args.height / 2;
            },
            render: function(){
                var c = this.options.canvas;
                var elem = c.set();
                var outer = c.circle(this.x, this.y, this.defaults.element_size / 2);
                outer.attr({fill: this.args.fillColor,
                            stroke: this.args.borderColor,
                            "stroke-width": this.args.borderWidth});
                elem.push(outer);
                var inner = c.circle(this.x, this.y, this.defaults.element_size / 2 - this.args.borderWidth * 3);
                inner.attr({fill: this.args.borderColor,
                            stroke: this.args.borderColor,
                            "stroke-width": this.args.borderWidth});
                elem.push(inner);
            },
            getEndPoint: function(){
                return {x: this.x - this.args.element_size / 2,
                        y: this.y};
            }

        }),
        edge_view: Backbone.View.extend({
            initialize: function(){
                this.defaults = $.extend({},
                                         activities.settings.rendering,
                                         activities.settings.node);
            },
            render: function(){
                var path = "";
                var arrow_length = 10;
                var arrow_height = 10;
                path += "M " + this.options.start.x + " " + this.options.start.y;
                if (this.options.start.y != this.options.end.y){
                    var middle = (this.options.start.x + this.options.end.x) / 2;
                    path += " L " + middle + " " + this.options.start.y;
                    path += " L " + middle + " " + this.options.end.y;
                }
                path += " L " + this.options.end.x + " " + this.options.end.y;
                path += " L " + (this.options.end.x - arrow_length) + " " + (this.options.end.y + arrow_height / 2);
                path += " M " + (this.options.end.x - arrow_length) + " " + (this.options.end.y - arrow_height / 2);
                path += " L " + this.options.end.x + " " + this.options.end.y;
                var line = this.options.canvas.path(path);
                line.attr({stroke: this.defaults.borderColor,
                           "stroke-width": this.defaults.borderWidth});
                var glass = this.options.canvas.path(path);
                glass.attr({stroke: "yellow",
                            "stroke-width": 20,
                            opacity: 0});
                glass.click(function(){console.log("Clicked on path");});
            }
        })

    });
});

