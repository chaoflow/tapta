(function($) {
    
    $(document).ready(function() {
        var diagram = new activities.ui.Diagram('level_0');
        var action = new activities.ui.Action(diagram);
        action.triggerColor = '#111111';
        action.x = 60;
        action.y = 100;
        
        var action = new activities.ui.Action(diagram);
        action.triggerColor = '#222222';
        action.x = 220;
        action.y = 40;
        action.selected = true;
        action.label = 'Fooooo';
        
        var decision = new activities.ui.Decision(diagram);
        decision.triggerColor = '#333333';
        decision.x = 60;
        decision.y = 200;
        
        var decision = new activities.ui.Decision(diagram);
        decision.triggerColor = '#444444';
        decision.x = 200;
        decision.y = 150;
        
        diagram.render();
    });
    
    // activities namespace
    activities = {
        
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
            MOUSE_DOWN: 0,
            MOUSE_UP: 1,
            MOUSE_HOVER: 2,
            
            // constructors
            
            // the event dispatcher
            // expects diagram
            Dispatcher: function(diagram) {
                
                // len array depends on available events
                this.subscriber = new Array(3);
                this.diagram = diagram;
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
                var imgData = context.getImageData(x, y, 1, 1).data;
                $('.status').html(event.type + 
                                  ' x: ' + x + 
                                  ' y: ' + y +
                                  ' hex: ' +
                                  activities.events.rgb2hex(imgData));
            },
            
            // convert array containing rgb to hex string
            rgb2hex: function(color) {
                return '#' +
                    activities.events.dec2hex(color[0]) + 
                    activities.events.dec2hex(color[1]) +
                    activities.events.dec2hex(color[2]);
            },
            
            // convert decimal to hex string
            dec2hex: function(dec) {
                var c = '0123456789ABCDEF';
                return String(c.charAt(Math.floor(dec / 16)))
                     + String(c.charAt(dec - (Math.floor(dec / 16) * 16)));
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
                this.layers = {
                    control:
                        new activities.ui.Layer($('#control_' + name).get(0)),
                    diagram:
                        new activities.ui.Layer($('#diagram_' + name).get(0))
                };
                this.width = this.layers.diagram.canvas.width;
                this.height = this.layers.diagram.canvas.height;
                this.elements = new Array();
                this.dispatcher = new activities.events.Dispatcher(this);
            },
            
            // Action element
            // refers to activity action, initial node, final node
            Action: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
                this.triggerColor = null;
                this.x = 0;
                this.y = 0;
                this.width = 100;
                this.height = 70;
                this.fillColor = '#3ce654';
                this.borderColor = '#ffc000';
                this.borderWidth = 3;
                this.label = 'Action';
                this.selected = false;
            },
            
            // Decision element
            Decision: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
                this.triggerColor = null;
                this.x = 0;
                this.y = 0;
                this.sideLength = 40;
                this.fillColor = '#c6c6c6';
                this.borderColor = '#000';
                this.borderWidth = 2;
            },
            
            // Join element
            Join: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
                this.triggerColor = null;
            },
            
            // Fork element
            Fork: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
                this.triggerColor = null;
            },
            
            // Connection element
            Connection: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
                this.triggerColor = null;
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
        
        // subscribe to event with handler
        // XXX: next step > colors
        subscribe: function(event, handler) {
            if (!this.subscriber[event]) {
                this.subscriber[event] = new Array();
            }
            this.subscriber[event].push(handler);
        }
        
    });
    
    // activities.ui.Diagram member functions
    $.extend(activities.ui.Diagram.prototype, {
        
        // iterate over elements of diagram and call render function
        render: function() {
            var context = this.layers.diagram.context;
            context.save();
            context.fillStyle = '#fff'; // global diagram bg color
            context.fillRect(0, 0, this.width, this.height);
            context.restore();
            
            for(var idx in this.elements) {
                this.elements[idx].render();
            }
        },
        
        // add element to this diagram
        add: function(elem) {
            this.elements.push(elem);
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
            context = this.diagram.layers.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            context.fillStyle = this.fillColor;
            if (this.selected) {
                context.strokeStyle = this.borderColor;
                context.lineWidth = this.borderWidth;
                context.strokeRect((this.width / 2) * -1,
                                   (this.height / 2) * -1,
                                   this.width,
                                   this.height);
            }
            context.fillRect((this.width / 2) * -1,
                             (this.height / 2) * -1,
                             this.width,
                             this.height);
            context.fillStyle = '#000';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = '12px sans-serif';
            context.fillText(this.label, 0, 0, this.width);
            context.restore();
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
            context = this.diagram.layers.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            context.rotate(45 * Math.PI / 180);
            context.fillStyle = this.fillColor;
            context.strokeStyle = this.borderColor;
            context.lineWidth = this.borderWidth;
            context.strokeRect((this.sideLength / 2) * -1,
                               (this.sideLength / 2) * -1,
                               this.sideLength,
                               this.sideLength);
            context.restore();
        }
        
    });

})(jQuery);