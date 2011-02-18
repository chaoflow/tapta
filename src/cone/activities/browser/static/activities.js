/*
 * activities.js
 * 
 * Author: Robert Niederreiter
 * Requires:
 *     - jQuery
 *     - jQuery Tools
 *     - bdajax
 */

var demo_editor = null;

(function($) {
    
    $(document).ready(function() {
        demo_editor = new activities.ui.Editor('level_0');
        demo_editor.newDiagram();
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
            FINAL      : 6,
            ACTION     : 7,
            EDGE       : 8
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
                var diagram = dispatcher.diagram;
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
                var diagram = obj.diagram;
                if (diagram.focused) {
                    diagram.focused.selected = false;
                    diagram.focused.render();
                }
                diagram.focused = obj;
                obj.selected = true;
                obj.render();
                diagram.editor.properties.display(obj);
            },
            
            /*
             * events status message
             */
            status: function(evt, x, y, trigger) {
                var status = 'Evt: ' + evt + '<br />' +
                             'X: ' + x + '<br />' +
                             'Y: ' + y + '<br />' +
                             'T: ' + trigger;
                $('.status').html(status);
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
            
            // rendering helpers
            
            /*
             * turn shadow drawing on.
             */
            shadowOn: function(context) {
                context.shadowOffsetX = 2.5;
                context.shadowOffsetY = 2.5;
                context.shadowBlur = 3.0;
                context.shadowColor = '#aaa';
            },
            
            /*
             * turn shadow drawing off.
             */
            shadowOff: function(context) {
                context.shadowOffsetX = 0.0;
                context.shadowOffsetY = 0.0;
                context.shadowBlur = 0.0;
            },
            
            /*
             * draw rounded rect
             */
            roundedRect: function(context, x1, y1, x2, y2, r) {
                var r2d = Math.PI / 180;
                //ensure that the radius isn't too large for x
                if ((x2 - x1) - (2 * r) < 0) {
                    r = ((x2 - x1) / 2);
                }
                //ensure that the radius isn't too large for y
                if((y2 - y1) - (2 * r) < 0 ) {
                    r = ((y2 - y1) / 2);
                }
                context.beginPath();
                context.moveTo(x1 + r, y1);
                context.lineTo(x2 - r, y1);
                context.arc(x2 - r, y1 + r, r, r2d * 270, r2d * 360, false);
                context.lineTo(x2, y2 - r);
                context.arc(x2 - r, y2 - r, r, r2d * 0, r2d * 90, false);
                context.lineTo(x1 + r, y2);
                context.arc(x1 + r, y2 - r, r, r2d * 90, r2d * 180, false);
                context.lineTo(x1, y1 + r);
                context.arc(x1 + r, y1 + r, r, r2d * 180, r2d * 270, false);
                context.closePath();
            },
            
            /*
             * draw circle
             */
            circle: function(context, r) {
                context.beginPath();
                context.arc(0, 0, r, 0, Math.PI * 2, true);
                context.closePath();
            },
            
            /*
             * draw filled rect
             */
            fillRect: function(context,
                               color,
                               width,
                               height,
                               shadow,
                               radius) {
                if (!radius && radius != 0) {
                    radius = 3;
                }
                context.fillStyle = color;
                if (shadow) {
                    activities.ui.shadowOn(context);
                }
                var w_2 = width / 2;
                var h_2 = height / 2;
                activities.ui.roundedRect(
                    context, w_2 * -1, h_2 * -1, w_2, h_2, 3);
                context.fill();
                if (shadow) {
                    activities.ui.shadowOff(context);
                }
            },
            
            /*
             * draw stroke rect
             */
            strokeRect: function(context,
                                 color,
                                 lineWidth,
                                 width,
                                 height) {
                context.strokeStyle = color;
                context.lineWidth = lineWidth;
                var w_2 = width / 2;
                var h_2 = height / 2;
                activities.ui.roundedRect(
                    context, w_2 * -1, h_2 * -1, w_2, h_2, 3);
                context.stroke();
            },
            
            /*
             * draw filled circle
             */
            fillCircle: function(context,
                                 color,
                                 radius,
                                 shadow) {
                context.fillStyle = color;
                if (shadow) {
                    activities.ui.shadowOn(context);
                }
                activities.ui.circle(context, radius);
                context.fill();
                if (shadow) {
                    activities.ui.shadowOff(context);
                }
            },
            
            /*
             * draw stroke circle 
             */
            strokeCircle: function(context,
                                   color,
                                   radius,
                                   lineWidth) {
                context.strokeStyle = color;
                context.lineWidth = lineWidth;
                activities.ui.circle(context, radius);
                context.stroke();
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
            },
            
            // rect diagram element agnostic. must be set on element
            
            /*
             * default rect diagram element initialization
             */
            initDiagramElem: function(width_or_radius, height, rotation) {
                this.triggerColor = null;
                this.x = 0;
                this.y = 0;
                this.rotation = rotation;
                
                // if circle
                this.radius = width_or_radius;
                
                // if rect
                this.width = width_or_radius;
                this.height = height;
                
                this.borderWidth = 2;
                this.fillColor = '#edf7ff';
                this.borderColor = '#b5d9ea';
                this.selectedFillColor = '#fff7ae';
                this.selectedBorderColor = '#e3ca4b';
                this.renderLabel = false;
                this.selected = false;
                this.label = null;
                this.description = null;
            },
            
            /*
             * default rect diagram element rendering
             */
            renderRectElem: function() {
                // control layer
                var context = this.diagram.layers.control.context;
                context.save();
                context.translate(this.x, this.y);
                if (this.rotation) {
                    context.rotate(this.rotation * Math.PI / 180);
                }
                activities.ui.fillRect(context,
                                       this.triggerColor,
                                       this.width,
                                       this.height);
                context.restore();
                
                // diagram layer
                var fillColor, borderColor;
                if (!this.selected) {
                    fillColor = this.fillColor;
                    borderColor = this.borderColor;
                } else {
                    fillColor = this.selectedFillColor;
                    borderColor = this.selectedBorderColor;
                }
                context = this.diagram.layers.diagram.context;
                context.save();
                context.translate(this.x, this.y);
                if (this.rotation) {
                    context.rotate(this.rotation * Math.PI / 180);
                }
                activities.ui.fillRect(context,
                                       fillColor,
                                       this.width,
                                       this.height,
                                       true);
                activities.ui.strokeRect(context,
                                         borderColor,
                                         this.borderWidth,
                                         this.width,
                                         this.height);
                if (this.renderLabel) {
                    activities.ui.label(context, this.label, this.width);
                }
                context.restore();
            }
        },
        
        /*
         * action handler for activities
         */
        actions: {
            
            // tmp. remove as soon as persistence widget is implemented
            _open: 0,
            
            new_activity: function(actions, element, event) {
                demo_editor.newDiagram();
            },
            
            open_activity: function(actions, element, event) {
                // tmp. alter with persistence widget code
                var model;
                if (activities.actions._open) {
                    model = eval(uneval(tests.model));
                    activities.actions._open = 0;
                } else {
                    model = eval(uneval(tests.model_2));
                    activities.actions._open = 1;
                }
                demo_editor.openDiagram(model);
            },
            
            save_activity: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            initial_node: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            final_node: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            action_node: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            join_node: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            fork_node: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            merge_node: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            decision_node: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            edge: function(actions, element, event) {
                bdajax.error('Not implemented');
            },
            
            debug: function(actions, element, event) {
                var status = $('.status');
                status.toggleClass('hidden');
            },
            
            run_tests: function(actions, element, event) {
                $('.qunit').show();
                tests.run();
            },
            
            flip_layers: function(actions, element, event) {
                activities.ui.toggleCanvas(demo_editor.name);
            }
        }
    }
    
    
    // ************************************************************************
    // activities.model.Model
    // ************************************************************************
    
    /* 
     * expects JSON serialized model as context.
     */
    activities.model.Model = function(context) {
        if (!context) {
            context = {
                __type: activities.model.ACTIVITY,
                __name: ''
            }
        }
        this.context = context;
        if (!this.context.__name) {
            this.context.__name = 'UNSET';
        }
        this.context.__parent = '';
        
        // set __name and __parent
        // XXX: recursion
        for (var key in this.context.children) {
            var node = this.node(key);
            node.__name = key;
            node.__parent = this.context.__name;
        }
        
        // set incoming_edges and outgoing_edges on model nodes
        var edges = this.filtered(activities.model.EDGE);
        var edge, source, target;
        for (var idx in edges) {
            // XXX: traversal by dottedpath if necessary
            edge = edges[idx];
            
            source = this.node(edge.source);
            if (!source.outgoing_edges) {
                source.outgoing_edges = new Array();
            }
            source.outgoing_edges.push(edge.__name);
            
            target = this.node(edge.target);
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
    activities.events.Dispatcher = function(diagram) {
        this.diagram = diagram;
        
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
            var canvas = $(this.diagram.layers.diagram.canvas);
            canvas.data('dispatcher', this);
            canvas.unbind().bind('mousedown mousemove mouseup',
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
     * expects diagram name mapping to editor dom id and a raw model.
     */
    activities.ui.Editor = function(name) {
        this.name = name;
        this.actions = null;
        this.properties = null;
        this.model = null;
        this.renderer = null;
    }
    
    activities.ui.Editor.prototype.init = function() {
        try {
            var canvas = $(this.renderer.diagram.layers.diagram.canvas);
            canvas.data('dispatcher', null);
        } catch (err) {}
        
        this.actions = new activities.ui.Actions(this);
        this.properties = new activities.ui.Properties(this);
        this.renderer = new activities.ui.TierRenderer(this);
        
        this.renderer.render();
        this.properties.display(this.renderer.diagram);
    }
    
    activities.ui.Editor.prototype.newDiagram = function() {
        this.model = new activities.model.Model(null);
        this.init();
    }
    
    activities.ui.Editor.prototype.openDiagram = function(model){
        this.model = new activities.model.Model(model);
        this.init();
    }
    
    
    // ************************************************************************
    // activities.ui.Actions
    // ************************************************************************
    
    /*
     * Actions
     */
    activities.ui.Actions = function(editor) {
        this.editor = editor;
        var actions = this;
        var elements = $('#' + editor.name + ' div.actions a');
        elements.unbind().bind('click', function(event) {
            var elem = $(this);
            var action = elem.attr('class');
            activities.actions[action](actions, elem, event);
        });
    }
    
    activities.ui.Actions.prototype = {
        
        /*
         * enable action by id
         */
        enable: function(id) {
            
        },
        
        /*
         * disable action by id
         */
        disable: function(id) {
            
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Properties
    // ************************************************************************
    
    activities.ui.Properties = function(editor) {
        this.model = editor.model;
        this.container = $('#' + editor.name + ' .element_properties');
        this.recent_node = null;
        this.recent_element = null;
        
        var typenames = new Array();
        var model = activities.model;
        typenames[model.ACTIVITY] = 'Activity';
        typenames[model.INITIAL] = 'Initial Node';
        typenames[model.FORK] = 'Fork';
        typenames[model.JOIN] = 'Join';
        typenames[model.DECISION] = 'Decision';
        typenames[model.MERGE] = 'Merge';
        typenames[model.FLOW_FINAL] = 'Flow final Node';
        typenames[model.FINAL] = 'Final Node';
        typenames[model.ACTION] = 'Action';
        typenames[model.EDGE] = 'Edge';
        this.typenames = typenames;
    }
    
    activities.ui.Properties.prototype = {
        
        /*
         * display properties for diagram element
         */
        display: function(elem) {
            this.clear();
            var node;
            if (typeof(elem.diagram) == 'undefined') {
                node = this.model.context;
            } else {
                var path = elem.diagram.mapping[elem.triggerColor];
                node = this.model.node(path);
            }
            this.recent_node = node;
            this.recent_element = elem;
            // generic
            this.prop({
                type: 'string',
                name: 'type',
                value: this.typenames[node.__type],
                title: 'Type:',
                readonly: true
            });
            this.prop({
                type: 'string',
                name: 'label',
                value: elem.label || node.__name,
                title: 'Label:'
            });
            this.prop({
                type: 'text',
                name: 'description',
                value: elem.description || '',
                title: 'Description:'
            });
            if (node.__type == activities.model.EDGE) {
                this.prop({
                    type: 'string',
                    name: 'source',
                    value: node.source || '',
                    title: 'Source:',
                    readonly: true
                });
                this.prop({
                    type: 'string',
                    name: 'target',
                    value: node.target || '',
                    title: 'Target:',
                    readonly: true
                });
            } else if (node.__type != activities.model.ACTIVITY) {
                var value =
                    node.incoming_edges ? node.incoming_edges.join(',') : '';
                this.prop({
                    type: 'string',
                    name: 'incoming',
                    value: value,
                    title: 'Incoming Edges:',
                    readonly: true
                });
                value =
                    node.outgoing_edges ? node.outgoing_edges.join(',') : '';
                this.prop({
                    type: 'string',
                    name: 'outgoing',
                    value: value,
                    title: 'Outgoing Edges:',
                    readonly: true
                });
            }
            var properties = this;
            $('.update', this.container)
                .unbind()
                .bind('click', function(evt) {
                    evt.preventDefault();
                    properties.update();
                });
        },
        
        /*
         * update props on node and diagram element
         */
        update: function() {
            var node = this.recent_node;
            var elem = this.recent_element;
            var label = $('input[name="label"]',
                          this.container).attr('value');
            var description = $('textarea[name="description"]',
                                this.container).attr('value');
            node.label = label;
            node.description = description;
            elem.label = label;
            elem.description = description;
            elem.render();
        },
        
        /*
         * clear props
         */
        clear: function() {
            $('.props', this.container).empty();
        },
        
        /*
         * opts = {
         *     type: [string|text],
         *     name: 'foo',
         *     value: 'bar',
         *     title: 'Baz',
         *     readonly: false,
         * }
         */
        prop: function(opts) {
            var type = opts.type;
            var name = opts.name;
            var value = opts.value;
            var title = opts.title;
            var readonly = opts.readonly;
            var prop = '<div class="field">';
            prop += '<label for="' + name + '">' + opts.title + '</label>';
            prop += '<br />';
            if (type == 'string') {
                prop += '<input type="text" name="' + name +
                        '" value="' + value + '"';
                if (readonly) {
                    prop += ' disabled="disabled"';
                }
                prop += ' />';
            } else {
                prop += '<textarea name="' + name + '" rows="6" cols="27"';
                if (readonly) {
                    prop += ' disabled="disabled"';
                }
                prop += '>' + value + '</textarea>';
            }
            prop += '</div>';
            $('.props', this.container).append(prop);
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
     * x / y grid mapping 2 dimensional array positions to diagram elements
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
         * elem - the diagram element
         */
        set: function(x, y, elem) {
            if (!this.data[x]) {
                this.data[x] = new Array();
            }
            if (!this.data[x][y]) {
                this.data[x][y] = new Array();
            }
            this.data[x][y] = elem;
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
                        elem.x + ',' + elem.y;
                    ret += elem;
                }
                ret += '\n';
            }
            return ret;
        }
    }
    
    
    // ************************************************************************
    // activities.ui.TierRenderer
    // ************************************************************************
    
    /*
     * http://ls11-www.cs.uni-dortmund.de/people/gutweng/AE-07/schichten.pdf
     */
    activities.ui.TierRenderer = function(editor) {
        this.diagram = new activities.ui.Diagram(editor);
        this.node2tier = new Object();
        this.tiers = new Array();
        this.model = editor.model;
        this.grid = null;
        this.diagram.bind();
    }
    
    activities.ui.TierRenderer.prototype = {
        
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
            var grid = this.grid;
            var size = grid.size();
            var entry;
            for (var i = 0; i < size[0]; i++) {
                for (var j = 0; j < size[1]; j++) {
                    entry = grid.get(i, j);
                    if (!entry) {
                        continue;
                    }
                    // XXX: more info
                    ret += 'x: ' + i + ', y: ' + j + '\n';
                }
            }
            return ret;
        },
        
        /*
         * return initial node
         */
        initial: function() {
            var model = this.model;
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
         * set tier for each node
         */
        setNodeTier: function(tier, node) {
            if (typeof(this.node2tier[node.__name]) == "undefined") {
                this.node2tier[node.__name] = tier;
            } else if (tier > this.node2tier[node.__name]) {
                this.node2tier[node.__name] = tier;
            }
            var model = this.model;
            var outgoing = model.outgoing(node);
            var edge, target;
            for (var idx in outgoing) {
                edge = outgoing[idx];
                target = model.target(edge);
                this.setNodeTier(tier + 1, target);
            }
        },
        
        /*
         * Set tier nodes
         */
        setTierNodes: function() {
            for (var key in this.node2tier) {
                tier = this.node2tier[key]
                if (typeof(this.tiers[tier]) == "undefined") {
                    this.tiers[tier] = new Array();
                }
                this.tiers[tier].push(key);
            }
        },
        
        /*
         * Set tier kinks
         */
        setTierKinks: function(tier, node) {
            var model = this.model;
            var outgoing = model.outgoing(node);
            var edge, target, diff;
            for (var idx in outgoing) {
                edge = outgoing[idx];
                target = model.target(edge);
                diff = this.node2tier[target.__name] -
                       this.node2tier[node.__name];
                if (diff > 1) {
                    for (var i = 1; i < diff; i++) {
                        this.tiers[tier + i].push(edge.__name);
                    }
                }
                this.setTierKinks(tier + 1, target);
            }
        },
        
        /*
         * create edges
         */
        createEdges: function() {
            var diagram = this.diagram;
            var model = this.model;
            var edges = model.filtered(activities.model.EDGE);
            for (var idx in edges) {
                var edge = edges[idx];
                var elem = new activities.ui.Edge(diagram);
                elem.source = edge.source;
                elem.target = edge.target;
                diagram.map(edge, elem);
            }
        },
        
        /*
         * Create grid
         */
        createGrid: function() {
            this.grid = new activities.ui.Grid();
            var elem;
            for (var i in this.tiers) {
                for (var j in this.tiers[i]) {
                    node = this.model.node(this.tiers[i][j]);
                    elem = this.getDiagramElement(node);
                    this.grid.set(i, j, elem);
                }
            }
        },
        
        // Set x/y position for elements in grid
        setElementPositions: function() {
            var step_x = 140;
            var step_y = 120;
            var x = step_x;
            var y = step_y;
            var model = this.model;
            var grid = this.grid;
            var size = grid.size();
            var elem;
            for (var i = 0; i < size[0]; i++) {
                for (var j = 0; j < size[1]; j++) {
                    elem = grid.get(i, j);
                    if (!elem) {
                        continue;
                    }
                    elem.x = x;
                    elem.y = y;
                    y += step_y;
                }
                x += step_x;
                y = step_y;
            }
        },
        
        /*
         * lookup or create UI element by node definition.
         */
        getDiagramElement: function(node) {
            var diagram = this.diagram;
            
            // check if element already exists
            var trigger = diagram.r_mapping[node.__name];
            if (trigger) {
                return diagram.elements[trigger];
            }
            
            // create new diagram element
            switch (node.__type) {
                case activities.model.EDGE: {
                    // this is a kink
                    var kink = new activities.ui.Kink();
                    var trigger = diagram.r_mapping[node.__name];
                    var edge = diagram.elements[trigger];
                    edge.kinks.push(kink);
                    return kink;
                }
                case activities.model.INITIAL: {
                    var initial = new activities.ui.Initial(diagram);
                    diagram.map(node, initial);
                    return initial;
                }
                case activities.model.FINAL: {
                    var final_node = new activities.ui.Final(diagram);
                    diagram.map(node, final_node);
                    return final_node;
                }
                case activities.model.ACTION: {
                    var action = new activities.ui.Action(diagram);
                    action.label = node.__name;
                    diagram.map(node, action);
                    return action;
                }
                case activities.model.DECISION: {
                    var decision = new activities.ui.Decision(diagram);
                    diagram.map(node, decision);
                    return decision;
                }
                case activities.model.MERGE: {
                    var merge = new activities.ui.Merge(diagram);
                    diagram.map(node, merge);
                    return merge;
                }
                case activities.model.FORK: {
                    var fork = new activities.ui.Fork(diagram);
                    diagram.map(node, fork);
                    return fork;
                }
                case activities.model.JOIN: {
                    var join = new activities.ui.Join(diagram);
                    diagram.map(node, join);
                    return join;
                }
            }
        },
        
        /*
         * render diagram
         */
        render: function() {
            // mapping for node id to tier level
            this.node2tier = new Object();
            
            // mapping for tier level to contained node ids
            this.tiers = new Array();
            
            // get initial node, if no initial node render empty diagram
            var initial;
            try {
                initial = this.initial();
            } catch (err) {
                this.diagram.render();
                return;
            }
            
            // check tier for each node and write to this.node2tier
            this.setNodeTier(0, initial);
            
            // set node ids for each tier
            this.setTierNodes();
            
            // set kink ids (edge) for each tier
            this.setTierKinks(0, initial);
            
            // create edges
            this.createEdges();
            
            // create grid
            this.createGrid();
            
            // set positions for diagram elements
            this.setElementPositions();
            
            // render diagram
            this.diagram.render();
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
        
        // trigger color to diagram element
        this.elements = new Object();
        
        // trigger color to model element dotted path
        this.mapping = new Object();
        
        // model element dotted path to trigger color
        this.r_mapping = new Object();
        
        // current focused diagram element
        this.focused = null;
        
        this.triggerColor = '#000000';
        this.layers = {
            control:
                new activities.ui.Layer($('#control_' + editor.name).get(0)),
            diagram:
                new activities.ui.Layer($('#diagram_' + editor.name).get(0))
        };
        this.width = this.layers.diagram.canvas.width;
        this.height = this.layers.diagram.canvas.height;
        
        this.label = null;
        this.description = null;
        
        // array for trigger color calculation for this diagram
        this._nextTriggerColor = [0, 0, 0];
        
        this.dispatcher = new activities.events.Dispatcher(this);
        this.dispatcher.bind();
    }
    
    activities.ui.Diagram.prototype = {
        
        /*
         * bind event handler
         */
        bind: function() {
            // event subscription
            var dispatcher = this.dispatcher;
            dispatcher.subscribe(
                activities.events.MOUSE_IN, this, this.setCursor);
            dispatcher.subscribe(
                activities.events.MOUSE_DOWN, this, this.unselectAll);
        },
        
        /*
         * iterate over elements of diagram and call render function
         */
        render: function() {
            // clear control layer
            var context = this.layers.control.context;
            context.save();
            context.clearRect(0, 0, this.width, this.height);
            context.restore();
            
            // clear diagram layer
            var context = this.layers.diagram.context;
            context.save();
            context.clearRect(0, 0, this.width, this.height);
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
            this.mapping[elem.triggerColor] = node.__name;
            this.r_mapping[node.__name] = elem.triggerColor;
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
            obj.editor.properties.display(obj);
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Initial
    // ************************************************************************
    
    activities.ui.Initial = function(diagram) {
        this.init(20, 0, 0);
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = diagram.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Initial.prototype.init = activities.ui.initDiagramElem;
    
    activities.ui.Initial.prototype.render = function() {
        // control layer
        var context = this.diagram.layers.control.context;
        context.save();
        context.translate(this.x, this.y);
        activities.ui.fillCircle(context,
                                 this.triggerColor,
                                 this.radius);
        context.restore();
        
        // diagram layer
        var fillColor, borderColor;
        if (!this.selected) {
            fillColor = this.fillColor;
            borderColor = this.borderColor;
        } else {
            fillColor = this.selectedFillColor;
            borderColor = this.selectedBorderColor;
        }
        context = this.diagram.layers.diagram.context;
        context.save();
        context.translate(this.x, this.y);
        activities.ui.fillCircle(context,
                                 fillColor,
                                 this.radius,
                                 true);
        activities.ui.strokeCircle(context,
                                   borderColor,
                                   this.radius,
                                   this.borderWidth);
        context.restore();
    }
    
    
    // ************************************************************************
    // activities.ui.Final
    // ************************************************************************
    
    activities.ui.Final = function(diagram) {
        this.init(20, 0, 0);
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = diagram.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Final.prototype.init = activities.ui.initDiagramElem;
    
    activities.ui.Final.prototype.render = function() {
        // control layer
        var context = this.diagram.layers.control.context;
        context.save();
        context.translate(this.x, this.y);
        activities.ui.fillCircle(context,
                                 this.triggerColor,
                                 this.radius);
        context.restore();
        
        // diagram layer
        var fillColor, borderColor;
        if (!this.selected) {
            fillColor = this.fillColor;
            borderColor = this.borderColor;
        } else {
            fillColor = this.selectedFillColor;
            borderColor = this.selectedBorderColor;
        }
        context = this.diagram.layers.diagram.context;
        context.save();
        context.translate(this.x, this.y);
        activities.ui.fillCircle(context,
                                 borderColor,
                                 this.radius,
                                 true);
        activities.ui.fillCircle(context,
                                 fillColor,
                                 this.radius - this.borderWidth);
        activities.ui.fillCircle(context,
                                 borderColor,
                                 this.radius / 2);
        context.restore();
    }
    
    
    // ************************************************************************
    // activities.ui.Action
    // ************************************************************************
    
    activities.ui.Action = function(diagram) {
        this.init(100, 70, 0);
        this.renderLabel = true;
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = diagram.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Action.prototype.init = activities.ui.initDiagramElem;
    
    activities.ui.Action.prototype.render = activities.ui.renderRectElem;
    
    
    // ************************************************************************
    // activities.ui.Decision
    // ************************************************************************
    
    activities.ui.Decision = function(diagram) {
        this.init(40, 40, 45);
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = diagram.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Decision.prototype.init = activities.ui.initDiagramElem;
    
    activities.ui.Decision.prototype.render = activities.ui.renderRectElem;
    
    
    // ************************************************************************
    // activities.ui.Merge
    // ************************************************************************
    
    activities.ui.Merge = function(diagram) {
        this.init(40, 40, 45);
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = diagram.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Merge.prototype.init = activities.ui.initDiagramElem;
    
    activities.ui.Merge.prototype.render = activities.ui.renderRectElem;
    
    
    // ************************************************************************
    // activities.ui.Join
    // ************************************************************************
    
    activities.ui.Join = function(diagram) {
        this.init(10, 80, 0);
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = diagram.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Join.prototype.init = activities.ui.initDiagramElem;
    
    activities.ui.Join.prototype.render = activities.ui.renderRectElem;
    
    
    // ************************************************************************
    // activities.ui.Fork
    // ************************************************************************
    
    activities.ui.Fork = function(diagram) {
        this.init(10, 80, 0);
        
        this.diagram = diagram;
        this.diagram.add(this);
        
        // event subscription
        var dispatcher = diagram.dispatcher;
        dispatcher.subscribe(
            activities.events.MOUSE_IN, this, activities.events.setCursor);
        dispatcher.subscribe(
            activities.events.MOUSE_DOWN, this, activities.events.setSelected);
    }
    
    activities.ui.Fork.prototype.init = activities.ui.initDiagramElem;
    
    activities.ui.Fork.prototype.render = activities.ui.renderRectElem;
    
    
    // ************************************************************************
    // activities.ui.Edge
    // ************************************************************************
    
    activities.ui.Edge = function(diagram) {
        this.triggerColor = null;
        
        this.source = null;
        this.target = null;
        this.kinks = new Array();
        
        this.diagram = diagram;
        this.diagram.add(this);
    }
    
    activities.ui.Edge.prototype.renderPath = function(context) {
        var diagram = this.diagram;
        var source = diagram.elements[diagram.r_mapping[this.source]];
        var target = diagram.elements[diagram.r_mapping[this.target]];
        
        context.beginPath();
        context.moveTo(source.x, source.y);
        var kink;
        for (var idx in this.kinks) {
            kink = this.kinks[idx];
            context.lineTo(kink.x, kink.y);
        }
        context.lineTo(target.x, target.y);
    }
    
    activities.ui.Edge.prototype.render = function() {
        // control layer
        var context = this.diagram.layers.control.context;
        context.save();
        context.strokeStyle = this.triggerColor;
        context.lineWidth = 2;
        this.renderPath(context);
        context.stroke();
        context.restore();
        
        // diagram layer
        context = this.diagram.layers.diagram.context;
        context.save();
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        this.renderPath(context);
        context.stroke();
        context.restore();
    }
    
    
    // ************************************************************************
    // activities.ui.Kink
    // ************************************************************************
    
    /*
     * represent a kink of an edge.
     */
    activities.ui.Kink = function() {
        this.x = null;
        this.y = null;
    }
    
})(jQuery);