/*
 * activities
 * ==========
 * 
 * An Activity diagram Editor.
 * 
 * Copyright (c) 2011, BlueDynamics Alliance, Austria, Germany, Switzerland
 * All rights reserved.
 * 
 * Contributors
 * ------------
 * 
 * - Robert Niederreiter
 * 
 * Requires
 * --------
 * 
 * - jQuery
 * - jQuery Tools
 * - bdajax
 */

var demo_editor = null;

// dnd related
var global_mousedown = 0;

(function($) {
    
    $(document).ready(function() {
        // global mouse wheel binding
        if (window.addEventListener) {
            // mozilla
            window.addEventListener('DOMMouseScroll',
                                    activities.events.notify,
                                    false);
        }
        // IE / Opera / Chrome
        $(document).bind('mousewheel', activities.events.notify);
        $(window).bind('mousewheel', activities.events.notify);
        
        demo_editor = new activities.ui.Editor('level_0');
        demo_editor.newDiagram();
        
        $('.qunit').show();
        tests.run();
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
            },
            
            /*
             * create uid
             * http://stackoverflow.com/questions/105034/
             */
            createUID: function() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
                    .replace(/[xy]/g, function(c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' 
                            ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    }).toUpperCase();
            },
            
            /*
             * remove array item
             * 
             * http://ejohn.org/blog/javascript-array-remove/
             */
            removeArrayItem: function(arr, from, to) {
                var rest = arr.slice((to || from) + 1 || arr.length);
                arr.length = from < 0 ? arr.length + from : from;
                return arr.push.apply(arr, rest);
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
            EDGE       : 8,
            
            TYPE_NAMES: [
                'Activity',
                'Initial Node',
                'Fork',
                'Join',
                'Decision',
                'Merge',
                'Final Node',
                'Action',
                'Edge'
            ]
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
            MOUSE_WHEEL: 5,
            
            /*
             * event notification
             */
            notify: function(event) {
                var canvas;
                if (event.type == 'mousewheel'
                 || event.type == 'DOMMouseScroll') {
                     // mousewheel, check if event target is canvas,
                    // otherwise return
                    var target;
                    if (event.target) {
                        target = event.target;
                    } else if (event.srcElement) {
                        target = event.srcElement;
                    }
                    if (!target || target.tagName != 'CANVAS') {
                        return;
                    }
                    canvas = $(target);
                } else {
                    var canvas = $(this);
                }
                event.preventDefault();
                var dispatcher = canvas.data('dispatcher');
                var diagram = dispatcher.diagram;
                var current = diagram.currentCursor(event);
                var x = current[0];
                var y = current[1];
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
                
                // trigger mousewheel if necessary and return
                if (event.type == 'mousewheel'
                 || event.type == 'DOMMouseScroll') {
                    var subscriber = dispatcher.subscriber[recent.triggerColor];
                    if (subscriber) {
                        var evt = activities.events.MOUSE_WHEEL;
                        for (var idx in subscriber[evt]) {
                            subscriber[evt][idx](recent, event);
                        }
                    }
                    return;
                }
                
                // trigger mousein/mouseout if necessary and return
                if (dispatcher.recent && recent != dispatcher.recent) {
                    var subscriber = dispatcher.subscriber[recent.triggerColor];
                    // mousein
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
                //activities.events.status(event.type, x, y, triggerColor);
            },
            
            // several event handler
        
            /*
             * set default cursor
             */
            setDefault: function(obj, event) {
                var diagram = obj.dnd ? obj : obj.diagram;
                $(diagram.layers.diagram.canvas).css('cursor', 'default');
            },
        
            /*
             * set pointer cursor
             */
            setPointer: function(obj, event) {
                var diagram = obj.dnd ? obj : obj.diagram;
                $(diagram.layers.diagram.canvas).css('cursor', 'pointer');
            },
            
            /*
             * set move cursor
             */
            setMove: function(obj, event) {
                var diagram = obj.dnd ? obj : obj.diagram;
                $(diagram.layers.diagram.canvas).css('cursor', 'move');
            },
            
            /*
             * activities.events.MOUSE_DOWN
             * 
             * set selected item. used by diagram elements
             */
            setSelected: function(obj, event) {
                var diagram = obj.diagram;
                if (diagram.focused) {
                    diagram.focused.selected = false;
                    diagram.renderTranslated(function() {
                        diagram.focused.render();
                    });
                }
                diagram.focused = obj;
                obj.selected = true;
                diagram.renderTranslated(function() {
                    obj.render();
                });
                diagram.editor.properties.display(obj);
            },
        
            /*
             * activities.events.MOUSE_DOWN
             * 
             * unselect all diagram elements. used by diagram
             */
            unselectAll: function(obj, event) {
                if (obj.focused) {
                    obj.focused.selected = false;
                    obj.focused.render();
                }
                obj.editor.properties.display(obj);
            },
            
            /*
             * activities.events.MOUSE_DOWN
             * 
             * do action
             */
            doAction: function(obj, event) {
                var diagram = obj.dnd ? obj : obj.diagram;
                var editor = diagram.editor;
                var model = editor.model;
                var actions = editor.actions;
                var node;
                switch(actions.active) {
                    case activities.actions.ADD_DIAGRAM_ELEMENT: {
                        node = model.createNode(actions.payload);
                        var elem = diagram.get(node);
                        var current = diagram.currentCursor(event);
                        var x = current[0];
                        var y = current[1];
                        var translated = diagram.translateCursor(x, y);
                        node.x = elem.x = translated[0];
                        node.y = elem.y = translated[1];
                        break;
                    }
                    case activities.actions.ADD_DIAGRAM_EDGE: {
                        var payload = actions.payload;
                        if (payload[1] == null) {
                            var node_name = diagram.mapping[obj.triggerColor];
                            payload[1] = node_name;
                            return;
                        }
                        payload[2] = diagram.mapping[obj.triggerColor];
                        node = model.createEdge(payload[1], payload[2])
                        diagram.createEdge(node);
                        break;
                    }
                    case activities.actions.DELETE_DIAGRAM_ELEMENT: {
                        var elems = diagram.selected();
                        if (!elems) {
                            return;
                        }
                        var path = diagram.mapping[elems[0].triggerColor];
                        var opts = {
                            message: 'Do you really want to delete this Item?',
                            model: model,
                            diagram: diagram,
                            path: path
                        };
                        bdajax.dialog(opts, function(options) {
                            // XXX: dottedpath
                            options.diagram.remove(options.path);
                            // XXX: dottedpath
                            options.model.remove(options.path);
                            options.diagram.render();
                        });
                        break;
                    }
                }
                actions.unselect();
                diagram.render();
            },
            
            // event utils
            
            /*
             * bind diagram element default events
             */
            bindElementDefaults: function() {
                // event subscription
                var diagram = this.diagram;
                var dnd = diagram.dnd;
                var dsp = diagram.dispatcher;
                var events = activities.events;
                dsp.subscribe(events.MOUSE_IN, this, events.setPointer);
                dsp.subscribe(events.MOUSE_DOWN, this, events.setSelected);
                dsp.subscribe(events.MOUSE_DOWN, this, events.doAction);
                dsp.subscribe(events.MOUSE_WHEEL, this, dnd.zoom);
                dsp.subscribe(events.MOUSE_DOWN, this, dnd.dragOn);
                dsp.subscribe(events.MOUSE_MOVE, this, dnd.drag);
                dsp.subscribe(events.MOUSE_UP, this, dnd.drop);
                dsp.subscribe(events.MOUSE_UP, this, dnd.panOff);
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
                var x = width / 2;
                var y = height / 2;
                activities.ui.roundedRect(
                    context, x * -1, y * -1, x, y, 3);
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
                var x = width / 2;
                var y = height / 2;
                activities.ui.roundedRect(
                    context, x * -1, y * -1, x, y, 3);
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
            
            translateEdge: function(elem, x, y, x_diff, y_diff, angle) {
                if (x - elem.x >= 0 && y - elem.y >= 0) {
                    return [elem.x + x_diff, elem.y + y_diff, angle - 180];
                }
                if (x - elem.x >= 0 && y - elem.y <= 0) {
                    return [elem.x + x_diff, elem.y - y_diff, 180 - angle];
                }
                if (x - elem.x <= 0 && y - elem.y <= 0) {
                    return [elem.x - x_diff, elem.y - y_diff, angle];
                }
                if (x - elem.x <= 0 && y - elem.y >= 0) {
                    return [elem.x - x_diff, elem.y + y_diff, angle * -1];
                }
            },
            
            // diagram element agnostic. must be set on element
            
            /*
             * default rect diagram element initialization
             */
            initDiagramElem: function(width_or_radius, height, rotation) {
                this.diagram = null;
                this.triggerColor = null;
                this.x = 0;
                this.y = 0;
                this.rotation = rotation;
                
                // if circle
                this.radius = width_or_radius;
                
                // if rect
                this.width = width_or_radius;
                this.height = height;
                
                this.edgeOffset = 5;
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
            },
            
            /*
             * Translate element coordinate for edge source by given following
             * point coordinate.
             *
             * Translate for circle element.
             */
            translateCircleEdge: function(x, y) {
                var gk = y - this.y;
                var ak = this.x - x;
                var angle = Math.abs(Math.atan(gk / ak) * 90 / (Math.PI / 2));
                var rad = this.radius + this.edgeOffset;
                var cos = Math.cos(Math.PI * angle / 180.0);
                var sin = Math.sin(Math.PI * angle / 180.0);
                var x_diff = rad * cos;
                var y_diff = rad * sin;
                return activities.ui.translateEdge(
                    this, x, y, x_diff, y_diff, angle);
            },
            
            /*
             * Translate element coordinate for edge source by given following
             * point coordinate.
             *
             * Translate for rect element.
             */
            translateRectEdge: function(x, y) {
                var width = this.width;
                var height = this.height;
                var gk = height / 2;
                var ak = width / 2;
                var marker = Math.abs(Math.atan(gk / ak) * 90 / (Math.PI / 2));
                gk = y - this.y;
                ak = this.x - x;
                var angle = Math.abs(Math.atan(gk / ak) * 90 / (Math.PI / 2));
                var angle_orgin = angle;
                if (this.rotation > 0) {
                    angle -= this.rotation;
                }
                var x_diff, y_diff;
                if (angle >= marker) {
                    angle = 90 - angle;
                    // XXX: offset by cos/sin
                    // ak = height / 2; //+ this.edgeOffset;
                    ak = height / 2 + this.edgeOffset;
                    gk = ak * Math.tan(Math.PI * angle / 180.0);
                    x_diff = gk;
                    y_diff = ak;
                } else {
                    // XXX: offset by cos/sin
                    // ak = width / 2; // + this.edgeOffset;
                    ak = width / 2 + this.edgeOffset;
                    gk = ak * Math.tan(Math.PI * angle / 180.0);
                    x_diff = ak;
                    y_diff = gk;
                }
                if (this.rotation > 0) {
                    var cos = Math.cos(Math.PI * this.rotation / 180.0);
                    var sin = Math.sin(Math.PI * this.rotation / 180.0);
                    var x_new = x_diff * cos - y_diff * sin;
                    var y_new = y_diff * cos + x_diff * sin;
                    x_diff = x_new;
                    y_diff = y_new;
                }
                return activities.ui.translateEdge(
                    this, x, y, x_diff, y_diff, angle_orgin);
            }
        },
        
        /*
         * action handler for activities
         */
        actions: {
            
            // action markers
            
            ADD_DIAGRAM_ELEMENT    : 0,
            ADD_DIAGRAM_EDGE       : 1,
            DELETE_DIAGRAM_ELEMENT : 2,
            
            // css sprite positions
            CSS_SPRITE: {
                'initial_node'  : 0,
                'final_node'    : -23,
                'action_node'   : -46,
                'decision_node' : -69,
                'merge_node'    : -92,
                'fork_node'     : -115,
                'join_node'     : -138,
                'edge'          : -161,
                'new_activity'  : -184,
                'open_activity' : -207,
                'save_activity' : -230,
                'debug'         : -253,
                'run_tests'     : -276,
                'flip_layers'   : -299,
                'delete_element': -322
            },
            
            // tmp. remove as soon as persistence widget is implemented
            _open: 0,
            
            // specific actions
            
            new_activity: function(name, element, event) {
                demo_editor.newDiagram();
            },
            
            open_activity: function(name, element, event) {
                // tmp. alter with persistence widget code
                var model;
                if (activities.actions._open) {
                    model = tests.create_test_model_1();
                    activities.actions._open = 0;
                } else {
                    model = tests.create_test_model_2();
                    activities.actions._open = 1;
                }
                demo_editor.openDiagram(model);
            },
            
            save_activity: function(name, element, event) {
                bdajax.error('Not implemented');
            },
            
            initial_node: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_ELEMENT;
                actions.payload = activities.model.INITIAL;
            },
            
            final_node: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_ELEMENT;
                actions.payload = activities.model.FINAL;
            },
            
            action_node: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_ELEMENT;
                actions.payload = activities.model.ACTION;
            },
            
            join_node: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_ELEMENT;
                actions.payload = activities.model.JOIN;
            },
            
            fork_node: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_ELEMENT;
                actions.payload = activities.model.FORK;
            },
            
            merge_node: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_ELEMENT;
                actions.payload = activities.model.MERGE;
            },
            
            decision_node: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_ELEMENT;
                actions.payload = activities.model.DECISION;
            },
            
            edge: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.ADD_DIAGRAM_EDGE;
                actions.payload = [activities.model.EDGE, null, null];
            },
            
            delete_element: function(name, element, event) {
                var actions = activities.actions.actions_object(name);
                actions.setSelected(element.attr('class'));
                actions.active = activities.actions.DELETE_DIAGRAM_ELEMENT;
            },
            
            debug: function(name, element, event) {
                var status = $('.status');
                status.toggleClass('hidden');
            },
            
            run_tests: function(name, element, event) {
                $('.qunit').show();
                tests.run();
            },
            
            flip_layers: function(name, element, event) {
                activities.ui.toggleCanvas(demo_editor.name);
            },
            
            actions_object: function(name) {
                return $('#' + name + ' canvas.diagram').data('actions');
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
            var context = {
                __type: activities.model.ACTIVITY
            }
        }
        this.context = context;
        if (!this.context.__name) {
            this.context.__name = activities.utils.createUID();
        }
        if (!this.context.__parent) {
            this.context.__parent = null;
        }
        if (!this.context.children) {
            this.context.children = {};
        }
        
        // set __name and __parent
        // XXX: recursion + dottedpath for parent
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
            // XXX: dottedpath
            source.outgoing_edges.push(edge.__name);
            
            target = this.node(edge.target);
            if (!target.incoming_edges) {
                target.incoming_edges = new Array();
            }
            // XXX: dottedpath
            target.incoming_edges.push(edge.__name);
        }
    }
    
    activities.model.Model.prototype = {
        
        /*
         * return initial node
         */
        initial: function() {
            var initial = this.filtered(activities.model.INITIAL);
            if (initial.length == 0) {
                throw "Could not find initial node. Abort.";
            }
            if (initial.length > 1) {
                throw "Invalid model. More than one initial node found";
            }
            return initial[0];
        },
        
        /*
         * return parent of node
         */
        parent: function(node) {
            var parent = node.__parent;
            if (parent == this.context.__name) {
                return this.context;
            }
            return this.node(parent);
        },
        
        /*
         * Create new child in parent by type. if parent is null, this.context
         * is used.
         */
        create: function(type, parent) {
            var context;
            if (parent) {
                context = parent;
            } else {
                context = this.context;
            }
            
            // create UID
            var uid = activities.utils.createUID();
            
            // create children container if not exists
            if (!context.children) {
                context.children = new Object();
            }
            
            // create child node in context.children and return created node
            context.children[uid] = new Object();
            var node = context.children[uid];
            node.__name = uid;
            node.__parent = context.__name;
            node.__type = type;
            node.label = 'New ' + activities.model.TYPE_NAMES[type];
            node.description = '';
            return node;
        },
        
        
        /*
         * Create new node in parent by type.
         */
        createNode: function(type, parent) {
            var node = this.create(type, parent);
            node.outgoing_edges = new Array();
            node.incoming_edges = new Array();
            return node;
        },
        
        /*
         * Create new edge in parent.
         */
        createEdge: function(source, target, parent) {
            var node = this.create(activities.model.EDGE, parent);
            node.source = source;
            node.target = target;
            var source_node = this.node(source);
            var target_node = this.node(target);
            // XXX: dottedpath
            source_node.outgoing_edges.push(node.__name);
            // XXX: dottedpath
            target_node.incoming_edges.push(node.__name);
            return node;
        },
        
        /*
         * remove node by path from model
         */
        remove: function(path) {
            var node = this.node(path);
            var parent = this.parent(node);
            if (node.__type == activities.model.EDGE) {
                // if edge, remove from target.incoming_edges and 
                // source.outgoing_edges
                var edges = this.source(node).outgoing_edges;
                activities.utils.removeArrayItem(
                    edges, edges.indexOf(node.__name));
                var edges = this.target(node).incoming_edges;
                activities.utils.removeArrayItem(
                    edges, edges.indexOf(node.__name));
                delete parent.children[node.__name];
            } else {
                // if activity node, remove all edges defined by incoming_edges
                // and outgoing_edges
                var edges = new Array();
                for (idx in node.incoming_edges) {
                    edges.push(node.incoming_edges[idx]);
                }
                for (idx in node.outgoing_edges) {
                    edges.push(node.outgoing_edges[idx]);
                }
                for (idx in edges) {
                    this.remove(edges[idx]);
                }
                delete parent.children[node.__name];
            }
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
            if (!path) {
                return;
            }
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
        
        this.bind();
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
                    [], // activities.events.MOUSE_OUT
                    []  // activities.events.MOUSE_WHEEL
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
        this.diagram = null;
        this.renderer = null;
    }
    
    activities.ui.Editor.prototype = {
        
        init: function() {
            try {
                var canvas = $(this.renderer.diagram.layers.diagram.canvas);
                canvas.data('dispatcher', null);
            } catch (err) {}
            
            this.actions = new activities.ui.Actions(this);
            this.properties = new activities.ui.Properties(this);
            this.diagram = new activities.ui.Diagram(this);
            this.renderer = new activities.ui.TierRenderer(this);
            this.renderer.render();
            this.properties.display(this.diagram);
        },
        
        newDiagram: function() {
            this.model = new activities.model.Model(null);
            this.init();
        },
        
        openDiagram: function(model){
            this.model = new activities.model.Model(model);
            this.init();
        }
        
    }
    
    
    // ************************************************************************
    // activities.ui.Actions
    // ************************************************************************
    
    /*
     * Actions
     */
    activities.ui.Actions = function(editor) {
        this.editor = editor;
        this.active = null;
        this.type = null;
        $('#' + editor.name + ' canvas.diagram').data('actions', this);
        var elements = $('#' + editor.name + ' div.actions a');
        elements.unbind().bind('click', function(event) {
            event.preventDefault();
            var elem = $(this);
            var action = elem.attr('class');
            var func = activities.actions[action];
            func(editor.name, elem, event);
        });
    }
    
    activities.ui.Actions.prototype = {
        
        setSelected: function(name) {
            this.unselect();
            $('#' + this.editor.name + ' div.actions a.' + name)
                .css('background-position',
                     '-23px ' + activities.actions.CSS_SPRITE[name] + 'px');
        },
        
        unselect: function() {
            this.active = null;
            this.type = null;
            $('#' + this.editor.name + ' div.actions a').each(function() {
                var elem = $(this);
                var name = elem.attr('class');
                elem.css('background-position',
                         '0px ' + activities.actions.CSS_SPRITE[name] + 'px');
            });
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
                value: activities.model.TYPE_NAMES[node.__type],
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
    activities.ui.Grid = function(model) {
        this.model = model;
        
        // this.data[x][y]
        this.data = new Array();
        
        this.orgin_x = 60;
        this.orgin_y = 70;
        this.step_x = 120;
        this.step_y = 50;
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
                throw "No element found at position " + x + ',' + y;
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
         * return nearest grid x/y position for coordinates
         */
        nearest: function(x, y) {
            
        },
        
        /*
         * Set x/y position for elements in grid
         */
        arrange: function() {
            var x = this.orgin_x;
            var y = this.orgin_y;
            var model = this.model;
            var size = this.size();
            var elem;
            for (var i = 0; i < size[0]; i++) {
                for (var j = 0; j < size[1]; j++) {
                    elem = this.get(i, j);
                    if (elem) {
                        elem.x = x;
                        elem.y = y;
                    }
                    y += this.step_y;
                }
                x += this.step_x;
                y = this.orgin_y;
            }
        },
        
        /*
         * insert element before x position at y position
         */
        before_X: function(x, y, elem) {
            // if first
            // always inserts new column
            if (x == 0) {
                var col = new Array();
                col[y] = elem;
                this.data.splice(0, 0, col);
                return;
            }
            
            // try to insert before, if coordinate already taken for another
            // element, insert new column.
            var col = this.data[x - 1];
            if (col[y]) {
                var col = new Array();
                col[y] = elem;
                this.data.splice(x, 0, col);
            } else {
                col[y] = elem;
            }
        },
        
        /*
         * insert element before y position at x position
         */
        before_Y: function(x, y, elem) {
            this.data[x].splice(y, 0, elem);
        },
        
        /*
         * insert element after x position at y position
         */
        after_X: function(x, y, elem) {
            
        },
        
        /*
         * insert element after y position at x position
         */
        after_Y: function(x, y, elem) {
            
        },
        
        /*
         * debug output
         */
        debug: function() {
            var ret = '';
            var size = this.size();
            var row, entry;
            for (var i = 0; i < size[0]; i++) {
                row = '|';
                for (var j = 0; j < size[1]; j++) {
                    entry = this.get(i, j);
                    if (!entry) {
                        row += '-x-|';
                    } else {
                        row += '-n-|';
                    }
                }
                row += '\n';
                ret += row;
            }
            return ret;
        },
    }
    
    
    // ************************************************************************
    // activities.ui.TierRenderer
    // ************************************************************************
    
    /*
     * http://ls11-www.cs.uni-dortmund.de/people/gutweng/AE-07/schichten.pdf
     */
    activities.ui.TierRenderer = function(editor) {
        this.model = editor.model;
        this.diagram = editor.diagram;
        
        this.node2tier = new Object();
        this.tiers = new Array();
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
         * 
         * XXX: maybe in diagram
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
         * count maximum number of tier elements
         */
        maxTierElements: function() {
            var ret = 0;
            for (var i in this.tiers) {
                if (this.tiers[i].length > ret) {
                    ret = this.tiers[i].length;
                }
            }
            return ret;
        },
        
        /*
         * fill grid
         */
        fillGrid: function() {
            grid = this.diagram.grid;
            var yMax = this.maxTierElements() * 2 - 1;
            if (yMax % 2 == 1) {
                yMax += 1;
            }
            var node, elem;
            for (var i in this.tiers) {
                yStart = yMax / 2 - this.tiers[i].length;
                for (var j in this.tiers[i]) {
                    node = this.model.node(this.tiers[i][j]);
                    elem = this.diagram.get(node);
                    grid.set(i, yStart + (j * 2), elem);
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
                initial = this.model.initial();
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
            
            // fill grid
            this.fillGrid();
            
            // arrange XY positions
            this.diagram.grid.arrange();
            
            // render diagram
            this.diagram.render();
        }
    }
    
    
    // ************************************************************************
    // activities.ui.DnD
    // ************************************************************************
    
    activities.ui.DnD = function() {
        this.recent = null;
        this.pan_active = false;
        this.last_x = null;
        this.last_y = null;
        // XXX: multi editor support
        var dnd = this;
        $(document).unbind().bind('mousedown', function(event) {
            ++global_mousedown;
        });
        $(document).unbind().bind('mouseup', function(event) {
            --global_mousedown;
            if (global_mousedown <= 0) {
                dnd.recent = null;
                dnd.pan_active = false;
                dnd.last_x = null;
                dnd.last_y = null;
            }
        });
    }
    
    activities.ui.DnD.prototype = {
        
        zoom: function(obj, event) {
            var delta = 0;
            // IE
            if (!event) {
                event = window.event;
            }
            // IE / Opera
            if (event.wheelDelta) {
                delta = event.wheelDelta / 120;
                // In Opera 9
                if (window.opera) {
                    delta = delta * -1;
                }
            // Mozilla
            } else if (event.detail) {
                delta = event.detail * -1 / 3;
            }
            var diagram = obj.dnd ? obj : obj.diagram;
            var current = diagram.currentCursor(event);
            var x = current[0];
            var y = current[1];
            if (delta > 0) {
                diagram.scale += 0.05;
                diagram.origin_x -= x * 0.05;
                diagram.origin_y -= y * 0.05;
            } else {
                diagram.scale -= 0.05;
                diagram.origin_x += x * 0.05;
                diagram.origin_y += y * 0.05;
            }
            diagram.render();
        },
        
        panOn: function(obj, event) {
            obj.dnd.pan_active = true;
            activities.events.setMove(obj, event);
        },
        
        panOff: function(obj, event) {
            var diagram = obj.dnd ? obj : obj.diagram;
            diagram.dnd.pan_active = false;
            diagram.dnd.last_x = null;
            diagram.dnd.last_y = null;
            activities.events.setDefault(obj, event);
        },
        
        pan: function(obj, event) {
            var diagram = obj.dnd ? obj : obj.diagram;
            var dnd = diagram.dnd;
            if (!global_mousedown) {
                dnd.pan_active = false;
                dnd.last_x = null;
                dnd.last_y = null;
            }
            if (!dnd.pan_active) {
                return;
            }
            var current = diagram.currentCursor(event);
            var x = current[0];
            var y = current[1];
            if (dnd.last_x == null || dnd.last_y == null) {
                dnd.last_x = x;
                dnd.last_y = y;
                return;
            }
            var offset_x, offset_y;
            if (x > 0) {
                offset_x = dnd.last_x - x;
            } else {
                offset_x = dnd.last_x + x;
            }
            if (y > 0) {
                offset_y = dnd.last_y - y;
            } else {
                offset_y = dnd.last_y + y;
            }
            dnd.last_x = x;
            dnd.last_y = y;
            diagram.origin_x -= offset_x;
            diagram.origin_y -= offset_y;
            diagram.render();
        },
        
        dragOn: function(obj, event) {
            obj.diagram.dnd.recent = obj;
        },
        
        drag: function(obj, event) {
            var diagram = obj.dnd ? obj : obj.diagram;
            if (!global_mousedown) {
                diagram.dnd.recent = null;
                return;
            }
            var recent = diagram.dnd.recent;
            if (!recent) {
                return;
            }
            var current = diagram.currentCursor(event);
            var x = current[0];
            var y = current[1];
            var translated = diagram.translateCursor(x, y);
            recent.x = translated[0];
            recent.y = translated[1];
            diagram.render();
        },
        
        drop: function(obj, event) {
            var diagram = obj.dnd ? obj : obj.diagram;
            diagram.dnd.recent = null;
        },
    }
    
    // ************************************************************************
    // activities.ui.Diagram
    // ************************************************************************
    
    /*
     * refers to activity model
     */
    activities.ui.Diagram = function(editor) {
        this.editor = editor;
        
        this.grid = new activities.ui.Grid(editor.model);
        this.dnd = new activities.ui.DnD();
        
        // XXX: move to seperate mapping object
        // trigger color to diagram element
        this.elements = new Object();
        
        // trigger color to model element dotted path
        this.mapping = new Object();
        
        // model element dotted path to trigger color
        this.r_mapping = new Object();
        // /XXX
        
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
        
        this.scale = 1.0;
        this.origin_x = 0;
        this.origin_y = 0;
        
        this.label = null;
        this.description = null;
        
        // array for trigger color calculation for this diagram
        this._nextTriggerColor = [0, 0, 0];
        
        // child factories
        this.factories = new Array();
        this.factories[activities.model.INITIAL] = activities.ui.Initial;
        this.factories[activities.model.FINAL] = activities.ui.Final;
        this.factories[activities.model.ACTION] = activities.ui.Action;
        this.factories[activities.model.DECISION] = activities.ui.Decision;
        this.factories[activities.model.MERGE] = activities.ui.Merge;
        this.factories[activities.model.FORK] = activities.ui.Fork;
        this.factories[activities.model.JOIN] = activities.ui.Join;
        
        this.dispatcher = new activities.events.Dispatcher(this);
        
        this.bind();
    }
    
    activities.ui.Diagram.prototype = {
        
        /*
         * bind event handler
         */
        bind: function() {
            // event subscription
            var dsp = this.dispatcher;
            var events = activities.events;
            dsp.subscribe(events.MOUSE_IN, this, events.setDefault);
            dsp.subscribe(events.MOUSE_DOWN, this, events.unselectAll);
            dsp.subscribe(events.MOUSE_DOWN, this, events.doAction);
            dsp.subscribe(events.MOUSE_WHEEL, this, this.dnd.zoom);
            dsp.subscribe(events.MOUSE_DOWN, this, this.dnd.panOn);
            dsp.subscribe(events.MOUSE_UP, this, this.dnd.panOff);
            dsp.subscribe(events.MOUSE_MOVE, this, this.dnd.pan);
            dsp.subscribe(events.MOUSE_MOVE, this, this.dnd.drag);
            dsp.subscribe(events.MOUSE_UP, this, this.dnd.drop);
        },
        
        /*
         * return current cursor position
         */
        currentCursor: function(event) {
            var canvas = $(this.layers.diagram.canvas);
            var offset = canvas.offset();
            var x = event.pageX - offset.left;
            var y = event.pageY - offset.top;
            return [x, y];
        },
        
        /*
         * create diagram edge
         */
        translateCursor: function(x, y) {
            x = (x - this.origin_x) / this.scale;
            y = (y - this.origin_y) / this.scale;
            return [x, y];
        },
        
        /*
         * translate editor origin and scale and call render
         */
        renderTranslated: function(render) {
            var context_ctl = this.layers.control.context;
            context_ctl.save();
            context_ctl.translate(this.origin_x, this.origin_y);
            context_ctl.scale(this.scale, this.scale);
            
            var context_diag = this.layers.diagram.context;
            context_diag.save();
            context_diag.translate(this.origin_x, this.origin_y);
            context_diag.scale(this.scale, this.scale);
            
            render();
            
            context_ctl.restore();
            context_diag.restore();
        },
        
        /*
         * iterate over elements of diagram and call render function
         */
        render: function() {
            //this.grid.arrange();
            
            // clear control layer
            var context = this.layers.control.context;
            context.save();
            context.clearRect(0, 0, this.width, this.height);
            context.restore();
            
            // clear diagram layer
            var context = this.layers.diagram.context;
            context.save();
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, this.width, this.height);
            context.restore();
            
            var diagram = this;
            this.renderTranslated(function() {
                var elem, selected;
                for(var key in diagram.elements) {
                    var elem = diagram.elements[key];
                    if (elem.selected) {
                        selected = elem;
                        continue;
                    }
                    elem.render();
                }
                if (selected) {
                    selected.render();
                }
            });
        },
        
        /*
         * map model node to diagram element
         */
        map: function(node, elem) {
            var triggerColor = this.nextTriggerColor();
            elem.diagram = this;
            elem.triggerColor = triggerColor;
            this.elements[triggerColor] = elem;
            // XXX: dottedpath
            this.mapping[triggerColor] = node.__name;
            this.r_mapping[node.__name] = triggerColor;
            elem.bind();
            
            // label
            if (node.label) {
                elem.label = node.label;
            } else {
                elem.label = node.__name;
            }
            // description
            if (node.description) {
                elem.description = node.description;
            }
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
        
        /*
         * return array containing selected diagram elements
         */
        selected: function() {
            var ret = new Array();
            var key, elem;
            for (key in this.elements) {
                elem = this.elements[key];
                if (elem.selected) {
                    ret.push(elem);
                }
            }
            return ret;
        },
        
        /*
         * remove diagram elements
         */
        remove: function(path) {
            var model = this.editor.model;
            var node = model.node(path);
            var elem = this.get(node);
            var triggerColor = elem.triggerColor;
            if (node.__type != activities.model.EDGE) {
                var edges = new Array();
                for (idx in node.incoming_edges) {
                    edges.push(node.incoming_edges[idx]);
                }
                for (idx in node.outgoing_edges) {
                    edges.push(node.outgoing_edges[idx]);
                }
                for (idx in edges) {
                    this.remove(edges[idx]);
                }
            }
            delete this.elements[triggerColor];
            delete this.mapping[triggerColor];
            delete this.r_mapping[node.__name];
        },
        
        /*
         * Lookup or create Diagram element by model node.
         */
        get: function(node) {
            // check if element already exists
            var trigger = this.r_mapping[node.__name];
            if (trigger) {
                return this.elements[trigger];
            }
            return this.createNode(node);
        },
        
        /*
         * create diagram node element
         */
        createNode: function(node) {
            var elem;
            if (node.__type == activities.model.EDGE) {
                // this is a kink
                elem = new activities.ui.Kink();
                var trigger = this.r_mapping[node.__name];
                var edge = this.elements[trigger];
                edge.kinks.push(elem);
                return kink;
            }
            elem = new this.factories[node.__type]();
            this.map(node, elem);
            return elem;
        },
        
        /*
         * create diagram edge
         */
        createEdge: function(node) {
            var elem = new activities.ui.Edge();
            elem.source = node.source;
            elem.target = node.target;
            this.map(node, elem);
            return elem;
        }
    }
    
    
    // ************************************************************************
    // activities.ui.Initial
    // ************************************************************************
    
    activities.ui.Initial = function(diagram) {
        this.init(20, 0, 0);
    }
    
    activities.ui.Initial.prototype = {
        
        bind: activities.events.bindElementDefaults,
        
        init: activities.ui.initDiagramElem,
        
        translateEdge: activities.ui.translateCircleEdge,
        
        render: function() {
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
    }
    
    
    // ************************************************************************
    // activities.ui.Final
    // ************************************************************************
    
    activities.ui.Final = function(diagram) {
        this.init(20, 0, 0);
    }
    
    activities.ui.Final.prototype = {
        
        bind: activities.events.bindElementDefaults,
        
        init: activities.ui.initDiagramElem,
        
        translateEdge: activities.ui.translateCircleEdge,
        
        render: function() {
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
    }
    
    
    // ************************************************************************
    // activities.ui.Action
    // ************************************************************************
    
    activities.ui.Action = function(diagram) {
        this.init(100, 70, 0);
        this.renderLabel = true;
    }
    
    activities.ui.Action.prototype = {
        
        bind: activities.events.bindElementDefaults,
        
        init: activities.ui.initDiagramElem,
        
        translateEdge: activities.ui.translateRectEdge,
        
        render: activities.ui.renderRectElem
    }
    
    
    // ************************************************************************
    // activities.ui.Decision
    // ************************************************************************
    
    activities.ui.Decision = function(diagram) {
        this.init(40, 40, 45);
    }
    
    activities.ui.Decision.prototype = {
        
        bind: activities.events.bindElementDefaults,
        
        init: activities.ui.initDiagramElem,
        
        translateEdge: activities.ui.translateRectEdge,
        
        render: activities.ui.renderRectElem
    }
    
    
    // ************************************************************************
    // activities.ui.Merge
    // ************************************************************************
    
    activities.ui.Merge = function(diagram) {
        this.init(40, 40, 45);
    }
    
    activities.ui.Merge.prototype = {
        
        bind: activities.events.bindElementDefaults,
        
        init: activities.ui.initDiagramElem,
        
        translateEdge: activities.ui.translateRectEdge,
        
        render: activities.ui.renderRectElem
    }
    
    
    // ************************************************************************
    // activities.ui.Join
    // ************************************************************************
    
    activities.ui.Join = function(diagram) {
        this.init(10, 80, 0);
    }
    
    activities.ui.Join.prototype = {
        
        bind: activities.events.bindElementDefaults,
        
        init: activities.ui.initDiagramElem,
        
        translateEdge: activities.ui.translateRectEdge,
        
        render: activities.ui.renderRectElem
    }
    
    
    // ************************************************************************
    // activities.ui.Fork
    // ************************************************************************
    
    activities.ui.Fork = function(diagram) {
        this.init(10, 80, 0);
    }
    
    activities.ui.Fork.prototype = {
        
        bind: activities.events.bindElementDefaults,
        
        init: activities.ui.initDiagramElem,
        
        translateEdge: activities.ui.translateRectEdge,
        
        render: activities.ui.renderRectElem
    }
    
    
    // ************************************************************************
    // activities.ui.Edge
    // ************************************************************************
    
    activities.ui.Edge = function(diagram) {
        this.diagram = null;
        this.triggerColor = null;
        this.color = '#333333';
        this.lineWidth = 3;
        this.arrowLength = 15;
        this.selectedColor = '#bbbbbb';
        this.selected = false;
        this.label = null;
        this.description = null;
        this.source = null;
        this.target = null;
        this.kinks = new Array();
    }
    
    activities.ui.Edge.prototype = {
        
        bind: function() {
            var dsp = this.diagram.dispatcher;
            var events = activities.events;
            dsp.subscribe(events.MOUSE_IN, this, events.setPointer);
            dsp.subscribe(events.MOUSE_DOWN, this, events.setSelected);
            dsp.subscribe(events.MOUSE_DOWN, this, events.doAction);
            dsp.subscribe(events.MOUSE_WHEEL, this, this.diagram.dnd.zoom);
        },
        
        translate: function() {
            var diagram = this.diagram;
            var source = diagram.elements[diagram.r_mapping[this.source]];
            var target = diagram.elements[diagram.r_mapping[this.target]];
            var x, y;
            if (this.kinks.length != 0) {
                x = this.kinks[0].x;
                y = this.kinks[0].y;
            } else {
                x = target.x;
                y = target.y;
            }
            this._start = source.translateEdge(x, y);
            
            if (this.kinks.length != 0) {
                var last = this.kinks.length - 1;
                x = this.kinks[last].x;
                y = this.kinks[last].y;
            } else {
                x = source.x;
                y = source.y;
            }
            this._end = target.translateEdge(x, y);
        },
        
        renderPath: function(context) {
            context.beginPath();
            context.moveTo(this._start[0], this._start[1]);
            var kink;
            for (var idx in this.kinks) {
                kink = this.kinks[idx];
                context.lineTo(kink.x, kink.y);
            }
            context.lineTo(this._end[0], this._end[1]);
            context.closePath();
        },
        
        renderRoot: function(context) {
            context.translate(this._start[0], this._start[1]);
            activities.ui.circle(context, this.lineWidth);
        },
        
        renderArrow: function(context) {
            var len = this.arrowLength;
            context.translate(this._end[0], this._end[1]);
            context.rotate(this._end[2] * Math.PI / 180);
            context.beginPath();
            context.lineTo(len * -1, len / 3);
            context.lineTo(len * -1, len * -1 / 3);
            context.lineTo(0, 0);
            context.closePath();
        },
        
        render: function() {
            // translate edge start and endpoint
            this.translate();
            
            // control layer
            var context = this.diagram.layers.control.context;
            context.save();
            context.strokeStyle = this.triggerColor;
            context.lineWidth = this.lineWidth + 3;
            context.lineCap = 'round';
            this.renderPath(context);
            context.stroke();
            context.restore();
            
            // diagram layer
            context = this.diagram.layers.diagram.context;
            context.save();
            if (!this.selected) {
                context.strokeStyle = this.color;
            } else {
                context.strokeStyle = this.selectedColor;
            }
            context.lineWidth = this.lineWidth;
            context.lineCap = 'round';
            this.renderPath(context);
            context.stroke();
            context.restore();
            
            // root
            context.save();
            if (!this.selected) {
                context.strokeStyle = this.color;
                context.fillStyle = this.color;
            } else {
                context.strokeStyle = this.selectedColor;
                context.fillStyle = this.selectedColor;
            }
            context.lineWidth = 1;
            this.renderRoot(context);
            context.fill();
            context.restore();
            
            // arrow
            context.save();
            if (!this.selected) {
                context.strokeStyle = this.color;
                context.fillStyle = this.color;
            } else {
                context.strokeStyle = this.selectedColor;
                context.fillStyle = this.selectedColor;
            }
            context.lineWidth = this.lineWidth;
            context.lineCap = 'round';
            this.renderArrow(context);
            context.stroke();
            context.fill();
            context.restore();
        }
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