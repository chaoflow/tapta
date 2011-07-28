define([
    'require',
    'jquery',
    'vendor/underscore.js',
    './base',
    './graphutils',
    './settings',
    './svgtools'
], function(require) {
    var base = require('./base'),
        View = base.View,
        CFG = require('./settings'),
        Arc = require('./graphutils').Arc,
        svgtools = require('./svgtools'),
        svgarrow = svgtools.svgarrow,
        svgpath = svgtools.svgpath;

    var xToPix = function(x) {
        return Math.round(CFG.gridsize.x * x);
    };
    var yToPix = function(y) {
        return Math.round(CFG.gridsize.y * y);
    };

    // ATTENTION: GraphElements are no real views: their el is not
    // added to the DOM, instead they render SVG elements on a
    // canvas. They also catch certain events and translate them into
    // backbone events triggered on themselves, thus propagating them
    // up the view hierarchy.
    var GraphElement = View.extend({
        draggable: false,
        // whether an element can be subtracted from a graph
        subtractable: false,
        ctrls: function(canvas) { return canvas.set(); },
        remove: function() {
            // remove children from canvas - our children are raphael sets
            for (var name in this.child) {
                this.child[name].remove();
                delete this.child[name];
            }
        },
        render: function(canvas, editmode) {
            // remove previously rendered stuff
            this.remove();

            // used to create handlers for specific events and aspects of us
            // event is the name of an event, eg. click
            // idx is either 'symbol' or the idx of the ctrl
            var handler = function(event, idx) {
                // in case of dndmove its dx and dy
                return function(dx, dy) {
                    // trigger backbone events for svg events, this
                    // corresponds to backbone's delegateEvents mechanism
                    this.trigger(event, {view: this, idx: idx, dx: dx, dy: dy});
                };
            };

            // FUTURE: investigate how/whether to use group/symbol/... SVG elements
            // render symbol, will return a set
            var symbol = this.child.symbol = this.symbol(canvas);
            symbol.click(handler("click", "symbol"), this);
            if (this.draggable) {
                symbol.drag(
                    handler("dndmove", "symbol"),
                    handler("dndstart", "symbol"),
                    handler("dndstop", "symbol"),
                    this
                );
            }
            if (this.subtractable) {
                _.each(symbol, function(part) {
                    part.node.setAttribute(
                        "class",
                        part.node.getAttribute("class") + " subtractable"
                    );
                });
            }

            // render controls
            var ctrls = this.child.ctrls = this.ctrls(canvas, editmode);
            _.each(ctrls, function(ctrl, idx) {
                ctrl.click(handler("click", idx), this);
                ctrl.mouseup(handler("mouseup", idx), this);
            }, this);
        },
        symbol: function(canvas) { throw "Not implemented"; }
    });
    Object.defineProperties(GraphElement.prototype, {
        // this would be the place for free positioning.
        geometry: {
            // We use fixed size and do not scale depending on available space
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
        subtractable: {get: function() { return false; }}
    });


    // An arcview connects two vertex views
    var ArcView = GraphElement.extend({
        initialize: function(opts) {
            this.srcview = opts.srcview;
            this.tgtview = opts.tgtview;
            // An arcview can also be drawn as a ctrl of a MIMO. In
            // that case it is an open arc, without a target/source
            // if (opts.srcview === undefined) throw "Need srcview";
            // if (opts.tgtview === undefined) throw "Need tgtview";
            // XXX: bind to our source and target
            // XXX: hack - should be in GraphElement
            this.predecessors = [];
            this.successors = [];
        },
        ctrls: function(canvas, editmode) {
            var cfg = CFG.symbols.arc.ctrl,
                geo = this.geometry,
                y = geo.y + geo.height / 2 - cfg.height / 2,
                ctrls = canvas.set(),
                ctrl = canvas.rect(geo.x, y, geo.width, cfg.height);
            ctrl.node.setAttribute("class", "arc ctrl");
            ctrls.push(ctrl);
            return ctrls;
        },
        // The arc is drawn as an SVG path, see:
        // http://www.w3.org/TR/SVG/paths.html#PathData
        symbol: function(canvas) {
            var cfg = CFG.symbols.arc,
                adx = cfg.adx,
                ady = cfg.ady,
                geo = this.geometry,
                begin = [geo.x, geo.y + geo.height / 2],
                end = [geo.x + geo.width, geo.y + geo.height / 2],
                // points to leave the source to our entrancepoint
                head = this.srcview ? this.srcview.exitpath(begin) : [],
                // points to enter the target from our exitpoint
                tail = this.tgtview ? this.tgtview.entrancepath(end) : [],
                points = head
                    .concat([begin])
                    .concat([end]),
                symbol = canvas.set(),
                arrow = svgarrow(canvas, points, adx, ady);
            if (tail.length > 0) {
                var path = svgpath(canvas, [end].concat(tail));
                path.node.setAttribute("class", "arc");
                path.toBack();
                symbol.push(path);
            }
            arrow.node.setAttribute("class", "arc");
            arrow.toBack();
            symbol.push(arrow);
            return symbol;
        }
    });


    // XXX: are we able to be stateless? binding to canvas elements could be a problem

    // if our elements do not exist anymore we do not have to care whether
    // we have bound functions to it. apart from that we can manage
    // everything stateless. the render method in this case needs to receive
    // the container geometry and the mode it shall render. It is possible
    // that one graph is displayed twice with different mode and will
    // generate events accordingly.

    // Let's call modes flavours!

    // vertex is the thing without knowledge of its payload. We are
    // not viewing the vertex, but it's payload, which is a node.
    var NodeView = GraphElement.extend({
        initialize: function() {
            // bind to our model
            this.model.bind("change:geometry", function(opts) {
                // XXX use opts.diff to move existing symol
            });
            // XXX: hack - should be in GraphElement
            this.predecessors = [];
            this.successors = [];
        },
        // return via points for entering from source point
        entrancepath: function(srcpoint) { return []; },
        // return via points for exiting to target point
        exitpath: function(tgtpoint) { return []; }
    });

    var InitialNodeView = NodeView.extend({
        // a filled circle centered with radius r
        symbol: function(canvas) {
            var geo = this.geometry,
                cx = geo.x + geo.width / 2,
                cy = geo.y + geo.height / 2,
                r = geo.width / 2,
                circle = canvas.circle(cx, cy, r),
                symbol = canvas.set();
            circle.node.setAttribute("class", "initial node");
            symbol.push(circle);
            return symbol;
        }
    });

    var FinalNodeView = NodeView.extend({
        draggable: true,
        // a filled circle surrounded by an empty circle, vertically
        // centered, left aligned
        symbol: function(canvas) {
            var geo = this.geometry,
                cx = geo.x + geo.width / 2,
                cy = geo.y + geo.height / 2,
                r_outer = geo.width / 2,
                r_inner = r_outer - 4,
                outer = canvas.circle(cx, cy, r_outer),
                inner = canvas.circle(cx, cy, r_inner),
                symbol = canvas.set();
            inner.node.setAttribute("class", "final node inner");
            outer.node.setAttribute("class", "final node outer");
            symbol.push(inner);
            symbol.push(outer);
            return symbol;
        }
    });


    var ActionNodeView = NodeView.extend({
        // a box with round corners and a label, centered
        symbol: function(canvas) {
            var cfg = CFG.symbols.action,
                label = this.model.payload.get('label'),
                geo = this.geometry,
                y = geo.y + (geo.height - cfg.height) / 2,
                rect = canvas.rect(geo.x, y, geo.width, cfg.height, cfg.r),
                symbol = canvas.set();
            rect.node.setAttribute("class", "action node");
            symbol.push(rect);
            if (label) {
                var text = canvas.text(geo.x+5, y+5, label);
                symbol.push(text);
            }
            return symbol;
        }
    });
    Object.defineProperties(ActionNodeView.prototype, {
        subtractable: {get: function() { return true; }}
    });


    // DecMer and ForkJoin are MIMOs
    var MIMONodeView = NodeView.extend({
        ctrls: function(canvas, editmode) {
            // our models successors are arcs
            // Before, in between and after them we need to create
            // open arcs (models+views), they are our ctrls.
            // it's all about model geometry
            var geos = map("succ.geometry", this.model.successors),
                lastgeo = _.last(geos),
                ourgeo = this.model.geometry,
                ctrls = canvas.set();
            // add one fake geo after the last
            geos.push({
                x: geos[0].x,
                y: lastgeo.y + lastgeo.height
            });
            _.each(geos, function(geo, idx) {
                var arc = new Arc({source: this.model});
                arc.setGeometry({
                    x: geo.x - ourgeo.x,
                    y: geo.y - ourgeo.y,
                    height: 0,
                    width: arc.minwidth / 3
                });
                var arcview = this.append(ArcView, {
                    name: "mimoctrlarc_"+idx,
                    model: arc,
                    srcview: this
                });
                arcview.addnewidx = idx;
                arcview.render(canvas, editmode);
                _.each(_.values(arcview.child), function(set) {
                    _.each(set, function(elem) {
                        elem.node.setAttribute(
                            "class",
                            elem.node.getAttribute("class") + " mimoctrl"
                        );
                    });
                    ctrls.push(set);
                });
            }, this);
            return ctrls;
        }
    });
    Object.defineProperties(MIMONodeView.prototype, {
        // more than one outgoing edge: decision
        subtractable: {get: function() {
            return ((this.model.predecessors.length === 1) &&
                    (this.model.successors.length === 1));
        }}
    });

    var DecMerNodeView = MIMONodeView.extend({
        // a diamond: colored bigger in case of decision (two outgoing)
        // without color and smaller in case of pure merge (one outgoing)
        // reasoning: a decmer with only one outgoing edge is at most a
        // merge, but not a decision. Only decisions are colorful -
        // they need to stand out, as human needs to do something in
        // contrast to forkjoin and pure merge.
        symbol: function(canvas) {
            var geo = this.geometry,
                edgelength = geo.width / Math.sqrt(2),
                x = geo.x + (geo.width - edgelength) / 2,
                y = geo.y + (geo.height - edgelength) / 2,
                rect = canvas.rect(x, y, edgelength, edgelength),
                symbol = canvas.set();
            // XXX: for some reason after a reload it does not rotate
            // around the rect center, but 0,0
            rect.rotate(45, x + edgelength / 2, y + edgelength / 2);
            rect.node.setAttribute(
                "class",
                this.decision ? "decision node" : "merge node"
            );
            symbol.push(rect);
            return symbol;
        },
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
        decision: {get: function() { return (this.model.successors.length > 1); }}
    });

    var ForkJoinNodeView = MIMONodeView.extend({
        symbol: function(canvas) {
            var geo = this.geometry,
                rect = canvas.rect(geo.x, geo.y, geo.width, geo.height),
                symbol = canvas.set();
            rect.node.setAttribute("class", "forkjoin node");
            symbol.push(rect);
            return symbol;
        }
    });

    var nodeviews = {
        initial: InitialNodeView,
        "final": FinalNodeView,
        action: ActionNodeView,
        decmer: DecMerNodeView,
        forkjoin: ForkJoinNodeView
    };

    // A graph contains vertices, arcs and control areas
    var GraphView = base.View.extend({
        initialize: function() {
            this._geometry = this.options.geometry;
            this.bindToGraph(this.model);
        },
        bindToGraph: function(graph) {
            // remove old views and forget about them
            this.remove();
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
                var view = this.defchild(
                    nodeviews[vertex.type],
                    {model: vertex, name: "vertex_"+vertex.cid}
                );
                acc[vertex.cid] = view;
                return acc;
            }, {}, graph.toArray(), this);

            // XXX: adapt to new graph.arcs format
            // create arc views
            this.arcviews = foldl(function(acc, arc) {
                var srcview = this.vertexviews[arc.source.cid],
                    tgtview = this.vertexviews[arc.target.cid],
                    arcview = this.defchild(ArcView, {
                        name: arc.cid,
                        model: arc,
                        srcview: srcview,
                        tgtview: tgtview
                    });
                acc[arc.cid] = arcview;
                // tell the vertex views its predecessors and successors
                arcview.predecessors.push(srcview);
                arcview.successors.push(tgtview);
                srcview.successors.push(arcview);
                tgtview.predecessors.push(arcview);
                return acc;
            }, {}, graph.arcs(), this);

            // XXX: for now we just rebind to graph
            // We are responsible for selectivly removing or adding views
            // graph.bind("add", _.bind(this.createAndRenderVertexView, this));
        },
        // createAndRenderVertexView: function(model) {
        //     var view = this.defchild(
        //         nodeviews[model.type],
        //         {model: model, name: "vertex_"+model.cid}
        //     );
        //     this.vertexviews[model.cid] = view;
        //     view.render(this.canvas, this.editmode);
        //     return view;
        // },
        remove: function() {
            var name;
            for (name in this.vertexviews) {
                this.vertexviews[name].remove();
            }
            for (name in this.arcviews) {
                this.arcviews[name].remove();
            }
        },
        render: function(canvas, editmode) {
            // // remember these for views of later added vertices
            // this.canvas = canvas;
            // this.editmode = editmode;
            // XXX: switch to use a set as container for all children
            var name;
            for (name in this.vertexviews) {
                this.vertexviews[name].render(canvas, editmode);
            }
            for (name in this.arcviews) {
                this.arcviews[name].render(canvas, editmode);
            }
        }
    });
    Object.defineProperties(GraphView.prototype, {
        geometry: {
            get: function() { return this._geometry; },
            set: function(g) {
                // XXX: do the diffing and trigger event
                this._geometry = g;
            }
        }
    });

    return {
        ArcView: ArcView,
        GraphView: GraphView
    };
});
