// list all dependencies
define([
    'require',
    'vendor/qunit.js',
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

        var slot = "test";
        var nodes = placeandroute(paths, slot);

        test("Path set 0: all node process order", function() {
            deepEqual(_.map(nodes, function(node) { return node.get('name'); }),
                      ["I", "A", "R", "E", "Q",
                       "H", "J", "K", "L", "M",
                       "B", "F", "G", "D",
                       "P",
                       "N",
                       "C"]);
        });

        var ui = function(node) {
            var res = _.clone(node.ui[slot]);
            delete res.outgoing;
            delete res.incoming;
            return res;
        };

        test("Path set 0: size and position", function() {
            // the blocks are sorted by path
            deepEqual(ui(I), {x:0,    y:0, dx:1,    dy:6}, 'I');
            deepEqual(ui(A), {x:1.5,  y:0, dx:1,    dy:6}, 'A');
            deepEqual(ui(B), {x:3,    y:0, dx:1.75, dy:3}, 'B');
            deepEqual(ui(C), {x:5.25, y:0, dx:3.5,  dy:1}, 'C');
            deepEqual(ui(D), {x:9.25, y:0, dx:1.75, dy:2}, 'D');
            deepEqual(ui(E), {x:11.5, y:0, dx:1,    dy:6}, 'E');
            deepEqual(ui(Q), {x:13,   y:0, dx:1,    dy:6}, 'Q');

            deepEqual(ui(F), {x:5.25, y:1, dx:1.75, dy:1}, 'F');
            deepEqual(ui(G), {x:7.5,  y:1, dx:1.75, dy:1}, 'G');

            deepEqual(ui(N), {x:5.25, y:2, dx:7.25, dy:1}, 'N');

            deepEqual(ui(H), {x:3,    y:3, dx:1.4,  dy:1}, 'H');
            deepEqual(ui(J), {x:4.9,  y:3, dx:1.4,  dy:1}, 'J');
            deepEqual(ui(K), {x:6.8,  y:3, dx:1.4,  dy:1}, 'K');
            deepEqual(ui(L), {x:8.7,  y:3, dx:1.4,  dy:1}, 'L');
            deepEqual(ui(M), {x:10.6, y:3, dx:1.4,  dy:1}, 'M');

            deepEqual(ui(P), {x:3,    y:4, dx:7,    dy:1}, 'P');

            deepEqual(ui(R), {x:3,    y:5, dx:7,    dy:1}, 'R');
        });

        var edges = function(node) {
            res = _.map(node.ui[slot].outgoing, function(edge) {
                return {source: edge.source.get('name'),
                        target: edge.target.get('name')};
            });
            return res;
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
