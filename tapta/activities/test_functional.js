define([
    'require',
    'vendor/qunit.js',
    './functional'
], function(require) {
    var f = require('./functional'),
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

    module('TaPTa Functional');

    // turn on caching - why would we want that off?
    String.prototype.lambda.cache();

    test("map", function() {
        deepEqual(map("1+", [1,2]),
                  [2,3], "map strfunbody ladd");
        deepEqual(map("+1", [1,2]),
                  [2,3], "map strfunbody radd");
        deepEqual(map("[this.a].concat(_)", [[1,2], [2,1]], {a:0}),
                  [[0,1,2], [0,2,1]], "map strfunbody concat");
        deepEqual(map("x,y -> x+y", [1,1,1]),
                  [1,2,3], "map strfun");
        deepEqual(map(function(x) { return x+1; }, [1,2]),
                  [2,3], "map fun");
        deepEqual(map("return 1", [0,0]),
                  [1,1], "constant function 1");
        deepEqual(map("2", [0,0]),
                  [2,2], "constant function 2");
        deepEqual(map("x", [1,2]),
                  [1,2], "map 1:1");
    });

    test("fold/scan", function() {
        equal(foldl("acc+x", 1, [1,2,3]), 7, "foldl");
        equal(foldl1("acc+x",   [1,2,3]), 6, "foldl1");
        equal(foldr("x+acc", 1, [3,2,1]), 7, "foldr");
        equal(foldr1("x+acc",   [3,2,1]), 6, "foldr1");
        deepEqual(scanl("acc+x", 1, [1,2,3]), [1,2,4,7], "scanl");
        deepEqual(scanl1("acc+x",   [1,2,3]), [1,3,6],   "scanl1");
        deepEqual(scanr("x+acc", 1, [3,2,1]), [7,4,2,1], "scanr");
        deepEqual(scanr1("x+acc",   [3,2,1]), [6,3,1],   "scanr1");
    });
}); 
