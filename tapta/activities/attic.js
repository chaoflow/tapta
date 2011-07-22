
    var Node = ElementView.extend({
        render: function(mode) {
            _.each([
                "symbol",
                "removearea",
                "ctrlareas"
            ], function(item) {
                var elem = this[item](canvas, ui, mode);
                if (elem) {
                    set.push(elem);
                    this.elems = this.elems || {};
                    this.elems[item] = elem;
                }
            }, this);
        },
        removable: function() { return false; },
        removearea: function(canvas, ui, mode) {
            var area;
            if ((mode.name === "removing") && this.removable(mode)) {
                area = canvas.rect(ui.x, ui.y, ui.dx, ui.dy);
                area.attr({fill: "red", opacity:"0.15"});
                area.click(function() {
                    this.trigger("act:remove", [this.model]);
                }, this);
            }
            return area;
        },
    });

    var Final = Node.extend({
        removable: function() {
            var slot = this.parent.cid;
            var previousnode = this.ui().incoming[0].model.source;
            return previousnode instanceof model.MIMO
                && previousnode.ui[slot].outgoing.length > 1;
        },
    });

    var Action = Node.extend({
        ctrlareas: function(canvas, ui, mode) {
            var ctrl;
            if (mode.name === "selecting") {
                ctrl = this.rakeArea(canvas, ui);
            }
            return ctrl;
        },
        rakeArea: function(canvas, ui) {
            var symbol = this.elems.symbol[0].attrs;
            // calculate and draw rake, lower right corner
            var rdx = symbol.width / 3;
            var rdy = symbol.height / 3;
            var rx = symbol.x + symbol.width - rdx;
            var ry = symbol.y + symbol.height - rdy;
            // XXX: make conditional, not for lowest layer - probably just a flag
            // something like getUtility would be nice, or even acquisition.
            // Did I say acquisition? yes! this.acquire(name) will go
            // up until it finds a value
            var rake = canvas.set();
            var rect = canvas.rect(rx, ry, rdx, rdy);
            rect.attr({fill: "white",
                       stroke: "grey",
                       opacity: 10});
            // XXX: draw rake symbol
            rake.push(rect);

            // translate DOM events to user acts
            rake.click(function() {
                this.trigger("act:rake", [this.model]);
            }, this);

            // XXX: this should not be here
            this.elems.symbol.click(function(){
                this.trigger("act:select:node", [this.model]);
            }, this);
            return rake;
        }
    });

    var MIMO = Node.extend({
        removable: function() {
            var ui = this.ui();
            return ui.incoming.length === 1 && ui.outgoing.length === 1;
        },
        ctrlareas: function(canvas, ui, mode) {
            var ctrlarea;
            // XXX: introduce mode classes:
            // draggingnode, addingnewnode, addinglibnode
            if (mode.name === "addingnewnode") {
                var i = 0;
                var y0;
                var y1 = ui.y;
                var lines = this.elems.outgoingEdges.concat([{
                    attrs: {path: [[0, 0, ui.y + ui.dy]]}
                }]);
                _.each(lines, function(line) {
                    y0 = y1;
                    y1 = _.last(line.attrs.path)[2];
                    ctrlarea = canvas.rect(ui.x, y0, ui.dx, y1-y0);
                    ctrlarea.attr({fill: "yellow",
                                   stroke: "grey",
                                   "fill-opacity": "0.1",
                                   "stroke-opacity": "0.2"});
                    ctrlarea.click(function(idx) {
                        return function() {
                            this.trigger("act:addnewpath", {
                                start: this.model,
                                idx: idx
                            });
                        };
                    }(i), this);
                    i++;
                }, this);
            }
            return ctrlarea;
        }
    });

    var DecMer = MIMO.extend({
        symbol: function(canvas, ui) {
            this.x_in = ui.x + (ui.dx - dx) / 2;
            this.x_out = ui.x + ui.dx / 2 + dx / 2;
        }
    });

    var ForkJoin = MIMO.extend({
        symbol: function(canvas, ui, mode) {
            this.x_in = x;
            this.x_out = x + dx;
            return rect;
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
















// from model.js


    Models.Element = Backbone.Model.extend({
    });

    Models.Node = Models.Element.extend({
        defaults : {
            label: "", // XXX: old, to be removed
            name: "", 
            description : "",
            x_req: 1, // varibale sizes are supported
            y_req: 1  // only size 1 supported for now
        },
        initialize : function() {
            Models.Element.prototype.initialize.call(this);
            this.ui = {
                edges: [],
                pos: {x:-1, y:-1},
                size: {x:-1, y:-1}
            };
        }
    } , {});

    Models.Activity = Models.Element.extend({
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
            _.bindAll(this, "eventForwarder");

            this.final_node_collection.bind("all", this.eventForwarder);
            this.fork_join_collection.bind("all", this.eventForwarder);
            this.decision_merge_collection.bind("all", this.eventForwarder);
            this.action_collection.bind("all", this.eventForwarder);
        },
        /* 
         Bubble up the event from your collections
         */
        children: function(){
            var children = this.fork_join_collection.models.concat(
                this.final_node_collection.models,
                this.decision_merge_collection.models,
                this.action_collection.models);
            if(this.initial){
                children = children.concat([this.initial]);
            }
            return children;
        },
        create : function(nodeType, position){
            var node = new nodeType(
                {ui_data: {x: position.x / activities.settings.rendering.gridsize,
                           y: position.y / activities.settings.rendering.gridsize,
                           width: 1,
                           height: 1},
                 activity_storage_name: this.get("storage_name")});

            // depending on the type, the new node is added to a
            // collection. This will trigger an event, which in turn
            // triggers redrawing. That means, at this point, the
            // element needs to know its coordinates.
            switch(nodeType){
            case Models.Initial:
                this.initial = node;
                this.trigger("add", node);
                break;
            case Models.Final:
                this.final_node_collection.add(node);
                break;
            case Models.ForkJoin:
                this.fork_join_collection.add(node);
                break;
            case Models.DecisionMerge:   
                this.decision_merge_collection.add(node);
                break;
            case Models.Action:
                this.action_collection.add(node);
                break;
            default:
                throw "Unknown node type. Bad programmer";
            }
            node.save();
            return node;
        },
        remove: function(node){
            if (!node) {
                return ;
            }
            if (node instanceof Models.Final){
                this.final_node_collection.remove(node).destroy();
            } else if (node instanceof Models.ForkJoin){
                this.fork_join_collection.remove(node).destroy();
            } else if (node instanceof Models.DecisionMerge){
                this.decision_merge_collection.remove(node).destroy();
            } else if (node instanceof Models.Action){
                this.action_collection.remove(node).destroy();
            } else {
                throw "Unknown node type. Bad programmer";
            }
        },
        dragging: function(element, rel_movement, abs_movement){
            var old_ui = element.get("ui_data");
            element.set({ui_data: 
                         {x: old_ui.x + rel_movement.x / activities.settings.rendering.gridsize,
                          y: old_ui.y + rel_movement.y / activities.settings.rendering.gridsize,
                          width: old_ui.width,
                          height: old_ui.height}});
            element.save();
        }
    } , {display_name : "Activity"});

    Models.Action = Models.Node.extend({
        initialize: function(models, options){
            Models.Node.prototype.initialize.call(this);
            if(! this.get("activity_id")){
                this.activity = new Models.Activity({id: Store.guid()});
                this.activity.localStorage = new Store(this.get("activity_storage_name"));
                this.activity.save();
                this.set({activity_id: this.activity.id});
            } else{
                this.activity = new Models.Activity({id: this.get("activity_id")});
                this.activity.localStorage = new Store(this.get("activity_storage_name"));
                this.activity.fetch();
            }
        }
    });

    /////////////// new-style below here ////////////////////////////////////

