// directed acyclic graph - persistent
define([
    'require',
    'vendor/underscore.js',
    './graphutils',
    './localstorage',
    './settings'
], function(require) {
    var graphutils = require('./graphutils');
    var storage = require('./localstorage');
    var Model = storage.Model;
    var Collection = storage.Collection;
    var CFG = require('./settings');

    // A vertex is a container for a node and knows its direct
    // successors. A node is eithe a string or an object with an id.
    var Vertex = Model.extend({
        initialize: function() {
            this._minwidth = 1000;
            this._minheight = 1000;
            this._geometry = {
                height: this._minheight
            };
            this.predecessors = [];
            this.successors = [];
        },
        setGeometry: function(obj) {
            var g = this._geometry,
                before = {},
                diff = {},
                changed = false;
            ["x", "y", "width", "height"].forEach(function(name) {
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
        minwidth: {get: function() { return this.fixedwidth || this._minwidth; }},
        minheight: {get: function() { return this._minheight; }},
        next: {get: function() {
            return this.get('next')
                || this.set({next:[]}, {silent:true}).get('next');
        }},
        payload: {get: function() { return this.get('payload'); }},
        // If payload has no type its a string with only type info
        type: {get: function() { return this.payload.type || this.payload; }},
        fixedwidth: {get: function() {
            // XXX: not nice, maybe decision and pure merge should be
            // two different things after all.
            var type = (this.type !== "decmer")
                    ? this.type
                    : (this.next.length > 1) ? "decision" : "merge";
            return CFG.nodes[type].fixedwidth;
        }},
        geometry: {get: function() { return this._geometry; }},
        x: {get: function() { return this._geometry.x; }},
        y: {get: function() { return this._geometry.y; }},
        width: {get: function() { return this._geometry.width;}},
        height: {get: function() { return this._geometry.height; }},
        // whether an element can be removed from the graph (name collision)
        subtractable: {get: function() {
            return ((this.predecessors.length === 1) &&
                    (this.successors.length === 1));
        }}
    });

    // a graph is stored as a collection of vertices.
    // arcs are stored implicitly as direct successors on vertices
    var Graph = Collection.extend({
        model: Vertex,
        initialize: function(attrs, opts) {
            // A nodelib returns nodes by id: nodelib.get(id) -> node
            this.nodelib = opts.nodelib;
            this._arcstorage = {};
            _.bindAll(this);
            this.bind("change:next", function(vertex, next) {
                var oldnext = vertex.previous('next') || [];
                // remove arcs for removed targets
                _.difference(oldnext, next).forEach(function(target) {
                    var arcid = [vertex.cid, idx, target.cid].join(':'),
                        arc = this._arcstorage[arcid];
                    arc.destroy();
                    delete this._arcstorage[arcid];
                }, this);
                // add arcs for new vertices
                next.forEach(function(target, idx) {
                    if (oldnext.indexOf(target) !== -1) return;
                    var arcid = [vertex.cid, idx, target.cid].join(':'),
                        arc = new graphutils.Arc(arcid, vertex, target);
                    this._arcstorage[arcid] = arc;
                }, this);
            }, this);
            // space out if something is added but no next was
            // changed, i.e. a new completely parallel path
            //this.bind("add", this.spaceOut);
            // an existing path was changed
            //this.bind("change:next", this.spaceOut);
            // this.bind("remove", this.spaceOut);
        },
        // goes hand-in-hand with Vertex.toJSON
        parse: function(resp) {
            // reset arc storage
            this._arcstorage = {};
            // create vertices and cache them by id. in the next step
            // this is used to replace references to ids with the real
            // vertices.
            var cache = {};
            var vertices = _.map(resp, function(attrs) {
                var vertex = new this.model(attrs);
                cache[vertex.id] = vertex;
                return vertex;
            }, this);

            // replace ids with the real objects and generate arcs
            vertices.forEach(function(vertex) {
                var attrs = vertex.attributes,
                    payload = attrs['payload'];
                if (payload && payload.slice(0,3) === "id:") {
                    if (!this.nodelib) throw "Need a nodelib";
                    attrs['payload'] = this.nodelib.get(payload.slice(3));
                }
                attrs.next = _.map(attrs.next, function(id, idx) {
                    var target = cache[id],
                        arcid = [vertex.cid, idx, target.cid].join(':'),
                        arc = new graphutils.Arc(arcid, vertex, target);
                    this._arcstorage[arcid] = arc;
                    return target;
                }, this);
            }, this);
            return vertices;
        },
        spaceOut: function() {
            // returns a list of all vertices; assigns position and
            // size as side effect
            return graphutils.spaceOut(this.sources, 600);
        }
    });
    Object.defineProperties(Graph.prototype, {
        arcs: {get: function() { return _.values(this._arcstorage); }},
        // sinks are vertices without successors
        sinks: {get: function() { return graphutils.sinks(this.models); }},
        // sources are vertices without predecessors
        sources: {get: function() { return graphutils.sources(this.models); }}
    });

    return {
        Graph: Graph,
        Vertex: Vertex
    };
});
