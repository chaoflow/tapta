define(['cdn/underscore.js', "cdn/backbone.js", "activities/element_views", "activities/storage"], function(){
    // ************************************************************************
    // activities.model.Model
    // ************************************************************************
    // An UML Diagram contains a number different elements.
    // There is an Activity, this contains a number of children and
    // has a parent. The childrens are Nodes and Edges, the Parent is
    // an Action Node. 
    // The nodes are UML elements that have an Activity as their
    // parent, and are connected via nodes. The Action Node can have
    // an Activity as a detail.
    // An Edge is an element that points from one node to another
    // node.
    // Nodes know which Edges point away from them and which point
    // towards them. Edges know to which Node they point.
    // All Elements are implemented with Backbone.Model objects.

    
    if (!window.activities){
        window.activities = {};
    }

    var Models = {}
    activities.model = Models;


    Models.Layer = Backbone.Model.extend({
    })

    Models.Layers = Backbone.Collection.extend({
        localStorage: new activities.Store("activities.Layers"),
        model: Models.Layer,
    });
    
    Models.Element = Backbone.Model.extend({
    });

    var AppModel = Backbone.Model.extend({
        localStorage: new activities.Store("activities.AppModel"),

        initialize: function(){
            var layers = new Models.Layers().fetch();
            // New computer
            if(layers.length == 0){
                for(var i=0;i<6;i++){
                    layers.create({});
                };
            }
            this.set({id: "one",
                      layers: layers});
            
        }
    });
    activities.app_model = AppModel;

    Models.Node = Models.Element.extend({
        defaults : {
            label : "",
            description : ""
        },
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
        }
    } , {});

    Models.Activity = Models.Element.extend({
        initialize : function(){
            // Tell the children who their father is and give them
            // names
            Models.Element.prototype.initialize.call(this);
            _.bindAll(this, "eventForwarder");
            this.set({id:'test'});
            this.initial = undefined;
            this.final_node = undefined;
            this.fork_join_collection = new Models.ForkJoinCollection([],
                {localStorage: new activities.Store("activities.activity[" 
                                                    + this.id 
                                                    + "].fork_join_collection")}).fetch();
            this.fork_join_collection.bind("all", this.eventForwarder);
            this.decision_merge_collection = new Models.DecisionMergeCollection([],
                {localStorage: new activities.Store("activities.activity[" 
                                                    + this.id 
                                                    + "].decision_merge_collection")}).fetch();
            this.decision_merge_collection.bind("all", this.eventForwarder);
            this.action_collection = new Models.ActionCollection([],
                {localStorage: new activities.Store("activities.activity[" 
                                                    + this.id 
                                                    + "].action_collection")}).fetch();
            this.action_collection.bind("all", this.eventForwarder);
            this.edge_collection = new Models.EdgeCollection([],
                {localStorage: new activities.Store("activities.activity[" 
                                                    + this.id 
                                                    + "].edge_collection")}).fetch();
            this.edge_collection.bind("all", this.eventForwarder);
        },
        eventForwarder: function(event, context){
            this.trigger(event, context);
        },
        children: function(){
            return this.fork_join_collection.concat(
                this.decision_merge_collection,
                this.action_collection,
                this.edge_collection,
                [this.initial, this.final_node]);
        },
        getEdgesFor : function(node){
            return this.node_collection.select(function(child){
                return (child.get("target") === node 
                        || child.get("source") === node);
            });
        },
        create : function(nodeType, args){
            var node = new nodeType(args);
            switch(nodeType){
            case Models.Initial:
                this.initial = node;
                break;
            case Models.Final:
                this.final_node = node;
                break;
            case Models.ForkJoin:
                this.fork_join_collection.add(node);
                break;
            case Models.DecisionMerge:
                this.decision_merge_collection.add(node);
                break;
            case Models.Action:
                this.action_collection.add(node);
                break;
            case Models.Edge:
                this.edge_collection.add(node);
                break;
            default:
                throw "Unknown node type. Bad programmer";
            }
            return node;
        },
        createEdge : function(source, target){
            var edge = this.create(Models.Edge);
            edge.set({source: source,
                       target: target});
            return edge;
        },
        remove: function(node){
            if (!node) {
                return ;
            }
            if (node instanceof Models.Edge){
                this.edge_collection.remove(node);
            } else {
                var obsolete = this.getEdgesFor(node).concat([node]);
                _.each(obsolete, function(node){
                    if(node instanceof Models.Initial){
                        this.initial = undefined;
                    } else if (node instanceof Models.Final){
                        this.final_node = undefined;
                    } else if (node instanceof Models.ForkJoin){
                        this.fork_join_collection.remove(node);
                    } else if (node instanceof Models.DecisionMerge){
                        this.decision_merge_collection.remove(node);
                    } else if (node instanceof Models.ActionCollection){
                        this.action_collection(node);
                    } else if (node instanceof Models.EdgeCollection){
                        this.edge_collection.remove(node);
                    } else {
                        throw "Unknown node type. Bad programmer";
                    }
                });
            }
        }
    } , {display_name : "Activity"});

    Models.Initial = Models.Node.extend({
        createView: function(){
            return new activities.ui.Initial(this);
        }} ,
                                        {display_name : "Initial Node"});

    Models.ForkJoin = Models.Node.extend({ 
        createView: function(){
            return new activities.ui.ForkJoin(this);
        }} ,
                                     {display_name : "Fork and Join"});
    Models.ForkJoinCollection = Backbone.Collection.extend({
        model: Models.ForkJoin,
        initialize: function(models, options){
            this.localStorage = options.localStorage;
        }
    });

    Models.DecisionMerge = Models.Node.extend({  
        createView: function(){
            return new activities.ui.DecisionMerge(this);
        }} ,
                                      {display_name : "Decision and Merge"});
    Models.DecisionMergeCollection = Backbone.Collection.extend({
        model: Models.DecisionMerge,
        initialize: function(models, options){
            this.localStorage = options.localStorage;
        }
    });

    Models.Final = Models.Node.extend({
        createView: function(){
            return new activities.ui.Final(this);
        }} ,
                                      {display_name : "Final Node"});

    Models.Action = Models.Node.extend({
        createView: function(ui_context){
            var View = Backbone.View.extend({
                initialize: function(){
                    this.tmpl = $.template(null, $("#action"));
                    this.defaults = $.extend(activities.settings.rendering,
                                             activities.settings.node);
                },
                render: function(){
                    args = $.extend(this.defaults, this.model.get("ui_data"));
                    var elem = this.options.parent_canvas.rect(args.x, args.y, 
                                                    args.width, args.height, 
                                                    args.rounding);
                    elem.attr({fill: args.fillColor,
                              stroke: args.borderColor,
                              "stroke-width": args.borderWidth});

                    var start = function () {
                        // storing original coordinates
                        this.ox = this.attr("x");
                        this.oy = this.attr("y");
                        this.attr({opacity: 1});
                    },
                    move = function (dx, dy) {
                        // move will be called with dx and dy
                        this.attr({x: this.ox + dx, y: this.oy + dy});
                    },
                    up = function () {
                        // restoring state

                        this.attr({opacity: .5});
                    };
                    elem.drag(move, start, up);
                    
                }
            });
            return new View({parent_canvas: ui_context,
                             model: this});
        }} ,
                                       {display_name : "Action"});

    Models.ActionCollection = Backbone.Collection.extend({
        model: Models.Action,
        initialize: function(models, options){
            this.localStorage = options.localStorage;
        }
    });

    Models.Edge = Models.Element.extend({
        defaults : {
            label : "",
            description : ""
        },
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
        }
    }, {display_name : "Edge"});

    Models.EdgeCollection = Backbone.Collection.extend({
        model: Models.Edge,
        initialize: function(models, options){
            this.localStorage = options.localStorage;
        }
    });
});
