define([
    'require',
    'cdn/qunit.js',
    'cdn/underscore.js',
    './graph'
], function(require) {
    // dependencies we need a handle for
    var Graph = require('./graph').Graph;

    module('Graph');

    test("(De)serialization with string nodes", function() {
        var graph = new Graph();
        graph.name = "test_graph";

        // cleanup leftovers
        graph.fetch();
        var foo = graph.toArray();
        _.invoke(foo, 'destroy');
        graph.remove(foo);

        // create vertices
        graph.create({node: "A"});
        graph.create({node: "B"});
        graph.create({node: "C"});
        graph.create({node: "D"});
        vertices = graph.toArray();
        var a = vertices[0];
        var b = vertices[1];
        var c = vertices[2];
        var d = vertices[3];
        equal(a.node(), "A", "A created correctly");
        equal(b.node(), "B", "B created correctly");
        equal(c.node(), "C", "C created correctly");
        equal(d.node(), "D", "D created correctly");

        // hook them up and save
        a.next().splice(0, 0, b, c);
        b.next().splice(0, 0, d);
        c.next().splice(0, 0, d);
        a.save();
        b.save();
        c.save();

        deepEqual(a.toJSON().next, [b.id, c.id], "next is serialized to ids");

        // fetch a fresh copy
        var graph_ = new Graph();
        graph_.name = "test_graph";
        graph_.fetch();
        vertices = graph_.toArray();
        var a_ = vertices[0];
        var b_ = vertices[1];
        var c_ = vertices[2];
        var d_ = vertices[3];

        deepEqual(_.pluck(a_.next(), 'id'), [b.id, c.id],
                  "next is deserialized correctly");

        // cleanup
        foo = graph_.toArray();
        _.invoke(foo, 'destroy');
        graph.remove(foo);
    });

    test("(De)serialization with object nodes", function() {
        var graph = new Graph();
        graph.name = "test_graph";

        // cleanup leftovers
        graph.fetch();
        var foo = graph.toArray();
        _.invoke(foo, 'destroy');
        graph.remove(foo);

        // mockup node library
        var NodeLib = function(nodes) {
            this.nodes = nodes;
        };
        _.extend(NodeLib.prototype, {
            get: function(id) {
                return this.nodes[id];
            }
        });
        var nodelib = new NodeLib({
            "idA":{id: "idA", name:"A"},
            "idB":{id: "idB", name:"B"}
        });
        graph.nodelib = nodelib;

        // create vertices
        graph.create({node: nodelib.get("idA")});
        vertices = graph.toArray();
        var a = vertices[0];
        equal(a.node().id, "idA", "A created correctly");

        equal(a.toJSON().node, "idA", "node is serialized to id");

        // fetch a fresh copy
        var graph_ = new Graph();
        graph_.name = "test_graph";
        graph_.nodelib = nodelib;
        graph_.fetch();
        vertices = graph_.toArray();
        var a_ = vertices[0];
        equal(a_.node().id, "idA", "node is deserialized correctly");

        // cleanup
        foo = graph_.toArray();
        _.invoke(foo, 'destroy');
        graph.remove(foo);
    });
}); 
