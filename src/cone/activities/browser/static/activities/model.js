define([
    'require',
    'cdn/underscore.js',
    'cdn/backbone.js',
    './settings',
    './element_views',
    './localstorage',
    './placeandroute'
], function(require) {
    var placeandroute = require('./placeandroute');
    var settings = require('./settings');
    var storage = require('./localstorage');
    var Store = storage.Store;

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
            this.activity.localStorage =  new Store(activities_storage_name);
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
        localStorage: new Store("activities.Layers"),
        model: Models.Layer
    });

    /*
     The Appmodel stores global app data
     */
    
    var AppModel = Backbone.Model.extend({
        localStorage: new Store("activities.AppModel"),

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
            label: "", // XXX: old, to be removed
            name: "", 
            description : "",
            x_req: 1, // varibale sizes are supported
            y_req: 1  // only size 1 supported for now
        },
        initialize : function() {
            Models.Element.prototype.initialize.call(this);
            this.ui = {
                edges: [],
                pos: {x:-1, y:-1},
                size: {x:-1, y:-1}
            };
        }
    } , {});

    Models.Activity = Models.Element.extend({
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
            _.bindAll(this, "eventForwarder");

            this.initial = undefined;
            this.final_node_collection = new Models.FinalNodeCollection(
                [],
                {id: this.id,
                 localStorage: new Store("activities.activity["
                                         + this.id
                                         + "].final_node_collection")}).fetch();
            this.final_node_collection.bind("all", this.eventForwarder);
            this.fork_join_collection = new Models.ForkJoinCollection(
                [],
                {id: this.id, 
                 localStorage: new Store("activities.activity[" 
                                         + this.id
                                         + "].fork_join_collection")}).fetch();
            this.fork_join_collection.bind("all", this.eventForwarder);
            this.decision_merge_collection = new Models.DecisionMergeCollection(
                [],
                {id: this.id,
                 localStorage: new Store("activities.activity[" 
                                         + this.id
                                         + "].decision_merge_collection")}).fetch();
            this.decision_merge_collection.bind("all", this.eventForwarder);
            this.action_collection = new Models.ActionCollection(
                [],
                {id: this.id,
                 localStorage: new Store("activities.activity["
                                         + this.id
                                         + "].action_collection")}).fetch();
            this.action_collection.bind("all", this.eventForwarder);
        },
        /* 
         Bubble up the event from your collections
         */
        eventForwarder: function(event, context){
            this.trigger(event, context);
        },
        children: function(){
            var children = this.fork_join_collection.models.concat(
                this.final_node_collection.models,
                this.decision_merge_collection.models,
                this.action_collection.models);
            if(this.initial){
                children = children.concat([this.initial]);
            }
            return children;
        },
        create : function(nodeType, position){
            var node = new nodeType(
                {ui_data: {x: position.x / activities.settings.rendering.gridsize,
                           y: position.y / activities.settings.rendering.gridsize,
                           width: 1,
                           height: 1},
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
                this.final_node_collection.add(node);
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
            default:
                throw "Unknown node type. Bad programmer";
            }
            node.save();
            return node;
        },
        remove: function(node){
            if (!node) {
                return ;
            }
            if (node instanceof Models.Final){
                this.final_node_collection.remove(node).destroy();
            } else if (node instanceof Models.ForkJoin){
                this.fork_join_collection.remove(node).destroy();
            } else if (node instanceof Models.DecisionMerge){
                this.decision_merge_collection.remove(node).destroy();
            } else if (node instanceof Models.Action){
                this.action_collection.remove(node).destroy();
            } else {
                throw "Unknown node type. Bad programmer";
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
    Models.FinalNodeCollection = Backbone.Collection.extend({
        model: Models.Final,
        initialize: function(models, options){
            this.localStorage = options.localStorage;
        }
    });

    Models.Action = Models.Node.extend({
        initialize: function(models, options){
            Models.Node.prototype.initialize.call(this);
            if(! this.get("activity_id")){
                this.activity = new Models.Activity({id: Store.guid()});
                this.activity.localStorage = new Store(this.get("activity_storage_name"));
                this.activity.save();
                this.set({activity_id: this.activity.id});
            } else{
                this.activity = new Models.Activity({id: this.get("activity_id")});
                this.activity.localStorage = new Store(this.get("activity_storage_name"));
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

    /////////////// new-style below here ////////////////////////////////////
    // XXX: temp for testing
    var testpaths = function(activity) {
        var A = new ForkJoin({name: 'A'});
        var B = new DecMer({name: 'B'});
        var C = new Action({name: 'C'});
        var D = new DecMer({name: 'D'});
        var E = new ForkJoin({name: 'E'});
        var F = new Action({name: 'F'});
        var G = new Action({name: 'G'});
        var H = new Action({name: 'H'});
        var I = new Initial({name: 'I'});
        var J = new Action({name: 'J'});
        var K = new Action({name: 'K'});
        var L = new Action({name: 'L'});
        var M = new Action({name: 'M'});
        var N = new Final({name: 'N'});
        var P = new Action({name: 'P'});
        var Q = new Final({name: 'Q'});
        var R = new Action({name: 'R', x_req: 1});

        // build paths
        var paths = activity.paths;
        paths.add(new Path({
            nodes: [I, A, B, C, D, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, B, F, G, D, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, B, N]
        }));
        paths.add(new Path({
            nodes: [I, A, H, J, K, L, M, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, P, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, R, E, Q]
        }));
    };

    var Model = storage.Model;
    var Collection = storage.Collection;

    // root object is based on a Backbone.Model, but the save and
    // fetch functions are disabled. You can give it a custom name:
    // var app = new App({name: "myApp"});
    // This is used for testing. The name is used as top-level
    // database key.
    var App = storage.Root.extend({
        initialize: function(attributes) {
            this.name = attributes.name || settings.localstorage_key;
            // XXX: consider using a collection for this
            this.layers = [];
            var prev;
            for (i = 0; i < 6; i++) {
                var layer = new Layer({}, {name:"layer"+i, parent:this});
                layer.prev = prev;
                if (prev) {
                    prev.next = layer;
                }
                this.layers.push(layer);
            }
        }
    });

    var Layer = Model.extend({
        initialize: function() {
            this.initials = new Initials([], {name: 'initials', parent:this});
            this.finals = new Finals([], {name:'finals', parent:this});
            this.actions = new Actions([], {name:'actions', parent:this});
            this.decmers = new DecMers([], {name:"decmers", parent:this});
            this.forkjoins = new ForkJoins([], {name:'forkjoins', parent:this});
            this.activities = new Activities([], {name:'activities', parent:this});
            // XXX: temp hack
            this.activity = new Activity([], {name:'theonlyone', parent:this});
 
        }
    });
    
    var Node = Model.extend({
        defaults: {
            x_req: 1, // varibale size supported
            y_req: 1  // fixed for now
        },
        initialize: function() {
            this.ui = {
                x: -1,
                y: -1,
                dx: -1,
                dy: -1
            };
            this.edges = [];
        }
    });
    var Final = Node.extend({});
    var Initial = Node.extend({});
    var Action = Node.extend({});
    var DecMer = Node.extend({});
    var ForkJoin = Node.extend({});

    var Initials = Collection.extend({
        model: Initial
    });

    var Finals = Collection.extend({
        model: Final
    });

    var Actions = Collection.extend({
        model: Action
    });

    var DecMers = Collection.extend({
        model: DecMer
    });

    var ForkJoins = Collection.extend({
        model: ForkJoin
    });

    var Activity = Model.extend({
        initialize: function() {
            this.paths = new Paths([], {name:'paths', parent:this});
            this.paths.fetch();
            if (!this.paths.length) {
                var source;
                var target;
                if (this.collection) {
                    source = this.collection.parent.initials.create();
                    target = this.collection.parent.finals.create();
                } else {
                    source = this.parent.initials.create();
                    target = this.parent.finals.create();
                }
                // XXX: objects are serialized and restored and then have no type
                // XXX: now code is needed to store paths properly,
                // ie. only the UUID of the nodes
//                this.paths.create({nodes: [source, target]});
            }
        },
        placeandroute: function() {
            return placeandroute(this.paths);
        }
    });

    var Activities = Collection.extend({
        model: Activity
    });

    var Path = Model.extend({
        copy: function() {
            return new Path({
                nodes: [].concat(this.get('nodes'))
            });
        },
        count: function() {
            return _.size(this.get('nodes'));
        },
        include: function(node) {
            return _.include(this.get('nodes'), node);
        },
        last: function() {
            return _.last(this.get('nodes'));
        },
        remove: function(node) {
            var nodes = this.get('nodes');
            node = nodes.splice(_.indexOf(nodes, node), 1);
            // XXX: what to return, the node or the remaining nodes?
        },
        xReq: function() {
            return _.reduce(this.get('nodes'), function (memo, node) {
                return memo + node.get('x_req');
            }, 0 );
        },
        yReq: function() {
            return 1;
            return _.max(this.get('nodes'), function (node) {
                return node.get('y_req');
            }).get('y_req');
        }
    });

    var Paths = Collection.extend({
        model: Path,
        deep: function() {
            // return a "deep" copy, nodes are still the same as in the original
            return new Paths(
                this.map(function (path) { return path.copy(); })
            );
        },
        longest: function() {
            return this.max(function(path) { return path.xReq(); });
        },
        xReq: function() {
            return this.longest().xReq();
        },
        yReq: function() {
            return this.reduce(function(memo, path) { return memo + path.yReq(); }, 0);
        }
    });

    return {
        App: App,
        Layer: Layer,
        Initial: Initial,
        Initials: Initials,
        Final: Final,
        Finals: Finals,
        Action: Action,
        Actions: Actions,
        DecMer: DecMer,
        DecMers: DecMers,
        ForkJoin: ForkJoin,
        ForkJoins: ForkJoins,
        Activity: Activity,
        Activities: Activities,
        Path: Path,
        Paths: Paths
    };
});
