define([
    'require',
    'vendor/underscore.js',
    './base',
    './graphutils',
    './graphviews',
    './debug'
], function(require) {
    var DEBUG = require('./debug').ops,
        base = require('./base'),
        Arc = require('./graphutils').Arc,
        ArcView = require('./graphviews').ArcView;

    // an operation that if enabled can be triggered by DOM events
    var Operation = function(ops) {
        // all operations
        this.ops = ops;
        if (DEBUG && this.ops) console.log("init op: "+this.name);
    };
    Object.defineProperties(Operation.prototype, {
        el: {get: function() { return this.layerview.el; }},
        layer: {get: function() { return this.layerview.model; }},
        layerview: {get: function() { return this.ops.layerview; }},
        name: {value: "operation"}
    });
    base.defineToggleProperty(
        "enabled",
        "enable", function() {
            this.delegations.forEach(function(info) {
                var selector = info[0],
                    event = [info[1], this.name].join("."),
                    mname = info[2],
                    method = function(obj) {
                        return function(event) {
                            var view = obj.layerview.traverse(
                                event.target.id
                            )[0];
                            return obj[mname].call(obj, event, view);
                        };
                    }(this);
                $(this.el).delegate(selector, event, method);
            }, this);
        },
        "disable", function() { $(this.el).undelegate("." + this.name); },
        Operation.prototype
    );

    var AddNode = function() { Operation.apply(this, arguments); };
    AddNode.prototype = new Operation();
    Object.defineProperties(AddNode.prototype, {
        act: {value: function(event, view) {
            if (view.model.type !== "arc") throw "Why did you call me?";
            var model = view.model,
                source = model.source,
                target = model.target,
                node = this.getNode();

            // create new vertex with action as payload
            var graph = this.layerview.model.activity.graph,
                // XXX: this triggers already spaceOut and
                // silent:true seems not to work
                newvert = new graph.model({payload: node});

            if (target === undefined) {
                // Open arc of a MIMO, create final node
                target = new graph.model({payload: "final"});
                graph.add(target, {silent:true});
                source.next.splice(model.addnewidx, 0, newvert);
            } else {
                // change next of source without triggering an event
                source.next.splice(source.next.indexOf(target), 1, newvert);
            }
            newvert.next.push(target);
            graph.add(newvert, {silent:true});
            target.save();
            newvert.save();
            source.save();
            // XXX: this currently triggers rebinding of the graphview
            graph.trigger("rebind");
        }},
        delegations: {value: [
            [".graph .arc", "click", "act"]
        ]},
        getNode: {value: function() { throw "Not implemented"; }},
        name: {value: "addnode"}
    });

    var AddLibAction = function() { AddNode.apply(this, arguments); };
    AddLibAction.prototype = new AddNode();
    Object.defineProperties(AddLibAction.prototype, {
        name: {value: "addlibaction"},
        getNode: {value: function() { return this.layer.activity.get("selected"); }}
    });

    var AddNewNode = function() { AddNode.apply(this, arguments); };
    AddNewNode.prototype = new AddNode();
    Object.defineProperties(AddNewNode.prototype, {
        getNode: {value: function() {
            var collection = this.layer[this.collection];
            return collection ? collection.create() : "forkjoin";
        }}
    });

    var AddNewAction = function() { AddNewNode.apply(this, arguments); };
    AddNewAction.prototype = new AddNewNode();
    Object.defineProperties(AddNewAction.prototype, {
        name: {value: "addnewaction"},
        collection: {value: "actions"}
    });

    var AddNewDecMer = function() { AddNewNode.apply(this, arguments); };
    AddNewDecMer.prototype = new AddNewNode();
    Object.defineProperties(AddNewDecMer.prototype, {
        name: {value: "addnewdecmer"},
        collection: {value: "decmers"}
    });

    var AddNewForkJoin = function() { AddNewNode.apply(this, arguments); };
    AddNewForkJoin.prototype = new AddNewNode();
    Object.defineProperties(AddNewForkJoin.prototype, {
        name: {value: "addnewforkjoin"},
        collection: {value: "forkjoins"}
    });

    var MergePaths = function() { Operation.apply(this, arguments); };
    MergePaths.prototype = new Operation();
    Object.defineProperties(MergePaths.prototype, {
        name: {value: "mergepaths"},
        delegations: {value: [
            [".graph .mimoctrlin", "mouseup", "merge"]
        ]},
        enable: {value: function() {
            Operation.prototype.enable.call(this);
            this.mimoctrls_on();
        }},
        disable: {value: function() {
            Operation.prototype.disable.call(this);
            this.mimoctrls_off();
        }},
        merge: {value: function(event, arcview) {
            var finmodel = this.draggedview.model,
                b4final = finmodel.predecessors[0].predecessors[0],
                mimo = arcview.tgtview.model;
            b4final.next.splice(b4final.next.indexOf(finmodel), 1, mimo);
            b4final.save();
            finmodel.destroy();
            this.enabled = false;
        }},
        mimoctrls_on: {value: function() {
            var mimoctrls = this.mimoctrls = [];
            // idx = 0 / -1
            var activatemimos = _.bind(function(view, type, idx) {
                if (view.model.type === type) {
                    var arc = new Arc({target: view.model});
                    // relative to view.geometry
                    arc.setGeometry({
                        x: - arc.minwidth / 3,
                        y: -1 * idx * view.model.geometry.height,
                        height: 0,
                        width: arc.minwidth / 3
                    });
                    var arcview = new ArcView({
                        className: "mimoctrlin",
                        name: "mimoctrlin_"+idx,
                        model: arc,
                        tgtview: view
                    });
                    // XXX: maybe an arc or GEs could also live
                    // without parents without throwing exceptions
                    view.adopt(arcview);
                    mimoctrls.push(arcview);
                    $(this.layerview.activityview.graphview.el).append(
                        arcview.render().el
                    );
                }
                if (view.successors.length > 0) {
                    activatemimos(view.successors.slice(idx)[0], type, idx);
                }
            }, this);
            var mimos = _.bind(function(view, above, below) {
                if (!(above || below)) return;
                // XXX: for now only one predecessor
                if (view.predecessors.length === 0) return;
                var prede = view.predecessors[0],
                    predetype = prede.model.type,
                    viewidx = prede.successors.indexOf(view);
                if (viewidx === -1) throw "Broken graph";
                // predecessor is a mimo
                if ((predetype === "decmer") || (predetype === "forkjoin")) {
                    // not the first
                    if (above && (viewidx > 0)) {
                        above = false;
                        activatemimos(prede.successors[viewidx-1],
                                      predetype,
                                      -1);
                    }
                    // not the last
                    if (below && (viewidx !== prede.successors.length - 1)) {
                        below = false;
                        activatemimos(prede.successors[viewidx+1],
                                      predetype,
                                      0);
                    }
                }
                mimos(prede, above, below);
            }, this);
            mimos(this.draggedview, true, true);
            return mimoctrls;
        }},
        mimoctrls_off: {value: function() {
            this.mimoctrls.forEach(function(ctrl) {
                ctrl.remove();
                delete ctrl.parent.child[ctrl.name];
            }, this);
            this.mimoctrls = [];
        }}
    });

    var DragFinal = function() { Operation.apply(this, arguments); };
    DragFinal.prototype = new Operation();
    Object.defineProperties(DragFinal.prototype, {
        name: {value: "dragfinal"},
        delegations: {value: [
            [".graph .node.final", "mousedown", "dndstart"]
        ]},
        dndmove: {value: function(event) {
            var dx = event.pageX - this.x0,
                dy = event.pageY - this.y0;
            this.draggedview.el.setAttribute(
                "transform", "translate("+dx+","+dy+")"
            );
            this.ops.mergepaths.enabled = true;
        }},
        dndstart: {value: function(event, view) {
            this.draggedview = view;
            this.ops.mergepaths.draggedview = view;
            // register for move event to move around the final node
            // (and its incoming edge)
            $(document).bind("mousemove.dragfinal",
                             _.bind(this.dndmove, this));

            // register for mouseup to stop dragging
            // the actual drop is handled by MergePaths
            $(document).bind("mouseup.dragfinal",
                             _.bind(this.dndstop, this));

            this.x0 = event.pageX;
            this.y0 = event.pageY;
        }},
        dndstop: {value: function(event) {
            this.draggedview.el.setAttribute(
                "transform", "translate(0,0)"
            );
            delete this.draggedview;
            this.ops.mergepaths.enabled = false;
            $(document).unbind(".dragfinal");
        }}
    });

    var Select = function() { Operation.apply(this, arguments); };
    Select.prototype = new Operation();
    Object.defineProperties(Select.prototype, {
        name: {value: "select"},
        delegations: {value: [
            [".graph .selectable", "click", "select"]
        ]},
        select: {value: function(event, view) {
            var node = view.model.payload;
            // ignore nodes, that have non-object payloads (initial, final,...)
            if (node.type === undefined) throw "Why?";
            // make sure there is change:selected event
            // reselecting the same element otherwise moves focus
            this.layer.activity.unset("selected");
            this.layer.activity.set({selected: node});
            this.layer.activity.save();
        }}
    });

    /*
     * Subtract an item from the graph, this only removes the vertex
     * or arc, the payload eventually continues to live in the library
     * XXX: extend to also remove from libraries, if items are unused.
     */
    var Subtract = function() { Operation.apply(this, arguments); };
    Subtract.prototype = new Operation();
    Object.defineProperties(Subtract.prototype, {
        name: {value: "subtract"},
        delegations: {value: [
            [".graph .arc.subtractable", "click", "subtractArc"],
            [".graph .node.subtractable", "click", "subtractNode"]
        ]},
        enable: {value: function() {
            Operation.prototype.enable.call(this);
            if (this.layer.activity) this.layer.activity.unset("selected");
        }},
        subtractArc: {value: function(event, view) {
            var model = view.model;
            // XXX: remove graph dependency
            var graph = this.layerview.model.activity.graph;
            // XXX: could be declarative as sanity check
            if (!model.subtractable) throw "Nope";
            // prede -> arc(model) -> succ
            var prede = model.predecessors[0],
                succ = model.successors[0];
            prede.next.splice(prede.next.indexOf(succ), 1);
            prede.save();
            // XXX: get rid of this
            graph.trigger("rebind");
        }},
        subtractNode: {value: function(event, view) {
            var model = view.model;
            // XXX: remove graph dependency
            var graph = this.layerview.model.activity.graph;
            // XXX: could be declarative as sanity check
            if (!model.subtractable) throw "Nope";
            // node -> arc -> node
            var predecessor = model.predecessors[0].predecessors[0],
                predenext = predecessor.next,
                // node -> arc -> node
                successor = model.successors[0].successors[0];
            if (model.predecessors.length !== 1) throw "Not subtractable";
            if (model.successors.length !== 1) throw "Not subtractable";
            // XXX: order of the calls is important to always have a valid model
            // silencing events would be a solution but somehow did
            // not work, therefore the code duplication for now.
            if ((successor.payload === "final") && (predenext.length > 1)) {
                predenext.splice(predenext.indexOf(model), 1);
                predecessor.save();
                successor.destroy({silent: true});
                model.destroy({silent: true});
            } else {
                predenext.splice(predenext.indexOf(model), 1, successor);
                predecessor.save();
                model.destroy({silent: true});
            }
            if (model.payload === this.layer.activity.get('selected')) {
                this.layer.activity.unset("selected");
                this.layer.activity.save();
            }
            graph.trigger("rebind");
        }}
    });

    /*
     * all operations ready to be initialized on a layerview
     */

    // initialize all operations for a layer, by default all are disabled
    var Operations = function(layerview) {
        if (layerview === undefined) return;
        this.layerview = layerview;
        if (DEBUG) console.group("init ops: "+this.layerview.abspath());
        this.list = [];
        this.accumulate("Ops").forEach(function(Op) {
            var op = new Op(this);
            this[op.name] = op;
            this.list.push(op);
        }, this);
        if (DEBUG) console.groupEnd();
    };
    Object.defineProperties(Operations.prototype, {
        accumulate: {value: base.accumulate},
        Ops: {value: [
            AddLibAction,
            AddNewAction,
            AddNewDecMer,
            AddNewForkJoin,
            DragFinal,
            MergePaths,
            Select,
            Subtract
        ]}
    });

    return {
        AddNode: AddNode,
        AddLibAction: AddLibAction,
        AddNewNode: AddNewNode,
        AddNewAction: AddNewAction,
        AddNewDecMer: AddNewDecMer,
        AddNewForkJoin: AddNewForkJoin,
        DragFinal: DragFinal,
        MergePaths: MergePaths,
        Operation: Operation,
        Operations: Operations,
        Select: Select,
        Subtract: Subtract
    };
});
