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
                var head = _.head(nodes, idx+1);
                var tail = _.tail(nodes, idx+1);
                path.set({nodes: head.concat(node).concat(tail)},
                         {silent: true});
            });
            _.first(this.paths).collection.trigger("change");
        }
    };

    var placeandroute = function(paths) {
        // sets sizes and positions on paths and nodes in the paths
        // returns list of edges

        // A deep working copy (wc), the nodes in there are still the very same.
        var paths_wc = paths.deep();
        
        // The longest path defines the size of the whole diagram
        // (paths.xReq), this space is available for all paths,
        paths_wc.each(function(path) { path.x_avail = paths_wc.xReq(); });

        // allocate space to the nodes and register them in an array
        // to be returned
        var recurse = function(paths, allnodes) {
            if (allnodes === undefined) {
                allnodes = [];
            };
            if (paths.length === 0) {
                return allnodes;
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
                allnodes = allnodes.concat([node]);
            });
            // we are using floats...
            if (longest.x_avail > 0.001) {
                debugger;
                throw "Unallocated space left!";
            };
            paths.remove(longest);
            return recurse(paths, allnodes);
        };
        var allnodes = recurse(paths_wc);

        // position all nodes
        // all nodes in the first path receive vertical position 0
        // all nodes in the second path that have no position yet, receive 1
        // ...
        var i = 0;
        paths.forEach(function(path) {
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
                    existing.paths.push(path);
                };
                prev_node = node;
            });
            i++;
        });
        return allnodes;
    };

    return placeandroute;
});
