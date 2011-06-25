define([
    'require',
    'vendor/underscore.js',
    'vendor/jslitmus.js',
    './functional'
], function(require) {
    var functional = require('./functional');

    var numbers = [];
    for (var i=0; i<1000; i++) numbers.push(i);
    var objects = _.map(numbers, function(n){ return {num : n}; });
    var randomized = _.sortBy(numbers, function(){ return Math.random(); });

    JSLitmus.test('functional.map() with fun', function() {
        return functional.map(function(obj){ return obj.num; }, objects);
    });

    JSLitmus.test('functional.map() with strfun', function() {
        return functional.map("_.num", objects);
    });

    JSLitmus.test('functional.map_() with fun', function() {
        return functional.map_(function(obj){ return obj.num; }, objects);
    });

    JSLitmus.test('functional.map_() with strfun', function() {
        return functional.map_("_.num", objects);
    });
});
