// directed acyclic graph - persistent
define([
    'require',
    'vendor/underscore.js',
    './graphutils',
    './localstorage'
], function(require) {
    var graphutils = require('./graphutils');
    var storage = require('./localstorage');
    var Model = storage.Model;
    var Collection = storage.Collection;

    // A vertex is a container for a node and knows its direct
    // successors. A node is eithe a string or an object with an id.
    var Vertex = Model.extend({
        initialize: function() {
            this._geometry = {};
            this._minwidth = 1;
            this._minheight = 1;
        },
        setGeometry: function(obj) {
            var g = this._geometry,
                before = {},
                diff = {},
                changed = false;
            _.each(["x", "y", "width", "height"], function(name) {
                var delta = obj[name] === undefined ? 0 : obj[name] - g[name];
                before[name] = g[name];
                diff[name] = delta;
                changed = changed || Boolean(delta);
            });
            _.extend(this._geometry, obj);
            if (changed) {
                this.trigger("change:geometry", { before: before,
                                                  now: g,
                                                  diff: diff });
            }
        },
        // goes hand-in-hand with Graph.parse
        toJSON: function() {
            // we are not responsible for jsonification, but only
            // selection of what is going to be jsonified.
            return _.reduce(this.attributes, function(memo, val, key) {
                memo[key] = function() {
                    if (key === "payload") {
                        if (_.isString(val)) return val;
                        if (val.id === undefined) throw "Payload needs an id!";
                        return val.id;
                    }
                    if (key === "next") return _.pluck(val, 'id');
                    return val;
                }();
                return memo;
            }, {});
        }
    });
    Object.defineProperties(Vertex.prototype, {
        minwidth: {get: function() { return this._minwidth; }},
        minheight: {get: function() { return this._minheight; }},
        next: {get: function() {
            return this.get('next') || this.set({next:[]}).get('next');
        }},
        payload: {get: function() { return this.get('payload'); }},
        // If payload has no type its a string with only type info
        type: {get: function() { return this.payload.type || this.payload; }},
        x: {get: function() { return this._geometry.x; }},
        y: {get: function() { return this._geometry.y; }},
        width: {get: function() { return this._geometry.width;}},
        height: {get: function() { return this._geometry.height; }}
    });

    // a graph is stored as a collection of vertices.
    // arcs are stored implicitly as direct successors on vertices
    var Graph = Collection.extend({
        arcs: function() {
            return graphutils.arcs(this.sources());
        },
        initialize: function(attrs, opts) {
            this.nodelib = opts.nodelib || this.parent && this.parent.nodelib;
        },
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
                if (this.nodelib && attrs['payload']) {
                    attrs['payload'] = this.nodelib.get(attrs['payload']);
                }
                _.each(['next'], function(name) {
                    attrs[name] = _.map(attrs[name], function(id) {
                        return cache[id];
                    });
                });
            }, this);
            return vertices;
        },
        paths: function() {
            return graphutils.paths(this.sources());
        },
        spaceOut: function() {
            // XXX: add padding and implement in graphutils for edges to be drawn
            // returns a list of all vertices; assigns position and
            // size as side effect
            return graphutils.spaceOut(this.paths());
        },
        sinks: function() {
            return graphutils.sinks(this.models);
        },
        sources: function() {
            return graphutils.sources(this.models);
        }
    });

    return {
        Graph: Graph,
        Vertex: Vertex
    };
});
