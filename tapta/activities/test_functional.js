define([
    'require',
    'vendor/qunit.js',
    './functional'
], function(require) {
    var functional = require('./functional');
    var map = functional.map;

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
}); 
