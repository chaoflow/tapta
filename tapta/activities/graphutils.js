// limitations:
//  - common prefxies need to be adjacent
//  - adjacent suffixes may be separated by paths with different final node
//  - only vertical element size of 1
define([
    'require',
    'vendor/underscore.js',
    './debug',
    './functional'
], function(require) {
    var DEBUG = require('./debug');
    require('./functional').install();

    // join items of a list with columns
    var colJoin = function(list) {
        return list.join(':');
    };
    var commaJoin = function(list) {
        return list.join(', ');
    };

    // turn a list of items into a list of their ids
    var pluckId = function(list) {
        if (!(list instanceof Array)) { return list.id; }
        return _.map(list, function(item) {
            return pluckId(item);
        });
    };


    ////// defining graphs

    // XXX: not yet working
    // var GraphElement = function() {
    //     this._geometry = {};
    //     this._minwidth = 1;
    //     this._minheight = 1;
    // };
    // _(GraphElement.prototype).extend({
    //     setGeometry: function(obj) {
    //         _.extend(this._geometry, obj);
    //     }
    // });
    // Object.defineProperties(GraphElement.prototype, {
    //     minwidth: { get: function() { return this._minwidth; } },
    //     minheight: { get: function() { return this._minheight; } },
    //     next: { get: function() { return this._next; } },
    //     x: { get: function() { return this._geometry.x; } },
    //     y: { get: function() { return this._geometry.y; } },
    //     width: { get: function() { return this._geometry.width;} },
    //     height: { get: function() { return this._geometry.height; } }
    // });


    // XXX: make portions of this reusable for inheritance
    var Vertex = function(attrs) {
        this.id = this.cid = attrs && attrs.id;
        this._next = [];
        this._minwidth = 1000;
        this._minheight = 1000;
        this._geometry = {
            height: this._minheight
        };
        this.predecessors = [];
        this.successors = [];
    };
    _(Vertex.prototype).extend({
        setGeometry: function(obj) {
            _.extend(this._geometry, obj);
        }
    });
    Object.defineProperties(Vertex.prototype, {
        geometry: {get: function() { return this._geometry; }},
        minwidth: { get: function() { return this._minwidth; } },
        minheight: { get: function() { return this._minheight; } },
        next: { get: function() { return this._next; } },
        x: { get: function() { return this._geometry.x; } },
        y: { get: function() { return this._geometry.y; } },
        width: { get: function() { return this._geometry.width;} },
        height: { get: function() { return this._geometry.height; } }
    });

    var Arc = function(id, source, target, stealthmode) {
        // XXX: should we really provide this.id
        this.id = this.cid = id;
        this.source = source;
        this.target = target;
        this._minwidth = 1000;
        this._minheight = 1000;
        this._geometry = {
            height: this._minheight
        };
        if (!stealthmode) {
            if (source !== undefined) {
                this.predecessors = [source];
                source.successors.push(this);
            }
            if (target !== undefined) {
                this.successors = [target];
                target.predecessors.push(this);
            }
        }
    };
    _(Arc.prototype).extend({
        type: "arc",
        destroy: function() {
            var srcidx = this.source.successors.indexOf(this),
                tgtidx = this.target.successors.indexOf(this);
            if (srcidx === -1) throw "Deep shit!";
            if (tgtidx === -1) throw "Deep shit!";
            this.source.successors.splice(srcidx, 1);
            this.target.predecessors.splice(tgtidx, 1);
        },
        setGeometry: function(obj) {
            _.extend(this._geometry, obj);
        }
    });
    Object.defineProperties(Arc.prototype, {
        geometry: {get: function() { return this._geometry; }},
        minwidth: {get: function() { return this._minwidth; }},
        minheight: {get: function() { return this._minheight; }},
        next: {get: function() { return this._next; }},
        x: {get: function() { return this._geometry.x; }},
        y: {get: function() { return this._geometry.y; }},
        width: {get: function() { return this._geometry.width;}},
        height: {get: function() { return this._geometry.height; }},
        // whether the arc can be removed from the graph (not the canvas)
        subtractable: {get: function() {
            // open arcs are control structures, surely not subtractable
            if (this.source === undefined) return false;
            if (this.target === undefined) return false;
            // we are our source's only successor
            if (this.source.successors.length === 1) return false;
            // we are out target's only predecessor
            if (this.target.predecessors.length === 1) return false;
            // XXX: what was that?
            // if ((this.srcview.model.type !== "decmer") &&
            //     (this.srcview.model.type !== "forkjoin")) return false;
            // if ((this.tgtview.model.type !== "decmer") &&
            //     (this.tgtview.model.type !== "forkjoin")) return false;
            return true;
        }}
    });

    // A graph can be created by only providing arcs.
    // An arc references its head and tail vertices by id. It can be
    // provided as a string "id1:id2" or tuple list ["id1", "id2"].
    // A very basic vertex implementation will be used to create all
    // referenced vertices. A list of all vertices is returned.
    var graph = function(arcs, VertexProto) {
        VertexProto = VertexProto || Vertex;
        // A is list of strings, let's get a list of tuples
        arcs = map("x.split(':')", arcs);
        // all vertex ids, seen in arcs
        var vids = _(arcs).chain().flatten().uniq().value(),
            vertices = map(function(id) { return new VertexProto({id:id}); }, vids),
            cache = foldl("acc,x -> (acc[x.id] = x) && acc", {}, vertices);
        _.each(arcs, function(arc) {
            cache[arc[0]].next.push(cache[arc[1]]);
        });
        return vertices;
    };


    ////// working with graphs

    // a recursive reduce
    // walk the graph from given vertices reducing it with func and memo
    var reduce = function(vertices, func, memo) {
        return _.reduce(vertices, function(memo, vertex) {
            return reduce(vertex.next, func, func(memo, vertex));
        }, memo);
    };

    // return uniq list of arcs seen while walking the graph along the
    // paths starting at vertices.
    // If arcstorage is defined, it will always return the same arc objects.
    // XXX: broken, arcstorage needs to be implemented
    var arcs = function(vertices, arcstorage) {
        return reduce(vertices, function(memo, vertex) {
            if (vertex.next.length === 0) return memo;
            return _.reduce(vertex.next, function(memo, next) {
                return _.some(memo, function(arc) {
                    return arc[0] === vertex
                        && arc[1] === next;
                }) ? memo : memo.concat([[vertex, next]]);
            }, memo);
        }, []);
    };

    // // return all paths starting with the given vertices
    // var paths = function(vertices) {
    //     // edge case: return list containing one empty path
    //     if (vertices.length === 0) return [[]];
    //     return _.reduce(vertices, function(memo, vertex) {
    //         return memo.concat(
    //             _.map(paths(vertex.next), function(path) {
    //                 return [vertex].concat(path);
    //             })
    //         );
    //     }, []);
    // };

    // alternative implementation
    // return all paths starting with the given vertices
    // var paths2 = function(vertices) {
    //     // edge case: return list containing one empty path
    //     if (vertices.length === 0) return [];
    //     var x = vertices.slice(0,1)[0];
    //     var xs = vertices.slice(1);
    //     return _.map(
    //         paths(x.next),
    //         function(path) { return [x].concat(path); }
    //     ).concat(paths2(xs));
    // };

    // return all paths starting with the given vertex
    // a path consist of graphelements (vertices and arcs)
    // XXX: maybe rename vertices to sources here
    // algorithm in action:
    // A.next = [B, C], B.next = [D], C.next = [D]
    // --> [[A, A:0:B, B, B:0:D, D],
    //      [A, A:1:C, C, C:0:D, D]]
    // x = D, tails = [[]]
    // --> [D]
    // x = B, tails = [D]
    // --> [B, B:0:D, D]
    // ...
    var paths_creating_arcs = function(vertex, arcstorage) {
        // If arcstorage is defined, it will be used to return always
        // the same arc objects.
        if (arcstorage === undefined) arcstorage = {};
        if (_.isArray(vertex)) return foldl(function(acc, x) {
                return acc.concat(paths(x, arcstorage));
        }, [], vertex);
        // edge case: no next vertices -> one path with only the current vertex
        if (vertex.next.length === 0) return [[vertex]];
        return foldl("acc.concat(x)", [], map(function(next, idx) {
            return map(function(tail) {
                var arcid = [vertex.cid, idx, tail[0].cid].join(':'),
                    arc = arcstorage[arcid] ||
                        (arcstorage[arcid] = new Arc(arcid, vertex, tail[0]));
                return [vertex, arc].concat(tail);
            }, paths(next, arcstorage));
        }, vertex.next));
    };

    var sources2paths = function(vertex) {
        if (_.isArray(vertex)) return foldl(function(acc, x) {
            return acc.concat(sources2paths(x));
        }, [], vertex);
        // edge case: no next vertices -> one path with only the current vertex
        if (vertex.successors.length === 0) return [[vertex]];
        return foldl("acc.concat(x)", [], map(function(successor) {
            return map(function(tail) {
                return [vertex].concat(tail);
            }, sources2paths(successor));
        }, vertex.successors));
    };

    // XXX: broken, as it does not account for arcs
    // the maximum minwidth of the paths seen from srcs
    // vertices have variable width
    // var minwidth = function(sources) {
    //     // enable calling on a single vertex
    //     if (sources.length === undefined) sources = [sources];
    //     switch (sources.length) {
    //     case 0: return 0;
    //     case 1: return sources[0].minwidth + minwidth(sources[0].next);
    //     default: return maximum(map(minwidth, sources));
    //     }
    // };
    var path_minwidth = function(path) {
        return sum(map("graphelement.minwidth", path));
    };

    var path_minheight = function(path) {
        return maximum(map("graphelement.minheight", path));
    };

    // find sinks, vertices not referencing other vertices, outdegree = 0
    var sinks = function(vertices) {
        return _(vertices).select(function(vertex) {
            return vertex.next.length === 0;
        });
    };

    // find sources, vertices not referenced by other vertices, indegree = 0
    var sources = function(vertices) {
        var referenced = _(vertices).chain()
                .map(function(vertex) { return vertex.next; })
                .flatten()
                .value();
        // a bit weird syntax that is: this, arguments
        return _.without.apply(_, [vertices].concat(referenced));
    };

    var calcWidth = function(paths) {
        DEBUG.spaceout && console.group("width");
        var cidx, crucial,
            maxminwidth = maximum(map(path_minwidth, paths));
        // create a working copy of paths
        paths = map(function(p) {
            // the maximum minimally needed width defines the width of
            // the whole graph and therefore the available width for each
            // path.
            return _.extend(p.slice(), {width_avail: maxminwidth});
        }, paths);
        while (paths.length > 0) {
            // The crucial path ultimately defines the size of its elements.
            // the first path with only one element is crucial
            // If there is no such path, the longest path is crucial
            crucial = _.detect(paths, function(path) { return (path.length === 1); });
            if (crucial === undefined) {
                crucial = foldl1(function(acc, p) { return acc < p ? p : acc; }, paths);
            }
            cidx = _.indexOf(paths, crucial);
            if (cidx == -1) throw "Deep shit!";
            if (crucial.length === 0) throw "Crucial path is empty";
            // remove crucial path from paths
            paths.splice(cidx, 1);

            // distribute space among variable width elements
            var n_varwidth = _.compact(_.map(crucial, function(elem) {
                return elem.fixedwidth ? undefined : elem;
            })).length;
            if (n_varwidth === 0) {
                throw "Need at least one variable width element";
            }
            var width_needed = path_minwidth(crucial);
            _.each(crucial, function(elem) {
                var geo = elem.geometry;
                geo.width = elem.fixedwidth || elem.minwidth + Math.round(
                    (crucial.width_avail - width_needed) / n_varwidth--
                );
                crucial.width_avail -= geo.width;
                width_needed -= geo.width;
                // remove element from the other paths and subtract
                // its width from their available widths
                _.each(paths, function(path, idx) {
                    if (_.include(path, elem)) {
                        path.splice(_.indexOf(path, elem),1);
                        path.width_avail -= geo.width;
                    }
                });
            });
            if (crucial.width_avail > 0) throw "Unallocated space left!";
            // remove empty paths
            for (var i = paths.length - 1; i >=0; i--) {
                if (paths[i].length === 0) {
                    if (paths[i].width_avail > 0) throw "Unallocated space left";
                    paths.splice(i,1);
                }
            }
        }
        DEBUG.spaceout && console.groupEnd();
    };

    var sumHeights = function(elems, vpad) {
        return vpad * ((elems.length || 1) - 1)
            + foldl("acc+x.geometry.height", 0, elems);
    };

    var calcHeight = function(sources, vpad) {
        if (vpad === undefined) vpad = 0;
        return foldl(function(acc, elem) {
            DEBUG.spaceout && console.group(elem.cid);
            var heights = [elem.geometry.height];
            if (elem.predecessors.length) {
                var prede = elem.predecessors[0],
                    n1 = prede.successors.length;
                if (prede.successors.length === 1) {
                    heights.push(sumHeights(elem.predecessors, vpad));
                } else {
//                    heights.push((prede.height - vpad * (n1 - 1)) / n1);
                }
            }
            if (elem.successors.length) {
                var succ = elem.successors[0],
                    n2 = succ.predecessors.length;
                if (succ.predecessors.length === 1) {
                    heights.push(sumHeights(elem.successors, vpad));
                } else {
                    heights.push((succ.height - vpad * (n2 - 1)) / n2);
                }
            }
            var height = maximum(heights),
                changed = (height !== elem.geometry.height);
            DEBUG.spaceout && console.log(
                elem.height,
                elem.minheight,
                map("x.height || 0", elem.predecessors),
                map("x.height || 0", elem.successors),
                height,
                changed ? "changed" : ""
            );
            elem.geometry.height = height;
            changed = calcHeight(elem.successors, vpad) || changed;
            DEBUG.spaceout && console.groupEnd();
            return acc || changed;
        }, false, sources);
    };

    var calcXY = function(sources, vpad, x, y, seen) {
        if (x === undefined) x = 0;
        if (y === undefined) y = 0;
        if (seen === undefined) seen = [];
        return foldl(function(acc, elem) {
            // We have been at that element already
            if (acc.indexOf(elem) !== -1) return acc;
            acc.push(elem);
            elem.geometry.x = x;
            elem.geometry.y = y;
            if (DEBUG.spaceout) console.log([
                "x, y, w, h:",
                elem.cid,
                elem.geometry.x,
                elem.geometry.y,
                elem.geometry.width,
                elem.geometry.height
            ]);
            calcXY(elem.successors, vpad, x + elem.geometry.width, y, acc);
            y += elem.geometry.height + vpad;
            return acc;
        }, seen, sources);
    };

    // allocate space to the vertices
    var spaceOut = function    (sources, vpad) {
        DEBUG.spaceout && console.group("spaceout");

        var paths = sources2paths(sources);
        // calculate element widths
        calcWidth(paths);
        // calc height
        while (calcHeight(sources, vpad)) true;
        // determine positions
        var rval = calcXY(sources, vpad);

        DEBUG.spaceout && console.groupEnd();
        return rval;
    };

    return {
        Arc: Arc,
        Vertex: Vertex,
        arcs: arcs,
        colJoin: colJoin,
        commaJoin: commaJoin,
        graph: graph,
//        minwidth: minwidth,
        pluckId: pluckId,
        reduce: reduce,
        sinks: sinks,
        sources: sources,
        spaceOut: spaceOut
    };
});
