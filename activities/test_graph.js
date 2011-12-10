define([
    'require',
    'vendor/qunit.js',
    'vendor/underscore.js',
    './graph',
    './graphutils'
], function(require) {
    module('TaPTa Graph');

    var Graph = require('./graph').Graph,
        Vertex = require('./graph').Vertex,
        graphutils = require('./graphutils'),
        pluckId = graphutils.pluckId,
        tg = require('./test_graphutils'),
        testgraph = tg.testgraph,
        graph_initfin = tg.graph_initfin,
        graph_initfin2 = tg.graph_initfin2,
        graph1 = tg.graph1,
        graph2 = tg.graph2,
        graph3 = tg.graph3;
    delete tg;

    var clean = function(model) {
        localStorage.removeItem(model.abspath());
    };

    // XXX: create testgraph or use same as in test_graphutils

    test("(De)serialization with string nodes", function() {
        var graph = new Graph();
        graph.name = "test_graph";

        // cleanup leftovers
        clean(graph);

        // create vertices
        graph.create({payload: "A"});
        graph.create({payload: "B"});
        graph.create({payload: "C"});
        graph.create({payload: "D"});
        vertices = graph.toArray();
        var a = vertices[0];
        var b = vertices[1];
        var c = vertices[2];
        var d = vertices[3];
        equal(a.payload, "A", "A created correctly");
        equal(b.payload, "B", "B created correctly");
        equal(c.payload, "C", "C created correctly");
        equal(d.payload, "D", "D created correctly");

        // hook them up and save
        a.next.splice(0, 0, b, c);
        b.next.splice(0, 0, d);
        c.next.splice(0, 0, d);
        a.save();
        b.save();
        c.save();
        deepEqual(a.toJSON().next, [b.id, c.id], "next is serialized to ids");


        deepEqual(pluckId(graph.arcs()), [
            [a.id, b.id],
            [a.id, c.id],
            [b.id, d.id],
            [c.id, d.id]
        ], "arcs");
        deepEqual(pluckId(graph.paths()), [
            [a.id, b.id, d.id],
            [a.id, c.id, d.id]
        ], "paths");
        deepEqual(pluckId(graph.sources()), [a.id], "sinks");
        deepEqual(pluckId(graph.sinks()), [d.id], "sinks");


        // fetch a fresh copy
        var graph_ = new Graph();
        graph_.name = "test_graph";
        graph_.fetch();
        vertices = graph_.toArray();
        var a_ = vertices[0];
        var b_ = vertices[1];
        var c_ = vertices[2];
        var d_ = vertices[3];

        deepEqual(_.pluck(a_.next, 'id'), [b.id, c.id],
                  "next is deserialized correctly");

        // cleanup
        clean(graph);
    });

    test("(De)serialization with object payloads", function() {
        var graph = new Graph();
        graph.name = "test_graph";

        // cleanup leftovers
        clean(graph);

        // mockup node library
        var NodeLib = function(nodes) {
            this.nodes = nodes;
        };
        _.extend(NodeLib.prototype, {
            get: function(id) {
                var res = this.nodes[id];
                if (res === undefined) throw "No node by id: "+id;
                return res;
            }
        });
        var nodelib = new NodeLib({
            "idA":{id: "idA", name:"A"},
            "idB":{id: "idB", name:"B"}
        });
        graph.nodelib = nodelib;

        // create vertices
        graph.create({payload: nodelib.get("idA")});
        vertices = graph.toArray();
        var a = vertices[0];
        equal(a.payload.id, "idA", "A created correctly");

        equal(a.toJSON().payload, "id:idA", "payload is serialized to id");

        // fetch a fresh copy
        var graph_ = new Graph();
        graph_.name = "test_graph";
        graph_.nodelib = nodelib;
        graph_.fetch();
        vertices = graph_.toArray();
        var a_ = vertices[0];
        equal(a_.payload.id, "idA", "payload is deserialized correctly");

        // cleanup
        clean(graph);
    });

    test("Graph initial final", testgraph(graph_initfin(Vertex)));
    test("Graph initial final 2", testgraph(graph_initfin2(Vertex)));
    test("Graph 1", testgraph(graph1(Vertex)));
    test("Graph 2", testgraph(graph2(Vertex)));
    test("Graph 3", testgraph(graph3(Vertex)));
});
