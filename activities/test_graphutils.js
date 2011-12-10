define([
    'require',
    'vendor/qunit.js',
    'vendor/underscore.js',
    './graphutils'
], function(require) {
    module('TaPTa Graph utils');

    var graphutils = require('./graphutils'),
        g = graphutils,
        minwidth = g.minwidth,
        spaceOut = g.spaceOut;
    delete g;

    var colJoin = graphutils.colJoin;
    var commaJoin = graphutils.commaJoin;
    var pluckId = graphutils.pluckId;

    test("Very basic tools", function() {
        var list = [{id: 1}, {id: 2}];
        deepEqual(pluckId(list), [1, 2], "pluckId");
        equal(colJoin(pluckId(list)), "1:2", "colJoin(pluckId())");
        equal(_.compose(colJoin, pluckId)(list), "1:2", "composed");
    });

    var testgraph = function(opts) { return function() {
        var graph = graphutils.graph(opts.arcs, opts.Vertex);

        // find sources and sinks of the graph
        var sources = graphutils.sources(graph);
        var sinks = graphutils.sinks(graph);
        deepEqual(pluckId(sources), opts.sources, "sources are found");
        deepEqual(pluckId(sinks), opts.sinks, "sinks are found");

        var A  = graphutils.arcs(sources);
        var arcs = _.map(A, _.compose(colJoin, pluckId));
        deepEqual(arcs, opts.arcs, "arcs");

//        equal(minwidth(sources), opts.minwidth, "minwidth");

        var paths = graphutils.paths(sources);
        deepEqual(_.map(paths, _.compose(commaJoin, pluckId)),
                  opts.paths, "paths are derived");

        vertices = spaceOut(paths, 0);
        deepEqual(map("vertex.width", vertices), opts.width, "width");
        deepEqual(map("vertex.height", vertices), opts.height, "height");
        deepEqual(map("vertex.x", vertices), opts.x, "x");
        deepEqual(map("vertex.y", vertices), opts.y, "y");
    };};

    var graph_initfin = function(VertexProto) {
        var arcs = ["a:b"];

        return {
            // the arcs define the graph
            arcs: arcs,
            Vertex: VertexProto,
            // aspects to explicitly check in addition to implicit checks
            minwidth: 2,
            width: [1,1,1],
            height: [1,1,1],
            x: [0,1,2],
            y: [0,0,0],
            paths: ['a, a:0:b, b'],
            sinks: ['b'],
            sources: ['a']
        };
    };

    var graph_initfin2 = function(VertexProto) {
        var arcs = ["a:b",
                    "c:d"];

        return {
            // the arcs define the graph
            arcs: arcs,
            Vertex: VertexProto,
            // aspects to explicitly check in addition to implicit checks
            minwidth: 2,
            width: [1,1,1,1,1,1],
            height: [1,1,1,1,1,1],
            x: [0,1,2,0,1,2],
            y: [0,0,0,1,1,1],
            paths: ['a, a:0:b, b',
                    'c, c:0:d, d'],
            sinks: ['b','d'],
            sources: ['a','c']
        };
    };

    var graph1 = function(VertexProto) {
        var arcs = [
            'a:b','a:c',
            'b:d','d:e',
            'c:d'
        ];

        return {
            // the arcs define the graph
            arcs: arcs,
            Vertex: VertexProto,
            // aspects to explicitly check in addition to implicit checks
            minwidth: 4,
            width: [1,1,1,1,1,1,1,1,1,1],
            height: [2,1,1,1,2,2,2,1,1,1],
            x: [0,1,2,3,4,5,6,1,2,3],
            y: [0,0,0,0,0,0,0,1,1,1],
            paths: ['a, a:0:b, b, b:0:d, d, d:0:e, e',
                    'a, a:1:c, c, c:0:d, d, d:0:e, e'],
            sinks: ['e'],
            sources: ['a']
        };
    };

    var graph2 = function(VertexProto) {
        var arcs = [
            'a:b','a:c',
            'b:d',
            'd:e',
            'e:h',
            'c:f','c:g',
            'f:e',
            'g:e'
        ];

        return {
            // the arcs define the graph
            arcs: arcs,
            Vertex: VertexProto,
            // aspects to explicitly check in addition to implicit checks
            minwidth: 5,
            width: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            height: [3,1,1,1,1,1,3,3,3,2,2,1,1,1,1,1,1],
            x: [0,1,2,3,4,5,6,7,8,1,2,3,4,5,3,4,5],
            y: [0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2,2],
            paths: ["a, a:0:b, b, b:0:d, d, d:0:e, e, e:0:h, h",
                    "a, a:1:c, c, c:0:f, f, f:0:e, e, e:0:h, h",
                    "a, a:1:c, c, c:1:g, g, g:0:e, e, e:0:h, h"],
            sinks: ['h'],
            sources: ['a']
        };
    };

    var graph3 = function(VertexProto) {
        var arcs = [
            'i:a',
            'a:b','a:h','a:p','a:r',
            'b:c','b:f','b:n',
            'c:d',
            'd:e',
            'e:q',
            'f:g',
            'g:d',
            'h:j',
            'j:k',
            'k:l',
            'l:m',
            'm:e',
            'p:e',
            'r:e'
        ];

        return {
            // the arcs define the graph
            arcs: arcs,
            Vertex: VertexProto,
            // aspects to explicitly check in addition to implicit checks
            minwidth: 9,
            width: [1, 1, 1.25, 2.5, 1.25, 1, 1, 1.25, 1.25, 5.75, 1,
                     1, 1, 1, 1, 5, 5],
            height: [6, 6, 3, 1, 2, 6, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            x: [0, 1, 2, 3.25, 5.75, 7, 8, 3.25, 4.5, 3.25, 2, 3, 4, 5, 6, 2, 2],
            y: [0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 3, 3, 3, 3, 4, 5],
            paths: ["i, i:0:a, a, a:0:b, b, b:0:c, c, c:0:d, d, d:0:e, e, e:0:q, q",
                    "i, i:0:a, a, a:0:b, b, b:1:f, f, f:0:g, g, g:0:d, d, d:0:e, e, e:0:q, q",
                    "i, i:0:a, a, a:0:b, b, b:2:n, n",
                    "i, i:0:a, a, a:1:h, h, h:0:j, j, j:0:k, k, k:0:l, l, l:0:m, m, m:0:e, e, e:0:q, q",
                    "i, i:0:a, a, a:2:p, p, p:0:e, e, e:0:q, q",
                    "i, i:0:a, a, a:3:r, r, r:0:e, e, e:0:q, q"],
            sinks: ['n','q'],
            sources: ['i']
        };
    };

    test("Graph: initial - final", testgraph(graph_initfin()));
    test("Graph: initial - final 2", testgraph(graph_initfin2()));
    test("Graph 1", testgraph(graph1()));
    test("Graph 2", testgraph(graph2()));
    test("Graph originial test case but als verts 1/1", testgraph(graph3()));

    return {
        graph_initfin: graph_initfin,
        graph_initfin2: graph_initfin2,
        graph1: graph1,
        graph2: graph2,
        graph3: graph3,
        testgraph: testgraph
    };
});
