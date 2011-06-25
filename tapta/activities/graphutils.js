define([
    'require',
    'vendor/underscore.js',
    './functional'
], function(require) {
    ////// generic tools
    var f = require('./functional'),
        extend = f.extend,
        foldl = f.foldl,
        foldl1 = f.foldl1,
        foldr = f.foldr,
        foldr1 = f.foldr1,
        map = f.map,
        scanl = f.scanl,
        scanl1 = f.scanl1,
        scanr = f.scanr,
        scanr1 = f.scanr1;
    delete f;


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

    // a very basic vertex
    var Vertex = function(id) {
        this.id = id;
        this._next = [];
    };
    _(Vertex.prototype).extend({
        next: function() {
            return this._next;
        }
    });

    // A graph can be created by only providing arcs.
    // An arc references its head and tail vertices by id. It can be
    // provided as a string "id1:id2" or tuple list ["id1", "id2"].
    // A very basic vertex implementation will be used to create all
    // referenced vertices. A list of all vertices is returned.
    var graph = function(arcs) {
        // A is list of strings, let's get a list of tuples
        arcs = map("x.split(':')", arcs);
        // all vertex ids, seen in arcs
        var vids = _(arcs).chain().flatten().uniq().value(),
            vertices = map(function(id) { return new Vertex(id); }, vids),
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

    return {
        Vertex: Vertex,
        arcs: arcs,
        colJoin: colJoin,
        graph: graph,
        paths: paths,
        pluckId: pluckId,
        reduce: reduce,
        sinks: sinks,
        sources: sources
    };
});
