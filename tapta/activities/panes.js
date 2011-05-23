define([
    'require',
    'jquery',
    'cdn/jquery.tmpl',
    'cdn/underscore',
    './base',
    './settings',
    './model'
], function(require) {
    var base = require('./base');
    var model = require('./model');

    var PaneManager = base.View.extend({
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
            if(elem instanceof model.Action){
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
            }
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
            $.tmpl(this.template, {}).appendTo(this.el);
            this.delegateEvents(this.events);
        },
        clicked: function(event){
            var key = event.target.getAttribute('class');
            if (this.prev_target) {
                $(this.prev_target).removeClass("highlight");
            }
            this.prev_target = event.target;
            $(event.target).addClass("highlight");
            var node = undefined;
            var activity = this.model.activity;
            if(key == "add_action"){
                node = new this.model.actions.model();
                this.model.actions.add(node);
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "actionbar:add_action",
                                elem: node,
                                activity: activity});
                }]);
            }else if(key == "add_dec"){
                node = new this.model.decmers.model();
                this.model.decmers.add(node);
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "actionbar:add_dec",
                                elem: node,
                                activity: activity});
                }]);
            }else if(key == "add_fork"){
                node = new this.model.forkjoins.model();
                this.model.forkjoins.add(node);
                this.trigger("add", [function (stack){
                    stack.push({event: "add",
                                detailed_event: "actionbar:add_fork",
                                elem: node,
                                activity: activity});
                }]);
            }else if(key == "delete"){
                this.trigger("delete", [function (stack){
                    stack.push({event: "delete",
                                detailed_event: "actionbar:delete",
                                activity: activity});
                }]);
            }
        }
    });

    return {
        PaneManager: PaneManager,
        PropertiesView: PropertiesView,
        LibraryView: LibraryView,
        ActionbarView: ActionbarView
    };
});
