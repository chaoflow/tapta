define(['cdn/underscore.js', "cdn/backbone.js", "activities/element_views", 
        "activities/storage"], function(){

    if (!window.activities){
        window.activities = {};
    }

    /* 
       Layers are responsible for remembering what the currenct
       active activity is.
    */
    
    var Models = {};
    activities.model = Models;

    Models.Layer = Backbone.Model.extend({
        initialize: function(){
            var id = this.get("activity_id");
            var activities_storage_name = "activities.layer.activity[" 
                + this.id
                + "]";
            this.activity = new Models.Activity({id:id,
                                                 storage_name: activities_storage_name});
            this.activity.localStorage =  new activities.Store(activities_storage_name);
            this.activity.fetch();
            this.activity.save();
            this.set({activity_id: this.activity.id});
            this.save();
        },
        updateActivity: function(activity){
            this.activity = activity;
            this.set({activity_id: activity.id});
            this.save();
        }
    });

    Models.Layers = Backbone.Collection.extend({
        localStorage: new activities.Store("activities.Layers"),
        model: Models.Layer
    });

    /*
      The Appmodel stores global app data
    */
    
    var AppModel = Backbone.Model.extend({
        localStorage: new activities.Store("activities.AppModel"),

        initialize: function(){
            var layers = new Models.Layers().fetch();
            // New computer
            if(layers.length == 0){
                for(var i=0;i<6;i++){
                    layers.create({id:"x" + i,
                                   activity_id: "x" + i});
                };
            }
            this.layers = layers;
            this.set({id: "app"});
            
        }
    });
    activities.app_model = AppModel;

    Models.Element = Backbone.Model.extend({
    });

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
            Models.Element.prototype.initialize.call(this);
            _.bindAll(this, "eventForwarder");

            this.initial = undefined;
            this.final_node = undefined;
            this.fork_join_collection = new Models.ForkJoinCollection(
                [],
                {id: this.id, 
                 localStorage: new activities.Store("activities.activity[" 
                                                    + this.id
                                                    + "].fork_join_collection")}).fetch();
            this.fork_join_collection.bind("all", this.eventForwarder);
            this.decision_merge_collection = new Models.DecisionMergeCollection(
                [],
                {id: this.id,
                 localStorage: new activities.Store("activities.activity[" 
                                                    + this.id
                                                    + "].decision_merge_collection")}).fetch();
            this.decision_merge_collection.bind("all", this.eventForwarder);
            this.action_collection = new Models.ActionCollection(
                [],
                {id: this.id,
                 localStorage: new activities.Store("activities.activity["
                                                    + this.id
                                                    + "].action_collection")}).fetch();
            this.action_collection.bind("all", this.eventForwarder);
            this.edge_collection = new Models.EdgeCollection(
                [],
                {id: this.id,
                 localStorage: new activities.Store("activities.activity[" 
                                                    + this.id 
                                                    + "].edge_collection")}).fetch();
            this.edge_collection.bind("all", this.eventForwarder);
        },
        /* 
           Bubble up the event from your collections
        */
        eventForwarder: function(event, context){
            this.trigger(event, context);
        },
        children: function(){
            var children = this.fork_join_collection.models.concat(
                this.decision_merge_collection.models,
                this.action_collection.models,
                this.edge_collection.models);
            if(this.initial){
                children = children.concat([this.initial]);
            }
            if(this.final_node){
                children = children.concat([this.final_node]);
            }
            return children;
        },
        getEdgesFor : function(node){
            return this.node_collection.select(function(child){
                return (child.get("target") === node 
                        || child.get("source") === node);
            });
        },
        create : function(nodeType, position){
            var node = new nodeType(
                {ui_data: {x: position.x / activities.settings.rendering.gridsize,
                           y: position.y / activities.settings.rendering.gridsize,
                           width: 50 / activities.settings.rendering.gridsize,
                           height: 50 / activities.settings.rendering.gridsize},
                 activity_storage_name: this.get("storage_name")});

            // depending on the type, the new node is added to a
            // collection. This will trigger an event, which in turn
            // triggers redrawing. That means, at this point, the
            // element needs to know its coordinates.
            switch(nodeType){
            case Models.Initial:
                this.initial = node;
                this.trigger("add", node);
                break;
            case Models.Final:
                this.final_node = node;
                this.trigger("add", node);
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
            node.save();
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
        },
        dragging: function(element, rel_movement, abs_movement){
            var old_ui = element.get("ui_data");
            element.set({ui_data: 
                         {x: old_ui.x + rel_movement.x / activities.settings.rendering.gridsize,
                          y: old_ui.y + rel_movement.y / activities.settings.rendering.gridsize,
                          width: old_ui.width,
                          height: old_ui.height}});
            element.save();
        }
    } , {display_name : "Activity"});

    Models.Initial = Models.Node.extend({
        getView: function(ui_context){
            if(this.view){
                this.view.options.canvas = ui_context;
                return this.view;
            }
            return this.view = new activities.ui.initial_view({canvas: ui_context,
                                                               model: this});
        }} ,
                                        {display_name : "Initial Node"});

    Models.ForkJoin = Models.Node.extend({ 
        getView: function(ui_context){
            if(this.view){
                this.view.options.canvas = ui_context;
                return this.view;
            }
            return this.view = new activities.ui.fork_join_view({canvas: ui_context,
                                                                 model: this});
        }} ,
                                         {display_name : "Fork and Join"});
    Models.ForkJoinCollection = Backbone.Collection.extend({
        model: Models.ForkJoin,
        initialize: function(models, options){
            this.localStorage = options.localStorage;
        }
    });

    Models.DecisionMerge = Models.Node.extend({  
        getView: function(ui_context){
            if(this.view){
                this.view.options.canvas = ui_context;
                return this.view;
            }
            return this.view = new activities.ui.decision_merge_view({canvas: ui_context,
                                                                 model: this});
        }} ,
                                              {display_name : "Decision and Merge"});
    Models.DecisionMergeCollection = Backbone.Collection.extend({
        model: Models.DecisionMerge,
        initialize: function(models, options){
            this.localStorage = options.localStorage;
        }
    });

    Models.Final = Models.Node.extend({
        getView: function(ui_context){
            if(this.view){
                this.view.options.canvas = ui_context;
                return this.view;
            }
            return this.view = new activities.ui.Final(this);
        }} ,
                                      {display_name : "Final Node"});

    Models.Action = Models.Node.extend({
        initialize: function(models, options){
            if(! this.get("activity_id")){
                this.activity = new Models.Activity({id: activities.Store.guid()});
                this.activity.localStorage = new activities.Store(this.get("activity_storage_name"));
                this.activity.save();
                this.set({activity_id: this.activity.id});
            } else{
                this.activity = new Models.Activity({id: this.get("activity_id")});
                this.activity.localStorage = new activities.Store(this.get("activity_storage_name"));
                this.activity.fetch();
            }
        },
        getView: function(ui_context){
            if(this.view){
                this.view.options.canvas = ui_context;
                return this.view;
            }
            return this.view = new activities.ui.action_view({canvas: ui_context,
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
