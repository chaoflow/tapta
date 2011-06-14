define([
    'require',
    'cdn/underscore.js',
    'cdn/backbone.js',
    './base',
    './settings',
    './localstorage',
    './placeandroute'
], function(require) {
    var base = require('./base');
    var placeandroute = require('./placeandroute');
    var settings = require('./settings');
    var storage = require('./localstorage');
    var Store = storage.Store;

    // XXX: temp for testing
    var testpaths = function(activity) {
        var A = new ForkJoin({name: 'A'});
        var B = new DecMer({name: 'B'});
        var C = new Action({name: 'C'});
        var D = new DecMer({name: 'D'});
        var E = new ForkJoin({name: 'E'});
        var F = new Action({name: 'F'});
        var G = new Action({name: 'G'});
        var H = new Action({name: 'H'});
        var I = new Initial({name: 'I'});
        var J = new Action({name: 'J', x_req: 2});
        var K = new Action({name: 'K'});
        var L = new Action({name: 'L'});
        var M = new Action({name: 'M'});
        var N = new Final({name: 'N'});
        var P = new Action({name: 'P'});
        var Q = new Final({name: 'Q'});
        var R = new Action({name: 'R', x_req: 3});

        // build paths
        var paths = activity.paths;
        paths.add(new Path({
            nodes: [I, A, B, C, D, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, B, F, G, D, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, B, N]
        }));
        paths.add(new Path({
            nodes: [I, A, H, J, K, L, M, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, P, E, Q]
        }));
        paths.add(new Path({
            nodes: [I, A, R, E, Q]
        }));
    };

    var Model = storage.Model;
    var Collection = storage.Collection;
    var IndexedCollection = storage.IndexedCollection;

    // root object is based on a Backbone.Model, but the save and
    // fetch functions are disabled. You can give it a custom name:
    // var app = new App({name: "myApp"});
    // This is used for testing. The name is used as top-level
    // database key.
    var App = storage.Root.extend({
        initialize: function(attributes) {
            this.name = attributes.name || settings.localstorage_key;
            // XXX: consider using a collection for this
            this.layers = [];
            var prev;
            var i;
            for (i = 0; i < 6; i++) {
                var layer = this.defchild(Layer, {}, {name: "layer"+i});
                layer.prev = prev;
                if (prev) {
                    prev.next = layer;
                }
                this.layers.push(layer);
                prev = layer;
            }
            this.fetch();
        },
        fetch: function() {
            // need to be fetched in reverse order, so actions can
            // look up activities they reference.
            _.each(this.layers.concat().reverse(), function(layer) {
                layer.fetch();
            }, this);

            var toplayer = _.first(this.layers);
            var bottomlayer = _.last(this.layers);

            // create activity for top-layer and tell it to show it
            var act;
            if (toplayer.activities.length === 0) {
                act = toplayer.activities.create();
            } else {
                act = toplayer.activities.first();
            }
            toplayer.activity = act;
//            testpaths(toplevel.activity);
        }
    });

    var Layer = Model.extend({
        initialize: function() {
            this.activity = undefined;
            this.initials = this.defchild(Initials, [], {name: 'initials'});
            this.finals = this.defchild(Finals, [], {name:'finals'});
            this.actions = this.defchild(Actions, [], {name:'actions'});
            this.decmers = this.defchild(DecMers, [], {name:"decmers"});
            this.forkjoins = this.defchild(ForkJoins, [], {name:'forkjoins'});
            this.activities = this.defchild(Activities, [], {name:'activities'});
        },
        fetch: function() {
            // XXX: support in base classes
            this.initials.fetch();
            this.finals.fetch();
            this.actions.fetch();
            this.decmers.fetch();
            this.forkjoins.fetch();
            this.activities.fetch();
        },
        obj: function(id) {
            var res;
            res = this.initials.get(id); if (res) { return res; }
            res = this.finals.get(id); if (res) { return res; }
            res = this.actions.get(id); if (res) { return res; }
            res = this.decmers.get(id); if (res) { return res; }
            res = this.forkjoins.get(id); if (res) { return res; }
            res = this.activities.get(id); if (res) { return res; }
            throw "Could not find node for id "+id;
        }
    });
    
    var Node = Model.extend({
        defaults: {
            x_req: 1, // varibale size supported
            y_req: 1  // fixed for now
        }
    });
    var Final = Node.extend({});
    var Initial = Node.extend({});
    var MIMO = Node.extend({});
    var DecMer = MIMO.extend({});
    var ForkJoin = MIMO.extend({});

    var Initials = Collection.extend({
        model: Initial
    });

    var Finals = Collection.extend({
        model: Final
    });

    var Action = Node.extend({
        toJSON: function() {
            var attributes = _.clone(this.attributes);
            _(['act']).each(function(key){
                var tmp = this.attributes[key];
                if(tmp !== undefined){
                    attributes[key] = tmp.id;
                }
            }, this);
            return attributes;
        }
    });
    var Actions = Collection.extend({
        model: Action,
        parse: function(resp) {
            var parent = this.parent;
            var model = this.model;
            resp = _.map(resp, function(data) {
                var actid = data['activity'];
                if (actid) {
                    data['activity'] = parent.next.activities.get(actid);
                }
                return new model(data);
            });
            return resp;
        }
    });

    var DecMers = Collection.extend({
        model: DecMer
    });

    var ForkJoins = Collection.extend({
        model: ForkJoin
    });

    var Activity = Model.extend({
        initialize: function(attrs, opts) {
            this.paths = this.defchild(Paths, [], {name:'paths'});
            this.layer = opts.layer || this.collection.parent;
        },
        placeandroute: function() {
            this.layer.fetch();
            this.paths.fetch();
            if ((!this.paths.length) && (this.layer !== undefined)) {
                // don't create path, initial and final node in the
                // storage, just "add" them. Only if the path is
                // changed later on, it will be added to the storage.
                var source = new Initial();
                var target = new Final();
                this.layer.initials.add(source);
                this.layer.finals.add(target);
                this.paths.add({nodes: [source, target]});
            }
            return placeandroute(this.paths, this.cid);
        },
        // remove a node from all paths
        remove: function(node) {
            _.each(this.paths.toArray(), function(path) {
                var nodes = path.get('nodes');
                var idx = nodes.indexOf(node);
                if (idx !== -1) {
                    if (node instanceof Final) {
                        path.destroy();
                        this.paths.remove(path);
                        node.destroy();
                        this.layer.finals.remove(node);
                    } else {
                        nodes.splice(idx,1);
                        path.set({nodes: nodes});
                        path.save();
                    }
                }
            }, this);
        },
        toJSON: function() {
            var attributes = _.clone(this.attributes);
            _(["raked", "selected"]).each(function(key){
                attributes[key] = attributes[key] && attributes[key].id;
            }, this);
            return attributes;
        }
    });

    var Activities = Collection.extend({
        model: Activity,
        parse: function(response) {
            var layer = this.parent;
            var activities = _.map(response, function(attrs) {
                _(["raked", "selected"]).each(function(key){
                    attrs[key] = attrs[key] && layer.obj(attrs[key]);
                }, this);
                return new Activity(attrs, {layer: layer});
            });
            return activities;
        }
    });

    var Path = Model.extend({
        copy: function() {
            return new Path({
                nodes: [].concat(this.get('nodes'))
            });
        },
        count: function() {
            return _.size(this.get('nodes'));
        },
        head: function(node) {
            return base.head(this.get('nodes'), node);
        },
        include: function(node) {
            return _.include(this.get('nodes'), node);
        },
        remove: function(node) {
            var nodes = this.get('nodes');
            node = nodes.splice(_.indexOf(nodes, node), 1);
            // XXX: what to return, the node or the remaining nodes?
        },
        save: function() {
            // make sure all nodes are saved;
            _.each(this.get('nodes'), function(node) {
                node.save();
            });
            Model.prototype.save.apply(this);
        },
        tail: function(node) {
            return base.tail(this.get('nodes'), node);
        },
        toJSON: function() {
            var attributes = _.clone(this.attributes);
            attributes['nodes'] = _.pluck(attributes['nodes'], 'id');
            return attributes;
        },
        xReq: function() {
            return _.reduce(this.get('nodes'), function (memo, node) {
                return memo + node.get('x_req');
            }, 0 );
        },
        yReq: function() {
            return 1;
            return _.max(this.get('nodes'), function (node) {
                return node.get('y_req');
            }).get('y_req');
        }
    });
    Path.prototype.first = Path.prototype.head;
    Path.prototype.last = Path.prototype.tail;

    var Paths = IndexedCollection.extend({
        model: Path,
        deep: function() {
            var wc = new Paths(
                this.map(function (path) {
                    return path.copy();
                })
            );
            return wc;
        },
        // return paths grouped by common head relative to node
        groups: function(node) {
            return base.groups(this.models, node, function(path) {
                return path.get("nodes");
            });
        },
        // return easy to read info about the paths structure
        inspect: function(opts) {
            var list = this.map(
                function(path) {
                    var nodes = _.map(path.get('nodes'), function(node) {
                        return node.id.toString().substr(0,8);
                    });
                    if (opts.toString) {
                        return [
                            path.get('idx'),
                            path.id.toString().substr(0,8),
                            nodes.join(',')
                        ].join(" : ");
                    } else {
                        return {
                            idx: path.get('idx'),
                            id: path.id.toString().substr(0,8),
                            nodes: nodes
                        };
                    }
                }
            );
            return list;
        },
        longest: function() {
            return this.max(function(path) { return path.xReq(); });
        },
        newpath: function(opts) {
            console.group("newpath: "+this.abspath());
            var before = this.inspect({toString:true}).join('\n');
            var slot = this.parent.cid;
            var outgoing = opts.start.ui[slot].outgoing;
            if (opts.idx > outgoing.length) {
                throw "Index out of range";
            }
            // Paths are grouped by common head up to the start node
            // of the new path. We need to create a new path for
            // each group.
            _.each(this.groups(opts.start), function(group) {
                var nodes = group.head.concat([opts.start]).concat(opts.nodes);
                var path = new Path({nodes: nodes});
                var idx;
                if (opts.idx === outgoing.length) {
                    // insert after last path of the last edge
                    idx = _.last(outgoing[opts.idx-1].paths).get('idx') + 1;
                } else {
                    // insert before first path with the edge of the same idx
                    idx = outgoing[opts.idx].paths[0].get('idx');
                }
                this.insert(path, {idx:idx});
                if (path !== this.toArray()[idx]) {
                    throw "Path inserted at wrong position";
                }
                path.save();
                this.fetch();
            }, this);
            console.group("then");
            console.debug(before);
            console.groupEnd();
            console.group("now");
            console.debug(this.inspect({toString:true}).join('\n'));
            console.groupEnd();
            console.groupEnd();
        },
        parse: function(response) {
            // this might be called during tests, also if no layer is
            // defined. However, the layer is only needed if there is
            // data coming from the storage.
            var layer = this.layer || this.parent.layer;
            var paths = _.map(response, function(attributes) {
                attributes['nodes'] = _.map(attributes['nodes'], function(id) {
                    return layer.obj(id);
                });
                var path = new Path(attributes);
                return path;
            });
            return paths;
        },
        xReq: function() {
            return this.longest().xReq();
        },
        yReq: function() {
            return this.reduce(function(memo, path) {
                return memo + path.yReq();
            }, 0);
        }
    });

    // Edges connect a source and target node and allow to insert a
    // new node in their place. Therefore they keep a reference to the
    // paths they belong to.
    var Edge = Model.extend({
        initialize: function(opts) {
            this.source = opts && opts.source;
            this.target = opts && opts.target;
            this.paths = [];
        },
        insert: function(node) {
            var source = this.source;
            _.each(this.paths, function(path) {
                var nodes = path.get('nodes');
                var idx = _.indexOf(nodes, source);
                var head = _.head(nodes, idx+1);
                var tail = _.tail(nodes, idx+1);
                path.set({nodes: head.concat(node).concat(tail)},
                         {silent: true});
                path.save();
            });
            _.first(this.paths).collection.trigger("change");
        }
    });

    return {
        App: App,
        Layer: Layer,
        Node: Node,
        MIMO: MIMO,
        Initial: Initial,
        Initials: Initials,
        Final: Final,
        Finals: Finals,
        Action: Action,
        Actions: Actions,
        DecMer: DecMer,
        DecMers: DecMers,
        ForkJoin: ForkJoin,
        ForkJoins: ForkJoins,
        Activity: Activity,
        Activities: Activities,
        Path: Path,
        Paths: Paths,
        Edge: Edge
    };
});
