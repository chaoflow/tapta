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
        deepEqual(base.head(list, 0), [], "head works for first element");
        raises(function() {
            base.head(list, 4);
        }, /^Item not in list$/, "throws: Item not in list");
    });

    test("tail", function() {
        var list = [0,1,2,3];
        deepEqual(base.tail(list), [1,2,3],
                  "return all but first element if item undefined");
        deepEqual(base.tail(list, 2), [3], "return tail after item in list");
        deepEqual(base.tail(list, 3), [], "tail works for last element");
        raises(function() {
            base.head(list, 4);
        }, /^Item not in list$/, "throws: Item not in list");
    });

    test("startswith", function() {
        var list = [0,1,2,3];
        var head = [0,1];
        var nothead = [1,2];
        equal(base.startswith(list, head), true, "startswith returns true");
        equal(base.startswith(list, nothead), false, "startswith returns true");
        equal(base.startswith(list), false, "false for undefined");
    });

    test("groups", function() {
        var lists = [
            [0,1,2],
            [0,2,1,3],
            [0,1,3],
            [0,2,1,4],
            [0,2,3],
            [0,3,1,4],
            [0,3,1,5],
            [0,3,4,1,5]
        ];
        deepEqual(_.pluck(base.groups(lists, 1), 'head'), [
            [0],
            [0,2],
            [0,3],
            [0,3,4]
        ], "group heads are correct");
        deepEqual(_.pluck(base.groups(lists, 1), "members"), [
            [[0,1,2],
             [0,1,3]],
            [[0,2,1,3],
             [0,2,1,4]],
            [[0,3,1,4],
             [0,3,1,5]],
            [[0,3,4,1,5]]
        ], "group members are correct");
        var objlists = [
            {items: [0,1,2]},
            {items: [0,2,1,3]},
            {items: [0,1,3]},
            {items: [0,2,1,4]},
            {items: [0,2,3]},
            {items: [0,3,1,4]},
            {items: [0,3,1,5]},
            {items: [0,3,4,1,5]}
        ];
        deepEqual(_.pluck(base.groups(objlists, 1, function(obj) {
            return obj.items;
        }), 'head'), [
            [0],
            [0,2],
            [0,3],
            [0,3,4]
        ], "group heads are correct with map");
        deepEqual(_.pluck(base.groups(objlists, 1, function(obj) {
            return obj.items;
        }), "members"), [
            [{items: [0,1,2]},
             {items: [0,1,3]}],
            [{items: [0,2,1,3]},
             {items: [0,2,1,4]}],
            [{items: [0,3,1,4]},
             {items: [0,3,1,5]}],
            [{items: [0,3,4,1,5]}]
        ], "group members are correct with map");
    });
}); 
