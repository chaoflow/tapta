(function($) {
    
    $(document).ready(function() {
        var diagram = new activities.ui.Diagram('level_0');
        var action = new activities.ui.Action(diagram);
        action.x = 60;
        action.y = 100;
        
        var action = new activities.ui.Action(diagram);
        action.x = 220;
        action.y = 40;
        action.label = 'Fooooo';
        
        var decision = new activities.ui.Decision(diagram);
        decision.x = 60;
        decision.y = 200;
        
        var decision = new activities.ui.Decision(diagram);
        decision.x = 200;
        decision.y = 150;
        
        diagram.render();
    });
    
    // activities namespace
    activities = {
        
        // helpers
        utils: {
            
            // convert array containing rgb to hex string
            rgb2hex: function(color) {
                return '#' +
                    activities.utils.dec2hex(color[0]) + 
                    activities.utils.dec2hex(color[1]) +
                    activities.utils.dec2hex(color[2]);
            },
            
            // convert decimal to hex string
            dec2hex: function(dec) {
                var c = '0123456789ABCDEF';
                return String(c.charAt(Math.floor(dec / 16)))
                     + String(c.charAt(dec - (Math.floor(dec / 16) * 16)));
            }
        },
        
        // model related
        model: {
            
            // activity model element types
            ACTIVITY   : 0,
            INITIAL    : 1,
            FORK       : 2,
            JOIN       : 3,
            DECISION   : 4,
            MERGE      : 5,
            FLOW_FINAL : 6,
            FINAL      : 7,
            ACTION     : 8,
            EDGE       : 9,
            
            // constructors
            
            // the model.
            // expects JSON response as context
            Model: function(context) {
                this.context = context;
            }
        },
        
        // interaction related
        events: {
            
            // event types
            MOUSE_DOWN : 0,
            MOUSE_UP   : 1,
            MOUSE_MOVE : 2,
            MOUSE_IN   : 3,
            MOUSE_OUT  : 4,
            
            // constructors
            
            // the event dispatcher
            // expects diagram
            Dispatcher: function(diagram) {
                // events directly mapping to javascript events for notification
                this.eventMapping = {
                    mousedown: activities.events.MOUSE_DOWN,
                    mouseup: activities.events.MOUSE_UP,
                    mousemove: activities.events.MOUSE_MOVE,
                };
                
                // len array depends on available events
                this.subscriber = new Object();
                this.diagram = diagram;
                this.recent = null;
                var canvas = $(diagram.layers.diagram.canvas);
                canvas.data('dispatcher', this);
                canvas.bind('mousedown mousemove mouseup',
                            activities.events.notify);
            },
            
            // utils
            
            // event notification
            notify: function(event) {
                event.preventDefault();
                var canvas = $(this);
                var offset = canvas.offset();
                var x = event.pageX - offset.left;
                var y = event.pageY - offset.top;
                var dispatcher = canvas.data('dispatcher');
                var context = dispatcher.diagram.layers.control.context;
                
                // try to get pixel info, return if fails
                try {
                    var imgData = context.getImageData(x, y, 1, 1).data;
                } catch (err) {
                    return;
                }
                
                // detect event scope object
                var triggerColor = activities.utils.rgb2hex(imgData);
                var recent = dispatcher.diagram.elements[triggerColor];
                if (!recent) {
                    recent = dispatcher.diagram;
                }
                
                // trigger mousein/mouseout if necessary and return
                if (dispatcher.recent && recent != dispatcher.recent) {
                    
                    // mousein
                    var subscriber = dispatcher.subscriber[recent.triggerColor];
                    if (subscriber) {
                        var evt = activities.events.MOUSE_IN;
                        for (var idx in subscriber[evt]) {
                            subscriber[evt][idx](recent, event);
                        }
                    }
                    
                    // mouseout
                    subscriber = dispatcher.subscriber[triggerColor];
                    if (subscriber) {
                        var evt = activities.events.MOUSE_OUT;
                        for (var idx in subscriber[evt]) {
                            subscriber[evt][idx](dispatcher.recent, event);
                        }
                    }
                    dispatcher.recent = recent;
                    return;
                }
                
                // trigger events directly mapped from javascript events        
                dispatcher.recent = recent;
                var subscriber = dispatcher.subscriber[triggerColor];
                if (subscriber) {
                    var mapped = dispatcher.eventMapping[event.type];
                    for (var idx in subscriber[mapped]) {
                        subscriber[mapped][idx](recent, event);
                    }
                }
                activities.events.debug(event.type, x, y, triggerColor);
            },
            
            // debug status message
            debug: function(evt, x, y, trigger) {
                $('.status')
                    .html(evt + ' X: ' + x + ' Y: ' + y + ' hex: ' + trigger);
            }
        },
        
        // rendering elements
        ui: {
            
            // debugging helper
            // toggles control canvas with diagram canvas
            toggleCanvas: function(name) {
                var canvas = $('#diagram_' + name);
                var control = $('#control_' + name);
                if (canvas.css('z-index') == 1) {
                    canvas.css('z-index', 0);
                    control.css('z-index', 1);
                } else {
                    canvas.css('z-index', 1);
                    control.css('z-index', 0);
                }
            },
            
            // constructors
            
            // Layer element
            // a layer is represented by a canvas, z index is defined by
            // css z-index property
            Layer: function(canvas) {
                this.canvas = canvas;
                this.context = canvas.getContext("2d");
            },
            
            // Diagram element
            // refers to activity model
            Diagram: function(name) {
                this.triggerColor = '#000000';
                this.layers = {
                    control:
                        new activities.ui.Layer($('#control_' + name).get(0)),
                    diagram:
                        new activities.ui.Layer($('#diagram_' + name).get(0))
                };
                this.width = this.layers.diagram.canvas.width;
                this.height = this.layers.diagram.canvas.height;
                this.elements = new Object();
                this.dispatcher = new activities.events.Dispatcher(this);
                
                // current focused diagram element
                this.focused = null;
                
                // array for trigger color calculation for this diagram
                this._nextTriggerColor = [0, 0, 0];
                
                // event subscription
                this.dispatcher.subscribe(
                    activities.events.MOUSE_IN, this, this.setCursor);
                this.dispatcher.subscribe(
                    activities.events.MOUSE_DOWN, this, this.unselectAll);
            },
            
            // Action element
            // refers to activity action, initial node, final node
            Action: function(diagram) {
                this.triggerColor = null;
                this.x = 0;
                this.y = 0;
                this.width = 100;
                this.height = 70;
                this.fillColor = '#3ce654';
                this.selectedColor = '#ffc000';
                this.selectedWidth = 2;
                this.selected = false;
                this.label = 'Action';
                
                this.diagram = diagram;
                this.diagram.add(this);
                
                // event subscription
                this.diagram.dispatcher.subscribe(
                    activities.events.MOUSE_IN, this, this.setCursor);
                this.diagram.dispatcher.subscribe(
                    activities.events.MOUSE_DOWN, this, this.setSelected);
            },
            
            // Decision element
            Decision: function(diagram) {
                this.triggerColor = null;
                this.x = 0;
                this.y = 0;
                this.sideLength = 40;
                this.fillColor = '#c6c6c6';
                this.borderColor = '#000000';
                this.borderWidth = 2;
                this.selectedColor = '#ffc000';
                this.selectedWidth = 2;
                this.selected = false;
                
                this.diagram = diagram;
                this.diagram.add(this);
                
                // event subscription
                this.diagram.dispatcher.subscribe(
                    activities.events.MOUSE_IN, this, this.setCursor);
                this.diagram.dispatcher.subscribe(
                    activities.events.MOUSE_DOWN, this, this.setSelected);
            },
            
            // Join element
            Join: function(diagram) {
                this.triggerColor = null;
                this.diagram = diagram;
                this.diagram.add(this);
            },
            
            // Fork element
            Fork: function(diagram) {
                this.triggerColor = null;
                this.diagram = diagram;
                this.diagram.add(this);
            },
            
            // Connection element
            Connection: function(diagram) {
                this.triggerColor = null;
                this.diagram = diagram;
                this.diagram.add(this);
            }
        }
    }
    
    // activities.model.Model member functions
    $.extend(activities.model.Model.prototype, {
    
        // search context for child objects providing given model element type.
        // optional node for searching could be given, otherwise this.context
        // is used. an object named 'children' is expected which gets searched
        // for child nodes.
        filtered: function(type, node) {
            var context;
            if (node) {
                context = node;
            } else {
                context = this.context;
            }
            var ret = new Array();
            if (!context.children) {
                return ret;
            }
            for (var key in context.children) {
                if (context.children[key].type == type) {
                    ret.push(context.children[key]);
                }
            }
            return ret;
        },
        
        // return array of incoming edges for given node
        incoming: function(node) {
            ret = new Array();
            if (!node || !node.incoming_edges) {
                return ret;
            }
            for (var idx in node.incoming_edges) {
                // XXX: traversal by dottedpath
                var edge = this.context.children[node.incoming_edges[idx]];
                ret.push(edge)
            }
            return ret;
        },
        
        // return array of outgoing edges for given node
        outgoing: function(node) {
            ret = new Array();
            if (!node || !node.outgoing_edges) {
                return ret;
            }
            for (var idx in node.outgoing_edges) {
                // XXX: traversal by dottedpath
                var edge = this.context.children[node.outgoing_edges[idx]];
                ret.push(edge)
            }
            return ret;
        },
        
        // return source node for given edge
        source: function(edge) {
            if (!edge || !edge.source) {
                return;
            }
            // XXX: traversal by dottedpath
            return this.context.children[edge.source];
        },
        
        // return target node for given edge
        target: function(edge) {
            if (!edge || !edge.target) {
                return;
            }
            // XXX: traversal by dottedpath
            return this.context.children[edge.target];
        }
    });
    
    // activities.events.Dispatcher member functions
    $.extend(activities.events.Dispatcher.prototype, {
        
        // subscribe object to event with handler
        // make sure trigger color is set correctly on object before
        // subscription
        subscribe: function(evt, obj, handler) {
            if (!this.subscriber[obj.triggerColor]) {
                this.subscriber[obj.triggerColor] = [
                    [], // activities.events.MOUSE_DOWN
                    [], // activities.events.MOUSE_UP
                    [], // activities.events.MOUSE_MOVE
                    [], // activities.events.MOUSE_IN
                    []  // activities.events.MOUSE_OUT
                ];
            }
            this.subscriber[obj.triggerColor][evt].push(handler);
        }
    });
    
    // activities.ui.Diagram member functions
    $.extend(activities.ui.Diagram.prototype, {
        
        // iterate over elements of diagram and call render function
        render: function() {
            var context = this.layers.diagram.context;
            context.save();
            context.fillStyle = '#ffffff'; // global diagram bg color
            context.fillRect(0, 0, this.width, this.height);
            context.restore();
            
            for(var key in this.elements) {
                this.elements[key].render();
            }
        },
        
        // add element to this diagram
        add: function(elem) {
            var triggerColor = this.nextTriggerColor();
            elem.triggerColor = triggerColor;
            this.elements[triggerColor] = elem;
        },
        
        // calculate next trigger color for diagram element
        // next color is calculated by step of 10 for r, g, b
        nextTriggerColor: function() {
            var idx = 0;
            for (var i = 0; i < 3; i++) {
                if (this._nextTriggerColor[idx] == 250) {
                    idx++;
                }
            }
            // happens if 25^3 colors are used (unlikely)
            if (idx == 3) {
                throw "Maximum number of trigger colors reached";
            }
            this._nextTriggerColor[idx] += 10;
            return activities.utils.rgb2hex(this._nextTriggerColor);
        },
        
        // event handler
        
        // MOUSE_IN
        setCursor: function(obj, event) {
            $(obj.layers.diagram.canvas).css('cursor', 'default');
        },
        
        // MOUSE_DOWN
        unselectAll: function(obj, event) {
            if (obj.focused) {
                obj.focused.selected = false;
                obj.focused.render();
            }
        }
    });
    
    // activities.ui.Action member functions
    $.extend(activities.ui.Action.prototype, {
        
        // render action
        render: function() {
            
            // control layer
            var context = this.diagram.layers.control.context;
            context.save();
            context.translate(this.x, this.y);
            context.fillStyle = this.triggerColor;
            context.fillRect((this.width / 2) * -1,
                             (this.height / 2) * -1,
                             this.width,
                             this.height);
            context.restore();
            
            // diagram layer
            
            // base element
            context = this.diagram.layers.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            context.fillStyle = this.fillColor;
            context.fillRect(((this.width + this.selectedWidth) / 2) * -1,
                             ((this.height + this.selectedWidth) / 2) * -1,
                             this.width + this.selectedWidth,
                             this.height + this.selectedWidth);
            
            // label
            context.fillStyle = '#000';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = '12px sans-serif';
            context.fillText(this.label, 0, 0, this.width);
            
            // selected border
            if (this.selected) {
                context.strokeStyle = this.selectedColor;
                context.lineWidth = this.selectedWidth;
                context.strokeRect((this.width / 2) * -1,
                                   (this.height / 2) * -1,
                                   this.width,
                                   this.height);
            }
            context.restore();
        },
        
        // event handler
        
        // MOUSE_IN
        setCursor: function(obj, event) {
            $(obj.diagram.layers.diagram.canvas).css('cursor', 'pointer');
        },
        
        // MOUSE_DOWN
        setSelected: function(obj, event) {
            if (obj.diagram.focused) {
                obj.diagram.focused.selected = false;
                obj.diagram.focused.render();
            }
            obj.diagram.focused = obj;
            obj.selected = true;
            obj.render();
        }
    });
    
    // activities.ui.Decision member functions
    $.extend(activities.ui.Decision.prototype, {
        
        // render decision
        render: function() {
            
            // control layer
            var context = this.diagram.layers.control.context;
            context.save();
            context.translate(this.x, this.y);
            context.rotate(45 * Math.PI / 180);
            context.fillStyle = this.triggerColor;
            context.fillRect((this.sideLength / 2) * -1,
                            (this.sideLength / 2) * -1,
                            this.sideLength,
                            this.sideLength);
            context.restore();
            
            // diagram layer
            
            // base element
            context = this.diagram.layers.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            context.rotate(45 * Math.PI / 180);
            context.fillStyle = this.fillColor;
            context.fillRect((this.sideLength / 2) * -1,
                             (this.sideLength / 2) * -1,
                             this.sideLength,
                             this.sideLength);
            
            // default border
            context.strokeStyle = this.borderColor;
            context.lineWidth = this.borderWidth;
            context.strokeRect((this.sideLength / 2) * -1,
                               (this.sideLength / 2) * -1,
                               this.sideLength,
                               this.sideLength);
            
            // selected border
            if (this.selected) {
                context.strokeStyle = this.selectedColor;
                context.lineWidth = this.selectedWidth;
                context.strokeRect((this.sideLength / 2) * -1,
                                   (this.sideLength / 2) * -1,
                                   this.sideLength,
                                   this.sideLength);
            }
            context.restore();
        },
        
        // event handler
        
        // MOUSE_IN
        setCursor: function(obj, event) {
            $(obj.diagram.layers.diagram.canvas).css('cursor', 'pointer');
        },
        
        // MOUSE_DOWN
        setSelected: function(obj, event) {
            if (obj.diagram.focused) {
                obj.diagram.focused.selected = false;
                obj.diagram.focused.render();
            }
            obj.diagram.focused = obj;
            obj.selected = true;
            obj.render();
        }
    });

})(jQuery);