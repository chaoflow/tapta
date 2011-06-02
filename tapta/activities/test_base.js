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

}); 
