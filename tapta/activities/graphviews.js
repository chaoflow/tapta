define([
    'require',
    'vendor/underscore.js',
    './base',
    './graph',
    './settings',
    './svgtools'
], function(require) {
    var base = require('./base'),
        View = base.View,
        CFG = require('./settings'),
        Vertex = require('./graph').Vertex,
        svgtools = require('./svgtools'),
        svgarrow = svgtools.svgarrow,
        svgpath = svgtools.svgpath;

    var xToPix = function(x) {
        return CFG.gridsize.x * x;
    };
    var yToPix = function(y) {
        return CFG.gridsize.y * y;
    };

    var GraphElement = View.extend({
        ctrls: function(canvas) { return []; },
        remove: function() {
            // remove children from canvas - our children are raphael sets
            for (var name in this.children) {
                this.children[name].remove();
                delete this.children[name];
            }
        },
        render: function(canvas, editmode) {
            // remove previously rendered stuff
            this.remove();

            // render symbol
            this.children["symbol"] = this.symbol(canvas);

            // render controls
            var ctrls = this.children.ctrls = this.ctrls(canvas, editmode);
            // trigger backbone events in case of svg events
            _.each(ctrls, function(ctrl, idx) {
                // build a handler that remembers us and the ctrl number
                var handler = function(idx) {
                    return function() {
                        this.trigger("click", {view: this, idx: idx});
                    };
                }(idx);
                ctrl.click(handler, this);
            }, this);
        },
        symbol: function(canvas) { throw "Not implemented"; }
    });

    // An arcview connects two vertex views
    var ArcView = GraphElement.extend({
        initialize: function(opts) {
            this.srcview = opts.srcview;
            this.tgtview = opts.tgtview;
            // XXX: bind to our source and target
        },
        ctrls: function(canvas, editmode) {
            // for now just the same line without the arrow head
            // XXX: maybe reuse or a rect (if needed)
            var cfg = CFG.symbols.edge,
                head = this.srcview.exitpath(this.tgtview),
                tail = this.tgtview.entrancepath(this.srcview),
                points = head.concat(tail),
                ctrl = svgpath(canvas, points);
            ctrl.attr(cfg.ctrls[editmode]);
            return [ctrl];
        },
        // The arc is drawn as an SVG path, see:
        // http://www.w3.org/TR/SVG/paths.html#PathData
        symbol: function(canvas) {
            var cfg = CFG.symbols.edge,
                adx = cfg.adx,
                ady = cfg.ady,
                // points to leave the source for target
                head = this.srcview.exitpath(this.tgtview),
                // points to enter the target from source
                tail = this.tgtview.entrancepath(this.srcview),
                points = head.concat(tail),
                symbol = svgarrow(canvas, points, adx, ady);
            symbol.attr({stroke: cfg.stroke,
                         "stroke-width": cfg["stroke-width"]});
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
        // return via points for entering from source view
        entrancepath: function(srcview) { throw "No entrance path defined"; },
        // return via points for exiting to target view
        exitpath: function(tgtview) { throw "No exit path defined"; }
    });
    Object.defineProperties(NodeView.prototype, {
        // XXX: this would be the place for free positioning.
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
        }
    });

    var InitialNodeView = NodeView.extend({
        // a filled circle centered with radius r
        symbol: function(canvas) {
            var cfg = CFG.symbols.initial,
                geo = this.geometry,
                cx = geo.x + cfg.r + (geo.width - 2 * cfg.r) / 2,
                cy = geo.y + cfg.r + (geo.height - 2 * cfg.r) / 2,
                symbol = canvas.circle(cx, cy, cfg.r);
            symbol.attr({fill: cfg.fill});
            this.exitpoint = [cx + cfg.r, cy];
            return symbol;
        },
        // fixed exit point
        exitpath: function(tgtview) {
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
            outer.attr({fill: "black",
                        "fill-opacity": 0,
                        stroke: cfg.stroke,
                        "stroke-width": cfg["stroke-width"]});
            inner.attr({fill: cfg.fill});
            this.entrancepoint = [cx - cfg.r_outer - cfg["stroke-width"], cy];
            symbol.push(inner);
            symbol.push(outer);
            return symbol;
        },
        // fixed entrance point
        entrancepath: function(srcview) {
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
            rect.attr({fill: cfg.fill,
                       stroke: cfg.stroke,
                       "stroke-width": cfg["stroke-width"]});
            symbol.push(rect);
            if (label) {
                var text = canvas.text(x+5, y+5, label);
                symbol.push(text);
            }
            return symbol;
        }
    });

    var DecMerNodeView = NodeView.extend({
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
                symbol = canvas.rect(x, y, edgelength, edgelength);
            symbol.rotate(45);
            symbol.attr({fill: cfg.fill,
                         stroke: cfg.stroke,
                         "stroke-width": cfg["stroke-width"]});
        }
    });
    Object.defineProperties(DecMerNodeView.prototype, {
        // more than one outgoing edge: decision
        decision: {get: function() { return (this.outgoing > 1); }}
    });

    var ForkJoinNodeView = NodeView.extend({
        symbol: function(canvas) {
            var cfg = CFG.symbols.forkjoin,
                geo = this.geometry,
                x = geo.x + (geo.width - cfg.width) / 2,
                y = geo.y + cfg.padY,
                height = geo.height - 2 * cfg.padY,
                symbol = canvas.rect(x, y, cfg.width, height);
            symbol.attr({fill: cfg.fill,
                         stroke: cfg.stroke,
                         "stroke-width": cfg["stroke-width"]});
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

            // fetch graph elements
            graph.fetch();

            // If graph model is empty, add an initial and final node
            // don't create them in the storage, just "add" them.
            // if something else is added, all of them will be stored
            if (graph.length === 0) {
                var initial = new Vertex({payload: "initial"});
                var final_ = new Vertex({payload: "final"});
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

            // create arc views
            this.arcviews = foldl(function(acc, arc) {
                var name = ["arc", arc[0].cid, arc[1].cid].join("_"),
                    srcview = this.vertexviews[arc[0].cid],
                    tgtview = this.vertexviews[arc[1].cid],
                    view = this.defchild(ArcView, {
                        name: name,
                        srcview: srcview,
                        tgtview: tgtview
                    });
                acc[name] = view;
                return acc;
            }, {}, graph.arcs(), this);

            // We are responsible for selectivly removing or adding views
            // XXX
            // graph.bind("add", XXX);
            // graph.bind("remove", XXX);
        },
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
        GraphView: GraphView
    };
});
