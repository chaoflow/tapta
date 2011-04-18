define([], function(){
    // ************************************************************************
    // activities.model.Model
    // ************************************************************************
    
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
        
    /* 
     * expects JSON serialized model as context.
     */
    activities.model.Model = function(context) {
        debugger;
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
});
