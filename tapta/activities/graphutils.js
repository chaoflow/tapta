// limitations:
//  - common prefxies need to be adjacent
//  - adjacent suffixes may be separated by paths with different final node
//  - only vertical element size of 1
define([
    'require',
    'vendor/underscore.js',
    './debug',
    './functional'
], function(require) {
    var DEBUG = require('./debug');
    require('./functional').install();

    // join items of a list with columns
    var colJoin = function(list) {
        return list.join(':');
    };
    var commaJoin = function(list) {
        return list.join(', ');
    };

    // turn a list of items into a list of their ids
    var pluckId = function(list) {
        if (!(list instanceof Array)) { return list.id; }
        return _.map(list, function(item) {
            return pluckId(item);
        });
    };


    ////// defining graphs

    // XXX: not yet working
    // var GraphElement = function() {
    //     this._geometry = {};
    //     this._minwidth = 1;
    //     this._minheight = 1;
    // };
    // _(GraphElement.prototype).extend({
    //     setGeometry: function(obj) {
    //         _.extend(this._geometry, obj);
    //     }
    // });
    // Object.defineProperties(GraphElement.prototype, {
    //     minwidth: { get: function() { return this._minwidth; } },
    //     minheight: { get: function() { return this._minheight; } },
    //     next: { get: function() { return this._next; } },
    //     x: { get: function() { return this._geometry.x; } },
    //     y: { get: function() { return this._geometry.y; } },
    //     width: { get: function() { return this._geometry.width;} },
    //     height: { get: function() { return this._geometry.height; } }
    // });


    // XXX: make portions of this reusable for inheritance
    var Vertex = function(attrs) {
        this.id = this.cid = attrs && attrs.id;
        this._next = [];
        this._geometry = {};
        this._minwidth = 1;
        this._minheight = 1;
        this.predecessors = [];
        this.successors = [];
    };
    _(Vertex.prototype).extend({
        setGeometry: function(obj) {
            _.extend(this._geometry, obj);
        }
    });
    Object.defineProperties(Vertex.prototype, {
        geometry: {get: function() { return this._geometry; }},
        minwidth: { get: function() { return this._minwidth; } },
        minheight: { get: function() { return this._minheight; } },
        next: { get: function() { return this._next; } },
        x: { get: function() { return this._geometry.x; } },
        y: { get: function() { return this._geometry.y; } },
        width: { get: function() { return this._geometry.width;} },
        height: { get: function() { return this._geometry.height; } }
    });

    var Arc = function(source, target) {
        this.id = this.cid = [source.cid, target && target.cid].join(':');
        this.source = source;
        this.target = target;
        this._geometry = {};
        this._minwidth = 1;
        this._minheight = 1;
        this.predecessors = [];
        this.successors = [];
    };
    _(Arc.prototype).extend({
        setGeometry: function(obj) {
            _.extend(this._geometry, obj);
        }
    });
    Object.defineProperties(Arc.prototype, {
        geometry: {get: function() { return this._geometry; }},
        minwidth: { get: function() { return this._minwidth; } },
        minheight: { get: function() { return this._minheight; } },
        next: { get: function() { return this._next; } },
        x: { get: function() { return this._geometry.x; } },
        y: { get: function() { return this._geometry.y; } },
        width: { get: function() { return this._geometry.width;} },
        height: { get: function() { return this._geometry.height; } }
    });

    // A graph can be created by only providing arcs.
    // An arc references its head and tail vertices by id. It can be
    // provided as a string "id1:id2" or tuple list ["id1", "id2"].
    // A very basic vertex implementation will be used to create all
    // referenced vertices. A list of all vertices is returned.
    var graph = function(arcs, VertexProto) {
        VertexProto = VertexProto || Vertex;
        // A is list of strings, let's get a list of tuples
        arcs = map("x.split(':')", arcs);
        // all vertex ids, seen in arcs
        var vids = _(arcs).chain().flatten().uniq().value(),
            vertices = map(function(id) { return new VertexProto({id:id}); }, vids),
            cache = foldl("acc,x -> (acc[x.id] = x) && acc", {}, vertices);
        _.each(arcs, function(arc) {
            cache[arc[0]].next.push(cache[arc[1]]);
        });
        return vertices;
    };


    ////// working with graphs

    // a recursive reduce
    // walk the graph from given vertices reducing it with func and memo
    var reduce = function(vertices, func, memo) {
        return _.reduce(vertices, function(memo, vertex) {
            return reduce(vertex.next, func, func(memo, vertex));
        }, memo);
    };

    // return uniq list of arcs seen while walking the graph along the
    // paths starting at vertices.
    // If arcstorage is defined, it will always return the same arc objects.
    // XXX: broken, arcstorage needs to be implemented
    var arcs = function(vertices, arcstorage) {
        return reduce(vertices, function(memo, vertex) {
            if (vertex.next.length === 0) return memo;
            return _.reduce(vertex.next, function(memo, next) {
                return _.some(memo, function(arc) {
                    return arc[0] === vertex
                        && arc[1] === next;
                }) ? memo : memo.concat([[vertex, next]]);
            }, memo);
        }, []);
    };

    // // return all paths starting with the given vertices
    // var paths = function(vertices) {
    //     // edge case: return list containing one empty path
    //     if (vertices.length === 0) return [[]];
    //     return _.reduce(vertices, function(memo, vertex) {
    //         return memo.concat(
    //             _.map(paths(vertex.next), function(path) {
    //                 return [vertex].concat(path);
    //             })
    //         );
    //     }, []);
    // };

    // alternative implementation
    // return all paths starting with the given vertices
    // var paths2 = function(vertices) {
    //     // edge case: return list containing one empty path
    //     if (vertices.length === 0) return [];
    //     var x = vertices.slice(0,1)[0];
    //     var xs = vertices.slice(1);
    //     return _.map(
    //         paths(x.next),
    //         function(path) { return [x].concat(path); }
    //     ).concat(paths2(xs));
    // };

    // return all paths starting with the given vertices
    // a path consist of graphelements (vertices and arcs)
    // XXX: maybe rename vertices to sources here
    // algorithm in action:
    // A.next = [B, C], B.next = [D], C.next = [D]
    // --> [[A, AB, B, BD, D],
    //      [A, AC, C, CD, D]]
    // x = D, tails = [[]]
    // --> [D]
    // x = B, tails = [D]
    // --> [B, BD, D]
    // ...
    var paths = function(vertices, arcstorage) {
        // If arcstorage is defined, it will use it to return always
        // the same arc objects.
        // edge case: return list containing one empty path
        if (arcstorage === undefined) arcstorage = {};
        if (vertices.length === 0) return [];
        var x = vertices.slice(0,1)[0],
            xs = vertices.slice(1),
            tails = paths(x.next, arcstorage);
        if (tails.length === 0) tails = [[]];
        return map(function(tail) {
            var res = [x];
            // If there is a tail, create an Arc from x to it
            if (tail.length) {
                var arcid = [x.cid, tail[0].cid].join(':'),
                    arc = arcstorage && arcstorage[arcid];
                arc = arc || new Arc(x, tail[0]);
                if (arcstorage) arcstorage[arcid] = arc;
                res.push(arc);
            }
            res = res.concat(tail);
            return res;
        }, tails).concat(paths(xs, arcstorage));
    };

    // XXX: broken, as it does not account for arcs
    // the maximum minwidth of the paths seen from srcs
    // vertices have variable width
    // var minwidth = function(sources) {
    //     // enable calling on a single vertex
    //     if (sources.length === undefined) sources = [sources];
    //     switch (sources.length) {
    //     case 0: return 0;
    //     case 1: return sources[0].minwidth + minwidth(sources[0].next);
    //     default: return maximum(map(minwidth, sources));
    //     }
    // };
    var path_minwidth = function(path) {
        return sum(map("graphelement.minwidth", path));
    };

    var path_minheight = function(path) {
        return maximum(map("graphelement.minheight", path));
    };

    // find sinks, vertices not referencing other vertices, outdegree = 0
    var sinks = function(vertices) {
        return _(vertices).select(function(vertex) {
            return vertex.next.length === 0;
        });
    };

    // find sources, vertices not referenced by other vertices, indegree = 0
    var sources = function(vertices) {
        var referenced = _(vertices).chain()
                .map(function(vertex) { return vertex.next; })
                .flatten()
                .value();
        // a bit weird syntax that is: this, arguments
        return _.without.apply(_, [vertices].concat(referenced));
    };

    // allocate space to the vertices
    var spaceOut = function    (paths, vpad) {
        DEBUG.spaceout && console.group("spaceout");
        // minwidth of longest path in the sense of space required, not item-wise
        var maxminwidth = maximum(map(path_minwidth, paths)),
            longest, lidx,
            orig_paths = paths;
        paths = map(function(p) {
            return _.extend(p.slice(), {width_avail: maxminwidth});
        }, orig_paths);
        while (paths.length > 0) {
            // longest path and other paths
            longest = foldl1(function(acc, p) { return acc < p ? p : acc; }, paths);
            lidx = _.indexOf(paths, longest);
            if (lidx == -1) throw "Deep shit!";
            paths.splice(lidx, 1);
            var width_add = (longest.width_avail - path_minwidth(longest))
                    / longest.length;
            _.each(longest, function(graphelement) {
                var height_add = 0,
                    width = graphelement.minwidth + width_add,
                    height = graphelement.minheight,
                    seen = false;
                longest.width_avail -= width;
                _.each(paths, function(path, idx) {
                    if (_.include(path, graphelement)) {
                        seen = true;
                        height += path_minheight(path) + height_add + vpad;
                        height_add = 0;
                        path.splice(_.indexOf(path, graphelement),1);
                        path.width_avail -= width;
                    } else if (seen && path.slice(-1) !== longest.slice(-1)) {
                        height_add = path_minheight(path) + vpad;
                    }
                });
                // XXX: manage to set width, height and x, y in one call
                graphelement.setGeometry({width: width, height: height});
                DEBUG.spaceout && console.log([
                    "size:",
                    graphelement.cid, width, height
                ]);
            });
            // we are using floats...
            var emargin = 0.00001;
            if (longest.width_avail > emargin) throw "Unallocated space left!";
            for (var i = paths.length-1; i >= 0; i--) {
                if (paths[i].length === 0) {
                    if (paths[i].width_avail > emargin) throw "Unallocated space left";
                    paths[i].length || delete paths[i];
                }
            }
        }
        // set positions
        var cache = {};
        var rval = [];
        _.each(orig_paths, function(path, path_idx) {
            var x = 0,
                prev_ge;
            _.each(path, function(graphelement) {
                if (!cache[graphelement.cid]) {
                    // XXX: manage to set width, height and x, y in one call
                    graphelement.setGeometry({x: x, y: path_idx * (1 + vpad)});
                    rval.push(graphelement);
                    DEBUG.spaceout && console.log([
                        "pos:",
                        graphelement.cid, x, path_idx
                    ]);
                }
                cache[graphelement.cid] = true;
                x += graphelement.width;
                if (prev_ge) {
                    prev_ge.successors.push(graphelement);
                    graphelement.predecessors.push(prev_ge);
                }
                prev_ge = graphelement;
            });
        });
        DEBUG.spaceout && console.groupEnd();
        return rval;
    };

    return {
        Arc: Arc,
        Vertex: Vertex,
        arcs: arcs,
        colJoin: colJoin,
        commaJoin: commaJoin,
        graph: graph,
//        minwidth: minwidth,
        paths: paths,
        pluckId: pluckId,
        reduce: reduce,
        sinks: sinks,
        sources: sources,
        spaceOut: spaceOut
    };
});
