define([
    'require',
    'jquery',
    'vendor/jquery.tmpl',
    'vendor/underscore.js',
    './debug',
    './base',
    './graphviews'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base');

    var Pane = base.View.extend({
        tagName: "div",
        className: "pane"
    });

    // a div with special divs as children
    var PaneManager = base.View.extend({
        tagName: "div",
        className: "panemanager",
        panescfg: [],
        initialize: function(props) {
            if (props.panescfg !== undefined) this.panescfg = props.panescfg;
            _.each(this.panescfg, this.append, this);
            this.init(props);
        },
        // Backbone uses the constructor which calls initialize
        // Our framework uses initialize which calls init
        // init is to be used by users of the framework, e.g. tapta
        init: function(props) {},
        append: function(cfg) {
            // create the pane
            var pane = base.View.prototype.append.call(
                this, Pane, {name: cfg.name,
                             extraClassNames: cfg.extraClassNames}
            );

            // add its content
            _.each(cfg.content, function(cfg) {
                var ViewProto = cfg.ViewProto,
                    props = cfg.propscallback !== undefined
                        ? cfg.propscallback.call(this)
                        : cfg.props;
                pane.append(ViewProto, props);
            }, this);

            return pane;
        }
    });


    // things to be put in panes - APIs are not stable here
    // especially some mixup/mashup of editmode and tool right now

    var Tool = base.View.extend({
        tagName: "li",
        className: "tool",
        events: {
            "click": "clicked"
        },
        clicked: function() {
            // XXX: don't pass the full view, but just what is needed
            this.trigger("editmode", {name: this.name, view: this});
        },
        // XXX: what is info?
        act: function(info) {
            throw "Tool needs to define act";
        },
        activate: function(layerview) {
            this.layerview = layerview;
            layerview.bind("click", this.act);
        },
        deactivate: function(layerview) {
            this.layerview = undefined;
            layerview.unbind("click", this.act);
        },
        initialize: function() {
            this.bind("editmode", function(info) {
                if (info.name === this.name) {
                    $(this.el).addClass("highlight");
                } else {
                    $(this.el).removeClass("highlight");
                }
            });
            _.bindAll(this, "act");
        },
        render: function() {
            $(this.el).text(this.name);
            return this;
        }
    });

    var PropertiesView = base.View.extend({
        tagName: "div",
        className: "properties",
        events: {
            "keyup" : "keyup"
        },
        initialize: function(props) {
            this.activity = props.activity;
            if (this.activity === undefined) return;
            this.activity.bind("change:selected", this.render);
        },
        render: function() {
            $(this.el).text("");
            if (this.activity === undefined) return this;
            if (this.activity.get('selected') === undefined) return this;
            $(this.el).html(_.template(
                'Node: <%= type %>, <%= cid %><br>'
                + 'Label: '
                + '<input type="input" name="label" value="<%= label %>" /><br>'
                + 'Description: '
                + '<textarea name="description" rows="10">'
                + '<%= description %>'
                + '</textarea><br>'
            , {
                cid: this.selected.cid,
                type: this.selected.type,
                label: this.selected.get('label') || '',
                description: this.selected.get('description') || ''
            }));
            return this;
        },
        keyup: function(info) {
            this.unsaved(info);
            this.save(info);
        },
        save: _.debounce(function(info) {
            var data = {},
                field = info.srcElement;
            data[field.name] = field.value;
            this.selected.set(data);
            this.selected.save();
            $(field).removeClass("unsaved");
        }, 500),
        unsaved: function(info) {
            $(info.srcElement).addClass("unsaved");
        }
    });
    Object.defineProperties(PropertiesView.prototype, {
        selected: { get: function() { return this.activity.get('selected'); } }
    });


    // click -> select for changing properties
    // drag final node -> drop on mimo ctrl area
    var SelectTool = Tool.extend({
        act: function(info) {
            var node = info.view.model.payload;
            // ignore nodes, that have non-object payloads (initial, final,...)
            if (node.type === undefined) return;
            this.layerview.model.activity.set({
                selected: info.view.model.payload
            });
        }
    });

    var gv = require('./graphviews');

    var AddNewNodeTool = Tool.extend({
        extraClassNames: ['addnewnode'],
        act: function(info) {
            if (info.view instanceof gv.ArcView) {
                var source = info.view.srcview.model,
                    target = info.view.tgtview && info.view.tgtview.model;

                // create node
                var collection = this.layerview.model[this.options.collection],
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
                    source.next.splice(info.view.addnewidx, 0, newvert);
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
                // XXX: select newly added node and move focus to label field
            }
        }
    });

    var RemoveTool = Tool.extend({
        act: function(info) {
            // If the element cannot be subtracted from the graph, we
            // have nothing to do
            if (!(info.view.subtractable)) return;
            var model = info.view.model,
                graph = this.layerview.model.activity.graph;
            if (model.type === "arc") {
                // prede -> arc(model) -> succ
                var prede = model.predecessors[0],
                    succ = model.successors[0];
                prede.next.splice(prede.next.indexOf(succ), 1);
                prede.save();
            } else {
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
            }
            graph.trigger("rebind");
        }
    });

    var ToolbarView = base.View.extend({
        tagName: "ul",
        className: "toolbar",
        initialize: function() {
            this.append(SelectTool, {name: "select"});
            this.append(AddNewNodeTool, {name: "addnewaction",
                                         collection: "actions"});
            this.append(AddNewNodeTool, {name: "addnewdecmer",
                                         collection: "decmers"});
            this.append(AddNewNodeTool, {name: "addnewforkjoin",
                                         collection: "forkjoins"});
            this.append(RemoveTool, {name: "remove"});
        }
    });

    // old below here


    // var LibraryView = base.View.extend({
    //     template: $.template($("#library_template")),
    //     events: {
    //         "click li" : "clicked"
    //     },
    //     render: function(){
    //         if(this.model === undefined){
    //             return;
    //         }
    //         var attrs = {};
    //         attrs.id = this.id; 
    //         this.id = _.uniqueId();
    //         var actions = _(
    //             _(this.model.actions.models).map(function(action){
    //                 return {id: action.id, label: action.get("label")};
    //             })).filter(function(action){
    //                 return action.label !== undefined;
    //             });
    //         attrs.action = actions;
    //         $.tmpl(this.template, attrs).appendTo(this.el);
    //         this.delegateEvents(this.events);
    //     },
    //     clicked: function(event){
    //         var node = this.model.actions.get(event.target.id);
    //         if(this.model.activity.indexOf(node) == -1){
    //             this.model.activity.actions.add(node);
    //             $(event.target).addClass("highlight");
    //             this.trigger("add", [function (stack){
    //                 stack.push({event: "add",
    //                             detailed_event: "library_add",
    //                             node: node,
    //                             activity: this.model.activity});
    //             }]);;
    //         }
    //     }
    // });

    return {
        PaneManager: PaneManager,
        ToolbarView: ToolbarView,
        PropertiesView: PropertiesView

//        LibraryView: LibraryView
    };
});
