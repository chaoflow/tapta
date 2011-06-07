define([
    'require',
    'cdn/qunit.js',
    'cdn/underscore.js',
    'cdn/backbone.js',
    './base'
], function(require) {
    // dependencies we need a handle for
    var base = require('./base');

    module('Base');

    test("location and abspath", function() {
        var A = {name:'A'};
        var B = {name:'B', parent:A};
        var C = {name:'C', parent:B};
        equal(base.abspath(base.location(A)), '/A');
        equal(base.abspath(base.location(B)), '/A/B');
        equal(base.abspath(base.location(C)), '/A/B/C');
    });

    test("head", function() {
        var list = [0,1,2,3];
        deepEqual(base.head(list), 0, "return first element if item undefined");
        deepEqual(base.head(list, 2), [0,1], "return head before item in list");
        raises(function() {
            base.head(list, 4);
        }, /^Item not in list$/, "throws: Item not in list");
        deepEqual(base.head(list, 0), [], "head works for first element");
    });

    test("tail", function() {
        var list = [0,1,2,3];
        deepEqual(base.tail(list), [1,2,3],
                  "return all but first element if item undefined");
        deepEqual(base.tail(list, 2), [3], "return tail after item in list");
        deepEqual(base.tail(list, 3), [], "tail works for last element");
    });
}); 
