// limitations:
//  - common prefxies need to be adjacent
//  - common suffixes need to be adjacent
//  - adjacent suffixes may be separated by paths with different final node
//  - only vertical element size of 1
define([
    'require',
    'cdn/underscore.js'
], function(require) {

    // XXX: feels like this should be in model.js
    // Edges connect a source and target node and allow to insert a
    // new node in their place. Therefore they keep a reference to the
    // paths they belong to.
    var Edge = function(opts) {
        this.source = opts && opts.source;
        this.target = opts && opts.target;
        this.paths = [];
    };
    Edge.prototype = {
        insert: function(node) {
            var source = this.source;
            _.each(this.paths, function(path) {
                var nodes = path.get('nodes');
                var idx = _.indexOf(nodes, source);
                var head = _.head(nodes, idx);
                var tail = _.tail(nodes, idx);
                path.set({nodes: head.concat(node).concat(tail)},
                         {silent: true});
            });
            _.first(this.paths).collection.trigger("change");
        }
    };

    // UINodes wrap normal nodes to carry information for the UI. In
    // our case this is position and size in grid coordinates
    // (fractions are ok) and the outgoing edges of a node.
    var UINode = function(model) {
        _.bindAll(model, "get", "set");
        _.extend(this, {
            edges: [],
            model: model,
            ui: {
                x: -1,
                y: -1,
                dx: -1,
                dy: -1
            }, 
            get: model.get,
            set: model.set
        });
    };
    
    // this will work on a working copy of the original paths
    // collection and destroy it in the process. the size is stored on
    // the nodes contained in paths and a list of all seen nodes is
    // returned.
    var size = function(paths, all) {
        if (all === undefined) {
            all = [];
        };
        if (paths.length === 0) {
            return all;
        };
        var longest = paths.longest();
        var nodes_of_longest = [].concat(longest.get('nodes'));
        _.forEach(nodes_of_longest, function(node) {
            if (node.get('y_req') > 1) {
                throw 'Vertical node size != 1 unspported';
            };
            node.ui.dx = node.get('x_req');
            node.ui.dy = node.get('y_req');

            // The longest path, i.e. the path that needs the most
            // space defines how much horizontal space to allocate
            // to its nodes, beyond their needs.
            var xadd = (longest.x_avail - longest.xReq()) / longest.count();
            node.ui.dx += Math.round(xadd * 1000) / 1000;

            // The vertical space given to a node depends on its
            // presence in paths. Additional space is given if a
            // prematurely ending path is enclosed by paths the
            // node is present in.
            var yadd = 0;
            var seen = false;
            paths.forEach(function(path) {
                if (path.include(node)) {
                    seen = true;
                    if (path !== longest) {
                        node.ui.dy += path.yReq();
                    };
                    node.ui.dy += yadd;
                    yadd = 0;
                    path.remove(node);
                    path.x_avail -= node.ui.dx;
                } else if (seen && (path.last() !== longest.last())) {
                    // The node is not present in this path, but
                    // its paths may enclose a path ending
                    // earlier.
                    // XXX: this will currently fail, if the first
                    // path is such a path.
                    yadd = path.yReq();
                };
            });
            all = all.concat([node]);
        });
        // we are using floats...
        if (longest.x_avail > 0.001) {
            throw "Unallocated space left!";
        };
        paths.remove(longest);
        return size(paths, all);        
    };

    // return nodes of all paths wrapped in UINodes with their
    // position, size and outgoing edges.
    var placeandroute = function(paths) {
        // A working copy of paths containing UINodes instead of
        // nodes. paths_wc2 is a copy of paths_wc, having its own path
        // objects but based on the same node objects as paths_wc.
        // paths_wc is used during sizing and gets killed in the process,
        // paths_wc2 is then used to add position information to the same
        // ui nodes.
        var paths_wc = paths.workingCopy(UINode);
        var paths_wc2 = paths_wc.workingCopy();

        // The longest path defines the size of the whole diagram
        // (paths.xReq), this space is available for all paths,
        paths_wc2.each(function(path) { path.x_avail = paths_wc.xReq(); });

        var all = size(paths_wc2);

        // position all nodes
        // all nodes in the first path receive vertical position 0
        // all nodes in the second path that have no position yet, receive 1
        // ...
        var i = 0;
        paths_wc.forEach(function(path) {
            var prev_node = undefined;
            _.forEach(path.get('nodes'), function(node) {
                if (node.ui.y === -1) {
                    node.ui.y = i;
                };
                if (node.ui.x === -1) {
                    if (prev_node) {
                        node.ui.x = Math.round(
                            (prev_node.ui.x + prev_node.ui.dx) * 1000
                        ) / 1000;
                    } else {
                        node.ui.x = 0;
                    };
                };

                // generate edge and store it on the previous node
                // the vertical position and size of an edge are taken
                // from the target node. Horizontal position and size
                // is queried from source and target node.
                if (prev_node) {
                    var existing = _.select(prev_node.edges, function(edge) {
                        return edge.target === node;
                    });
                    if (existing.length > 1) {
                        throw "Duplicate edge - programmer's fault!";
                    }
                    existing = existing[0];
                    if (existing === undefined) {
                        existing = new Edge({source: prev_node,
                                             target: node});
                        prev_node.edges.push(existing);
                    }
                    // the edge needs access to the real path object
                    // to insert nodes - XXX: I don't like this
                    existing.paths.push(path.orig);
                };
                prev_node = node;
            });
            i++;
        });
        return all;
    };

    return placeandroute;
});
