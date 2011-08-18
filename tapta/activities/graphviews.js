define([
    'require',
    'jquery',
    'vendor/underscore.js',
    './base',
    './graphutils',
    './settings',
    './svgviews'
], function(require) {
    var base = require('./base'),
        View = base.View,
        CFG = require('./settings'),
        Arc = require('./graphutils').Arc,
        svg = require('./svgviews');

    var xToPix = function(x) { return Math.round(CFG.gridsize.x * x / 1000); };
    var yToPix = function(y) { return Math.round(CFG.gridsize.y * y / 1000); };

    var GraphElement = svg.Group.extend({
        // whether an element can be moved around
        draggable: false,
        ctrls: function() { return []; },
        initialize: function() {
            this.predecessors = [];
            this.successors = [];
            if (this.subtractable) this.addClass("subtractable");
            // XXX: consider renaming to hasproperties or something
            if (this.selectable) this.addClass("selectable");
            this.symbol().forEach(function(sym) { sym.addClass("symbol"); });
            this.ctrls().forEach(function(ctrl) { ctrl.addClass("ctrl"); });
            if (this.labelshow) {
                this.label().forEach(function(label) { label.addClass("label"); });
            }
        },
        label: function() { return []; },
        symbol: function() { throw "Not implemented"; }
    });
    Object.defineProperties(GraphElement.prototype, {
        cfg: {get: function() {
            return foldl("acc[x]", CFG.graphelement, this.extraClassNames);
        }},
        // geometry of the element and shortcuts
        geo: {get: function() { return this.geometry; }},
        geometry: {
            get: function() {
                var pg = this.parent.geometry,
                    mg = this.model.geometry,
                    geometry = {
                        x: pg.x + xToPix(mg.x),
                        y: pg.y + yToPix(mg.y),
                        width: xToPix(mg.width),
                        height: yToPix(mg.height)
                    };
                return geometry;
            }
        },
        x: {get: function() { return this.geo.x; }},
        y: {get: function() { return this.geo.y; }},
        width: {get: function() { return this.geo.width; }},
        height: {get: function() { return this.geo.height; }},
        // center of the area and radius of circle that fits into the area
        cx: {get: function() { return this.geo.x + this.geo.width / 2; }},
        cy: {get: function() { return this.geo.y + this.geo.height / 2; }},
        r: {get: function() {
            return ((this.width < this.height) ? this.width : this.height) / 2;
        }},
        labelshow: {value: true},
        labelyoffset: {value: 0},
        subtractable: {get: function() { return this.model.subtractable; }}
    });


    // An arcview connects two vertex views
    var ArcView = GraphElement.extend({
        extraClassNames: ["arc"],
        ctrls: function() { var view = this;  return [
            this.append(Object.defineProperties(
                new svg.Rect(), {
                    attrs: {get: function() { return {
                        x: view.x,
                        y: view.y + (view.height - CFG.graphelement.arc.ctrl.height) / 2,
                        width: view.width,
                        height: CFG.graphelement.arc.ctrl.height
                    }; }}
                }))
        ]; },
        symbol: function() { var view = this; return [
            this.append(Object.defineProperties(
                new svg.Path({name: "arrow"}), {
                    points: {get: function() {
                        return view.points;
                    }},
                    arrowhead: {value: {
                        dx: CFG.graphelement.arc.adx,
                        dy: CFG.graphelement.arc.ady
                    }}
                }
            )),
            this.append(Object.defineProperties(
                new svg.Path({name: "tail"}), {
                    points: {get: function() {
                        return view.points_tail;
                    }}
                }
            ))
        ]; }
    });
    Object.defineProperties(ArcView.prototype, {
        // XXX: some duplication with next property
        points: {get: function() {
            var begin = [this.x, this.y + this.height / 2],
                end = [this.x + this.width, this.y + this.height / 2],
                // points to leave the source to our entrancepoint
                head = this.srcview ? this.srcview.exitpath(begin) : [],
                // points to enter the target from our exitpoint
                tail = this.tgtview ? this.tgtview.entrancepath(end) : [],
                points = head.concat([begin]).concat([end]);
            return points;
        }},
        points_tail: {get: function() {
            var end = [this.x + this.width, this.y + this.height / 2],
                // points to enter the target from our exitpoint
                tail = this.tgtview ? this.tgtview.entrancepath(end) : [],
                points = [end].concat(tail);
            return points;
        }},
        // source and target view
        srcview: {get: function() { return this.options.srcview; }},
        tgtview: {get: function() { return this.options.tgtview; }}
    });

    // vertex is the thing without knowledge of its payload. We are
    // not viewing the vertex, but it's payload, which is a node.
    // Well, let's at least pretend it makes sense.
    var NodeView = GraphElement.extend({
        // for drawing arcs, return via points to enter from source point
        entrancepath: function(srcpoint) { return []; },
        // for drawing arcs, return via points to exit to target point
        exitpath: function(tgtpoint) { return []; }
    });
    Object.defineProperties(NodeView.prototype, {
        selectable: {get: function() {
            return this.model.payload.attributes !== undefined;
        }}
    });

    var InitialNodeView = NodeView.extend({
        extraClassNames: ["node", "initial"],
        // a filled circle
        symbol: function() { var view = this; return [
            this.append(Object.defineProperties(
                new svg.Circle(), {
                    attrs: {get: function() { return {
                        cx: view.cx,
                        cy: view.cy,
                        r: view.r
                    }; }}
                }
            ))
        ]; }
    });

    var FinalNodeView = NodeView.extend({
        draggable: true,
        extraClassNames: ["node", "final"],
        // a filled circle surrounded by an empty circle
        symbol: function() { var view = this; return [
            this.append(Object.defineProperties(
                new svg.Circle({name: "outer"}), {
                    attrs: {get: function() { return {
                        cx: view.cx,
                        cy: view.cy,
                        r: view.r
                    }; }}
                }
            )),
            this.append(Object.defineProperties(
                new svg.Circle({name: "inner"}), {
                    attrs: {get: function() { return {
                        cx: view.cx,
                        cy: view.cy,
                        r: view.r_inner
                    }; }}
                }
            ))
        ]; }
    });
    Object.defineProperties(FinalNodeView.prototype, {
        r_inner: {get: function() { return this.r - 4; }}
    });

    var LabeledNodeView = NodeView.extend({
        initialize: function() {
            NodeView.prototype.initialize.call(this);
            this.model.payload.bind("change:label", function() {
                this.render();
            }, this);
        },
        label: function() { var view = this; return [
            this.append(Object.defineProperties(
                new svg.Text(), {
                    attrs: {get: function() { return {
                        x: view.cx,
                        y: view.cy + view.labelyoffset
                    }; }},
                    text: {get: function() {
                        // raphael does something like that,
                        // but it did not work ootb
                        // html: label ? "<tspan>"+label+"</tspan>" : ""
                        return view.model.payload.get('label') || "";
                    }}
                }
            ))
        ]; }
    });

    var ActionNodeView = LabeledNodeView.extend({
        extraClassNames: ["node", "action"],
        // rake happens on select for now
        // ctrls: function() {
        //     var width = this.width / 3,
        //         height = this.cfg.height / 3,
        //         x = this.x + 2/3 * this.width,
        //         y = this.y + (this.height + this.cfg.height) / 2 - height;
        //     return [
        //         this.append(svg.Rect, {
        //             name: "rake",
        //             attrs: {
        //                 x: x,
        //                 y: y,
        //                 width: width,
        //                 height: height,
        //                 rx: this.cfg.r,
        //                 ry: this.cfg.r
        //             }
        //         })
        //     ];
        // },
        // a box with round corners and a label, centered
        symbol: function() { var view = this; return [
            this.append(Object.defineProperties(
                new svg.Rect(), {
                    attrs: {get: function() { return {
                        x: view.x,
                        y: view.y + (view.height - view.cfg.height) / 2,
                        width: view.width,
                        height: view.cfg.height,
                        rx: view.cfg.r,
                        ry: view.cfg.r
                    }; }}
                }
            ))
        ]; }
    });

    // DecMer and ForkJoin use this
    var mimoCtrls = function() {
        // our models successors are arcs
        // Before, in between and after them we need to create
        // open arcs (models+views), they are our ctrls.
        // it's all about model geometry
        var geos = this.model.successors.map(function(current, idx, succs) {
            var previous = succs[idx-1],
                geo = {
                    x: current.x,
                    y: current.y - (
                        previous ?
                            current.y - previous.y - previous.height :
                            0) / 2
                };
            return geo;
        });
        var ourmodelgeo = this.model.geometry;
        // add one fake geo after the last
        geos.push({
            x: geos[0].x,
            y: ourmodelgeo.y + ourmodelgeo.height
        });
        return _.map(geos, function(geo, idx) {
            var arc = new Arc(this.model.cid+":open", this.model,
                              undefined, true);
            arc.setGeometry({
                x: geo.x - ourmodelgeo.x,
                y: geo.y - ourmodelgeo.y,
                height: 0,
                width: arc.minwidth / 3
            });
            arc.addnewidx = idx;
            // XXX: these arcs will be marked as "symbols" which I think is bad
            var arcview = this.insert(0, new ArcView({
                name: "mimoctrl_"+idx,
                extraClassNames: ["mimoctrl"],
                model: arc,
                srcview: this
            }));
            return arcview;
        }, this);
    };

    var DecMerNodeView = LabeledNodeView.extend({
        extraClassNames: ["node", "decmer"],
        ctrls: mimoCtrls,
        // a diamond: colored bigger in case of decision (two outgoing)
        // without color and smaller in case of pure merge (one outgoing)
        // reasoning: a decmer with only one outgoing edge is at most a
        // merge, but not a decision. Only decisions are colorful -
        // they need to stand out, as human needs to do something in
        // contrast to forkjoin and pure merge.
        symbol: function() { var view = this; return [
            this.append(Object.defineProperties(
                new svg.Diamond({
                    extraClassNames: [
                        this.decision ? "decision" : "merge"
                    ]
                }), {
                    cx: {get: function() { return view.cx; }},
                    cy: {get: function() { return view.cy; }},
                    r: {get: function() { return view.r; }}
                }
            ))
        ]; },
        entrancepath: function(srcpoint) {
            var geo = this.geometry;
            // center
            return [[geo.x + geo.width / 2, geo.y + geo.height / 2]];
        },
        exitpath: function(tgtpoint) {
            var geo = this.geometry;
            // center
            return [[geo.x + geo.width / 2, geo.y + geo.height / 2]];
        }
    });
    Object.defineProperties(DecMerNodeView.prototype, {
        // more than one outgoing edge: decision, otherwise at most a merge
        decision: {get: function() { return (this.model.successors.length > 1); }},
        labelyoffset: {get: function() { return this.decision ? 0 : this.width; }},
        selectable: {get: function() { return this.decision; }}
    });

    var ForkJoinNodeView = NodeView.extend({
        extraClassNames: ["node", "forkjoin"],
        ctrls: mimoCtrls,
        symbol: function() { var view = this; return [
            this.append(Object.defineProperties(
                new svg.Rect(), {
                    attrs: {get: function() { return {
                        x: view.x,
                        y: view.y,
                        width: view.width,
                        height: view.height
                    }; }}
                }
            ))
        ]; }
    });

    var nodeviews = {
        initial: InitialNodeView,
        "final": FinalNodeView,
        action: ActionNodeView,
        decmer: DecMerNodeView,
        forkjoin: ForkJoinNodeView
    };

    var GraphView = svg.Group.extend({
        name: "graph",
        initialize: function() {
            this._geometry = this.options.geometry;
            // list of vertices that are highlighted as selected
            this._selected = [];
            this.bindToGraph(this.model);
        },
        bindToGraph: function(graph) {
            // remove old views and forget about them
            this.removeChildren();
            // XXX: merge these as this.children?
            this.vertexviews = {};
            this.arcviews = {};
            this.model = graph;

            // no graph, nothing to do
            if (graph === undefined) return;

            // fetch graph elements and space them out
            graph.fetch();

            // If graph model is empty, add an initial and final node
            // don't create them in the storage, just "add" them.
            // if something else is added, all of them will be stored
            if (graph.length === 0) {
                var initial = new graph.model({payload: "initial"});
                var final_ = new graph.model({payload: "final"});
                // one event (set next) is enough trigger spaceout
                graph.add([initial, final_], {silent:true});
                initial.set({next: [final_]});
            }

            graph.spaceOut();

            // create vertex views and remember them by their models' cid
            // we need that to initialize the arc views
            this.vertexviews = foldl(function(acc, vertex) {
                var view = this.append(
                    new nodeviews[vertex.type](
                        {model: vertex, name: "vertex_"+vertex.cid}
                    )
                );
                acc[vertex.cid] = view;
                return acc;
            }, {}, graph.toArray(), this);

            // create arc views
            this.arcviews = foldl(function(acc, arc) {
                var srcview = this.vertexviews[arc.source.cid],
                    tgtview = this.vertexviews[arc.target.cid],
                    arcview = this.insert(0, new ArcView({
                        name: arc.cid,
                        model: arc,
                        srcview: srcview,
                        tgtview: tgtview
                    }));
                acc[arc.cid] = arcview;
                // tell the vertex views its predecessors and successors
                arcview.predecessors.push(srcview);
                arcview.successors.push(tgtview);
                srcview.successors.push(arcview);
                tgtview.predecessors.push(arcview);
                return acc;
            }, {}, graph.arcs, this);

            // XXX: for now we just rebind to graph
            // We are responsible for selectivly removing or adding views
            // graph.bind("add", _.bind(this.createAndRenderVertexView, this));
        }
        // createAndRenderVertexView: function(model) {
        //     var view = this.defchild(
        //         nodeviews[model.type],
        //         {model: model, name: "vertex_"+model.cid}
        //     );
        //     this.vertexviews[model.cid] = view;
        //     view.render();
        //     return view;
        // },
    });
    Object.defineProperties(GraphView.prototype, {
        geometry: {
            get: function() { return this._geometry; },
            set: function(g) {
                // XXX: do the diffing and trigger event
                this._geometry = g;
            }
        },
        selected: {
            // all vertices that carry that node will be highlighted
            set: function(node) {
                this._selected.forEach(function(vertex) {
                    vertex.removeClass("selected");
                });
                this._selected = _.values(this.vertexviews).filter(function(vertex) {
                    if (vertex.model.payload === node) {
                        vertex.addClass("selected");
                        return true;
                    } else {
                        return false;
                    }
                });
            }
        }
    });

    return {
        ArcView: ArcView,
        GraphView: GraphView
    };
});
