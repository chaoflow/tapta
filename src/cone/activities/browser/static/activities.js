(function($) {
    
    $(document).ready(function() {
        var name = 'level_0';
        var model = eval(uneval(tests.model));
        var editor = new activities.ui.Editor('level_0', model);
        
        //alert(renderer._debugNode2tier());
        //alert(renderer._debugTiers());
        //alert(renderer._debugGrid());
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
                var diagram = dispatcher.editor.diagram;
                var context = diagram.layers.control.context;
                // try to get pixel info, return if fails
                try {
                    var imgData = context.getImageData(x, y, 1, 1).data;
                } catch (err) {
                    return;
                }
                
                // detect event scope object
                var triggerColor = activities.utils.rgb2hex(imgData);
                var recent = diagram.elements[triggerColor];
                if (!recent) {
                    recent = diagram;
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
                activities.events.status(event.type, x, y, triggerColor);
            },
            
            // global event handler for diagram children
        
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
                obj.diagram.editor.properties.display(obj);
            },
            
            /*
             * events status message
             */
            status: function(evt, x, y, trigger) {
                $('.events_status')
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
            },
            
            /*
             * draw filled rect
             */
            fillRect: function(context, color, width, height) {
                context.fillStyle = color;
                context.fillRect((width / 2) * -1,
                                 (height / 2) * -1,
                                 width,
                                 height);
            },
            
            /*
             * draw stroke rect
             */
            strokeRect: function(context, color, lineWidth, width, height) {
                context.strokeStyle = color;
                context.lineWidth = lineWidth;
                context.strokeRect((width / 2) * -1,
                                   (height / 2) * -1,
                                   width,
                                   height);
            },
            
            /*
             * draw label
             */
            label: function(context, label, width) {
                context.fillStyle = '#000';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.font = '12px sans-serif';
                context.fillText(label, 0, 0, width);
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
        
        // set __name and __parent
        for (var key in this.context.children) {
            // XXX: recursion
            this.context.children[key].__name = key;
            this.context.children[key].__parent = this.context.__name;
        }
        
        // set incoming_edges and outgoing_edges on model nodes
        var edges = this.filtered(activities.model.EDGE);
        var edge, source, target;
        for (var idx in edges) {
            // XXX: traversal by dottedpath if necessary
            edge = edges[idx];
            
            source = this.context.children[edge.source];
            if (!source.outgoing_edges) {
                source.outgoing_edges = new Array();
            }
            source.outgoing_edges.push(edge.__name);
            
            target = this.context.children[edge.target];
            if (!target.incoming_edges) {
                target.incoming_edges = new Array();
            }
            target.incoming_edges.push(edge.__name);
        }
    }
    
    activities.model.Model.prototype = {
        
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
            for (var key in context.children) {
                if (context.children[key].__type == type) {
                    ret.push(context.children[key]);
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
            return this.context.children[path];
        }
    }
    
    
    // ************************************************************************
    // activities.events.Dispatcher
    // ************************************************************************
    
    /*
     * expects diagram
     */
    activities.events.Dispatcher = function(editor) {
        this.editor = editor;
        
        // events directly mapping to javascript events for notification
        this.eventMapping = {
            mousedown: activities.events.MOUSE_DOWN,
            mouseup: activities.events.MOUSE_UP,
            mousemove: activities.events.MOUSE_MOVE,
        };
        
        // len array depends on available events
        this.subscriber = new Object();
        this.recent = null;
    }
    
    activities.events.Dispatcher.prototype = {
        
        /*
         * bind JS events to activity element notification
         */
        bind: function() {
            var canvas = $(this.editor.diagram.layers.diagram.canvas);
            canvas.data('dispatcher', this);
            canvas.bind('mousedown mousemove mouseup',
                        activities.events.notify);
        },
        
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
    // activities.ui.Editor
    // ************************************************************************
    
    /*
     * A single diagram editor.
     * 
     * expects diagram name mapping to editor dom id and a
     * activities.model.Model instance.
     */
    activities.ui.Editor = function(name, model) {
        this.name = name;
        this.grid = new activities.ui.Grid();
        this.model = new activities.model.Model(model);
        this.properties = new activities.ui.Properties(this);
        this.dispatcher = new activities.events.Dispatcher(this);
        this.diagram = new activities.ui.Diagram(this);
        
        this.dispatcher.bind();
        this.diagram.bindHandler();
        
        this.renderer = new activities.ui.SimpleGridRenderer(this);
        this.renderer.render();
    }
    
    
    // ************************************************************************
    // activities.ui.Actions
    // ************************************************************************
    
    activities.ui.Actions = function() {
        
    }
    
    
    // ************************************************************************
    // activities.ui.Properties
    // ************************************************************************
    
    activities.ui.Properties = function(editor) {
        this.editor = editor;
        this.container = $('#' + editor.name + ' .element_properties');
    }
    
    activities.ui.Properties.prototype = {
        
        /*
         * display properties for diagram element
         */
        display: function(elem) {
            
        },
        
        heading: function(label) {
            $('head', this.container).text(label);
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
         * path - model element dottedpath
         * a - x coordinate
         * b - y coordinate
         */
        set: function(x, y, path, a, b) {
            if (!this.data[x]) {
                this.data[x] = new Array();
            }
            if (!this.data[x][y]) {
                this.data[x][y] = new Array();
            }
            this.data[x][y] = [path, a, b];
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
                        elem[1] + ',' + elem[2] + ':' + elem[0];
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
    
    /*
     * http://ls11-www.cs.uni-dortmund.de/people/gutweng/AE-07/schichten.pdf
     */
    activities.ui.SimpleGridRenderer = function(editor) {
        this.editor = editor;
        this.node2tier = new Object();
        this.tiers = new Array();
        
        // get rid
        this.name = editor.name;
        this.model = editor.model;
        this.diagram = editor.diagram;
        this.grid = editor.grid;
    }
    
    activities.ui.SimpleGridRenderer.prototype = {
        
        /*
         * this.node2tier debug
         */
        _debugNode2tier: function() {
            var ret = '';
            for (var key in this.node2tier) {
                ret += key + ': ' + this.node2tier[key] + '\n';
            }
            return ret;
        },
        
        /*
         * this.tiers debug out
         */
        _debugTiers: function() {
            var ret = '';
            for (var i in this.tiers) {
                ret += 'tier: ' + i + '\n';
                for (var j in this.tiers[i]) {
                    ret += '    ' + j + ': ' + this.tiers[i][j] + '\n';
                }
            }
            return ret;
        },
        
        /*
         * debug grid
         */
        _debugGrid: function() {
            var ret = '';
            var grid = this.editor.grid;
            var size = grid.size();
            var entry;
            for (var i = 0; i < size[0]; i++) {
                for (var j = 0; j < size[1]; j++) {
                    entry = grid.get(i, j);
                    if (!entry) {
                        continue;
                    }
                    ret += 'x: ' + i + ', y: ' + j + 
                           ', path: ' + entry[0] + 
                           ', a: ' + entry[1] + 
                           ', b: ' + entry[2] + '\n';
                }
            }
            return ret;
        },
        
        /*
         * return initial node
         */
        initial: function() {
            var model = this.editor.model;
            var initial = model.filtered(activities.model.INITIAL);
            if (initial.length == 0) {
                throw "Could not find initial node. Abort.";
            }
            if (initial.length > 1) {
                throw "Invalid model. More than one initial node found";
            }
            return initial[0];
        },
        
        /*
         * detect tiers
         */
        detectTiers: function(tier, node) {
            if (typeof(this.node2tier[node.__name]) == "undefined") {
                this.node2tier[node.__name] = tier;
            } else if (tier > this.node2tier[node.__name]) {
                this.node2tier[node.__name] = tier;
            }
            var model = this.editor.model;
            var outgoing = model.outgoing(node);
            var edge, target;
            for (var idx in outgoing) {
                edge = outgoing[idx];
                target = model.target(edge);
                this.detectTiers(tier + 1, target);
            }
        },
        
        /*
         * fill tiers
         */
        fillTiers: function() {
            for (var key in this.node2tier) {
                tier = this.node2tier[key]
                if (typeof(this.tiers[tier]) == "undefined") {
                    this.tiers[tier] = new Array();
                }
                this.tiers[tier].push(key);
            }
        },
        
        /*
         * fill grid with elements from this.tiers
         */
        fillGrid: function() {
            var grid = this.editor.grid;
            var step_x = 140;
            var step_y = 120;
            var x = step_x;
            var y = step_y;
            for (var i in this.tiers) {
                for (var j in this.tiers[i]) {
                    grid.set(i, j, this.tiers[i][j], x, y);
                    y += step_y;
                }
                x += step_x;
                y = step_y;
            }
        },
        
        /*
         * draw single element
         */
        drawElement: function(node, entry) {
            var diagram = this.editor.diagram;
            switch (node.__type) {
                case activities.model.INITIAL: {
                    var action = new activities.ui.Action(diagram);
                    action.x = entry[1];
                    action.y = entry[2];
                    action.label = node.__name;
                    diagram.map(node, action);
                    break;
                }
                case activities.model.ACTION: {
                    var action = new activities.ui.Action(diagram);
                    action.x = entry[1];
                    action.y = entry[2];
                    action.label = node.__name;
                    diagram.map(node, action);
                    break;
                }
                case activities.model.FINAL: {
                    var action = new activities.ui.Action(diagram);
                    action.x = entry[1];
                    action.y = entry[2];
                    action.label = node.__name;
                    diagram.map(node, action);
                    break;
                }
                case activities.model.DECISION: {
                    var decision = new activities.ui.Decision(diagram);
                    decision.x = entry[1];
                    decision.y = entry[2];
                    diagram.map(node, decision);
                    break;
                }
                case activities.model.MERGE: {
                    var merge = new activities.ui.Merge(diagram);
                    merge.x = entry[1];
                    merge.y = entry[2];
                    diagram.map(node, merge);
                    break;
                }
                case activities.model.FLOW_FINAL: {
                    var merge = new activities.ui.Merge(diagram);
                    merge.x = entry[1];
                    merge.y = entry[2];
                    diagram.map(node, merge);
                    break;
                }
                case activities.model.FORK: {
                    var fork = new activities.ui.Fork(diagram);
                    fork.x = entry[1];
                    fork.y = entry[2];
                    diagram.map(node, fork);
                    break;
                }
                case activities.model.JOIN: {
                    var join = new activities.ui.Join(diagram);
                    join.x = entry[1];
                    join.y = entry[2];
                    diagram.map(node, join);
                    break;
                }
            }
        },
        
        /*
         * render diagram
         */
        render: function() {
            this.node2tier = new Object();
            this.tiers = new Array();
            this.detectTiers(0, this.initial());
            this.fillTiers();
            this.fillGrid();
            var model = this.editor.model;
            var grid = this.editor.grid;
            var size = grid.size();
            var entry;
            for (var i = 0; i < size[0]; i++) {
                for (var j = 0; j < size[1]; j++) {
                    entry = grid.get(i, j);
                    if (!entry) {
                        continue;
                    }
                    node = model.node(entry[0]);
                    this.drawElement(node, entry);
                }
            }
            this.editor.diagram.render();
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Diagram
    // ************************************************************************
    
    /*
     * refers to activity model
     */
    activities.ui.Diagram = function(editor) {
        this.editor = editor;
        
        this.triggerColor = '#000000';
        
        this.layers = {
            control:
                new activities.ui.Layer($('#control_' + editor.name).get(0)),
            diagram:
                new activities.ui.Layer($('#diagram_' + editor.name).get(0))
        };
        this.width = this.layers.diagram.canvas.width;
        this.height = this.layers.diagram.canvas.height;
        
        // trigger color to diagram element
        this.elements = new Object();
        
        // model element dotted path to trigger color
        this.mapping = new Object();
        
        // current focused diagram element
        this.focused = null;
        
        // array for trigger color calculation for this diagram
        this._nextTriggerColor = [0, 0, 0];
    }
    
    activities.ui.Diagram.prototype = {
        
        /*
         * bind event handler
         */
        bindHandler: function() {
            // event subscription
            this.editor.dispatcher.subscribe(
                activities.events.MOUSE_IN, this, this.setCursor);
            this.editor.dispatcher.subscribe(
                activities.events.MOUSE_DOWN, this, this.unselectAll);
        },
        
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
         * map model element path to trigger color
         */
        map: function(node, elem) {
            this.mapping[node.__name] = elem.triggerColor;
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
        var dispatcher = this.diagram.editor.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
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
            activities.ui.fillRect(context,
                                   this.triggerColor,
                                   this.width,
                                   this.height);
            context.restore();
            
            // diagram layer
            
            // base element
            context = this.diagram.layers.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            activities.ui.fillRect(context,
                                   this.fillColor,
                                   this.width + this.selectedWidth,
                                   this.height + this.selectedWidth);
            
            // label
            activities.ui.label(context, this.label, this.width);
            
            // selected border
            if (this.selected) {
                activities.ui.strokeRect(context,
                                         this.selectedColor,
                                         this.selectedWidth,
                                         this.width,
                                         this.height);
            }
            context.restore();
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
        var dispatcher = this.diagram.editor.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
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
            activities.ui.fillRect(context,
                                   this.triggerColor,
                                   this.sideLength,
                                   this.sideLength);
            context.restore();
            
            // diagram layer
            
            // base element
            context = this.diagram.layers.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            context.rotate(45 * Math.PI / 180);
            activities.ui.fillRect(context,
                                   this.fillColor,
                                   this.sideLength,
                                   this.sideLength);
            
            // default border
            activities.ui.strokeRect(context,
                                     this.borderColor,
                                     this.borderWidth,
                                     this.sideLength,
                                     this.sideLength);
            
            // selected border
            if (this.selected) {
                activities.ui.strokeRect(context,
                                         this.selectedColor,
                                         this.selectedWidth,
                                         this.sideLength,
                                         this.sideLength);
            }
            context.restore();
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
        var dispatcher = this.diagram.editor.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Merge.prototype.render = 
        activities.ui.Decision.prototype.render;
    
    
    // ************************************************************************
    // activities.ui.Join
    // ************************************************************************
    
    activities.ui.Join = function(diagram) {
        this.triggerColor = null;
        
        this.x = 0;
        this.y = 0;
        this.width = 10;
        this.height = 80;
        this.fillColor = '#b954ff';
        this.selectedColor = '#ffc000';
        this.selectedWidth = 2;
        this.selected = false;
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = this.diagram.editor.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Join.prototype = {
    
        /*
         * render join
         */
        render: function() {
            
            // control layer
            var context = this.diagram.layers.control.context;
            context.save();
            context.translate(this.x, this.y);
            activities.ui.fillRect(context,
                                   this.triggerColor,
                                   this.width,
                                   this.height);
            context.restore();
            
            // diagram layer
            
            // base element
            context = this.diagram.layers.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            activities.ui.fillRect(context,
                                   this.fillColor,
                                   this.width + this.selectedWidth,
                                   this.height + this.selectedWidth);
            
            // selected border
            if (this.selected) {
                activities.ui.strokeRect(context,
                                         this.selectedColor,
                                         this.selectedWidth,
                                         this.width,
                                         this.height);
            }
            context.restore();
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Fork
    // ************************************************************************
    
    activities.ui.Fork = function(diagram) {
        this.triggerColor = null;
        
        this.x = 0;
        this.y = 0;
        this.width = 10;
        this.height = 80;
        this.fillColor = '#b954ff';
        this.selectedColor = '#ffc000';
        this.selectedWidth = 2;
        this.selected = false;
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = this.diagram.editor.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Fork.prototype.render = activities.ui.Join.prototype.render;
    
    
    // ************************************************************************
    // activities.ui.Edge
    // ************************************************************************
    
    activities.ui.Edge = function(diagram) {
        this.triggerColor = null;
        this.diagram = diagram;
        this.diagram.add(this);
    }
    
    activities.ui.Edge.prototype = {
    
        /*
         * render edge
         */
        render: function() {
        }
    }
    
})(jQuery);