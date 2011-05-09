require(["jquery", "activities/settings", "cdn/backbone.js"], 
        function(){
            this.activities.ui = {};

            $.extend(this.activities.ui, {
                action_view: Backbone.View.extend({
                    initialize: function(){
                        this.defaults = $.extend(activities.settings.rendering,
                                                 activities.settings.node);
                    },
                    render: function(){
                        args = $.extend(this.defaults, this.model.get("ui_data"));
                        var elem = this.options.canvas.rect(args.x, args.y, 
                                                            args.width, args.height, 
                                                            args.rounding);
                        elem.attr({fill: args.fillColor,
                                   stroke: args.borderColor,
                                   "stroke-width": args.borderWidth});

                        /* This is just for fun. drag and drop must be 
                         * handled by strategy */
                        var start = function () {
                            // storing original coordinates
                            this.ox = this.attr("x");
                            this.oy = this.attr("y");
                            this.attr({opacity: 1});
                        },
                        move = function (dx, dy) {
                            // move will be called with dx and dy
                            this.attr({x: this.ox + dx, y: this.oy + dy});
                        },
                        up = function () {
                            // restoring state
                            this.attr({opacity: .5});
                        };
                        elem.drag(move, start, up);
                    }
                })
            });
        });

