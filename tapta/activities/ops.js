define([
    'require',
    'vendor/underscore.js',
    './base'
], function(require) {
    var base = require('./base');

    // an operation that if enabled can be triggered by DOM events
    var Operation = function(layerview) {
        this.layerview = layerview;
    };
    Object.defineProperties(Operation.prototype, {
        el: {get: function() { return this.layerview.el; }},
        layer: {get: function() { return this.layerview.model; }}
    });
    base.defineToggleProperty(
        "enabled",
        "enable", function() {
            this.delegations.forEach(function(info) {
                var selector = info[0],
                    event = [info[1], this.namespace].join("."),
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
        "disable", function() { $(this.el).undelegate("."+this.name); },
        Operation.prototype
    );

    /*
     * Subtract an item from the graph, this only removes the vertex
     * or arc, the payload eventually continues to live in the library
     * XXX: extend to also remove from libraries, if items are unused.
     */
    var Subtract = function() { Operation.apply(this, arguments); };
    Subtract.prototype = new Operation();
    _(Subtract.prototype).extend({
        name: "subtract",
        delegations: [
            [".activity .arc.subtractable", "click", "subtractArc"],
            [".activity .node.subtractable", "click", "subtractNode"]
        ],
        subtractArc: function(event, model) {
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
        },
        subtractNode: function(event, model) {
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
        }
    });

    /*
     * all operations ready to be initialized on a layerview
     */

    // initialize all operations for a layer, by default all are disabled
    var Operations = function(layerview) {
        if (layerview === undefined) return;
        this.accumulate("Ops").forEach(function(Op) {
            var op = new Op(layerview);
            this[op.name] = op;
        }, this);
    };
    Object.defineProperties(Operations.prototype, {
        accumulate: {value: base.accumulate},
        Ops: {value: [Subtract]}
    });

    return {
        Operation: Operation,
        Operations: Operations,
        Subtract: Subtract
    };
});
