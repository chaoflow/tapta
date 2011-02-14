(function($) {
    
    $(document).ready(function() {
        var model = eval(uneval(tests.model));
        var name = 'level_0';
        var renderer = new activities.ui.SimpleGridRenderer(model, name);
        renderer.render();
    });
    
    
    // ************************************************************************
    // activities namespace
    // ************************************************************************
    
    activities = {
        
        /*
         * activity utils.
         */
        utils: {
            
            /*
             * convert array containing rgb to hex string
             */
            rgb2hex: function(color) {
                return '#' +
                    activities.utils.dec2hex(color[0]) + 
                    activities.utils.dec2hex(color[1]) +
                    activities.utils.dec2hex(color[2]);
            },
            
            /*
             * convert decimal to hex string
             */
            dec2hex: function(dec) {
                var c = '0123456789ABCDEF';
                return String(c.charAt(Math.floor(dec / 16)))
                     + String(c.charAt(dec - (Math.floor(dec / 16) * 16)));
            }
        },
        
        /*
         * activity model namespace and element types
         */
        model: {
            
            ACTIVITY   : 0,
            INITIAL    : 1,
            FORK       : 2,
            JOIN       : 3,
            DECISION   : 4,
            MERGE      : 5,
            FLOW_FINAL : 6,
            FINAL      : 7,
            ACTION     : 8,
            EDGE       : 9
        },
        
        /*
         * activity events namespace and event types
         */
        events: {
            
            MOUSE_DOWN : 0,
            MOUSE_UP   : 1,
            MOUSE_MOVE : 2,
            MOUSE_IN   : 3,
            MOUSE_OUT  : 4,
            
            /*
             * event notification
             */
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
        
        /*
         * activities ui namespace and helpers
         */
        ui: {
            
            /*
             * debugging helper
             * toggles control canvas with diagram canvas
             */
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
            }
        }
    }
    
    
    // ************************************************************************
    // activities.model.Model
    // ************************************************************************
    
    /* 
     * expects JSON as context.
     * 
     * - all object names starting with '__' are considered as non children.
     * - __name, __parent are set on activities.model.Model init.
     * - incoming_edges, outgoing_egdes are set on, activities.model.Model
     *   init for non edge children.
     */
    activities.model.Model = function(context) {
        this.context = context;
        this.context.__name = 'model';
        this.context.__parent = '';
        
        // set __name__ and __parent__
        for (var key in this.context) {
            // XXX: recursion
            if (!this._isChildKey(key)) {
                continue;
            }
            this.context[key].__name = key;
            this.context[key].__parent = this.context.__name;
        }
        
        // set incoming_edges and outgoing_edges on model nodes
        var edges = this.filtered(activities.model.EDGE);
        var edge, source, target;
        for (var idx in edges) {
            // XXX: traversal by dottedpath if necessary
            edge = edges[idx];
            
            source = this.context[edge.source];
            if (!source.outgoing_edges) {
                source.outgoing_edges = new Array();
            }
            source.outgoing_edges.push(edge.__name);
            
            target = this.context[edge.target];
            if (!target.incoming_edges) {
                target.incoming_edges = new Array();
            }
            target.incoming_edges.push(edge.__name);
        }
    }
    
    activities.model.Model.prototype = {
    
        _isChildKey: function(key) {
            return key.substring(0, 2) != '__';
        },
        
        /*
         * search context for child objects providing given model element type.
         * optional node for searching could be given, otherwise this.context
         * is used.
         */
        filtered: function(type, node) {
            var context;
            if (node) {
                context = node;
            } else {
                context = this.context;
            }
            var ret = new Array();
            for (var key in context) {
                if (!this._isChildKey(key)) {
                    continue;
                }
                if (context[key].__type == type) {
                    ret.push(context[key]);
                }
            }
            return ret;
        },
        
        /*
         * return array of incoming edges for given node
         */
        incoming: function(node) {
            ret = new Array();
            if (!node || !node.incoming_edges) {
                return ret;
            }
            for (var idx in node.incoming_edges) {
                var edge = this.node(node.incoming_edges[idx]);
                ret.push(edge)
            }
            return ret;
        },
        
        /*
         * return array of outgoing edges for given node
         */
        outgoing: function(node) {
            ret = new Array();
            if (!node || !node.outgoing_edges) {
                return ret;
            }
            for (var idx in node.outgoing_edges) {
                var edge = this.node(node.outgoing_edges[idx]);
                ret.push(edge)
            }
            return ret;
        },
        
        /*
         * return source node for given edge
         */
        source: function(edge) {
            if (!edge || !edge.source) {
                return;
            }
            return this.node(edge.source);
        },
        
        /*
         * return target node for given edge
         */
        target: function(edge) {
            if (!edge || !edge.target) {
                return;
            }
            return this.node(edge.target);
        },
        
        /*
         * return node by path
         */
        node: function(path) {
            // XXX: traversal by dottedpath
            return this.context[path];
        }
    }
    
    
    // ************************************************************************
    // activities.events.Dispatcher
    // ************************************************************************
    
    /*
     * expects diagram
     */
    activities.events.Dispatcher = function(diagram) {
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
    }
    
    activities.events.Dispatcher.prototype = {
        
        /*
         * subscribe object to event with handler
         * 
         * make sure trigger color is set correctly on object before
         * subscription
         */
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
    }
    
    
    // ************************************************************************
    // activities.ui.Layer
    // ************************************************************************
    
    /*
     * a layer is represented by a canvas, z index is defined by
     * css z-index property
     */
    activities.ui.Layer = function(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
    }
    
    
    // ************************************************************************
    // activities.ui.Grid
    // ************************************************************************
    
    /*
     * x / y grid mapping 2 dimensional array positions to coordinates
     */
    activities.ui.Grid = function() {
        // this.data[x][y]
        this.data = new Array();
    }
    
    activities.ui.Grid.prototype = {
    
        /*
         * set grid position
         * x - grid x position
         * y - grid y position
         * a - x coordinate
         * b - y coordinate
         * path - model element dottedpath
         */
        set: function(x, y, a, b, path) {
            if (!this.data[x]) {
                this.data[x] = new Array();
            }
            if (!this.data[x][y]) {
                this.data[x][y] = new Array();
            }
            this.data[x][y] = [a, b, path];
        },
        
        /*
         * get grid coordinates for position
         * x - grid x position
         * y - grid y position
         */
        get: function(x, y) {
            try {
                return this.data[x][y];
            } catch(err) {
                throw "No coordinates found for position " + x + ',' + y;
            }
        },
        
        /*
         * return grid size
         */
        size: function() {
            var x = this.data.length;
            var y = 0;
            var next_y;
            for(var idx in this.data) {
                next_y = this.data[idx].length;
                if (next_y > y) {
                    y = next_y;
                }
            }
            return [x, y];
        },
        
        /*
         * debug helper
         */
        debug: function() {
            var size = this.size();
            var ret = '';
            var elem;
            for (var i = 0; i < size[0]; i++) {
                for (var j = 0; j < size[1]; j++) {
                    elem = this.get(i, j);
                    elem = i + ',' + j + ':' +
                        elem[0] + ',' + elem[1] + ':' + elem[2];
                    while(elem.length < 25) {
                        elem += ' ';
                    }
                    ret += elem;
                }
                ret += '\n';
            }
            return ret;
        }
    }
    
    
    // ************************************************************************
    // activities.ui.SimpleGridRenderer
    // ************************************************************************
    
    activities.ui.SimpleGridRenderer = function(model, name) {
        this.model = new activities.model.Model(model);
        this.diagram = new activities.ui.Diagram(name);
        this.grid = new activities.ui.Grid();
    }
    
    activities.ui.SimpleGridRenderer.prototype = {
        
        render: function() {
            // grid for filling
            var grid = this.grid;
            
            // current grid position
            var grid_x = 0;
            var grid_y = 0;
            
            // incremental coordinates
            var step_x = 140;
            var step_y = 120;
            
            // absolute coordinates
            var x = step_x;
            var y = step_y;
            
            // get the model
            var model = this.model;
            
            // search initial node
            var initial = model.filtered(activities.model.INITIAL);
            if (initial.length == 0) {
                throw "Could not find initial node. Abort.";
            }
            if (initial.length > 1) {
                throw "Invalid model. More than one initial node found";
            }
            
            // graph start node
            var node = initial[0];
            
            // set initial element coordinates
            grid.set(grid_x, grid_y, x, y, node.__name);
            grid_x++;
            
            // helper
            // return array with next level nodes
            var next = function(node) {
                var ret = new Array();
                var outgoing = model.outgoing(node);
                var edge, target;
                for (var idx in outgoing) {
                    edge = outgoing[idx];
                    target = model.target(edge);
                    ret.push(target);
                }
                return ret;
            }
            
            // fill grid with graph data and coordinates
            var nodes = next(node);
            while (nodes.length > 0) {
                node = nodes[0];
                x = x + step_x;
                grid.set(grid_x, grid_y, x, y, node.__name);
                grid_x++;
                nodes = next(node);
            }
            
            // XXX: hash mapping dottedpath2triggerColor
            var diagram = this.diagram;
            
            // iterate grid and set diagram data
            var grid_size = grid.size();
            var grid_entry;
            for (var i = 0; i < grid_size[0]; i++) {
                for(var j = 0; j < grid_size[1]; j++) {
                    grid_entry = grid.get(i, j);
                    if (!grid_entry) {
                        continue;
                    }
                    
                    // get node by dottedpath from model
                    node = model.node(grid_entry[2]);
                    
                    // build diagram
                    switch (node.__type) {
                        case activities.model.INITIAL: {
                            var action = new activities.ui.Action(diagram);
                            action.x = grid_entry[0];
                            action.y = grid_entry[1];
                            action.label = node.__name;
                            break;
                        }
                        case activities.model.ACTION: {
                            var action = new activities.ui.Action(diagram);
                            action.x = grid_entry[0];
                            action.y = grid_entry[1];
                            action.label = node.__name;
                            break;
                        }
                        case activities.model.DECISION: {
                            var decision = new activities.ui.Decision(diagram);
                            decision.x = grid_entry[0];
                            decision.y = grid_entry[1];
                            break;
                        }
                        case activities.model.MERGE: {
                            var merge = new activities.ui.Merge(diagram);
                            merge.x = grid_entry[0];
                            merge.y = grid_entry[1];
                            break;
                        }
                        // XXX remaining
                    }
                }
            }
            diagram.render();
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Diagram
    // ************************************************************************
    
    /*
     * refers to activity model
     */
    activities.ui.Diagram = function(name) {
        this.triggerColor = '#000000';
        this.layers = {
            control:
                new activities.ui.Layer($('#control_' + name).get(0)),
            diagram:
                new activities.ui.Layer($('#diagram_' + name).get(0))
        };
        this.width = this.layers.diagram.canvas.width;
        this.height = this.layers.diagram.canvas.height;
        // XXX: hash mapping dottedpath2triggerColor
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
    }
    
    activities.ui.Diagram.prototype = {
        
        /*
         * iterate over elements of diagram and call render function
         */
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
        
        /*
         * add element to this diagram
         */
        add: function(elem) {
            var triggerColor = this.nextTriggerColor();
            elem.triggerColor = triggerColor;
            this.elements[triggerColor] = elem;
        },
        
        /*
         * calculate next trigger color for diagram element
         * next color is calculated by step of 10 for r, g, b
         */
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
        
        /*
         * activities.events.MOUSE_IN
         */
        setCursor: function(obj, event) {
            $(obj.layers.diagram.canvas).css('cursor', 'default');
        },
        
        /*
         * activities.events.MOUSE_DOWN
         */
        unselectAll: function(obj, event) {
            if (obj.focused) {
                obj.focused.selected = false;
                obj.focused.render();
            }
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Action
    // ************************************************************************
    
    /*
     * refers to activity action, initial node, final node
     */
    activities.ui.Action = function(diagram) {
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
    }
    
    activities.ui.Action.prototype = {
        
        /*
         * render action
         */
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
        
        /*
         * activities.events.MOUSE_IN
         */
        setCursor: function(obj, event) {
            $(obj.diagram.layers.diagram.canvas).css('cursor', 'pointer');
        },
        
        /*
         * activities.events.MOUSE_DOWN
         */
        setSelected: function(obj, event) {
            if (obj.diagram.focused) {
                obj.diagram.focused.selected = false;
                obj.diagram.focused.render();
            }
            obj.diagram.focused = obj;
            obj.selected = true;
            obj.render();
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Decision
    // ************************************************************************
    
    activities.ui.Decision = function(diagram) {
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
    }
    
    activities.ui.Decision.prototype = {
        
        /*
         * render decision
         */
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
        
        /*
         * activities.events.MOUSE_IN
         */
        setCursor: function(obj, event) {
            $(obj.diagram.layers.diagram.canvas).css('cursor', 'pointer');
        },
        
        /*
         * activities.events.MOUSE_DOWN
         */
        setSelected: function(obj, event) {
            if (obj.diagram.focused) {
                obj.diagram.focused.selected = false;
                obj.diagram.focused.render();
            }
            obj.diagram.focused = obj;
            obj.selected = true;
            obj.render();
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Merge
    // ************************************************************************
    
    activities.ui.Merge = function(diagram) {
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
    }
    
    activities.ui.Merge.prototype = {
        
        /*
         * render decision
         */
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
        
        /*
         * activities.events.MOUSE_IN
         */
        setCursor: function(obj, event) {
            $(obj.diagram.layers.diagram.canvas).css('cursor', 'pointer');
        },
        
        /*
         * activities.events.MOUSE_DOWN
         */
        setSelected: function(obj, event) {
            if (obj.diagram.focused) {
                obj.diagram.focused.selected = false;
                obj.diagram.focused.render();
            }
            obj.diagram.focused = obj;
            obj.selected = true;
            obj.render();
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Join
    // ************************************************************************
    
    activities.ui.Join = function(diagram) {
        this.triggerColor = null;
        this.diagram = diagram;
        this.diagram.add(this);
    }
    
    
    // ************************************************************************
    // activities.ui.Fork
    // ************************************************************************
    
    activities.ui.Fork = function(diagram) {
        this.triggerColor = null;
        this.diagram = diagram;
        this.diagram.add(this);
    }
    
    
    // ************************************************************************
    // activities.ui.Edge
    // ************************************************************************
    
    activities.ui.Edge = function(diagram) {
        this.triggerColor = null;
        this.diagram = diagram;
        this.diagram.add(this);
    }
    
})(jQuery);