define([''], function(){

    if (!window.activities){
        window.activities = {};
    }
    window.activities.actions = {};

    /* 
       Section
       =======
       A Section is a container for actions. 
       Additionally it is responsible for return the html
       representation of its UI Elements
    */
    var Section = function(){
        this.actions = new Array()
    }
    window.activities.actions.Section = Section;

    Section.prototype = {
        add: function(action){
            this.actions.push(action);}
             ,
        render: function(){
            var section = $('<div class="section"></div>');
            for (var idx in this.actions){
                this.actions[idx].render().appendTo(section);
            }
            return section;
        }
    }

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
            var model = this.actions.editor.model.fetch();
            this.actions.editor.openDiagram(model);
            //this.actions.editor.newDiagram();
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
            model = new activities.model.Activity(model);
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
            data = this.actions.editor.model;
            data.save();
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
            var node = editor.model.create(this.type);
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
                                           activities.model.Initial);
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
                                           activities.model.Final);
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
                                           activities.model.Action);
    };
    activities.actions.ActionNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.JoinNode
    // ************************************************************************
    
    activities.actions.JoinNode = function(actions) {
        activities.actions.NodeAction.call(
            this, actions, 'join_node', 'Join Node', activities.model.Join);
    };
    activities.actions.JoinNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.ForkNode
    // ************************************************************************
    
    activities.actions.ForkNode = function(actions) {
        activities.actions.NodeAction.call(
            this, actions, 'fork_node', 'Fork Node', activities.model.Fork);
    };
    activities.actions.ForkNode.prototype =
        new activities.actions.NodeAction;
    
    
    // ************************************************************************
    // activities.actions.MergeNode
    // ************************************************************************
    
    activities.actions.MergeNode = function(actions) {
        activities.actions.NodeAction.call(
            this, actions, 'merge_node', 'Merge Node', activities.model.Merge);
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
                                           activities.model.Decision);
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
            var source_id = this.source;
            var source_ob = _.select(editor.model.get("children"), 
                                     function(node){return node.id === source_id;
                                            })[0];
            var target_id = this.target;
            var target_ob = _.select(editor.model.get("children"),
                                    function(node){return node.id === target_id;})[0];
            var node = editor.model.createEdge(source_ob, target_ob);
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
});
