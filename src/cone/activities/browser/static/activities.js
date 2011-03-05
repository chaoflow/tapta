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

(function($) {
    
    $(document).ready(function() {
        // initialie activities child factories
        var factories = activities.settings.diagram.childFactories;
        factories[activities.model.INITIAL] = activities.ui.Initial;
        factories[activities.model.FINAL] = activities.ui.Final;
        factories[activities.model.ACTION] = activities.ui.Action;
        factories[activities.model.DECISION] = activities.ui.Decision;
        factories[activities.model.MERGE] = activities.ui.Merge;
        factories[activities.model.FORK] = activities.ui.Fork;
        factories[activities.model.JOIN] = activities.ui.Join;
        
        // initialie activities globals
        activities.glob.initialize();
        
        // demo editor
        $('#demo_editor').activities({
            width: 1200,
            height: 450,
        });
    });
    
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
        editor = new activities.ui.Editor(name);
        elem.data('activities_editor', editor);
        editor.newDiagram();
        return elem;
    };
    
    
    // ************************************************************************
    // activities namespace
    // ************************************************************************
    
    activities = {
        
        /*
         * global activity related
         */
        glob: {
            
            // public objects
            keys: null,
            mouse: null,
            dnd: null,
            
            // flag wether globs were already initialized
            _inizialized: 0,
            
            /*
             * intialize globals
             */
            initialize: function() {
                // already initialized, return
                if (activities.glob._inizialized) {
                    return;
                }
                activities.glob.keys = new activities.events.KeyListener();
                activities.glob.mouse = new activities.events.MouseListener();
                activities.glob.dnd = new activities.events.DnD();
                activities.glob._inizialized = 1;
            }
        },
        
        /*
         * editor settings
         */
        settings: {
            
            grid: {
                res_x: 50,
                res_y: 50
            },
            
            rendering: {
                shadowOffsetX   : 2.5,
                shadowOffsetY   : 2.5,
                shadowBlur      : 3.0,
                shadowColor     : '#aaaaaa',
                textColor       : '#000000',
                textAlign       : 'center',
                textBaseline    : 'middle',
                lineHeight      : 14,
                fontSize        : 12,
                fontStyle       : 'sans-serif',
                defaultRounding : 3
            },
            
            node: {
                edgeOffset          : 5,
                borderWidth         : 2,
                fillColor           : '#edf7ff',
                borderColor         : '#b5d9ea',
                selectedFillColor   : '#fff7ae',
                selectedBorderColor : '#e3ca4b'
            },
            
            edge: {
                color         : '#333333',
                lineWidth     : 3,
                arrowLength   : 15,
                selectedColor : '#bbbbbb'
            },
            
            overlay: {
                padding     : 10,
                fillColor   : '#efefef',
                borderColor : '#dddddd',
                alpha       : 0.9,
                textColor   : '#222222'
            },
            
            diagram: {
                childFactories: []
            },
            
            actions: {
                
                icon_css_sprite_img: "url('icons/activities_sprite.png')",
                
                // css sprite positions for actions by id
                icon_css_sprite: {
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
                    'delete_element': -322,
                    'snap'          : -345
                }
            }
        },
        
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
            
            // events
            MOUSE_DOWN : 0,
            MOUSE_UP   : 1,
            MOUSE_MOVE : 2,
            MOUSE_IN   : 3,
            MOUSE_OUT  : 4,
            MOUSE_WHEEL: 5,
            KEY_DOWN   : 6,
            KEY_UP     : 7,
            
            // keys
            KEY_SHIFT  : 16,
            KEY_CTL    : 17,
            KEY_ALT    : 18
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
        },
        
        /*
         * actions namespace
         */
        actions: {},
        
        /*
         * activities ui namespace and helpers
         */
        ui: {
            
            /*
             * lookup diagram on object.
             * object is either diagram or diagram element
             */
            getDiagram: function(obj) {
                return obj.isDiag ? obj : obj.diagram;
            },
            
            /*
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
    };
    
    
    // ************************************************************************
    // activities.actions.Section
    // ************************************************************************
    
    activities.actions.Section = function() {
        this.actions = new Array();
    };
    
    activities.actions.Section.prototype = {
        
        add: function(action) {
            this.actions.push(action);
        },
        
        render: function() {
            var section = $('<div class="section"></div>');
            for (var idx in this.actions) {
                this.actions[idx].render().appendTo(section);
            }
            return section;
        }
    };
    
    
    // ************************************************************************
    // activities.actions.Action
    // ************************************************************************
    
    activities.actions.Action = function(actions, id, title) {
        // activities.ui.Actions instance
        this.actions = actions;
        this.id = id;
        this.title = title;
        
        // flag wether action is actually selected
        this.active = false;
        
        // flag wether action must be disabled manually
        this.steady = false;
        
        // flag wether action is busy.
        this.busy = false;
        
        // the action corresponding dom element as jQuery object
        this.element = null;
    };
    
    activities.actions.Action.prototype = {
        
        /*
         * render action
         */
        render: function() {
            var opts = {
                id: this.id,
                title: this.title
            }
            var action = $("#editor_action").tmpl(opts);
            var css_sprite = activities.settings.actions.icon_css_sprite;
            var img = activities.settings.actions.icon_css_sprite_img;
            var val = '0px ' + css_sprite[this.id] + 'px';
            action.css('background-image', img);
            action.css('background-repeat', 'no-repeat');
            action.css('background-position', val);
            return action;
        },
        
        /*
         * set this action active
         */
        select: function(name) {
            this.active = true;
            var css_sprite = activities.settings.actions.icon_css_sprite;
            var val = '-23px ' + css_sprite[this.id] + 'px';
            this.element.css('background-position', val);
        },
        
        /*
         * set this action inactive
         */
        unselect: function() {
            this.active = false;
            this.busy = false;
            var css_sprite = activities.settings.actions.icon_css_sprite;
            var val = '-0px ' + css_sprite[this.id] + 'px';
            this.element.css('background-position', val);
        },
        
        /*
         * action clicked callback
         */
        click: function() {
            if (this.active) {
                this.unselect();
            } else {
                this.actions.reset(true);
                this.select();
            }
        },
        
        /*
         * perform whatever this action is supposed to perform
         */
        perform: function(editor, obj, event) {
            throw "``perform`` is not implemented on abstract Action";
        }
    };
    
    
    // ************************************************************************
    // activities.actions.NewDiagram
    // ************************************************************************
    
    activities.actions.NewDiagram = function(actions) {
        activities.actions.Action.call(this, actions, 'new_activity', 'New');
    };
    activities.actions.NewDiagram.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.NewDiagram.prototype, {
        
        click: function() {
            this.perform();
        },
        
        perform: function() {
            this.actions.editor.newDiagram();
        }
    });
    
    
    // ************************************************************************
    // activities.actions.OpenDiagram
    // ************************************************************************
    
    activities.actions.OpenDiagram = function(actions) {
        activities.actions.Action.call(this, actions, 'open_activity', 'Open');
    };
    activities.actions.OpenDiagram.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.OpenDiagram.prototype, {
        
        _open: 0,
        
        click: function() {
            this.perform();
        },
        
        perform: function() {
            // tmp. alter with persistence widget code
            var model;
            if (activities.actions.OpenDiagram._open) {
                model = tests.create_test_model_1();
                activities.actions.OpenDiagram._open = 0;
            } else {
                model = tests.create_test_model_2();
                activities.actions.OpenDiagram._open = 1;
            }
            this.actions.editor.openDiagram(model);
        }
    });
    
    
    // ************************************************************************
    // activities.actions.SaveDiagram
    // ************************************************************************
    
    activities.actions.SaveDiagram = function(actions) {
        activities.actions.Action.call(this, actions, 'save_activity', 'Save');
    };
    activities.actions.SaveDiagram.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.SaveDiagram.prototype, {
        
        click: function() {
            this.perform();
        },
        
        perform: function() {
            bdajax.error('Not implemented');
        }
    });
    
    
    // ************************************************************************
    // activities.actions.Snap
    // ************************************************************************
    
    activities.actions.Snap = function(actions) {
        activities.actions.Action.call(this, actions, 'snap', 'Snap to Grid');
        this.steady = true;
    };
    activities.actions.Snap.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.Snap.prototype, {
        
        click: function() {
            var diagram = this.actions.editor.diagram;
            if (this.active) {
                this.unselect();
                diagram.snap = false;
            } else {
                this.select();
                diagram.snap = true;
                diagram.render();
            }
        }
    });
    
    
    // ************************************************************************
    // activities.actions.NodeAction
    // ************************************************************************
    
    activities.actions.NodeAction = function(actions, id, title, type) {
        activities.actions.Action.call(this, actions, id, title);
        this.type = type;
    };
    activities.actions.NodeAction.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.NodeAction.prototype, {
        
        perform: function(editor, obj, event) {
            this.unselect();
            var node = editor.model.createNode(this.type);
            var diagram = editor.diagram;
            var elem = diagram.get(node);
            var current = diagram.currentCursor(event);
            var x = current[0];
            var y = current[1];
            var translated = diagram.translateCursor(x, y);
            node.x = elem.x = translated[0];
            node.y = elem.y = translated[1];
            diagram.unselect();
            elem.selected = true;
            diagram.selected.push(elem);
            diagram.render();
        }
    });
    
    
    // ************************************************************************
    // activities.actions.InitialNode
    // ************************************************************************
    
    activities.actions.InitialNode = function(actions) {
        activities.actions.NodeAction.call(this,
                                           actions,
                                           'initial_node',
                                           'Initial Node',
                                           activities.model.INITIAL);
    };
    activities.actions.InitialNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.FinalNode
    // ************************************************************************
    
    activities.actions.FinalNode = function(actions) {
        activities.actions.NodeAction.call(this,
                                           actions,
                                           'final_node',
                                           'Final Node',
                                           activities.model.FINAL);
    };
    activities.actions.FinalNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.ActionNode
    // ************************************************************************
    
    activities.actions.ActionNode = function(actions) {
        activities.actions.NodeAction.call(this,
                                           actions,
                                           'action_node',
                                           'Action Node',
                                           activities.model.ACTION);
    };
    activities.actions.ActionNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.JoinNode
    // ************************************************************************
    
    activities.actions.JoinNode = function(actions) {
        activities.actions.NodeAction.call(
            this, actions, 'join_node', 'Join Node', activities.model.JOIN);
    };
    activities.actions.JoinNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.ForkNode
    // ************************************************************************
    
    activities.actions.ForkNode = function(actions) {
        activities.actions.NodeAction.call(
            this, actions, 'fork_node', 'Fork Node', activities.model.FORK);
    };
    activities.actions.ForkNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.MergeNode
    // ************************************************************************
    
    activities.actions.MergeNode = function(actions) {
        activities.actions.NodeAction.call(
            this, actions, 'merge_node', 'Merge Node', activities.model.MERGE);
    };
    activities.actions.MergeNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.DecisionNode
    // ************************************************************************
    
    activities.actions.DecisionNode = function(actions) {
        activities.actions.NodeAction.call(this,
                                           actions,
                                           'decision_node',
                                           'Decision Node',
                                           activities.model.DECISION);
    };
    activities.actions.DecisionNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.Edge
    // ************************************************************************
    
    activities.actions.Edge = function(actions) {
        activities.actions.Action.call(this, actions, 'edge', 'Edge');
        this.source = null;
        this.target = null;
    };
    activities.actions.Edge.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.Edge.prototype, {
        
        click: function() {
            if (this.active) {
                this.source = null;
                this.target = null;
                this.unselect();
            } else {
                this.actions.reset(true);
                this.source = null;
                this.target = null;
                this.select();
            }
        },
        
        perform: function(editor, obj, event) {
            var diagram = editor.diagram;
            if (this.source == null
             || typeof(this.source) == "undefined") {
                var node_name = diagram.mapping[obj.triggerColor];
                this.source = node_name;
                this.busy = true;
                return;
            }
            this.target = diagram.mapping[obj.triggerColor];
            if (typeof(this.target) == "undefined") {
                return;
            }
            var node = editor.model.createEdge(this.source, this.target);
            diagram.createEdge(node);
            this.source = null;
            this.target = null;
            this.unselect();
            diagram.render();
        }
    });
    
    
    // ************************************************************************
    // activities.actions.DeleteElement
    // ************************************************************************
    
    activities.actions.DeleteElement = function(actions) {
        activities.actions.Action.call(
            this, actions, 'delete_element', 'Delete Element');
    };
    activities.actions.DeleteElement.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.DeleteElement.prototype, {
        
        perform: function(editor, obj, event) {
            this.unselect();
            var diagram = editor.diagram;
            var model = editor.model;
            if (!diagram.selected) {
                return;
            }
            var opts = {
                message: 'Do you really want to delete this Item?',
                model: model,
                diagram: diagram
            };
            bdajax.dialog(opts, function(options) {
                var diagram = options.diagram;
                var model = options.model;
                var elem, path;
                var paths = new Array();
                for (var idx in diagram.selected) {
                    elem = diagram.selected[idx];
                    path = diagram.mapping[elem.triggerColor];
                    paths.push(path);
                }
                for (var idx in paths) {
                    path = paths[idx];
                    diagram.remove(path);
                }
                for (var idx in paths) {
                    path = paths[idx];
                    model.remove(path);
                }
                diagram.selected = new Array();
                diagram.render();
            });
        }
    });
    
    
    // ************************************************************************
    // activities.actions.Monitor
    // ************************************************************************
    
    activities.actions.Monitor = function(actions) {
        activities.actions.Action.call(this, actions, 'debug', 'Debug');
        this.steady = true;
    };
    activities.actions.Monitor.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.Monitor.prototype, {
        
        click: function() {
            this.perform();
        },
        
        perform: function() {
            var status = $('.status');
            status.toggleClass('hidden');
            if (status.hasClass('hidden')) {
                this.unselect();
            } else {
                this.select();
            }
        }
    });
    
    
    // ************************************************************************
    // activities.actions.RunTests
    // ************************************************************************
    
    activities.actions.RunTests = function(actions) {
        activities.actions.Action.call(
            this, actions, 'run_tests', 'Run Tests');
    };
    activities.actions.RunTests.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.RunTests.prototype, {
        
        click: function() {
            this.perform();
        },
        
        perform: function() {
            $('.qunit').show();
            tests.run();
        }
    });
    
    
    // ************************************************************************
    // activities.actions.FlipLayers
    // ************************************************************************
    
    activities.actions.FlipLayers = function(actions) {
        activities.actions.Action.call(
            this, actions, 'flip_layers', 'Flip Layers');
    };
    activities.actions.FlipLayers.prototype = new activities.actions.Action;
    
    $.extend(activities.actions.FlipLayers.prototype, {
        
        click: function() {
            this.perform();
        },
        
        perform: function() {
            activities.ui.toggleCanvas(this.actions.editor.name);
        }
    });
    
    
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
    };
    
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
            node.label = node.description = '';
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
            if (!node) {
                return;
            }
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
                ret.push(edge);
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
                ret.push(edge);
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
        },
        
        /*
         * model as string for debugging purposes
         */
        debug: function(context) {
            var ret = '';
            if (!context) {
                context = this.context;
            }
            if (!context.children) {
                return ret;
            }
            var child;
            for (var key in context.children) {
                child = context.children[key];
                for (subkey in child) {
                    if (subkey == 'children') {
                        continue;
                    }
                    ret += subkey + ': ' + child[subkey] + '\n';
                }
                ret += '---\n';
                ret += this.debug(child);
            }
            return ret;
        }
    };
    
    
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
                
                // only perform multi drag if event object is diagram
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
                    elem.x -= offset[0];
                    elem.y -= offset[1];
                }
            
            // single drag
            } else {
                var translated = diagram.translateCursor(x, y);
                recent.x = translated[0];
                recent.y = translated[1];
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
            this.model = new activities.model.Model(null);
            this.init();
        },
        
        /*
         * open existing diagram
         */
        openDiagram: function(model) {
            this.model = new activities.model.Model(model);
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
            node.label = label;
            node.description = description;
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
                node = this.model.context;
            } else {
                var path = elem.diagram.mapping[elem.triggerColor];
                node = this.model.node(path);
            }
            this.recent_node = node;
            this.recent_element = elem;
            var model = activities.model;
            this.displayProperty('Type:', model.TYPE_NAMES[node.__type]);
            this.stringProperty('label', 'Label:', elem.label || '');
            this.textProperty('description',
                              'Description:',
                              elem.description || '');
            if (node.__type == activities.model.EDGE) {
                this.displayProperty('Source:', node.source || '');
                this.displayProperty('Target:', node.target || '');
            } else if (node.__type != activities.model.ACTIVITY) {
                var val = node.incoming_edges ? node.incoming_edges.length : 0;
                this.displayProperty('Incoming Edges:', val);
                var val = node.outgoing_edges ? node.outgoing_edges.length : 0;
                this.displayProperty('Outgoing Edges:', val);
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
                elem.x = nearest[0] * this.res_x;
                elem.y = nearest[1] * this.res_y;
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
                        elem.x = x;
                        elem.y = y;
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
                tier = this.node2tier[key];
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
                var elem = new activities.ui.Edge();
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
                    node = this.model.node(this.tiers[i][j]);
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
            var initial;
            try {
                initial = this.model.initial();
            } catch (err) {
                diagram.render();
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
    // activities.ui.Rendering
    // ************************************************************************
    
    activities.ui.Rendering = function() {
        var settings = activities.settings.rendering;
        this.shadowOffsetX = settings.shadowOffsetX;
        this.shadowOffsetY = settings.shadowOffsetY;
        this.shadowBlur = settings.shadowBlur;
        this.shadowColor = settings.shadowColor;
        
        this.textColor = settings.textColor;
        this.textAlign = settings.textAlign;
        this.textBaseline = settings.textBaseline;
        
        this.lineHeight = settings.lineHeight;
        this.fontSize = settings.fontSize;
        this.fontStyle = settings.fontStyle;
        
        this.defaultRounding = settings.defaultRounding;
    };
    
    activities.ui.Rendering.prototype = {
        
        /*
         * return canvas context font configuration
         */
        font: function() {
            return this.fontSize + 'px ' + this.fontStyle;
        },
        
        /*
         * turn shadow drawing on.
         */
        shadowOn: function(ctx) {
            ctx.shadowOffsetX = this.shadowOffsetX;
            ctx.shadowOffsetY = this.shadowOffsetY;
            ctx.shadowBlur = this.shadowBlur;
            ctx.shadowColor = this.shadowColor;
        },
        
        /*
         * turn shadow drawing off.
         */
        shadowOff: function(ctx) {
            ctx.shadowOffsetX = 0.0;
            ctx.shadowOffsetY = 0.0;
            ctx.shadowBlur = 0.0;
        },
        
        /*
         * draw circle at x0,y0 with given radius
         */
        circle: function(ctx, r) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2, true);
            ctx.closePath();
        },
        
        /*
         * draw filled circle
         */
        fillCircle: function(ctx, color, radius, shadow) {
            ctx.fillStyle = color;
            if (shadow) {
                this.shadowOn(ctx);
            }
            this.circle(ctx, radius);
            ctx.fill();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw stroke circle 
         */
        strokeCircle: function(ctx, color, radius, lineWidth, shadow) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            if (shadow) {
                this.shadowOn(ctx);
            }
            this.circle(ctx, radius);
            ctx.stroke();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw rounded rect
         */
        rect: function(ctx, x1, y1, x2, y2, r) {
            var r2d = Math.PI / 180;
            
            //ensure that the radius isn't too large for x
            if ((x2 - x1) - (2 * r) < 0) {
                r = ((x2 - x1) / 2);
            }
            
            //ensure that the radius isn't too large for y
            if((y2 - y1) - (2 * r) < 0) {
                r = ((y2 - y1) / 2);
            }
            
            ctx.beginPath();
            ctx.moveTo(x1 + r, y1);
            ctx.lineTo(x2 - r, y1);
            ctx.arc(x2 - r, y1 + r, r, r2d * 270, r2d * 360, false);
            ctx.lineTo(x2, y2 - r);
            ctx.arc(x2 - r, y2 - r, r, r2d * 0, r2d * 90, false);
            ctx.lineTo(x1 + r, y2);
            ctx.arc(x1 + r, y2 - r, r, r2d * 90, r2d * 180, false);
            ctx.lineTo(x1, y1 + r);
            ctx.arc(x1 + r, y1 + r, r, r2d * 180, r2d * 270, false);
            ctx.closePath();
        },
        
        /*
         * draw filled rect
         */
        fillRect: function(ctx,
                           color,
                           width,
                           height,
                           shadow,
                           radius) {
            if (!radius && radius != 0) {
                radius = this.defaultRounding;
            }
            ctx.fillStyle = color;
            if (shadow) {
                this.shadowOn(ctx);
            }
            var x = width / 2;
            var y = height / 2;
            this.rect(ctx, x * -1, y * -1, x, y, radius);
            ctx.fill();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw stroke rect
         */
        strokeRect: function(ctx,
                             color,
                             lineWidth,
                             width,
                             height,
                             shadow,
                             radius) {
            if (!radius && radius != 0) {
                radius = this.defaultRounding;
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            if (shadow) {
                this.shadowOn(ctx);
            }
            var x = width / 2;
            var y = height / 2;
            this.rect(ctx, x * -1, y * -1, x, y, radius);
            ctx.stroke();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw label
         */
        drawLabel: function(ctx, label, width) {
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.textBaseline = this.textBaseline;
            ctx.font = this.font();
            ctx.fillText(label, 0, 0, width);
        },
        
        /*
         * render control layer and diagram layer
         */
        render: function() {
            this.renderCtl();
            this.renderDiag();
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
        
        this.factories = activities.settings.diagram.childFactories;
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
            //this.grid.arrange();
            
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
                    if (elem.node.__type == activities.model.EDGE) {
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
            this.mapping[triggerColor] = node.__name;
            this.r_mapping[node.__name] = triggerColor;
            elem.bind();
            elem.label = node.label || '';
            elem.description = node.description || '';
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
            var model = this.editor.model;
            var node = model.node(path);
            if (!node) {
                return;
            }
            var triggerColor = this.r_mapping[node.__name];
            if (!triggerColor) {
                return;
            }
            var elem = this.elements[triggerColor];
            elem.unbind();
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
    
    
    // ************************************************************************
    // activities.ui.Element
    // ************************************************************************
    
    activities.ui.Element = function() {
        activities.ui.Rendering.call(this);
        this.node = null;
        this.diagram = null;
        this.triggerColor = null;
        
        this.renderLabel = false;
        this.selected = false;
        
        this.label = null;
        this.description = null;
        
        this.showOverlay = false;
    };
    activities.ui.Element.prototype = new activities.ui.Rendering;
    
    $.extend(activities.ui.Element.prototype, {
        
        // event handler. note that event handlers are called unbound, so
        // working with ``this`` inside event handlers does not work.
        
        /*
         * set selected item.
         */
        setSelected: function(obj, event) {
            var diagram = obj.diagram;
            var selected = diagram.selected;
            
            // case pending action
            if (diagram.editor.actions.pending()) {
                // if obj unselected, select exclusive 
                if (!obj.selected && selected.length > 0) {
                    selected = diagram.unselect();
                }
                obj.selected = true;
                selected.push(obj);
            
            // case ctrl pressed
            } else if (activities.glob.keys.pressed(activities.events.CTL)) {
                // case unselect
                if (obj.selected) {
                    var idx = selected.indexOf(obj);
                    activities.utils.removeArrayItem(selected, idx, idx);
                    obj.selected = false;
                // case select
                } else {
                    selected.push(obj);
                    obj.selected = true;
                }
            
            // case single select
            } else {
                if (selected.length > 0) {
                    selected = diagram.unselect();
                }
                selected.push(obj);
                obj.selected = true;
            }
            obj.showOverlay = false;
            diagram.render();
            diagram.editor.properties.display(obj);
        },
        
        /*
         * turn on info rendering
         */
        infoOn: function(obj, event) {
            if (activities.glob.keys.pressed(activities.events.CTL)) {
                return;
            }
            obj.showOverlay = true;
        },
        
        /*
         * turn off info rendering
         */
        infoOff: function(obj, event) {
            obj.showOverlay = false;
            obj.diagram.render();
        },
        
        /*
         * render info
         */
        renderInfo: function(obj, event) {
            if (obj.showOverlay) {
                obj.diagram.render();
            }
        },
    });
    
    
    // ************************************************************************
    // activities.ui.Node
    // ************************************************************************
    
    activities.ui.Node = function() {
        activities.ui.Element.call(this);
        this.x = 0;
        this.y = 0;
        
        var settings = activities.settings.node;
        this.edgeOffset = settings.edgeOffset;
        this.borderWidth = settings.borderWidth;
        
        this.fillColor = settings.fillColor;
        this.borderColor = settings.borderColor;
        
        this.selectedFillColor = settings.selectedFillColor;
        this.selectedBorderColor = settings.selectedBorderColor;
    };
    activities.ui.Node.prototype = new activities.ui.Element;
    
    $.extend(activities.ui.Node.prototype, {
        
        SHAPE_RECT: 0,
        SHAPE_CIRCLE: 1,
        
        /*
         * bind node to dispatcher
         */
        bind: function() {
            // event subscription
            var diagram = this.diagram;
            var dnd = activities.glob.dnd;
            var dsp = diagram.dispatcher;
            var events = activities.events;
            var handler = activities.handler;
            dsp.subscribe(events.MOUSE_IN, this, this.infoOn);
            dsp.subscribe(events.MOUSE_OUT, this, this.infoOff);
            dsp.subscribe(events.MOUSE_MOVE, this, this.renderInfo);
            dsp.subscribe(events.MOUSE_IN, this, handler.setPointer);
            dsp.subscribe(events.MOUSE_DOWN, this, dnd.dragOn);
            dsp.subscribe(events.MOUSE_DOWN, this, this.setSelected);
            dsp.subscribe(events.MOUSE_DOWN, this, handler.doAction);
            dsp.subscribe(events.MOUSE_WHEEL, this, dnd.zoom);
            dsp.subscribe(events.MOUSE_MOVE, this, dnd.drag);
            dsp.subscribe(events.MOUSE_UP, this, dnd.drop);
            dsp.subscribe(events.MOUSE_UP, this, dnd.panOff);
        },
        
        /*
         * unbind node from dispatcher
         */
        unbind: function() {
            // event subscription
            var diagram = this.diagram;
            var dnd = activities.glob.dnd;
            var dsp = diagram.dispatcher;
            var events = activities.events;
            dsp.unsubscribe(events.MOUSE_IN, this);
            dsp.unsubscribe(events.MOUSE_OUT, this);
            dsp.unsubscribe(events.MOUSE_DOWN, this);
            dsp.unsubscribe(events.MOUSE_WHEEL, this);
            dsp.unsubscribe(events.MOUSE_MOVE, this);
            dsp.unsubscribe(events.MOUSE_UP, this);
        },
        
        /*
         * translate coordinate direction for element edge start/end
         * translation.
         */
        translateDirection: function(x, y, x_diff, y_diff, angle) {
            if (x - this.x >= 0 && y - this.y >= 0) {
                return [this.x + x_diff, this.y + y_diff, angle - 180];
            }
            if (x - this.x >= 0 && y - this.y <= 0) {
                return [this.x + x_diff, this.y - y_diff, 180 - angle];
            }
            if (x - this.x <= 0 && y - this.y <= 0) {
                return [this.x - x_diff, this.y - y_diff, angle];
            }
            if (x - this.x <= 0 && y - this.y >= 0) {
                return [this.x - x_diff, this.y + y_diff, angle * -1];
            }
        }
    });
    
    
    // ************************************************************************
    // activities.ui.CircleNode
    // ************************************************************************
    
    activities.ui.CircleNode = function(radius) {
        activities.ui.Node.call(this);
        this.radius = radius;
    };
    activities.ui.CircleNode.prototype = new activities.ui.Node;
    
    $.extend(activities.ui.CircleNode.prototype, {
        
        /*
         * Translate element coordinate for edge source by given following
         * point coordinate.
         */
        translateEdge: function(x, y) {
            var gk = y - this.y;
            var ak = this.x - x;
            var angle = Math.abs(Math.atan(gk / ak) * 90 / (Math.PI / 2));
            var rad = this.radius + this.edgeOffset;
            var cos = Math.cos(Math.PI * angle / 180.0);
            var sin = Math.sin(Math.PI * angle / 180.0);
            var x_diff = rad * cos;
            var y_diff = rad * sin;
            return this.translateDirection(x, y, x_diff, y_diff, angle);
        },
        
        /*
         * render control layer
         */
        renderCtl: function() {
            var ctx = this.diagram.ctl_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            this.fillCircle(ctx, this.triggerColor, this.radius);
            ctx.restore();
        },
        
        /*
         * render diagram layer
         */
        renderDiag: function() {
            var fillColor, borderColor;
            if (!this.selected) {
                fillColor = this.fillColor;
                borderColor = this.borderColor;
            } else {
                fillColor = this.selectedFillColor;
                borderColor = this.selectedBorderColor;
            }
            var ctx = this.diagram.diag_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            this.fillCircle(ctx, fillColor, this.radius, true);
            this.strokeCircle(ctx, borderColor, this.radius, this.borderWidth);
            ctx.restore();
        }
    });
    
    
    // ************************************************************************
    // activities.ui.RectNode
    // ************************************************************************
    
    activities.ui.RectNode = function(width, height, rotation) {
        activities.ui.Node.call(this);
        this.width = width;
        this.height = height;
        this.rotation = rotation;
    };
    activities.ui.RectNode.prototype = new activities.ui.Node;
    
    $.extend(activities.ui.RectNode.prototype, {
        
        /*
         * Translate element coordinate for edge source by given following
         * point coordinate.
         */
        translateEdge: function(x, y) {
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
            return this.translateDirection(x, y, x_diff, y_diff, angle_orgin);
        },
        
        /*
         * render control layer
         */
        renderCtl: function() {
            var ctx = this.diagram.ctl_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.rotation) {
                ctx.rotate(this.rotation * Math.PI / 180);
            }
            this.fillRect(ctx, this.triggerColor, this.width, this.height);
            ctx.restore();
        },
        
        /*
         * render diagram layer
         */
        renderDiag: function() {
            // diagram layer
            var fillColor, borderColor;
            if (!this.selected) {
                fillColor = this.fillColor;
                borderColor = this.borderColor;
            } else {
                fillColor = this.selectedFillColor;
                borderColor = this.selectedBorderColor;
            }
            var ctx = this.diagram.diag_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.rotation) {
                ctx.rotate(this.rotation * Math.PI / 180);
            }
            this.fillRect(
                ctx, fillColor, this.width, this.height, true);
            this.strokeRect(
                ctx, borderColor, this.borderWidth, this.width, this.height);
            ctx.restore();
            
            if (this.renderLabel) {
                var label = this.label;
                ctx.save();
                ctx.translate(this.x, this.y);
                this.drawLabel(ctx, label, 200);
                ctx.restore();
            }
        }
    });
    
    
    // ************************************************************************
    // activities.ui.Initial
    // ************************************************************************
    
    activities.ui.Initial = function() {
        activities.ui.CircleNode.call(this, 20);
    };
    activities.ui.Initial.prototype = new activities.ui.CircleNode;
    
    
    // ************************************************************************
    // activities.ui.Final
    // ************************************************************************
    
    activities.ui.Final = function() {
        activities.ui.CircleNode.call(this, 20);
    };
    activities.ui.Final.prototype = new activities.ui.CircleNode;
    
    $.extend(activities.ui.Final.prototype, {
        
        /*
         * render diagram layer
         */
        renderDiag: function() {
            var fillColor, borderColor;
            if (!this.selected) {
                fillColor = this.fillColor;
                borderColor = this.borderColor;
            } else {
                fillColor = this.selectedFillColor;
                borderColor = this.selectedBorderColor;
            }
            ctx = this.diagram.diag_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            this.fillCircle(ctx, borderColor, this.radius, true);
            this.fillCircle(ctx, fillColor, this.radius - this.borderWidth);
            this.fillCircle(ctx, borderColor, this.radius / 2);
            ctx.restore();
        }
    });
    
    
    // ************************************************************************
    // activities.ui.Action
    // ************************************************************************
    
    activities.ui.Action = function() {
        activities.ui.RectNode.call(this, 100, 70, 0);
        this.renderLabel = true;
    };
    activities.ui.Action.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Decision
    // ************************************************************************
    
    activities.ui.Decision = function() {
        activities.ui.RectNode.call(this, 40, 40, 45);
        this.renderLabel = true;
    };
    activities.ui.Decision.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Merge
    // ************************************************************************
    
    activities.ui.Merge = function() {
        activities.ui.RectNode.call(this, 40, 40, 45);
    };
    activities.ui.Merge.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Join
    // ************************************************************************
    
    activities.ui.Join = function() {
        activities.ui.RectNode.call(this, 10, 80, 0);
    };
    activities.ui.Join.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Fork
    // ************************************************************************
    
    activities.ui.Fork = function() {
        activities.ui.RectNode.call(this, 10, 80, 0);
    };
    activities.ui.Fork.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Edge
    // ************************************************************************
    
    activities.ui.Edge = function() {
        activities.ui.Element.call(this);
        var settings = activities.settings.edge;
        this.color = settings.color;
        this.lineWidth = settings.lineWidth;
        this.arrowLength = settings.arrowLength;
        this.selectedColor = settings.selectedColor;
        this.source = null;
        this.target = null;
        this.renderLabel = true;
        this.kinks = new Array();
    };
    activities.ui.Edge.prototype = new activities.ui.Element;
    
    $.extend(activities.ui.Edge.prototype, {
        
        /*
         * bind edge to dispatcher
         */
        bind: function() {
            var dsp = this.diagram.dispatcher;
            var dnd = activities.glob.dnd;
            var events = activities.events;
            var handler = activities.handler;
            dsp.subscribe(events.MOUSE_IN, this, this.infoOn);
            dsp.subscribe(events.MOUSE_OUT, this, this.infoOff);
            dsp.subscribe(events.MOUSE_MOVE, this, this.renderInfo);
            dsp.subscribe(events.MOUSE_IN, this, handler.setPointer);
            dsp.subscribe(events.MOUSE_DOWN, this, this.setSelected);
            dsp.subscribe(events.MOUSE_DOWN, this, handler.doAction);
            dsp.subscribe(events.MOUSE_WHEEL, this, dnd.zoom);
        },
        
        /*
         * unbind edge from dispatcher
         */
        unbind: function() {
            var dsp = this.diagram.dispatcher;
            var events = activities.events;
            dsp.unsubscribe(events.MOUSE_IN, this);
            dsp.unsubscribe(events.MOUSE_DOWN, this);
            dsp.unsubscribe(events.MOUSE_MOVE, this);
            dsp.unsubscribe(events.MOUSE_WHEEL, this);
        },
        
        /*
         * translate edge start- and endpoint relative to corresponding source
         * and target object
         */
        translate: function(source, target) {
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
        
        /*
         * return zero position between start and end point
         */
        zero: function() {
            return [
                this._start[0] + ((this._end[0] - this._start[0]) / 2),
                this._start[1] + ((this._end[1] - this._start[1]) / 2)
            ];
        },
        
        /*
         * render edge path
         */
        renderPath: function(ctx) {
            ctx.beginPath();
            ctx.moveTo(this._start[0], this._start[1]);
            var kink;
            for (var idx in this.kinks) {
                kink = this.kinks[idx];
                ctx.lineTo(kink.x, kink.y);
            }
            ctx.lineTo(this._end[0], this._end[1]);
            ctx.closePath();
        },
        
        /*
         * render edge root bubble
         */
        renderRoot: function(ctx) {
            ctx.translate(this._start[0], this._start[1]);
            this.circle(ctx, this.lineWidth);
        },
        
        /*
         * render edge arrow
         */
        renderArrow: function(ctx) {
            var len = this.arrowLength;
            ctx.translate(this._end[0], this._end[1]);
            ctx.rotate(this._end[2] * Math.PI / 180);
            ctx.beginPath();
            ctx.lineTo(len * -1, len / 3);
            ctx.lineTo(len * -1, len * -1 / 3);
            ctx.lineTo(0, 0);
            ctx.closePath();
        },
        
        /*
         * render edge
         */
        render: function() {
            var diagram = this.diagram;
            var source = diagram.elements[diagram.r_mapping[this.source]];
            var target = diagram.elements[diagram.r_mapping[this.target]];
            
            // do not render edge if source and target refer to same 
            // diagram position
            if (source.x == target.x && source.y == target.y) {
                return;
            }
            
            // translate edge start and endpoint
            this.translate(source, target);
            
            // control layer
            var ctx = diagram.ctl_ctx;
            ctx.save();
            ctx.strokeStyle = this.triggerColor;
            ctx.lineWidth = this.lineWidth + 3;
            ctx.lineCap = 'round';
            this.renderPath(ctx);
            ctx.stroke();
            ctx.restore();
            
            // diagram layer
            var strokeStyle, fillStyle;
            if (!this.selected) {
                strokeStyle = this.color;
                fillStyle = this.color;
            } else {
                strokeStyle = this.selectedColor;
                fillStyle = this.selectedColor;
            }
            ctx = diagram.diag_ctx;
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            this.renderPath(ctx);
            ctx.stroke();
            ctx.restore();
            
            // root
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.fillStyle = strokeStyle;
            ctx.lineWidth = 1;
            this.renderRoot(ctx);
            ctx.fill();
            ctx.restore();
            
            // arrow
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.fillStyle = strokeStyle;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            this.renderArrow(ctx);
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            
            // label
            if (this.renderLabel) {
                var label = this.label;
                var zero = this.zero();
                ctx.save();
                ctx.translate(zero[0], zero[1]);
                this.drawLabel(ctx, label, 200);
                ctx.restore();
            }
        }
    });
    
    
    // ************************************************************************
    // activities.ui.Kink
    // ************************************************************************
    
    /*
     * represents a kink of an edge.
     */
    activities.ui.Kink = function() {
        this.x = null;
        this.y = null;
    };
    
    
    // ************************************************************************
    // activities.ui.Overlay
    // ************************************************************************
    
    activities.ui.Overlay = function(element) {
        activities.ui.Rendering.call(this);
        this.element = element;
        this.diagram = element.diagram;
        
        var settings = activities.settings.overlay;
        this.padding = settings.padding;
        this.fillColor = settings.fillColor;
        this.borderColor = settings.borderColor;
        this.alpha = settings.alpha;
        this.textColor = settings.textColor;
        this.textAlign = 'left';
        this.textBaseline = 'top';
    };
    activities.ui.Overlay.prototype = new activities.ui.Rendering;
    
    $.extend(activities.ui.Overlay.prototype, {
        
        /*
         * render info overlay
         */
        render: function() {
            var ctx = this.diagram.diag_ctx;
            ctx.save();
            
            var element = this.element;
            var label = element.label;
            var description = element.description.split('\n');
            
            var lines = ['Label:'];
            lines = lines.concat([label]);
            lines = lines.concat(['', 'Description:']);
            lines = lines.concat(description);
            
            var lineHeight = this.lineHeight;
            var padding = this.padding;
            
            ctx.font = this.font();
            var width = ctx.measureText(label).width + 2 * padding;
            var height = (lines.length * lineHeight) + 2 * padding;
            
            var line, line_width;
            for (var i in lines) {
                line = lines[i];
                line_width = ctx.measureText(line).width;
                if (line_width > width) {
                    width = line_width + 2 * padding;
                }
            }
            
            var x, y;
            if (element.zero) {
                var zero = element.zero();
                x = zero[0];
                y = zero[1];
            } else {
                x = element.x;
                y = element.y;
            }
            
            var diagram = element.diagram;
            var current = diagram.currentCursor({
                pageX: activities.glob.mouse.x,
                pageY: activities.glob.mouse.y
            });
            current = diagram.translateCursor(current[0], current[1]);
            
            var offset = [current[0] - x, current[1] - y];
            x = x + offset[0] + width / 2;
            y = y + offset[1] + height / 2;
            
            ctx.translate(x, y);
            ctx.globalAlpha = this.alpha;
            this.fillRect(ctx, this.fillColor, width, height, false, 3);
            this.strokeRect(ctx, this.borderColor, 3, width, height);
            ctx.globalAlpha = 1.0;
            
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.textBaseline = this.textBaseline;
            
            x = width / 2 * -1 + padding;
            y = height / 2 * -1 + padding;
            ctx.translate(x, y);
            y = 0;
            for (var i in lines) {
                ctx.fillText(lines[i], 0, y, width);
                y = y + lineHeight;
            }
            ctx.restore();
        }
    });
    
})(jQuery);