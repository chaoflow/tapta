define([
    'require',
    'vendor/qunit.js',
    'vendor/underscore.js',
    './graphutils'
], function(require) {
    module('TaPTa Graph utils');

    var graphutils = require('./graphutils');
    var colJoin = graphutils.colJoin;
    var pluckId = graphutils.pluckId;

    test("Very basic tools", function() {
        var list = [{id: 1}, {id: 2}];
        deepEqual(pluckId(list), [1, 2], "pluckId");
        equal(colJoin(pluckId(list)), "1:2", "colJoin(pluckId())");
        equal(_.compose(colJoin, pluckId)(list), "1:2", "composed");
    });

    var testgraph = function(opts) {
        // create vertices from ids in opts.arcs strings
        var vids = _(opts.arcs).chain()
                .map(function(arc) { return arc.split(':'); })
                .flatten()
                .uniq()
                .value();
        var V = _.map(vids, function(id) { return new graphutils.Vertex(id); });

        // generate graph, a list of vertices that know their direct successors
        var graph = graphutils.graph(V, opts.arcs);

        // find sources and sinks of the graph
        var sources = graphutils.sources(graph);
        var sinks = graphutils.sinks(graph);
        deepEqual(pluckId(sources), opts.sources, "sources are found");
        deepEqual(pluckId(sinks), opts.sinks, "sinks are found");

        // reduce to a list of vertices
        var V_ = graphutils.reduce(sources, function(memo, vertex) {
            // XXX: would functional be better? profile it
            // return _.include(memo, vertex) ? memo : memo.concat([vertex]);
            _.include(memo, vertex) || memo.push(vertex);
            return memo;
        }, []);
        var vids_ = pluckId(V_);
        // XXX: introduce test that checks the order
        ok(vids_.length === vids.length
           && _.without.apply(_, [vids_].concat(vids)).length === 0
           && _.intersect(vids_, vids).length === vids.length,
           "vertices are ok");

        var A  = graphutils.arcs(sources);
        var arcs = _.map(A, _.compose(colJoin, pluckId));
        deepEqual(arcs, opts.arcs, "arcs");

        var paths = _.map(
            graphutils.paths(sources),
            _.compose(colJoin, pluckId)
        );
        deepEqual(paths, opts.paths, "paths are derived");
        var paths2 = _.map(
            graphutils.paths2(sources),
            _.compose(colJoin, pluckId)
        );
        deepEqual(paths2, opts.paths, "paths are derived using paths2");
        var paths3 = _.map(
            graphutils.paths2(sources),
            _.compose(colJoin, pluckId)
        );
        deepEqual(paths3, opts.paths, "paths are derived using paths3");
    };

    test("Graph 1", function() {
        var arcs = [
            'a:b','a:c',
            'b:d','d:e',
            'c:d'
        ];

        testgraph({
            // the arcs define the graph
            arcs: arcs,
            // aspects to explicitly check in addition to implicit checks
            paths: ['a:b:d:e',
                    'a:c:d:e'],
            sinks: ['e'],
            sources: ['a']
        });
    });

    test("Graph 2", function() {
        var arcs = [
            'a:b','a:c',
            'b:d',
            'd:e',
            'e:h',
            'c:f','c:g',
            'f:e',
            'g:e'
        ];

        testgraph({
            // the arcs define the graph
            arcs: arcs,
            // aspects to explicitly check in addition to implicit checks
            paths: ["a:b:d:e:h",
                    "a:c:f:e:h",
                    "a:c:g:e:h"],
            sinks: ['h'],
            sources: ['a']
        });
    });    
}); 
