/*
 *  In this file, action means a user action. The action 
 * repsonsability consists of: Rendering a button for 
 * itself, and performing the action, like saving everything 
 * or adding an action (Model action) to an editor view. 
 * 
 * Communication occurs via events, the menubar listens
 * to events on document level and reissues event on the
 * target of the original event.
 * An example:
 * 1. A user clicks on some empty space in the canvas
 * 2. The canvas registers this event and triggers a
 *    "clicked_on_empty_space" event.
 * 3. The event gets bubbled up until it reaches the
 *    document. Here the menubar catches the event
 *    and decides what to do.
 * 4. The menubar decides the trigger a add_new_element
 *    event, triggered on the original target (the canvas)
 * 5. The diagramview listens to this element, and adds a new
 *    element to the active activity, based on the type
 *    the menubar provided with the event
 * 6. The collection where the element got added triggers
 *    an add event.
 * 7. The diagram listens to the add event and renders
 *    the new element.
 * 
 */

define([], function(){

    if (!window.activities){
        window.activities = {};
    }

    window.activities.actions = {};
    /*
      This builds up the complete action menu
    */

    activities.actions.Menubar = function(id) {
        this.selector = '#' + id + ' div.actions';
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
//        section.add(new activities.actions.InitialNode(this));
//        section.add(new activities.actions.FinalNode(this));
        section.add(new activities.actions.ActionNode(this));
        section.add(new activities.actions.JoinNode(this));
//        section.add(new activities.actions.ForkNode(this));
        section.add(new activities.actions.MergeNode(this));
//        section.add(new activities.actions.DecisionNode(this));
        section.add(new activities.actions.Edge(this));
        section.add(new activities.actions.DeleteElement(this));
        this.sections.push(section);
        
        // debugging and development actions
        section = new activities.actions.Section(this);
        section.add(new activities.actions.Monitor(this));
        section.add(new activities.actions.RunTests(this));
        section.add(new activities.actions.FlipLayers(this));
        this.sections.push(section);
        
    };
    
    activities.actions.Menubar.prototype = {
        
        /*
         * bind toolbar actions
         */
        bind: function() {
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
            // Custom events we listen on
            $(window.document).bind("clicked_on_empty_space", 
                                    function(event, activity, position){
                if(actions.pending()){
                    actions.perform(event, activity, position);
                }
            });
            $(window.document).bind("elem_click", function(event, node){
                var action = actions.get("delete_element");
                if(action.active && !action.steady && !action.busy){
                    // screw it
                    node.activity.remove(node);
                }
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
            return false;
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
        perform: function(event, activity, position) {
            var actions = this.actions();
            var action;
            for (var idx in actions) {
                action = actions[idx];
                if (action.active && !action.steady) {
                    action.perform(event, activity, position);
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


    /* 
       Section
       =======
       A Section is a container for actions. 
       Additionally it is responsible for return the html
       representation of its UI Elements
    */
    var Section = function(){
        this.actions = new Array();
    };
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
            $(document).trigger("save");
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
            for(i in localStorage){
                localStorage.removeItem(i);
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
        
        perform: function(event, activity, position) {
            jQuery(event.target).trigger("add_new_element", [this.type,
                                         position]);
            this.unselect();
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
            this, actions, 'join_node', 'Join Node', activities.model.ForkJoin);
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
            this, actions, 'merge_node', 'Merge Node', activities.model.DecisionMerge);
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
            jQuery(event.target).trigger("remove_element", [this.type,
                                         position]);
            this.unselect();
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
