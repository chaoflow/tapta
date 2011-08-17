define([
    'require',
    'vendor/underscore.js',
    './base',
    './debug'
], function(require) {
    var DEBUG = require('./debug').ops,
        base = require('./base');

    // an operation that if enabled can be triggered by DOM events
    var Operation = function(layerview) {
        this.layerview = layerview;
        if (DEBUG && this.layerview) console.log("init op: "+this.name);
    };
    Object.defineProperties(Operation.prototype, {
        el: {get: function() { return this.layerview.el; }},
        layer: {get: function() { return this.layerview.model; }},
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
                            var model = obj.layerview.traverseToModel(
                                event.target.id
                            );
                            return obj[mname].call(obj, event, model);
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
        name: {value: "addnode"}
    });

    var AddNewNode = function() { AddNode.apply(this, arguments); };
    AddNewNode.prototype = new AddNode();
    Object.defineProperties(AddNewNode.prototype, {
        delegations: {value: [
            [".graph .arc", "click", "act"]
        ]},
        act: {value: function(event, model) {
            if (model.type !== "arc") throw "Why did you call me?";
            var source = model.source,
                target = model.target;
            // create node
            var collection = this.layer[this.collection],
                node;
            if (collection === undefined) {
                node = "forkjoin";
            } else {
                node = collection.create();
            }

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
            this.layer.activity.set({
                selected: node
            });
            this.layer.activity.save();
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

    var Select = function() { Operation.apply(this, arguments); };
    Select.prototype = new Operation();
    Object.defineProperties(Select.prototype, {
        name: {value: "select"},
        delegations: {value: [
            [".graph .selectable .symbol", "click", "select"]
        ]},
        select: {value: function(event, model) {
            var node = model.payload;
            // ignore nodes, that have non-object payloads (initial, final,...)
            if (node.type === undefined) throw "Why?";
            // make sure there is change:selected event
            // reselecting the same element otherwise moves focus
            this.layer.activity.set({selected: undefined});
            this.layer.activity.set({selected: node});
            this.layer.activity.set({raked: node});
            this.layer.activity.save();
            if (this.selected) {
                this.selected.setAttribute(
                    "class",
                    _(this.selected.getAttribute("class").split(" "))
                        .without("selected").join(" ")
                );
            }
            this.selected = event.target;
            this.selected.setAttribute(
                "class",
                [this.selected.getAttribute("class"), "selected"].join(" ")
            );
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
        subtractArc: {value: function(event, model) {
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
        subtractNode: {value: function(event, model) {
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
            if (model.payload === this.layer.activity.get('raked')) {
                this.layer.activity.set({raked: undefined});
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
            var op = new Op(layerview);
            this[op.name] = op;
            this.list.push(op);
        }, this);
        if (DEBUG) console.groupEnd();
    };
    Object.defineProperties(Operations.prototype, {
        accumulate: {value: base.accumulate},
        Ops: {value: [
            AddNewAction,
            AddNewDecMer,
            AddNewForkJoin,
            Select,
            Subtract
        ]}
    });

    return {
        AddNode: AddNode,
        AddNewNode: AddNewNode,
        AddNewAction: AddNewAction,
        AddNewDecMer: AddNewDecMer,
        AddNewForkJoin: AddNewForkJoin,
        Operation: Operation,
        Operations: Operations,
        Select: Select,
        Subtract: Subtract
    };
});
