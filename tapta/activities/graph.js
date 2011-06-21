define([
    'require',
    'cdn/underscore.js',
    './localstorage'
], function(require) {
    var storage = require('./localstorage');
    var Model = storage.Model;
    var Collection = storage.Collection;

    // vertex and node mean the same in graphs: we use vertex for the
    // graph element and node for what is actually put into the vertex,
    // e.g. an initial node. The vertex is just a container, that knows
    // its pre- and successor(s).
    var Vertex = Model.extend({
        node: function() {
            return this.get('node');
        },
        // return array of next vertices
        next: function() {
            this.get('next') || this.set({next:[]});
            return this.get('next');
        },
        // goes hand-in-hand with Graph.parse
        toJSON: function() {
            // get a copy of our attributes and replace some things by
            // their ids
            var attrs = _.clone(this.attributes);
            if (this.collection.nodelib && attrs['node']) {
                attrs['node'] = attrs['node'].id;
            }
            // XXX: concept of prev unused so far and might vanish
            _.each(['prev', 'next'], function(name) {
                if (attrs[name]) {
                    attrs[name] = _.pluck(attrs[name], 'id');
                }
            });
            // we are not responsible for jsonification, but only
            // selection of what is going to be jsonified.
            return attrs;
        }
    });

    // a graph is a collection of vertices. The edges are stored
    // implicitly (prev/next vertex/vertices).
    var Graph = Collection.extend({
        model: Vertex,
        // goes hand-in-hand with Vertex.toJSON
        parse: function(resp) {
            // create vertices and cache them by id. in the next step
            // this is used to replace references to ids with the real
            // vertices.
            var cache = {};
            var vertices = _.map(resp, function(attrs) {
                var vertex = new this.model(attrs);
                cache[vertex.id] = vertex;
                return vertex;
            }, this);

            // replace ids with the real objects
            _.each(vertices, function(vertex) {
                var attrs = vertex.attributes;
                if (this.nodelib && attrs['node']) {
                    attrs['node'] = this.nodelib.get(attrs['node']);
                }
                // XXX: concept of prev unused so far and might vanish
                _.each(['prev', 'next'], function(name) {
                    attrs[name] = _.map(attrs[name], function(id) {
                        return cache[id];
                    });
                });
            }, this);
            return vertices;
        }
    });

    return {
        Graph: Graph,
        Vertex: Vertex
    };
});
