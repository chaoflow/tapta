define([
    'require',
    'vendor/qunit.js',
    './functional'
], function(require) {
    require('./functional').install();

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

    test("without", function() {
        var a = [1,2,3];
        deepEqual(without("x == 2", a), [1,3], "without");
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

    test("maximum", function() {
        equal(maximum([1,3,4,2]), 4, "maximum");
    });

    test("compose", function() {
        var f = "/3".lambda(),
            g = "2*".lambda(),
            h = "x*x".lambda(),
            composition = compose(f,g,h);
        equal(composition(6), f(g(h(6))), "compose");
    });

    test("partial", function() {
        var add = function(x,y) {
            return x+y;
        };
        var add5 = partial(add, 5);
        equal(add5(3), 8, "partial with one arg works");
    });

    test("traced", function() {
        var f1 = function(x,y) { return x+y; };
        var f2 = "x+y".lambda();
        equal(f1.traced()(1,2), f1(1,2), "normal traced function");
        equal(f2.traced()(1,2), f2(1,2), "traced string lambda");
    });
});
