define([
    'require',
    'vendor/underscore.js',
    './functional'
], function(require) {
    require('./functional').install();

    // join items of a list with columns
    var colJoin = function(list) {
        return list.join(':');
    };

    // turn a list of items into a list of their ids
    var pluckId = function(list) {
        if (!(list instanceof Array)) { return list.id; }
        return _.map(list, function(item) {
            return pluckId(item);
        });
    };


    ////// defining graphs

    // XXX: make portions of this reusable for inheritance
    var Vertex = function(attrs) {
        this.id = attrs && attrs.id;
        this._geometry = {};
        this._minwidth = 1;
        this._minheight = 1;
        this._next = [];
    };
    _(Vertex.prototype).extend({
        setGeometry: function(obj) {
            _.extend(this._geometry, obj);
        }
    });
    Object.defineProperties(Vertex.prototype, {
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
    var arcs = function(vertices) {
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
    var paths = function(vertices) {
        // edge case: return list containing one empty path
        if (vertices.length === 0) return [];
        var x = vertices.slice(0,1)[0],
            xs = vertices.slice(1),
            tails = paths(x.next);
        return map('[this.x].concat(path)', tails.length ? tails : [[]], {x:x})
            .concat(paths(xs));
    };

    // the maximum minwidth of the paths seen from srcs
    // vertices have variable width
    var minwidth = function(sources) {
        // enable calling on a single vertex
        if (sources.length === undefined) sources = [sources];
        switch (sources.length) {
        case 0: return 0;
        case 1: return sources[0].minwidth + minwidth(sources[0].next);
        default: return maximum(map(minwidth, sources));
        }
    };
    var path_minwidth = function(path) {
        return sum(map("vertex.minwidth", path));
    };

    var path_minheight = function(path) {
        return maximum(map("vertex.minheight", path));
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
    var spaceOut = function    (paths, hpad, vpad) {
        // minwidth of longest path in the sense of space required, not item-wise
        var maxminwidth = maximum(map(path_minwidth, paths)),
            longest, lidx,
            orig_paths = paths;
        paths = map(function(p) {
            return _.extend(p.slice(), {h_avail: maxminwidth});
        }, orig_paths);
        while (paths.length > 0) {
            // longest path and other paths
            longest = foldl1(function(acc, p) { return acc < p ? p : acc; }, paths);
            lidx = _.indexOf(paths, longest);
            if (lidx == -1) throw "Deep shit!";
            paths.splice(lidx, 1);
            var hadd = (longest.h_avail - path_minwidth(longest)) / longest.length;
            _.each(longest, function(vertex) {
                var vadd = 0,
                    width = vertex.minwidth + hadd,
                    height = vertex.minheight,
                    seen = false;
                longest.h_avail -= width;
                _.each(paths, function(path, idx) {
                    if (_.include(path, vertex)) {
                        seen = true;
                        height += path_minheight(path) + vadd;
                        vadd = 0;
                        path.splice(_.indexOf(path, vertex),1);
                        path.h_avail -= width;
                    } else if (seen && path.slice(-1) !== longest.slice(-1)) {
                        vadd = path_minheight(path);
                    }
                });
                // XXX: manage to set width, height and x, y in one call
                vertex.setGeometry({width: width, height: height});
            });
            // we are using floats...
            var emargin = 0.00001;
            if (longest.h_avail > emargin) throw "Unallocated space left!";
            for (var i = paths.length-1; i >= 0; i--) {
                if (paths[i].length === 0) {
                    if (paths[i].h_avail > emargin) throw "Unallocated space left";
                    paths[i].length || delete paths[i];
                }
            }
        }
        // set positions
        var cache = {};
        var rval = [];
        _.each(orig_paths, function(path, path_idx) {
            var x = 0;
            _.each(path, function(vertex) {
                if (!cache[vertex.id]) {
                    // XXX: manage to set width, height and x, y in one call
                    vertex.setGeometry({x: x, y: path_idx});
                    rval.push(vertex);
                }
                cache[vertex.id] = true;
                x += vertex.width;
            });
        });
        return rval;
    };

    return {
        Vertex: Vertex,
        arcs: arcs,
        colJoin: colJoin,
        graph: graph,
        minwidth: minwidth,
        paths: paths,
        pluckId: pluckId,
        reduce: reduce,
        sinks: sinks,
        sources: sources,
        spaceOut: spaceOut
    };
});
