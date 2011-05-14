// list all dependencies
define([
    'require',
    'cdn/qunit.js',
    './model',
    './placeandroute'
], function(require) {
    // dependencies we need a handle for
    var placeandroute = require('./placeandroute');
    var model = require('./model');
    
    module('Place and route');

    var path_set_0 = function() {
        var A = new model.ForkJoin({name: 'A'});
        var B = new model.DecMer({name: 'B'});
        var C = new model.Action({name: 'C'});
        var D = new model.DecMer({name: 'D'});
        var E = new model.ForkJoin({name: 'E'});
        var F = new model.Action({name: 'F'});
        var G = new model.Action({name: 'G'});
        var H = new model.Action({name: 'H'});
        var I = new model.Initial({name: 'I'});
        var J = new model.Action({name: 'J'});
        var K = new model.Action({name: 'K'});
        var L = new model.Action({name: 'L'});
        var M = new model.Action({name: 'M'});
        var N = new model.Final({name: 'N'});
        var P = new model.Action({name: 'P'});
        var Q = new model.Final({name: 'Q'});
        var R = new model.Action({name: 'R', x_req: 7});

        // build paths
        var paths = new model.Paths();
        paths.add(new model.Path({
            nodes: [I, A, B, C, D, E, Q]
        }));
        paths.add(new model.Path({
            nodes: [I, A, B, F, G, D, E, Q]
        }));
        paths.add(new model.Path({
            nodes: [I, A, B, N]
        }));
        paths.add(new model.Path({
            nodes: [I, A, H, J, K, L, M, E, Q]
        }));
        paths.add(new model.Path({
            nodes: [I, A, P, E, Q]
        }));
        paths.add(new model.Path({
            nodes: [I, A, R, E, Q]
        }));

        var nodes = placeandroute(paths);

        test("Path set 0: all node process order", function() {
            deepEqual(_.map(nodes, function(node) { return node.get('name'); }),
                      ["I", "A", "R", "E", "Q",
                       "H", "J", "K", "L", "M",
                       "B", "F", "G", "D",
                       "P",
                       "N",
                       "C"]);
        });

        test("Path set 0: sizes", function() {
            // call place and route

            // check size of nodes - the blocks are sorted by path
            deepEqual(I.ui.size, {x:1, y:6}, 'I size');
            deepEqual(A.ui.size, {x:1, y:6}, 'A size');
            deepEqual(B.ui.size, {x:1.75, y:3}, 'B size');
            deepEqual(C.ui.size, {x:3.5, y:1}, 'C size');
            deepEqual(D.ui.size, {x:1.75, y:2}, 'D size');
            deepEqual(E.ui.size, {x:1, y:6}, 'E size');
            deepEqual(Q.ui.size, {x:1, y:6}, 'Q size');

            deepEqual(F.ui.size, {x:1.75, y:1}, 'F size');
            deepEqual(G.ui.size, {x:1.75, y:1}, 'G size');

            deepEqual(N.ui.size, {x:7.25, y:1}, 'N size');

            deepEqual(H.ui.size, {x:1.4, y:1}, 'H size');
            deepEqual(J.ui.size, {x:1.4, y:1}, 'J size');
            deepEqual(K.ui.size, {x:1.4, y:1}, 'K size');
            deepEqual(L.ui.size, {x:1.4, y:1}, 'L size');
            deepEqual(M.ui.size, {x:1.4, y:1}, 'M size');

            deepEqual(P.ui.size, {x:7, y:1}, 'P size');

            deepEqual(R.ui.size, {x:7, y:1}, 'R size');
        });

        test("Path set 0: positions", function() {
            // check position of nodes - the blocks are sorted by path
            deepEqual(I.ui.pos, {x:0, y:0}, 'I pos');
            deepEqual(A.ui.pos, {x:1, y:0}, 'A pos');
            deepEqual(B.ui.pos, {x:2, y:0}, 'B pos');
            deepEqual(C.ui.pos, {x:3.75, y:0}, 'C pos');
            deepEqual(D.ui.pos, {x:7.25, y:0}, 'D pos');
            deepEqual(E.ui.pos, {x:9, y:0}, 'E pos');
            deepEqual(Q.ui.pos, {x:10, y:0}, 'Q pos');

            deepEqual(F.ui.pos, {x:3.75, y:1}, 'F pos');
            deepEqual(G.ui.pos, {x:5.5, y:1}, 'G pos');

            deepEqual(N.ui.pos, {x:3.75, y:2}, 'N pos');

            deepEqual(H.ui.pos, {x:2, y:3}, 'H pos');
            deepEqual(J.ui.pos, {x:3.4, y:3}, 'J pos');
            deepEqual(K.ui.pos, {x:4.8, y:3}, 'K pos');
            deepEqual(L.ui.pos, {x:6.2, y:3}, 'L pos');
            deepEqual(M.ui.pos, {x:7.6, y:3}, 'M pos');

            deepEqual(P.ui.pos, {x:2, y:4}, 'P pos');

            deepEqual(R.ui.pos, {x:2, y:5}, 'R pos');
        });

        var edges = function(node) {
            return _.map(node.ui.edges, function(edge) {
                return {source: edge.source.get('name'),
                        target: edge.target.get('name')};
            });
        };

        test("Path set 0: edges", function() {
            deepEqual(edges(I), [
                {"source": "I", "target": "A"}
            ], 'I edges');
            deepEqual(edges(A), [
                {"source": "A", "target": "B"},
                {"source": "A", "target": "H"},
                {"source": "A", "target": "P"},
                {"source": "A", "target": "R"},
            ], 'A edges');
            deepEqual(edges(B), [
                {"source": "B", "target": "C"},
                {"source": "B", "target": "F"},
                {"source": "B", "target": "N"},
            ], 'B edges');
            deepEqual(edges(C), [
                {"source": "C", "target": "D"},
            ], 'C edges');
            deepEqual(edges(D), [
                {"source": "D", "target": "E"}
            ], 'D edges');
            deepEqual(edges(E), [
                {"source": "E", "target": "Q"},
            ], 'E edges');
            deepEqual(edges(F), [
                {"source": "F", "target": "G"},
            ], 'F edges');
            deepEqual(edges(G), [
                {"source": "G", "target": "D"},
            ], 'G edges');
            deepEqual(edges(H), [
                {"source": "H", "target": "J"},
            ], 'H edges');
            deepEqual(edges(J), [
                {"source": "J", "target": "K"},
            ], 'J edges');
            deepEqual(edges(K), [
                {"source": "K", "target": "L"},
            ], 'K edges');
            deepEqual(edges(L), [
                {"source": "L", "target": "M"},
            ], 'L edges');
            deepEqual(edges(M), [
                {"source": "M", "target": "E"},
            ], 'M edges');
            deepEqual(edges(N), [
            ], 'N edges');
            deepEqual(edges(P), [
                {"source": "P", "target": "E"},
            ], 'P edges');
            deepEqual(edges(Q), [
            ], 'Q edges');
            deepEqual(edges(R), [
                {"source": "R", "target": "E"},
            ], 'R edges');
        });
    };

    path_set_0();
});
