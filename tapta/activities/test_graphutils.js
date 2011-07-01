define([
    'require',
    'vendor/qunit.js',
    'vendor/underscore.js',
    './graphutils'
], function(require) {
    module('TaPTa Graph utils');

    var graphutils = require('./graphutils'),
        g = graphutils,
        hsize = g.hsize,
        spaceOut = g.spaceOut;
    delete g;

    var colJoin = graphutils.colJoin;
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

        equal(hsize(sources), opts.hsize, "hsize");

        var paths = graphutils.paths(sources);
        deepEqual(_.map(paths, _.compose(colJoin, pluckId)),
                  opts.paths, "paths are derived");

        vertices = spaceOut(paths);
        deepEqual(map("x.hspace()", vertices), opts.hspace, "hspace");
        deepEqual(map("x.vspace()", vertices), opts.vspace, "vspace");
        deepEqual(map("x.hpos()", vertices), opts.hpos, "hpos");
        deepEqual(map("x.vpos()", vertices), opts.vpos, "vpos");
    };};

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
            hsize: 4,
            hspace: [1,1,1,1,1],
            vspace: [2,1,2,2,1],
            hspace: [1,1,1,1,1],
            vspace: [2,1,2,2,1],
            hpos: [0,1,2,3,1],
            vpos: [0,0,0,0,1],
            paths: ['a:b:d:e',
                    'a:c:d:e'],
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
            hsize: 5,
            hspace: [1,1,1,1,1,1,1,1],
            vspace: [3,1,1,3,3,2,1,1],
            hpos: [0,1,2,3,4,1,2,2],
            vpos: [0,0,0,0,0,1,1,2],
            paths: ["a:b:d:e:h",
                    "a:c:f:e:h",
                    "a:c:g:e:h"],
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
            hsize: 9,
            hspace: [1, 1, 1.25, 2.5, 1.25, 1, 1, 1.25, 1.25, 5.75, 1,
                     1, 1, 1, 1, 5, 5],
            vspace: [6, 6, 3, 1, 2, 6, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            hpos: [0, 1, 2, 3.25, 5.75, 7, 8, 3.25, 4.5, 3.25, 2, 3, 4, 5, 6, 2, 2],
            vpos: [0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 3, 3, 3, 3, 4, 5],
            paths: ["i:a:b:c:d:e:q",
                    "i:a:b:f:g:d:e:q",
                    "i:a:b:n",
                    "i:a:h:j:k:l:m:e:q",
                    "i:a:p:e:q",
                    "i:a:r:e:q"],
            sinks: ['n','q'],
            sources: ['i']
        };
    };

    test("Graph 1", testgraph(graph1()));
    test("Graph 2", testgraph(graph2()));
    test("Graph originial test case but als verts 1/1", testgraph(graph3()));

    return {
        graph1: graph1,
        graph2: graph2,
        graph3: graph3,
        testgraph: testgraph
    };
});
