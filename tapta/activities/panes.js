define([
    'require',
    'jquery',
    'vendor/jquery.tmpl',
    'vendor/underscore.js',
    './debug',
    './base'
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


    // things to be put in panes
    var ToolView = base.View.extend({
        tagName: "li",
        className: "tool",
        events: {
            "click": "clicked"
        },
        clicked: function() {
            this.trigger("click", {view: this});
        },
        render: function() {
            $(this.el).text(this.name);
            return this;
        }
    });

    var ToolbarView = base.View.extend({
        tagName: "ul",
        className: "toolbar",
        initialize: function() {
            _.each([
                "select",
                "addnewaction",
                "addnewdecmer",
                "addnewforkjoin",
                "remove"
            ], function(name) {
                this.append(ToolView, {name: name});
            }, this);
        }
    });

    // old below here


    var PaneManager_ = base.View.extend({
        template: $.template(null, $("#pane_template")),
        initialize: function(){
            this.keys = [];
            this.panes = {};
            this.pane_elems = {};
        },
        add: function(view){
            var id = _.uniqueId("pane_");
            var pane_elem = $.tmpl(this.template, {id: id});
            view.el = pane_elem;
            this.keys.push(id);
            this.panes[id] = view;
            this.pane_elems[id] = pane_elem;
        },
        render: function(){
            this.el.empty();
            _(this.keys).each(function(key){
                this.el.append(this.pane_elems[key]);
                this.panes[key].render();
            }, this);
        }
    });

    var PropertiesView = base.View.extend({
        template: $.template($("#properties_template")),
        initialize: function(){
            _.bindAll(this, "handle_update");
        },
        handle_update: function(){
            if(this.elem instanceof model.Action){
                this.elem.set({
                    label: this.el.find("input[name=label]").val(),
                    description: this.el.find("input[name=description]").val()
                });
                this.elem.save();
            }
        },
        render: function(){
            if(this.model === undefined){
                return;
            }
            if(this.model.get("selected") === undefined) {
                return;
            }
            var elem = this.model.get("selected");
            this.elem = elem;
            this.el.empty();
            var attrs = {};
            attrs.hidden = {
                id: elem.id,
                cid: elem.cid
            };
            attrs.singleline = {
                label: elem.get("label") || ""
            };
            attrs.multiline = {
                description: elem.get("description") || ""
            };
            $.tmpl(this.template, attrs).appendTo(this.el);
            this.el.find('input[type=button]').unbind().bind("click", this.handle_update);
        }
    });

    var LibraryView = base.View.extend({
        template: $.template($("#library_template")),
        events: {
            "click li" : "clicked"
        },
        render: function(){
            if(this.model === undefined){
                return;
            }
            var attrs = {};
            attrs.id = this.id; 
            this.id = _.uniqueId();
            var actions = _(
                _(this.model.actions.models).map(function(action){
                    return {id: action.id, label: action.get("label")};
                })).filter(function(action){
                    return action.label !== undefined;
                });
            attrs.action = actions;
            $.tmpl(this.template, attrs).appendTo(this.el);
            this.delegateEvents(this.events);
        },
        clicked: function(event){
            var node = this.model.actions.get(event.target.id);
            if(this.model.activity.indexOf(node) == -1){
                this.model.activity.actions.add(node);
                $(event.target).addClass("highlight");
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "library_add",
                                node: node,
                                activity: this.model.activity});
                }]);;
            }
        }
    });

    var ActionbarView = base.View.extend({
        initialize: function() {
            this.prev_target = undefined;
            _.bindAll(this, "clicked", "render");
        },
        template: $.template($("#actionbar_template")),
        events: {
            "click li" : "clicked"
        },
        render: function(){
            // XXX: render full el content, not append
            $.tmpl(this.template, {}).appendTo(this.el);
            this.delegateEvents(this.events);
        },
        clicked: function(event){
            // XXX: move highlighting to render depending on mode
            if (this.prev_target) {
                $(this.prev_target).removeClass("highlight");
            }
            this.prev_target = event.target;
            $(event.target).addClass("highlight");
            var collection;
            var layermodel = this.model;
            var classes = event.target.classList;
            if (classes.contains("select")) {
                this.trigger("mode:selecting");
            } else if (classes.contains("new_node")) {
                if (classes.contains("new_action")) {
                    collection = layermodel.actions;
                } else if (classes.contains("new_decmer")) {
                    collection = layermodel.decmers;
                } else if (classes.contains("new_forkjoin")) {
                    collection = layermodel.forkjoins;
                }
                this.trigger("mode:addingnewnode", [{
                    collection: collection
                }]);
            } else if (classes.contains("remove")) {
                this.trigger("mode:removing");
            }
        }
    });

    return {
        PaneManager: PaneManager,
        ToolbarView: ToolbarView,

        PaneManager_: PaneManager_,
        PropertiesView: PropertiesView,
        LibraryView: LibraryView,
        ActionbarView: ActionbarView
    };
});
