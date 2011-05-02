define(['cdn/underscore.js', "cdn/backbone.js"], function(){
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

    /*
     * activity model namespace and element types
     */
    activities.model = {
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
    }

    var Models = {}
    activities.model = Models;
    
    Models.Element = Backbone.Model.extend({
        defaults : {parent: null},
        initialize: function(){
            this.set({name: this.get("name") || createUID(),
                      uid: createUID()});
        },
        parent : function(){
            return node.get("parent") || null;
        }
        
    });

    Models.Node = Models.Element.extend({
        defaults : {
            label : "",
            description : "",
            children : [],
        },
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
            this.set({outgoing_edges : new Array(),
                      incoming_edges : new Array()});
        }
    } , {});

    Models.Activity = Models.Element.extend({
        initialize : function(){
            // Tell the children who their father is and give them
            // names
            Models.Element.prototype.initialize.call(this);
            var parent = this;
            _(this.get("children")).each(function(child){ 
                child.set({parent : parent});
            });
            // Tell the nodes which edges are connected with them
            _(this.get("children")).chain().select(function(child){
                return child.get("source") && child.get("target");
            }).each(function(edge){
                var source = edge.get('source');
                var outgoing_edges = source.get("outgoing_edges");
                if(!outgoing_edges){
                    outgoing_edges = new Array();
                } 
                outgoing_edges.push(edge);
                source.set({outgoing_edges : outgoing_edges});
                var target = edge.get("target");
                var incoming_edges = target.get("incoming_edges");
                if(!incoming_edges){
                    incoming_edges = new Array();
                }
                incoming_edges.push(edge);
                target.set({incoming_edges : incoming_edges});
            })
        },
        initial : function(){
            return _(this.get("children")).chain()
                .select(function(child){
                    return child instanceof Models.Initial;
                })
                .first()
                .value();
        },
        create : function(nodeType){
            var node = new nodeType();
            node.set({'parent': this.name});
            var children = this.get('children');
            if(!children){
                children = new Array();
            }
            children.push(node);
            this.set({'children': children});
            return node
        },
        createEdge : function(source, target){
            var edge = this.create(Models.Edge);
            edge.set({source: source,
                       target: target});
            var o_edges = source.get('outgoing_edges');
            o_edges.push(edge);
            source.set({'outgoing_edges' : o_edges});
            var i_edges = target.get("incoming_edges");
            i_edges.push(edge);
            target.set({'incoming_edges' : i_edges});
            return edge;
        },
        remove: function(node){
            if (!node) {
                return ;
            }
            if (node instanceof Models.Edge){
                var source = this.source(node);
                var target = this.target(node);
                var o_edges = source.get('outgoing_edges');
                var i_edges = target.get("incoming_edges");
                source.set({"outgoing_edges" : _.without(o_edges, node)});
                target.set({"incoming_edges" : _.without(i_edges, node)});
                this.set({"children" : _.without(this.get("children"), node)});
            } else {
                var obsolete = node.get("incoming_edges").concat(
                    node.get("outgoing_edges"),[node]);
                this.set({children: _.without.apply(this, 
                                                    [this.get("children")]
                                                    .concat(obsolete)) });
                this.set({"children": _.without(this.get("children"), obsolete)});
            }
        },
    } , {display_name : "Activity"});

    Models.Initial = Models.Node.extend({} ,
                                        {display_name : "Initial Node"});

    Models.Fork = Models.Node.extend({} ,
                                     {display_name : "Fork"});

    Models.Join = Models.Node.extend({} ,
                                     {display_name : "Join"});

    Models.Decision = Models.Node.extend({} ,
                                         {display_name : "Decision"});

    Models.Merge = Models.Node.extend({} ,
                                      {display_name : "Merge"});

    Models.Final = Models.Node.extend({} ,
                                      {display_name : "Final Node"});

    Models.Action = Models.Node.extend({} ,
                                       {display_name : "Action"});

    Models.Edge = Models.Element.extend({
        defaults : {
            label : "",
            description : ""
        },
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
            var source = this.get('source');
            if(source){
                var outgoing_edges = source.get("outgoing_edges");
                outgoing_edges.push(this);
                source.set({outgoing_edges : outgoing_edges}); 
            }
            var target = this.get('target');
            if(target){
                var incoming_edges = target.get("incoming_edges");
                incoming_edges.push(this);
                target.set({incoming_edges : incoming_edges});
            }
        }
    }, {display_name : "Edge"});


    /*
     * create uid
     * http://stackoverflow.com/questions/105034/
     */ 
    function createUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
            .replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' 
                    ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }).toUpperCase();
    }
   
    /* 
     * expects JSON serialized model as this.
     */
    activities.model.XXX = Backbone.Model.extend({
        defaults : {__type : activities.model.ACTIVITY,
                    __parent : null,
                    children : {}} , 
        
        initialize : function(){
            if (!this.get('__name')){
                this.set({"__name" : createUID()});
            }
            
            // set __name and __parent
            // XXX: recursion + dottedpath for parent
            for (var key in this.get("children")) {
                var node = this.node(key);
                node.set({__name : key,
                          __parent : this.__name});
            }
            
            // set incoming_edges and outgoing_edges on model nodes
            var edges = this.filtered(activities.model.EDGE);
            var edge, source, target, incoming_edges, outgoing_edges;
            for (var idx in edges) {
                // XXX: traversal by dottedpath if necessary
                edge = edges[idx];
                
                source = this.node(edge.source);
                
                outgoing_edges = source.get("outgoing_edges");
                if (!outgoing_edges) {
                    outgoing_edges = source.set({outgoing_edges : new Array()});
                }
                
                // XXX: dottedpath
                source.set({outgoing_edges: outgoing_edges});
                
                target = this.node(edge.target);
                incoming_edges = target.get("incoming_edges");
                if (!target.incoming_edges) {
                    target.incoming_edges = new Array();
                }
                // XXX: dottedpath
                target.set({incoming_edges: incoming_edges});
            }
        },
        
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
            var parent = node.get("__parent");
            if (parent == this.get("__name")) {
                return this;
            }
            return this.node(parent);
        },
        
        /*
         * Create new child in parent by type. if parent is null, this
         * is used.
         */
        create: function(type, parent) {
            var node;
            if (parent) {
                node = parent;
            } else {
                node = this;
            }
            
            // create UID
            var uid = createUID();
            
            // create children container if not exists
            var children = node.get("children");
            if (!children) {
                children = new Object();
            }
            
            // create child node in this.children and return created node
            children[uid] = activities.model.Model({
                __name: uid,
                __parent: get(node, '__name'),
                __type: type,
                label: '',
                description: ''
            });

            this.set({children: children});

            var child = node.children[uid];
            return child;
        },
        
        
        /*
         * Create new node in parent by type.
         */
        createNode: function(type, parent) {
            var node = this.create(type, parent);
            node.set({outgoing_edges: new Array(),
                      incoming_edges: new Array()});
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
                var source = this.source(node);
                var target = this.target(node);
                var edges = this.source(node).outgoing_edges;
/*                activities.utils.removeArrayItem(
                    edges, edges.indexOf(node.__name));*/
                source.outgoing_edges = _.without(source.outgoing_edges,
                                                  node.__name);
                target.incoming_edges = _.without(target.incoming_edges, 
                                                  node.__name);
/*                activities.utils.removeArrayItem(
                    edges, edges.indexOf(node.__name));*/
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
         * search child objects providing given model element type.
         * optional node for searching could be given, otherwise this
         * is used.
         */
        filtered: function(type, default_node) {
            var node;
            if (default_node) {
                node = default_node;
            } else {
                node = this;
            }
            var ret = new Array();
            for (var key in this.children) {
                if (this.children[key].__type == type) {
                    ret.push(this.children[key]);
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
            return this.children[path];
        },
        
        /*
         * model as string for debugging purposes
         */
        debug: function(Model) {
            var ret = '';
            if (!Model) {
                Model = this;
            }
            if (!Model.children) {
                return ret;
            }
            var child;
            for (var key in Model.children) {
                child = Model.children[key];
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
    });
});
