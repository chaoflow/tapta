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
                return function() {
                    // trigger backbone events for svg events, this
                    // corresponds to backbone's delegateEvents mechanism
                    this.trigger(event, {view: this, idx: idx});
                };
            };

            // FUTURE: investigate how/whether to use group/symbol/... SVG elements
            // render symbol, will return a set
            var symbol = this.child.symbol = this.symbol(canvas);
            symbol.click(handler("click", "symbol"), this);
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
            if (opts.srcview === undefined) throw "Need srcview";
            // An arcview can also be drawn as a ctrl of a MIMO. In
            // that case it is an open arc, without a target.
            // if (opts.tgtview === undefined) throw "Need tgtview";
            // XXX: bind to our source and target
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
                entrancepoint = [geo.x, geo.y + geo.height / 2],
                exitpoint = [geo.x + geo.width, geo.y + geo.height / 2],
                // points to leave the source to our entrancepoint
                head = this.srcview.exitpath(entrancepoint),
                // points to enter the target from our exitpoint
                tail = this.tgtview ? this.tgtview.entrancepath(exitpoint) : [],
                points = head
                    .concat([entrancepoint])
                    .concat([exitpoint])
                    .concat(tail),
                symbol = canvas.set(),
                arrow = svgarrow(canvas, points, adx, ady);
            arrow.node.setAttribute("class", "arc");
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
        },
        // return via points for entering from source point
        entrancepath: function(srcpoint) { throw "No entrance path defined"; },
        // return via points for exiting to target point
        exitpath: function(tgtpoint) { throw "No exit path defined"; }
    });

    var InitialNodeView = NodeView.extend({
        // a filled circle centered with radius r
        symbol: function(canvas) {
            var cfg = CFG.symbols.initial,
                geo = this.geometry,
                cx = geo.x + cfg.r + (geo.width - 2 * cfg.r) / 2,
                cy = geo.y + cfg.r + (geo.height - 2 * cfg.r) / 2,
                symbol = canvas.set(),
                circle = canvas.circle(cx, cy, cfg.r);
            circle.node.setAttribute("class", "initialnode");
            symbol.push(circle);
            this.exitpoint = [cx + cfg.r, cy];
            return symbol;
        },
        // XXX: this is not really needed, as the arc stretches to our border
        exitpath: function(tgtpoint) {
            // fixed exit point
            return [this.exitpoint];
        }
    });

    var FinalNodeView = NodeView.extend({
        // a filled circle surrounded by an empty circle, vertically
        // centered, left aligned
        symbol: function(canvas) {
            var cfg = CFG.symbols.final_,
                geo = this.geometry,
                cx = geo.x + cfg.r_outer,
                cy = geo.y + cfg.r_outer + (geo.height - 2 * cfg.r_outer) / 2,
                symbol = canvas.set(),
                outer = canvas.circle(cx, cy, cfg.r_outer),
                inner = canvas.circle(cx, cy, cfg.r_inner);
            inner.node.setAttribute("class", "finalnode inner");
            outer.node.setAttribute("class", "finalnode outer");
            this.entrancepoint = [cx - cfg.r_outer - cfg["stroke-width"], cy];
            symbol.push(inner);
            symbol.push(outer);
            return symbol;
        },
        // XXX: this is not really needed, as the arc stretches to our border
        entrancepath: function(srcpoint) {
            // fixed entrance point
            return [this.entrancepoint];
        }
    });


    var ActionNodeView = NodeView.extend({
        // a box with round corners and a label, centered
        symbol: function(canvas) {
            var cfg = CFG.symbols.action,
                label = this.model.payload.get('label'),
                geo = this.geometry,
                x = geo.x + (geo.width - cfg.width) / 2,
                y = geo.y + (geo.height - cfg.height) / 2,
                symbol = canvas.set(),
                rect = canvas.rect(x, y, cfg.width, cfg.height, cfg.r);
            this.entrancepoint = [x - cfg["stroke-width"], y + cfg.height / 2];
            this.exitpoint = [x + cfg.width, y + cfg.height / 2];
            rect.node.setAttribute("class", "actionnode");
            symbol.push(rect);
            if (label) {
                var text = canvas.text(x+5, y+5, label);
                symbol.push(text);
            }
            return symbol;
        },
        // XXX: this is not really needed, as the arc stretches to our border
        entrancepath: function(srcpoint) {
            // fixed entrance point
            return [this.entrancepoint];
        },
        // XXX: this is not really needed, as the arc stretches to our border
        exitpath: function(tgtpoint) {
            // fixed exit point
            return [this.exitpoint];
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
                var model = new Arc({source: this.model});
                model.setGeometry({
                    x: geo.x - ourgeo.x,
                    y: geo.y - ourgeo.y,
                    height: 0,
                    width: model.minwidth
                });
                var arcview = this.append(ArcView, {
                    name: "mimoctrlarc_"+idx,
                    model: model,
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
            var cfg = this.decision ? CFG.symbols.decision : CFG.symbols.merge,
                geo = this.geometry,
                edgelength = Math.sqrt(Math.pow(cfg.width, 2) / 2),
                x = geo.x + (geo.width - edgelength) / 2,
                y = geo.y + (geo.height - edgelength) / 2,
                symbol = canvas.set(),
                rect = canvas.rect(x, y, edgelength, edgelength);
            // XXX: for some reason after a reload it does not rotate
            // around the rect center, but 0,0
            rect.rotate(45, x + edgelength / 2, y + edgelength / 2);
            rect.node.setAttribute(
                "class",
                this.decision ? "decisionnode" : "mergenode"
            );
            symbol.push(rect);
            return symbol;
        },
        entrancepath: function(srcpoint) {
            // XXX: implement
            return [];
        },
        exitpath: function(tgtpoint) {
            // XXX: implement
            return [];
        }
    });
    Object.defineProperties(DecMerNodeView.prototype, {
        // more than one outgoing edge: decision, otherwise at most a merge
        decision: {get: function() { return (this.model.successors.length > 1); }}
    });

    var ForkJoinNodeView = MIMONodeView.extend({
        symbol: function(canvas) {
            var cfg = CFG.symbols.forkjoin,
                geo = this.geometry,
                x = geo.x + (geo.width - cfg.width) / 2,
                y = geo.y + cfg.padY,
                height = geo.height - 2 * cfg.padY,
                symbol = canvas.set(),
                rect = canvas.rect(x, y, cfg.width, height);
            rect.node.setAttribute("class", "forkjoinnode");
            symbol.push(rect);
            return symbol;
        },
        entrancepath: function(srcpoint) {
            // XXX: implement
            return [];
        },
        exitpath: function(tgtpoint) {
            // XXX: implement
            return [];
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
            graph.spaceOut();

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
                var name = ["arc", arc.source.cid, arc.target.cid].join("_"),
                    srcview = this.vertexviews[arc.source.cid],
                    tgtview = this.vertexviews[arc.target.cid],
                    view = this.defchild(ArcView, {
                        name: name,
                        model: arc,
                        srcview: srcview,
                        tgtview: tgtview
                    });
                acc[name] = view;
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
