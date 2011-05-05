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
 * - jQuery 1.4.2
 * - jQuery Tools 1.2.5
 * - jQuery templates beta 1
 * - bdajax 1.0.2
 */

define(['order!jquery', 'order!cdn/jquery.tools.min.js', 
        'order!cdn/jquery.tmpl.js', 'order!bdajax/bdajax.js', 
        './model', "./storage", "./menubar", "./settings",
       "./element_views"], function() {
    
    /*
     * jQuery activities editor plugin
     */
    $.fn.activities = function(opts) {
        // render editor template
        var elem = $(this);
        if (elem.length == 0) {
            return;
        }
        if (elem.length > 1) {
            throw "Can only intitialize Editor for single DOM element";
        }
        var name = elem.attr('id');
        elem = elem.replaceWith($("#editor_template").tmpl({
            name: name,
            width: opts.width,
            height: opts.height
        }));
        
        // create editor
        var editor = new activities.ui.Editor(name);
        elem.data('editor', editor);
        editor.newDiagram();
        return elem;
    };
    
    
    // ************************************************************************
    // activities namespace
    // ************************************************************************

    if (!window.activities){
        window.activities = {};
    }
    
    $.extend(activities, {
                
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
            
        },
        
        
        /*
         * generic event handler
         */
        handler: {
            
            /*
             * set default cursor
             */
            setDefault: function(obj, event) {
                var diagram = activities.ui.getDiagram(obj);
                $(diagram.layers.diagram.canvas).css('cursor', 'default');
            },
        
            /*
             * set pointer cursor
             */
            setPointer: function(obj, event) {
                var diagram = activities.ui.getDiagram(obj);
                $(diagram.layers.diagram.canvas).css('cursor', 'pointer');
            },
            
            /*
             * set move cursor
             */
            setMove: function(obj, event) {
                var diagram = activities.ui.getDiagram(obj);
                $(diagram.layers.diagram.canvas).css('cursor', 'move');
            },
            
            /*
             * do action. bound by diagram and elements
             */
            doAction: function(obj, event) {
                var diagram = activities.ui.getDiagram(obj);
                var editor = diagram.editor;
                var actions = editor.actions;
                actions.perform(editor, obj, event);
            }
        }                
    });
    
        
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
            keydown: activities.events.KEY_DOWN,
            keyup: activities.events.KEY_UP
        };
        
        // len array depends on available events
        this.subscriber = new Object();
        this.recent = null;
        
        this.bind();
    };
    
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
                    [], // activities.events.MOUSE_WHEEL
                    [], // activities.events.KEY_DOWN
                    []  // activities.events.KEY_UP
                ];
            }
            this.subscriber[obj.triggerColor][evt].push(handler);
        },
        
        /*
         * unsubscribe object from event
         */
        unsubscribe: function(evt, obj) {
            delete this.subscriber[obj.triggerColor];
        }
    };
    
    
    // ************************************************************************
    // activities.events.KeyListener
    // ************************************************************************
    
    activities.events.KeyListener = function() {
        this.keyCode = null;
        this.charCode = null;
        this.bind();
    };
    
    activities.events.KeyListener.prototype = {
        
        bind: function() {
            $(document).unbind('keydown').bind('keydown', function (event) {
                activities.glob.keys.keyCode = event.keyCode;
                activities.glob.keys.charCode = event.charCode;
                activities.events.notify(event);
            });
            $(document).unbind('keyup').bind('keyup', function (event) {
                activities.glob.keys.keyCode = null;
                activities.glob.keys.charCode = null;
                activities.events.notify(event);
            });
        },
        
        pressed: function(key) {
            return !(this.keyCode == key || this.charCode == key);
        }
    };
    
    
    // ************************************************************************
    // activities.events.MouseListener
    // ************************************************************************
    
    activities.events.MouseListener = function() {
        this.x = 0;
        this.y = 0;
        this.pressed = 0;
        this.bind();
    };
    
    activities.events.MouseListener.prototype = {
        
        bind: function() {
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
            
            // global mouse move binding
            $(document).bind('mousemove', function(event) {
                activities.glob.mouse.x = event.pageX;
                activities.glob.mouse.y = event.pageY;
            });
            
            $(document).bind('mousedown', function(event) {
                ++activities.glob.mouse.pressed;
            });
            $(document).bind('mouseup', function(event) {
                --activities.glob.mouse.pressed;
            });
        }
    };
    
    
    // ************************************************************************
    // activities.events.DnD
    // ************************************************************************
    
    activities.events.DnD = function() {
        this.recent = null;
        this.pan_active = false;
        this.last_x = null;
        this.last_y = null;
    };
    
    activities.events.DnD.prototype = {
        
        bind: function() {
            $(document).bind('mouseup', function(event) {
                if (activities.glob.mouse.pressed <= 0) {
                    activities.glob.dnd.recent = null;
                    activities.glob.dnd.pan_active = false;
                    activities.glob.dnd.last_x = null;
                    activities.glob.dnd.last_y = null;
                }
            });
        },
        
        /*
         * compute offset relative to xy
         */
        offset: function(x, y) {
            var offset_x, offset_y;
            if (x > 0) {
                offset_x = this.last_x - x;
            } else {
                offset_x = this.last_x + x;
            }
            if (y > 0) {
                offset_y = this.last_y - y;
            } else {
                offset_y = this.last_y + y;
            }
            this.last_x = x;
            this.last_y = y;
            return [offset_x, offset_y];
        },
        
        // event handler. note that event handlers are called unbound, so
        // working with ``this`` inside event handlers does not work.
        
        /*
         * zoom diagram
         */
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
            var diagram = activities.ui.getDiagram(obj);
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
        
        /*
         * switch pan on
         */
        panOn: function(obj, event) {
            if (activities.glob.keys.pressed(activities.events.CTL)) {
                return;
            }
            activities.glob.dnd.pan_active = true;
            activities.handler.setMove(obj, event);
        },
        
        /*
         * switch pan off
         */
        panOff: function(obj, event) {
            var diagram = activities.ui.getDiagram(obj);
            if (activities.glob.keys.pressed(activities.events.CTL)) {
                return;
            }
            var dnd = activities.glob.dnd;
            dnd.pan_active = false;
            dnd.last_x = null;
            dnd.last_y = null;
            activities.handler.setDefault(obj, event);
        },
        
        /*
         * do pan
         */
        pan: function(obj, event) {
            var diagram = activities.ui.getDiagram(obj);
            if (activities.glob.keys.pressed(activities.events.CTL)) {
                return;
            }
            var dnd = activities.glob.dnd;
            if (!activities.glob.mouse.pressed) {
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
            var offset = dnd.offset(x, y);
            diagram.origin_x -= offset[0];
            diagram.origin_y -= offset[1];
            diagram.render();
        },
        
        /*
         * switch drag on
         */
        dragOn: function(obj, event) {
            activities.glob.dnd.recent = obj;
        },
        
        /*
         * do drag
         */
        drag: function(obj, event) {
            var diagram = activities.ui.getDiagram(obj);
            var dnd = activities.glob.dnd;
            
            // check for global mousedown, if not set, reset dnd and return
            if (!activities.glob.mouse.pressed) {
                dnd.recent = null;
                dnd.last_x = null;
                dnd.last_y = null;
                return;
            }
            
            // check whether ctl key is pressed
            var ctl_down = activities.glob.keys.pressed(activities.events.CTL);
            
            // if no recent object (single drag) and not ctl pressed, return
            var recent = dnd.recent;
            if (!recent && !ctl_down) {
                return;
            }
            
            // get diagram cursor position 
            var current = diagram.currentCursor(event);
            var x = current[0];
            var y = current[1];
            
            // multi drag
            if (ctl_down) {
                
                // only perform multi drag if object is diagram
                if (!obj.isDiag) {
                    return;
                }
                
                // return if no items are selected
                var selected = diagram.selected;
                if (!selected) {
                    return;
                }
                
                // if diagram snap mode, translate x, y to next snap position
                if (diagram.snap) {
                    var grid = diagram.grid;
                    var nearest = grid.nearest(current[0], current[1]);
                    var translated = grid.translate(nearest[0], nearest[1]);
                    x = translated[0];
                    y = translated[1];
                }
                
                // first drag loop. set last_x and last_y and return
                if (dnd.last_x == null || dnd.last_y == null) {
                    dnd.last_x = x;
                    dnd.last_y = y;
                    return;
                }
                
                // calculate element offset
                var offset = dnd.offset(x, y);
                
                // return if no element offset
                if (!offset[0] && !offset[1]) {
                    return;
                }
                
                // change selected objects position ba offset
                var elem;
                for (var idx in selected) {
                    elem = selected[idx];
                    elem.setCoordinates(offset[0], offset[1]);
                }
            
            // single drag
            } else {
                var translated = diagram.translateCursor(x, y);
                recent.setCoordinates(translated[0], translated[1]);
                recent.selected = true;
            }
            diagram.render();
        },
        
        /*
         * do drop
         */
        drop: function(obj, event) {
            var dnd = activities.glob.dnd;
            dnd.recent = null;
            dnd.last_x = null;
            dnd.last_y = null;
        }
    };
    
    
    // ************************************************************************
    // activities.events.notify
    // ************************************************************************
    
    activities.events.notify = function(event) {
        var canvas;
        
        // get canvas by global mouse position if keydown, keyup
        if (event.type == 'keydown'
         || event.type == 'keyup') {
             
            // key events, check if x, y target is canvas, otherwise return
            var target = document.elementFromPoint(activities.glob.mouse.x,
                                                   activities.glob.mouse.y);
            if (!target || target.tagName != 'CANVAS') {
                return;
            }
            canvas = $(target);
        
        // get canvas by event target if mousewheel
        } else if (event.type == 'mousewheel'
                || event.type == 'DOMMouseScroll') {
            
            // mousewheel, check if event target is canvas, otherwise return
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
        
        // event directly bound to canvas
        } else {
            var canvas = $(this);
        }
        
        event.preventDefault();
        var dispatcher = canvas.data('dispatcher');
        var diagram = dispatcher.diagram;
        var current = diagram.currentCursor(event);
        var x = current[0];
        var y = current[1];
        var ctx = diagram.layers.control.context;
        
        // try to get pixel info, return if fails
        try {
            var imgData = ctx.getImageData(x, y, 1, 1).data;
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
            subscriber = dispatcher.subscriber[dispatcher.recent.triggerColor];
            if (subscriber) {
                var evt = activities.events.MOUSE_OUT;
                for (var idx in subscriber[evt]) {
                    subscriber[evt][idx](dispatcher.recent, event);
                }
            }
            dispatcher.recent = recent;
            return;
        }
        
        // trigger mousedown mouseup mousemove keydown keyup   
        dispatcher.recent = recent;
        var subscriber = dispatcher.subscriber[triggerColor];
        if (subscriber) {
            var mapped = dispatcher.eventMapping[event.type];
            for (var idx in subscriber[mapped]) {
                subscriber[mapped][idx](recent, event);
            }
        }
    };
    
    
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
    };
    
    activities.ui.Editor.prototype = {
        
        /*
         * initialize editor
         */
        init: function() {
            try {
                var canvas = $(this.renderer.diagram.layers.diagram.canvas);
                canvas.data('dispatcher', null);
            } catch (err) {
            }
            
            this.actions = new activities.ui.Actions(this);
            this.properties = new activities.ui.Properties(this);
            this.diagram = new activities.ui.Diagram(this);
            this.renderer = new activities.ui.TierRenderer(this);
            this.renderer.render();
            this.properties.display(this.diagram);
        },
        
        /*
         * create new diagram
         */
        newDiagram: function() {
            this.model = new activities.model.Activity();
            this.init();
        },
        
        /*
         * open existing diagram
         */
        openDiagram: function(model) {
            this.model = model;
            this.init();
        }
    };
    
    
    // ************************************************************************
    // activities.ui.Actions
    // ************************************************************************
    
    activities.ui.Actions = function(editor) {
        this.editor = editor;
        this.selector = '#' +editor.name + ' div.actions';
        this.sections = new Array();
        var section, action;
        
        // diagram management actions
        section = new activities.actions.Section();
        section.add(new activities.actions.NewDiagram(this));
        section.add(new activities.actions.OpenDiagram(this));
        section.add(new activities.actions.SaveDiagram(this));
        this.sections.push(section);
        
        // diagram behavior releated
        section = new activities.actions.Section();
        section.add(new activities.actions.Snap(this));
        this.sections.push(section);
        
        // diagram element related actions
        section = new activities.actions.Section();
        section.add(new activities.actions.InitialNode(this));
        section.add(new activities.actions.FinalNode(this));
        section.add(new activities.actions.ActionNode(this));
        section.add(new activities.actions.JoinNode(this));
        section.add(new activities.actions.ForkNode(this));
        section.add(new activities.actions.MergeNode(this));
        section.add(new activities.actions.DecisionNode(this));
        section.add(new activities.actions.Edge(this));
        section.add(new activities.actions.DeleteElement(this));
        this.sections.push(section);
        
        // debugging and development actions
        section = new activities.actions.Section(this);
        section.add(new activities.actions.Monitor(this));
        section.add(new activities.actions.RunTests(this));
        section.add(new activities.actions.FlipLayers(this));
        this.sections.push(section);
        
        this.render();
    };
    
    activities.ui.Actions.prototype = {
        
        /*
         * bind toolbar actions
         */
        bind: function() {
            var editor = this.editor;
            var elements = $(this.selector + ' a');
            var actions = this;
            var action, id, elem;
            elements.each(function() {
                elem = $(this);
                id = elem.attr('class');
                action = actions.get(id);
                action.element = elem;
            });
            elements.unbind();
            elements.bind('click', function(event) {
                event.preventDefault();
                elem = $(this);
                id = elem.attr('class');
                action = actions.get(id);
                action.click();
            });
            elements.hover(
                function(event) {
                    var elem = $(this);
                    var id = elem.attr('class');
                    var css_sprite = 
                        activities.settings.actions.icon_css_sprite;
                    var val = '-23px ' + css_sprite[id] + 'px';
                    elem.css('background-position', val);
                },
                function(event) {
                    var elem = $(this);
                    var id = elem.attr('class');
                    if (actions.get(id).active) {
                        return;
                    }
                    var css_sprite = 
                        activities.settings.actions.icon_css_sprite;
                    var val = '0px ' + css_sprite[id] + 'px';
                    elem.css('background-position', val);
                });
        },
        
        /*
         * return true whether an action is pending
         */
        pending: function() {
            var actions = this.actions();
            var action;
            for (var idx in actions) {
                action = actions[idx];
                if (action.active && !action.steady && !action.busy) {
                    return true;
                }
            }
        },
        
        /*
         * reset actions.
         */
        reset: function(unsteady_only) {
            var actions = this.actions();
            var action;
            for (var idx in actions) {
                action = actions[idx];
                if (unsteady_only && action.steady) {
                    continue;
                }
                action.unselect();
            }
        },
        
        /*
         * search for active action and perform
         */
        perform: function(editor, obj, event) {
            var actions = this.actions();
            var action;
            for (var idx in actions) {
                action = actions[idx];
                if (action.active && !action.steady) {
                    action.perform(editor, obj, event);
                }
            }
        },
        
        /*
         * return all actions as array
         */
        actions: function() {
            var ret = new Array();
            for (var i in this.sections) {
                for (var j in this.sections[i].actions) {
                    ret.push(this.sections[i].actions[j]);
                }
            }
            return ret;
        },
        
        /*
         * return action by id
         */
        get: function(id) {
            var actions = this.actions();
            var action;
            for (var idx in actions) {
                action = actions[idx];
                if (action.id == id) {
                    return action;
                }
            }
            throw "No Action found with id '" + id + "'";
        },
        
        /*
         * render actions
         */
        render: function() {
            var elements = $(this.selector);
            $('a', elements).unbind();
            elements.empty();
            for (var idx in this.sections) {
                this.sections[idx].render().appendTo(elements);
            }
            this.bind();
        }
    };
    
    
    // ************************************************************************
    // activities.ui.Properties
    // ************************************************************************
    
    activities.ui.Properties = function(editor) {
        this.model = editor.model;
        this.container = $('#' + editor.name + ' .element_properties');
        this.recent_node = null;
        this.recent_element = null;
    };
    
    activities.ui.Properties.prototype = {
        
        /*
         * update props on node and diagram element
         */
        update: function() {
            var node = this.recent_node;
            var elem = this.recent_element;
            var diagram = elem.diagram;
            var label = $('input[name="label"]',
                          this.container).attr('value');
            var description = $('textarea[name="description"]',
                                this.container).attr('value');
            node.set({description: description,
                      label: label});
            elem.label = label;
            elem.description = description;
            diagram.renderTranslated(function() {
                elem.render();
            });
        },
        
        /*
         * display properties for diagram element
         */
        display: function(elem) {
            this.clear();
            var node;
            if (typeof(elem.diagram) == 'undefined') {
                node = this.model;
            } else {
                var path = elem.diagram.mapping[elem.triggerColor];
                node = _.filter(this.model.get("children"), function(node){return node.id == path})[0];
            }
            this.recent_node = node;
            this.recent_element = elem;
            var model = activities.model;
            this.displayProperty('Type:', node.constructor.display_name);
            this.stringProperty('label', 'Label:', elem.label || '');
            this.textProperty('description',
                              'Description:',
                              elem.description || '');
            if (node instanceof activities.model.Edge) {
                this.displayProperty('Source:', node.get("source") || '');
                this.displayProperty('Target:', node.ger("target") || '');
            } else if (node instanceof activities.model.Activity) {
                var incoming_count = 0;
                var outgoing_count = 0;
                _.each(this.model.getEdgesFor(node), function(edge){
                    if(node.get("source") === node){
                        outgoing_count += 1;
                    }
                    if(node.get("target") === node){
                        incoming_count += 1;
                    }
                });
                this.displayProperty('Incoming Edges:', incoming_count);
                this.displayProperty('Outgoing Edges:', outgoing_count);
            }
            var properties = this;
            $('.update', this.container).unbind().bind('click', function(evt) {
                evt.preventDefault();
                properties.update();
            });
        },
        
        /*
         * clear props
         */
        clear: function() {
            $('.props', this.container).empty();
        },
        
        /*
         * immutable property
         */
        displayProperty: function(title, value) {
            var opts = {
                title: title,
                value: value
            }
            $("#display_property").tmpl(opts).appendTo(
                $('.props', this.container)
            );
        },
        
        /*
         * property as string field
         */
        stringProperty: function(name, title, value) {
            var opts = {
                name: name,
                title: title,
                value: value
            }
            $("#string_property").tmpl(opts).appendTo(
                $('.props', this.container)
            );
        },
        
        /*
         * property as text field
         */
        textProperty: function(name, title, value) {
            var opts = {
                name: name,
                title: title,
                value: value
            }
            $("#text_property").tmpl(opts).appendTo(
                $('.props', this.container)
            );
        }
    };
    
    
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
    };
    
    
    // ************************************************************************
    // activities.ui.Grid
    // ************************************************************************
    
    activities.ui.Grid = function(model) {
        var settings = activities.settings.grid;
        this.res_x = settings.res_x;
        this.res_y = settings.res_y;
    };
    
    activities.ui.Grid.prototype = {
        
        /*
         * return nearest grid x/y position for coordinates
         * x, y are positive integer values
         */
        nearest: function(x, y) {
            var nearest_x = x == 0 ? 0 : Math.round(x / this.res_x);
            var nearest_y = y == 0 ? 0 : Math.round(y / this.res_y);
            return [nearest_x, nearest_y];
        },
        
        /*
         * translate grid position to coordinates
         */
        translate: function(x, y) {
            return [
                x * this.res_x,
                y * this.res_y
            ]
        },
        
        /*
         * snap diagram elements to grid
         */
        snap: function(diagram) {
            var elem, nearest;
            for (var idx in diagram.elements) {
                elem = diagram.elements[idx];
                nearest = this.nearest(elem.x, elem.y);
                elem.setCoordinates(nearest[0] * this.res_x, 
                                    nearest[1] * this.res_y);
            }
        }
    };
    
    
    // ************************************************************************
    // activities.ui.ElementMatrix
    // ************************************************************************
    
    /*
     * x / y matrix poiting to diagram elements
     */
    activities.ui.ElementMatrix = function(grid) {
        this.grid = grid;
        
        // this.data[x][y]
        this.data = new Array();
    };
    
    activities.ui.ElementMatrix.prototype = {
    
        /*
         * set matrix position
         * x - matrix x position
         * y - matrix y position
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
         * get matrix coordinates for position
         * x - matrix x position
         * y - matrix y position
         */
        get: function(x, y) {
            try {
                return this.data[x][y];
            } catch(err) {
                return null;
            }
        },
        
        /*
         * return matrix size
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
         * Set x/y position for elements in grid
         */
        arrange: function() {
            var x = 0;
            var y = 0;
            var size = this.size();
            var elem;
            for (var i = 0; i < size[0]; i++) {
                for (var j = 0; j < size[1]; j++) {
                    elem = this.get(i, j);
                    if (elem) {
                        elem.setCoordinates(x, y);
                    }
                    y += this.grid.res_y;
                }
                x += this.grid.res_x;
                y = 0;
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
                col[0] = elem;
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
        }
    };
    
    
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
    };
    
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
         * set tier for the node and every target of the nodes
         * outgoing edges
         */
        fillNode2TierMap: function(node, tier) { 
            if (tier === undefined){
                tier = 0;
            }
            var id = node.id;
            if(this.node2tier[id] === undefined){
                this.node2tier[id] = tier;
            }else if (tier > this.node2tier[id]){
                this.node2tier[id] = tier;
            } 
            var here = this;
            _(this.model.getEdgesFor(node))
                .chain()
                .select(function(edge){                
                    return edge.get("source") === node;
                })
                .each(function(edge){
                    here.fillNode2TierMap(edge.get("target"), tier + 1);
                });
        },
        
        /*
         * Fill the mapping of tiers to nodes
         */
        fillTier2NodeMap: function() {
            for (var id in this.node2tier) {
                tier = this.node2tier[id];
                if (this.tiers[tier] === undefined) {
                    this.tiers[tier] = new Array();
                }
                this.tiers[tier].push(_.select(this.model.get("children"), function(node){
                    return node.id == id;
                })[0]);
            }
        },
        
        /*
         * Recursivly set tier kinks (What are tier kinks?)
         * Kinks are the endpoints of edges
         */
        setTierKinks: function(node, tier) {
            if(tier === undefined){
                tier = 0;
            }
            var here = this;
            /* For each edge, look how big is the difference between
             * source and target endpoint and add the edge to all
             * tiers inbetween source and target */
            _(this.model.getEdgesFor(node))
                .chain()
                .select(function(edge){                
                    return edge.get("source") === node;
                })
                .each(function(edge){
                    var target = edge.get("target");
                    diff = here.node2tier[target] - here.node2tier[node];
                    if (diff > 1){
                        for(var i=1;i<diff;i++){
                            here.tiers[tier+i].push(edge);
                        }
                    }
                    here.setTierKinks(target, tier + 1);
                });
        },
        
        /*
         * create edges
         * 
         * XXX: maybe in diagram
         */
        createEdges: function() {
            var diagram = this.diagram;
            var model = this.model;
            var edges = _.filter(model.get("children"), function(node){
                return node instanceof activities.model.Edge;
            });
            for (var idx in edges) {
                var edge = edges[idx];
                var elem = new activities.ui.Edge();
                elem.source = edge.get("source");
                elem.target = edge.get("target");
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
         * fill matrix
         */
        fillMatrix: function() {
            grid = this.diagram.grid;
            this.matrix = new activities.ui.ElementMatrix(grid);
            var yMax = this.maxTierElements() * 2 - 1;
            if (yMax % 2 == 1) {
                yMax += 1;
            }
            var node, elem;
            for (var i in this.tiers) {
                yStart = yMax / 2 - this.tiers[i].length;
                for (var j in this.tiers[i]) {
                    node = this.tiers[i][j];
                    elem = this.diagram.get(node);
                    this.matrix.set(i, yStart + (j * 2), elem);
                }
            }
        },
        
        /*
         * render diagram
         */
        render: function() {
            var diagram = this.diagram;
            
            // set diagram origin
            diagram.origin_x = 100;
            diagram.origin_y = 100;
            
            // mapping for node id to tier level
            this.node2tier = new Object();
            
            // mapping for tier level to contained node ids
            this.tiers = new Array();
            
            // get initial node, if no initial node render empty diagram

            var initial = this.model.initial();
            if(initial === undefined) {
                diagram.render();
                return;
            }
            
            // recursivly add each node to the node2tier map
            this.fillNode2TierMap(initial);
            
            this.fillTier2NodeMap();
            
            // pg: This is kind of strange, it seems that the
            // Node2TierMap is no longer used at this point, it was
            // used by the fillTier2NodeMap to fill this.tiers, but
            // setTierKinks adds more entries to the Node2Tier map
            // which apparently isnt used any longer
            // set kink ids (edge) for each tier recursivly
            this.setTierKinks(initial);
            
            // create edges
            this.createEdges();
            
            // fill matrix
            this.fillMatrix();
            
            // set grid resolution
            diagram.grid.res_x = 120;
            diagram.grid.res_y = 50;
            
            // arrange XY positions
            this.matrix.arrange();
            
            // render diagram
            diagram.render();
        }
    };
    
    
    
    // ************************************************************************
    // activities.ui.Diagram
    // ************************************************************************
    
    /*
     * refers to activity model
     */
    activities.ui.Diagram = function(editor) {
        this.editor = editor;
        
        // flag for diagram checking in event handlers
        this.isDiag = true;
        
        this.grid = new activities.ui.Grid(editor.model);
        this.snap = false;
        
        // XXX: maybe move to seperate mapping object
        // trigger color to diagram element
        this.elements = new Object();
        
        // trigger color to model element dotted path
        this.mapping = new Object();
        
        // model element dotted path to trigger color
        this.r_mapping = new Object();
        
        // currently selected items
        this.selected = new Array();
        
        this.triggerColor = '#000000';
        this.layers = {
            control:
                new activities.ui.Layer($('#control_' + editor.name).get(0)),
            diagram:
                new activities.ui.Layer($('#diagram_' + editor.name).get(0))
        };
        
        this.ctl_ctx = this.layers.control.context;
        this.diag_ctx = this.layers.diagram.context;
        
        this.width = this.layers.diagram.canvas.width;
        this.height = this.layers.diagram.canvas.height;
        
        this.scale = 1.0;
        this.origin_x = 0.0;
        this.origin_y = 0.0;
        
        this.label = null;
        this.description = null;
        
        // array for trigger color calculation for this diagram
        this._nextTriggerColor = [0, 0, 0];
        
        this.dispatcher = new activities.events.Dispatcher(this);
        this.bind();
    };
    
    activities.ui.Diagram.prototype = {
        
        /*
         * bind event handler
         */
        bind: function() {
            // event subscription
            var dsp = this.dispatcher;
            var events = activities.events;
            var handler = activities.handler;
            var dnd = activities.glob.dnd;
            dsp.subscribe(events.MOUSE_IN, this, handler.setDefault);
            dsp.subscribe(events.MOUSE_UP, this, this.unselectAll);
            dsp.subscribe(events.MOUSE_DOWN, this, handler.doAction);
            dsp.subscribe(events.MOUSE_WHEEL, this, dnd.zoom);
            dsp.subscribe(events.MOUSE_DOWN, this, dnd.panOn);
            dsp.subscribe(events.MOUSE_UP, this, dnd.panOff);
            dsp.subscribe(events.MOUSE_MOVE, this, dnd.pan);
            dsp.subscribe(events.MOUSE_MOVE, this, dnd.drag);
            dsp.subscribe(events.MOUSE_UP, this, dnd.drop);
            dsp.subscribe(events.KEY_DOWN, this, this.setMultiPanCursor);
            dsp.subscribe(events.KEY_UP, this, this.unsetMultiPanCursor);
        },
        
        /*
         * return current cursor position
         */
        currentCursor: function(event) {
            var canvas = $(this.layers.diagram.canvas);
            var offset = canvas.offset();
            var px, py;
            if (event.type == 'keydown'
             || event.type == 'keyup') {
                px = activities.glob.mouse.x;
                py = activities.glob.mouse.y;
            } else {
                px = event.pageX;
                py = event.pageY;
            }
            var x = px - offset.left;
            var y = py - offset.top;
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
            var ctx_ctl = this.ctl_ctx;
            ctx_ctl.save();
            ctx_ctl.translate(this.origin_x, this.origin_y);
            ctx_ctl.scale(this.scale, this.scale);
            
            var ctx_diag = this.diag_ctx;
            ctx_diag.save();
            ctx_diag.translate(this.origin_x, this.origin_y);
            ctx_diag.scale(this.scale, this.scale);
            
            render();
            
            ctx_ctl.restore();
            ctx_diag.restore();
        },
        
        /*
         * iterate over elements of diagram and call render function
         */
        render: function() {
            // clear control layer
            var ctx = this.ctl_ctx;
            ctx.save();
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.restore();
            
            // clear diagram layer
            var ctx = this.diag_ctx;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.restore();
            
            var overlay;
            var diagram = this;
            this.renderTranslated(function() {
                if (diagram.snap) {
                    diagram.grid.snap(diagram);
                }
                var edges = new Array();
                var elem;
                for(var key in diagram.elements) {
                    var elem = diagram.elements[key];
                    if (elem.showOverlay) {
                        overlay = new activities.ui.Overlay(elem);
                    }
                    if (elem.selected) {
                        continue;
                    }
                    if (elem.node instanceof activities.model.Edge) {
                        edges.push(elem);
                        continue;
                    }
                    elem.render();
                }
                for (idx in edges) {
                    edge = edges[idx];
                    edge.render();
                }
                for (var idx in diagram.selected) {
                    diagram.selected[idx].render();
                }
                if (overlay && !activities.glob.mouse.pressed) {
                    overlay.render();
                }
           });
        },
        
        /*
         * map model node to diagram element
         */
        map: function(node, elem) {
            var triggerColor = this.nextTriggerColor();
            elem.node = node;
            elem.diagram = this;
            elem.triggerColor = triggerColor;
            this.elements[triggerColor] = elem;
            // XXX: dottedpath
            this.mapping[triggerColor] = node.id;
            this.r_mapping[node.id] = triggerColor;
            elem.bind();
            elem.label = node.get("label") || '';
            elem.description = node.get("description") || '';
        },
        
        /*
         * calculate next trigger color for diagram element
         * next color is calculated by step of 10 for r, g, b
         * 
         * XXX: buggy
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
         * remove diagram elements
         */
        remove: function(path) {
            debugger;
            var model = this.editor.model;
            var node = _.filter(this.editor.model.get("children"), 
                                function(node){return node.id == path})[0];
            if (!node) {
                return;
            }
            var triggerColor = this.r_mapping[node.id];
            if (!triggerColor) {
                return;
            }
            var elem = this.elements[triggerColor];
            elem.unbind();
            if (node instanceof activities.model.Edge) {
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
            delete this.r_mapping[node.id];
        },
        
        /*
         * Lookup or create Diagram element by model node.
         */
        get: function(node) {
            // check if element already exists
            var trigger = this.r_mapping[node.id];
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
            if (node instanceof activities.model.Edge){
                // this is a kink
                elem = new activities.ui.Kink();
                var trigger = this.r_mapping[node.id];
                var edge = this.elements[trigger];
                edge.kinks.push(elem);
                return kink;
            }
            elem = node.createView();
            this.map(node, elem);
            return elem;
        },
        
        /*
         * create diagram edge
         */
        createEdge: function(node) {
            debugger;
            var elem = new activities.ui.Edge();
            elem.source = node.get("source");
            elem.target = node.get("target");
            this.map(node, elem);
            return elem;
        },
        
        /*
         * set selected flag to fasle on all diagram elements in selected array
         */
        unselect: function() {
            var selected = this.selected;
            var elem, idx;
            for (var idx in selected) {
                selected[idx].selected = false;
            }
            this.selected = new Array();
            return this.selected;
        },
        
        // event handler. note that event handlers are called unbound, so
        // working with ``this`` inside event handlers does not work.
        
        /*
         * set cursor for multi item pan if ctl key is pressed
         */
        setMultiPanCursor: function(obj, event) {
            if (activities.glob.keys.pressed(activities.events.CTL)) {
                activities.handler.setMove(obj, event);
            }
        },
        
        /*
         * unset cursor for multi item pan if ctl key is released
         */
        unsetMultiPanCursor: function(obj, event) {
            if (!activities.glob.keys.pressed(activities.events.CTL)) {
                activities.handler.setDefault(obj, event);
            }
        },
        
        /*
         * unselect all diagram elements. bound by diagram
         */
        unselectAll: function(obj, event) {
            // do not unselect if pan was performed
            if (activities.glob.dnd.last_x) {
                return;
            }
            var selected = obj.selected;
            var elem;
            for (idx in selected) {
                elem = selected[idx];
                elem.selected = false;
                obj.renderTranslated(function() {
                    elem.render();
                });
            }
            obj.selected = new Array();
            obj.editor.properties.display(obj);
        }
    };
    
    
    
    
  
});
