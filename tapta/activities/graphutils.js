define([
    'require',
    'vendor/underscore.js'
], function(require) {
    ////// generic tools

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


    ////// defining a graph

    // define a graph via vertices and arcs:
    // - vertices: list of objects having ids
    // - arcs: list of "id1:id2" strings
    // returns the list of all vertices
    var graph = function(vertices, arcs) {
        // scan all vertices and remember by id
        var cache = _.reduce(vertices, function(memo, vertex) {
            memo[vertex.id] = vertex;
            return memo;
        }, {});
        // connect vertices according to arc strings
        _.each(arcs, function(arc) {
            var head = arc.split(':')[0];
            var tail = arc.split(':')[1];
            cache[head].next().push(cache[tail]);
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
    
    // return all paths starting with the given vertices
    var paths = function(vertices) {
        // edge case: return list containing one empty path
        if (vertices.length === 0) return [[]];
        return _.reduce(vertices, function(memo, vertex) {
            return memo.concat(
                _.map(paths(vertex.next()), function(path) {
                    return [vertex].concat(path);
                })
            );
        }, []);
    };

    // alternative implementation
    // return all paths starting with the given vertices
    var paths2 = function(vertices) {
        // edge case: return list containing one empty path
        if (vertices.length === 0) return [];
        var x = vertices.slice(0,1)[0];
        var xs = vertices.slice(1);
        return _.map(
            paths(x.next()),
            function(path) { return [x].concat(path); }
        ).concat(paths2(xs));
    };

    // yaa using functional.js
    // return all paths starting with the given vertices
    var paths3 = function(vertices) {
        // edge case: return list containing one empty path
        if (vertices.length === 0) return [];
        var x = vertices.slice(0,1)[0];
        var xs = vertices.slice(1);
        return map('[x].concat(_)', paths(x.next())).concat(paths3(xs));
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
        arcs: arcs,
        colJoin: colJoin,
        graph: graph,
        paths: paths,
        paths2: paths2,
        paths3: paths3,
        pluckId: pluckId,
        reduce: reduce,
        sinks: sinks,
        sources: sources
    };
});
