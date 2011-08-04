define([
    'require',
    './base',
    './debug',
    './graphutils',
    './graphviews'
], function(require) {
    var DEBUG = require('./debug').controller,
        base = require('./base'),
        Arc = require('./graphutils').Arc,
        ArcView = require('./graphviews').ArcView;

    // A final node is dragged around and MIMOs that are willing to
    // accept it offer arcs without source
    var PathMergeMode = function() {
        // XXX: legacy
        this.view = this;
        this.draggednodeview = undefined;
        this.odx = 0;
        this.ody = 0;
        this.ctrls = [];
        _.bindAll(this, "act", "dndmove");
    };
    _(PathMergeMode.prototype).extend({
        extraClassNames: [],
        name: "pathmerge",
        act: function(info) {
            var mimoarcview = info.view,
                finmodel = this.draggednodeview.model,
                b4final = finmodel.predecessors[0].predecessors[0],
                mimo = mimoarcview.tgtview.model;
            this.deactivate(this.layerview);
            b4final.next.splice(b4final.next.indexOf(finmodel), 1, mimo);
            b4final.save();
            finmodel.destroy();
        },
        activate: function(layerview) {
            layerview.bind("dndmove", this.dndmove);
            layerview.bind("mouseup", this.act);
            this.layerview = layerview;
            var ctrls = this.ctrls;
            // idx = 0 / -1
            var activatemimos = function(view, type, idx) {
                if (view.model.type === type) {
                    var arc = new Arc({target: view.model});
                    // relative to view.geometry
                    arc.setGeometry({
                        x: - arc.minwidth / 3,
                        y: -1 * idx * view.model.geometry.height,
                        height: 0,
                        width: arc.minwidth / 3
                    });
                    var arcview = view.defchild(ArcView, {
                        name: "mimoinctrlarc_"+idx,
                        model: arc,
                        tgtview: view
                    });
                    ctrls.push(arcview);
                    arcview.render(layerview.activityview.canvas,
                                   layerview.editmode);
                    _.each(_.values(arcview.child), function(set) {
                        _.each(set, function(elem) {
                            elem.node.setAttribute(
                                "class",
                                elem.node.getAttribute("class") + " mimoctrl pathmerge"
                            );
                        });
                    });
                }
                if (view.successors.length > 0) {
                    activatemimos(view.successors.slice(idx)[0], type, idx);
                }
            };
            var mimos = function(view, above, below) {
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
            };
            mimos(this.draggednodeview, true, true);
        },
        deactivate: function(layerview) {
            if (this.draggednodeview === undefined) return;
            layerview.unbind("dndmove", this.dndmove);
            layerview.unbind("mouseup", this.act);
            delete this.layerview;
            this.draggednodeview.child.symbol.translate(-this.odx, -this.ody);
            delete this.draggednodeview;
            this.odx = this.ody = 0;
            _.each(this.ctrls, function(ctrl) { ctrl.remove(); });
            this.ctrls = [];
        },
        dndmove: function(info) {
            this.draggednodeview.child.symbol.translate(
                info.dx - this.odx,
                info.dy - this.ody
            );
            this.odx = info.dx;
            this.ody = info.dy;
        }
    });
    var pathmergemode = new PathMergeMode();

    // a controller that attaches to a layer
    var LayerController = function(layerview) {
        this.name = "controller";
        this.parent = layerview;
        this.layerview = layerview;
        _.bindAll(this, "handler");
    };
    _(LayerController.prototype).extend({
        abspath: base.abspath,
        location: base.location,
        handler: function(event, info) {
            DEBUG && console.group(
                "controller:" +this.abspath() + ": "
                    + [event, info.view.name].join(", ")
            );

            switch (event) {
            case "click":
                if ((info.view.model.type === "action") &&
                    (info.idx === 0)) {
                    // tell next layer which activity to display
                    var action = info.view.model.payload,
                        layer = this.layerview.model;
                    if (action.get('activity') === undefined) {
                        action.set({
                            activity: layer.next.activities.create()
                        });
                        action.save();
                    }
                    layer.activity.set({raked: action});
                    layer.activity.save();
                }
                break;
            case "dndstart":
                // switch to pathmergemode
                this.prev_editmode = this.layerview.editmode;
                // XXX: if creating a new pathmergemode the old
                // one does not vanish but is still around and translates
                // the previous node
                // XXX: unbind was not done properly - should be fixed by now
                pathmergemode.draggednodeview = info.view;
                this.layerview.editmode = pathmergemode;
                break;
            case "dndstop":
                this.layerview.editmode = this.prev_editmode;
                break;
            case "editmode":
                // switch to editmode
                this.layerview.editmode = info;
                break;
            }

            // supported operations
            //
            // add node: (click/drag)
            // sources:
            // - new node icon
            // - lib element
            // targets:
            // - edge
            // - ctrl area right of mimo
            //
            // move node (editmode: select):
            // - drag final, drop on ctrl area left of MIMO
            // - drag action, drop on edge (cut and paste)

                // current arc needs to be rerendered
                //
                // view for new vertex needs to be created and rendered
                // --> eg. via add
                //
                // arc between new vertex and old target needs to be created and rendered
                // target has new geometry and needs to be moved


            DEBUG && console.groupEnd();
        }
    });

    return LayerController;
});
