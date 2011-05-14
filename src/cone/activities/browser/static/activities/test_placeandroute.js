// list all dependencies
define([
    'require',
    'cdn/qunit.js',
    './settings',
    './placeandroute',
    './model'
], function(require) {
    // dependencies we need a handle for
    var placeandroute = require('./placeandroute');
    var model = require('./model');
    
    module('Place and route');

    test("Path set 0", function() {
        var A = new model.ForkJoin({name: 'A'});
        var B = new model.DecisionMerge({name: 'B'});
        var C = new model.Action({name: 'C'});
        var D = new model.DecisionMerge({name: 'D'});
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

        // call place and route
        nodes = placeandroute.place(paths);

        // check result
        deepEqual(I.ui.size, {x:1, y:6}, 'I size');
        deepEqual(A.ui.size, {x:1, y:6}, 'A size');
        deepEqual(R.ui.size, {x:7, y:1}, 'R size');
        deepEqual(E.ui.size, {x:1, y:6}, 'E size');
        deepEqual(Q.ui.size, {x:1, y:6}, 'Q size');
        deepEqual(H.ui.size, {x:1.4, y:1}, 'H size');
        deepEqual(J.ui.size, {x:1.4, y:1}, 'J size');
        deepEqual(K.ui.size, {x:1.4, y:1}, 'K size');
        deepEqual(L.ui.size, {x:1.4, y:1}, 'L size');
        deepEqual(M.ui.size, {x:1.4, y:1}, 'M size');
        deepEqual(B.ui.size, {x:1.75, y:3}, 'B size');
        deepEqual(F.ui.size, {x:1.75, y:1}, 'F size');
        deepEqual(G.ui.size, {x:1.75, y:1}, 'G size');
        deepEqual(D.ui.size, {x:1.75, y:2}, 'D size');
        deepEqual(C.ui.size, {x:3.5, y:1}, 'C size');
        deepEqual(N.ui.size, {x:7.25, y:1}, 'N size');
        deepEqual(P.ui.size, {x:7, y:1}, 'P size');
    });
});
