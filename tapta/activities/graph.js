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
            // XXX: define node sizes in relation to grid size
            // and use their size here
            this._minwidth = 1;
            this._minheight = 1;
            // XXX: hack
            if (this.payload === "initial") this._minwidth = 1/6;
            if (this.payload === "final") this._minwidth = 1/5;
            this.predecessors = [];
            this.successors = [];
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
                        // prepend 'id:' so we later recognize it
                        return "id:"+val.id;
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
            return this.get('next')
                || this.set({next:[]}, {silent:true}).get('next');
        }},
        payload: {get: function() { return this.get('payload'); }},
        // If payload has no type its a string with only type info
        type: {get: function() { return this.payload.type || this.payload; }},
        geometry: {get: function() { return this._geometry; }},
        x: {get: function() { return this._geometry.x; }},
        y: {get: function() { return this._geometry.y; }},
        width: {get: function() { return this._geometry.width;}},
        height: {get: function() { return this._geometry.height; }}
    });

    // a graph is stored as a collection of vertices.
    // arcs are stored implicitly as direct successors on vertices
    var Graph = Collection.extend({
        model: Vertex,
        arcs: function() {
            // XXX: spaceOut needs to run before that, NOT nice!
            return _.values(this.arcstorage);
        },
        fetch: function() {
            // fetch results in new cids, arcstorage uses cids
            Collection.prototype.fetch.call(this);
            this.arcstorage = {};
        },
        initialize: function(attrs, opts) {
            // A nodelib returns nodes by id: nodelib.get(id) -> node
            this.nodelib = opts.nodelib;
            this.arcstorage = {};
            _.bindAll(this);
            // space out if something is added but no next was
            // changed, i.e. a new completely parallel path
            this.bind("add", this.spaceOut);
            // an existing path was changed
            this.bind("change:next", this.spaceOut);
            // this.bind("remove", this.spaceOut);
        },
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
                var attrs = vertex.attributes,
                    payload = attrs['payload'];
                if (payload && payload.slice(0,3) === "id:") {
                    if (!this.nodelib) throw "Need a nodelib";
                    attrs['payload'] = this.nodelib.get(payload.slice(3));
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
            // we need to generate arcs between the vertices and once
            // generated we always need to return the very same arcs
            return graphutils.paths(this.sources(), this.arcstorage);
        },
        spaceOut: function() {
            // returns a list of all vertices; assigns position and
            // size as side effect
            return graphutils.spaceOut(this.paths(), 0.5);
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
