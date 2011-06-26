define([
    'require',
    'vendor/qunit.js',
    './functional'
], function(require) {
    var f = require('./functional'),
        extend = f.extend,
        foldl = f.foldl,
        foldl1 = f.foldl1,
        foldr = f.foldr,
        foldr1 = f.foldr1,
        map = f.map,
        partial = f.partial,
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

    test("extend", function() {
        var obj1 = {a:1};
        var obj2 = extend(obj1, {b:2});
        equal(obj1.a, 1, "obj1 untouched");
        equal(obj2.a, 1, "obj2 has a");
        equal(obj2.b, 2, "obj2 has b");
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

    test("partial", function() {
        var add = function(x,y) {
            return x+y;
        };
        var add5 = partial(add, 5);
        equal(add5(3), 8, "partial with one arg works");
    });
}); 
