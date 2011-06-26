// limitations:
//  - common prefxies need to be adjacent
//  - adjacent suffixes may be separated by paths with different final node
//  - only vertical element size of 1
define([
    'require',
    'vendor/underscore.js',
    './model',
    './settings'
], function(require) {
    var settings = require('./settings');

    var placeandroute = function(paths, slot) {
        // calculate size, position and outgoing edges for all nodes
        // information is stored on the nodes in: node.ui[slot]
        // slot is the cid of the activity we are working for
        if (slot === undefined) {
            throw "Need slot to store ui info in.";
        }

        // A deep working copy (wc), the nodes in there are still the very same.
        var paths_wc = paths.deep();
        paths_wc.name = "placeandroute_working_copy";
        // make sure events are not logged
        paths_wc.logevents = false;

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

                // initialize ui slot for this node. we always iterate
                // over the longest path and remove all nodes we see
                // from the other paths. Therefore, here we only see
                // each node once.
                if (node.ui === undefined) {
                    node.ui = {};
                }
                var ui = node.ui[slot] = {
                    x: -1,
                    y: -1,
                    dx: node.get('x_req'),
                    dy: node.get('y_req'),
                    incoming: [],
                    outgoing: []
                };

                // The longest path, i.e. the path that needs the most
                // space, defines how much horizontal space to allocate
                // to its nodes, beyond their needs.
                var xadd = (longest.x_avail - longest.xReq()) / longest.count();
                ui.dx += Math.round(xadd * 1000) / 1000;

                // The vertical space given to a node depends on its
                // presence in paths. Additional space is given if a
                // prematurely ending path is enclosed by paths the
                // node is present in.
                var yadd = 0;
                var seen = false;
                paths.forEach(function(path) {
                    if (path.include(node)) {
                        seen = true;
                        // for the current longest path we already
                        // added the vertical space above.
                        if (path !== longest) {
                            ui.dy += path.yReq();
                        };

                        // If there is additional space we add and
                        // reset it. This is the case, if between the
                        // paths this node is a member of, there is a
                        // prematurely ending path.
                        ui.dy += yadd;
                        yadd = 0;

                        // remove the node from the path and reduce
                        // the path's available space accordingly.
                        path.remove(node);
                        path.x_avail -= ui.dx;
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
                // XXX: sigh, we end up here, with like real space
                // left-over, like 1 or 2. Produce by adding a row of
                // actions in combination with reloading.
                throw "Unallocated space left!";
            };
            // XXX: paths is a real collection and throws events
            // no problem, but something to be aware of
            paths.remove(longest, {silent:true});
            return recurse(paths, allnodes);
        };
        var allnodes = recurse(paths_wc);

        // XXX: resolved circular dependency, we currently need to
        // create Edges
        var Edge = require('./model').Edge;

        // position all nodes
        // all nodes in the first path receive vertical position 0
        // all nodes in the second path that have no position yet, receive 1
        // ...
        var i = 0;
        paths.forEach(function(path) {
            var prev_node;
            var prevui;
            _.forEach(path.get('nodes'), function(node) {
                var ui = node.ui[slot];
                // If the node has no vertical place yet, its the
                // index of our path.
                if (ui.y === -1) {
                    ui.y = i;
                }
                if (prev_node) {
                    prevui = prev_node.ui[slot];
                }
                // If the node has no horizontal place yet, its the
                // previous node's + its size + space for the edge.
                if (ui.x === -1) {
                    if (prevui) {
                        // XXX: do we need this round? (see also edge.ui.x)
                        ui.x = Math.round(
                            (prevui.x + prevui.dx + settings.edge.dx) * 1000
                        ) / 1000;
                    } else {
                        ui.x = 0;
                    };
                };
                // generate edge and store it on the previous node
                // the vertical position and size of an edge are taken
                // from the target node. Horizontal position and size
                // is queried from source and target node.
                if (prevui) {
                    var edges = _.select(prevui.outgoing, function(edge) {
                        return edge.target === node;
                    });
                    // select returns an array, make sure we have at
                    // most one matching edge
                    if (edges.length > 1) {
                        throw "Duplicate edge - programmer's fault!";
                    }
                    var edge = edges[0];
                    if (edge === undefined) {
                        edge = new Edge({
                            source: prev_node,
                            target: node,
                            ui: {
                                x: prevui.x + prevui.dx,
                                y: prevui.y > ui.y ? prevui.y : ui.y,
                                dx: settings.edge.dx,
                                dy: prevui.dy < ui.dy ? prevui.dy : ui.dy
                            }
                        });
                        prevui.outgoing.push(edge);
                        ui.incoming.push(edge);
                    }
                    edge.paths.push(path);
                };
                prev_node = node;
            });
            i++;
        });
        return allnodes;
    };

    return placeandroute;
});
