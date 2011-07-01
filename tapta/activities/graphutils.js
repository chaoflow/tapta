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

    var Vertex = function(attrs) {
        this._space = {};
        this.id = attrs.id;
        this._hsize = 1;
        this._vsize = 1;
        this._next = [];
    };
    _(Vertex.prototype).extend({
        hsize: function() {
            return this._hsize;
        },
        vsize: function() {
            return this._vsize;
        },
        hpos: function() {
            return this._space.hpos;
        },
        vpos: function() {
            return this._space.vpos;
        },
        hspace: function() {
            return this._space.hspace;
        },
        vspace: function() {
            return this._space.vspace;
        },
        next: function() {
            return this._next;
        },
        setSpace: function(obj) {
            _.extend(this._space, obj);
        }
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
            cache[arc[0]].next().push(cache[arc[1]]);
        });
        return vertices;
    };


    ////// working with graphs

    // a recursive reduce
    // walk the graph from given vertices reducing it with func and memo
    var reduce = function(vertices, func, memo) {
        return _.reduce(vertices, function(memo, vertex) {
            return reduce(vertex.next(), func, func(memo, vertex));
        }, memo);
    };

    // return uniq list of arcs seen while walking the graph along the
    // paths starting at vertices.
    var arcs = function(vertices) {
        return reduce(vertices, function(memo, vertex) {
            if (vertex.next().length === 0) { return memo; }
            return _.reduce(vertex.next(), function(memo, next) {
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
    //             _.map(paths(vertex.next()), function(path) {
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
    //         paths(x.next()),
    //         function(path) { return [x].concat(path); }
    //     ).concat(paths2(xs));
    // };

    // return all paths starting with the given vertices
    var paths = function(vertices) {
        // edge case: return list containing one empty path
        if (vertices.length === 0) return [];
        var x = vertices.slice(0,1)[0],
            xs = vertices.slice(1),
            tails = paths(x.next());
        return map('[this.x].concat(path)', tails.length ? tails : [[]], {x:x})
            .concat(paths(xs));
    };

    // the maximum hsize of the paths seen from srcs
    // vertices have variable width
    var hsize = function(sources) {
        // enable calling on a single vertex
        if (sources.length === undefined) sources = [sources];
        switch (sources.length) {
        case 0: return 0;
        case 1: return sources[0].hsize() + hsize(sources[0].next());
        default: return maximum(map(hsize, sources));
        }
    };
    var pathHSize = function(path) {
        return sum(map("vertex.hsize()", path));
    };

    var pathVSize = function(path) {
        return maximum(map("vertex.vsize()", path));
    };

    // find sinks, vertices not referencing other vertices, outdegree = 0
    var sinks = function(vertices) {
        return _(vertices).select(function(vertex) {
            return vertex.next().length === 0;
        });
    };

    // find sources, vertices not referenced by other vertices, indegree = 0
    var sources = function(vertices) {
        var referenced = _(vertices).chain()
                .map(function(vertex) { return vertex.next(); })
                .flatten()
                .value();
        // a bit weird syntax that is: this, arguments
        return _.without.apply(_, [vertices].concat(referenced));
    };

    // allocate space to the vertices
    var spaceOut = function    (paths, hpad, vpad) {
        // hsize of longest path in the sense of space required, not item-wise
        var maxhsize = maximum(map(pathHSize, paths)),
            longest, lidx,
            orig_paths = paths;
        paths = map(function(p) {
            return _.extend(p.slice(), {h_avail: maxhsize});
        }, orig_paths);
        while (paths.length > 0) {
            // longest path and other paths
            longest = foldl1(function(acc, p) { return acc < p ? p : acc; }, paths);
            lidx = _.indexOf(paths, longest);
            if (lidx == -1) throw "Deep shit!";
            paths.splice(lidx, 1);
            var hadd = (longest.h_avail - pathHSize(longest)) / longest.length;
            _.each(longest, function(vertex) {
                var vadd = 0,
                    hspace = vertex.hsize() + hadd,
                    vspace = vertex.vsize(),
                    seen = false;
                longest.h_avail -= hspace;
                _.each(paths, function(path, idx) {
                    if (_.include(path, vertex)) {
                        seen = true;
                        vspace += pathVSize(path) + vadd;
                        vadd = 0;
                        path.splice(_.indexOf(path, vertex),1);
                        path.h_avail -= hspace;
                    } else if (seen && path.slice(-1) !== longest.slice(-1)) {
                        vadd = pathVSize(path);
                    }
                });
                vertex.setSpace({hspace: hspace, vspace: vspace});
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
        _.each(orig_paths, function(path, pidx) {
            var hpos = 0;
            _.each(path, function(vertex) {
                if (!cache[vertex.id]) {
                    vertex.setSpace({hpos: hpos, vpos: pidx});
                    rval.push(vertex);
                }
                cache[vertex.id] = true;
                hpos += vertex.hspace();
            });
        });
        return rval;
    };

    return {
        Vertex: Vertex,
        arcs: arcs,
        colJoin: colJoin,
        graph: graph,
        hsize: hsize,
        paths: paths,
        pluckId: pluckId,
        reduce: reduce,
        sinks: sinks,
        sources: sources,
        spaceOut: spaceOut
    };
});
