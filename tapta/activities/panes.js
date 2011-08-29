define([
    'require',
    'jquery',
    'vendor/jquery.tmpl',
    'vendor/underscore.js',
    './debug',
    './base',
    './editmodes'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        editmodes = require('./editmodes');

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
            this.panescfg.forEach(this.append, this);
            this.init(props);
        },
        // Backbone uses the constructor which calls initialize
        // Our framework uses initialize which calls init
        // init is to be used by users of the framework, e.g. tapta
        init: function(props) {},
        append: function(cfg) {
            // create the pane
            var pane = base.View.prototype.append.call(
                this, new Pane({name: cfg.name,
                                extraClassNames: cfg.extraClassNames})
            );

            // add its content
            cfg.content.forEach(function(cfg) {
                var ViewProto = cfg.ViewProto,
                    props = cfg.propscallback !== undefined
                        ? cfg.propscallback.call(this)
                        : _.clone(cfg.props);
                props.panemanager = this;
                var view = new ViewProto(props);
                pane.append(view);
            }, this);

            return pane;
        }
    });

    var DebugInfo = base.View.extend({
        className: "debuginfo",
        name: "debuginfo",
        initialize: function() {
            this.bind("editmode", this.render);
        },
        render: function() {
            $(this.el)
                .html("<h4>Debug info</h4>")
                .append("Editmode: " + (this.layerview.editmodename));
            $(this.el).append("<br>Ops:<ul>");
            this.layerview.editmodes.ops.list.forEach(function(op) {
                $(this.el).append([
                    "<li>",
                    op.name,
                    op.enabled ? "true" : "false",
                    "</li>"
                ].join(": "));
            }, this);
            return this;
        }
    });
    Object.defineProperties(DebugInfo.prototype, {
        layerview: {get: function() { return this.options.panemanager; }}
    });

    var PropertiesView = base.View.extend({
        tagName: "div",
        className: "properties",
        events: {
            "keydown": "keydown"
        },
        initialize: function(props) {
            this.layer = props.layer;
            this.bindToActivity();
            this.layer.bind("change:activity", this.bindToActivity, this);
            this.layer.bind("change:activity", this.render, this);
        },
        bindToActivity: function() {
            if (this.layer.activity === this.activity) return;
            if (this.activity) this.activity.unbind(this.render);
            this.activity = this.layer.activity;
            if (this.activity === undefined) return;
            this.activity.bind("change:selected", this.render);
        },
        render: function() {
            $(this.el).text("");
            if (this.selected === undefined) return this;
            $(this.el).html(_.template(
                'Node: <%= type %>, <%= cid %><br>'
                + 'Label: '
                + '<input type="input"'
                + ' name="label"'
                + ' value="<%= label %>"'
                + ' class="label"'
                + ' /><br>'
                + 'Description: '
                + '<textarea class="description" name="description" rows="10">'
                + '<%= description %>'
                + '</textarea>'
//                + '<br><div width="100%" class="update">Update</div>'
            , {
                cid: this.selected.cid,
                type: this.selected.type,
                label: this.selected.get('label') || '',
                description: this.selected.get('description') || ''
            }));
            this.$(".label")[0].focus();
            // this.$(".update").click(_.bind(function() {
            //     this.save([this.$(".label")[0], this.$(".description")[0]]);
            // }, this));
            return this;
        },
        keydown: function(info) {
            this.unsaved(info.srcElement);
            this.save_debounced([info.srcElement]);
        },
        save: function(els) {
            var data = foldl(function(acc, el) {
                $(el).removeClass("unsaved");
                acc[el.name] = el.value;
                return acc;
            }, {}, els);
            this.selected.set(data);
            this.selected.save();
        },
        save_debounced: _.debounce(function(els) {
            this.save(els);
        }, 400),
        unsaved: function(el) {
            $(el).addClass("unsaved");
        }
    });
    Object.defineProperties(PropertiesView.prototype, {
        selected: {get: function() {
            return this.activity && this.activity.get('selected');
        }}
    });

    var EditModeChanger = base.View.extend({
        className: "editmodechanger",
        tagName: "li",
        initialize: function() {
            this.bind("editmode", function(name) {
                if (name === this.name) {
                    $(this.el).addClass("highlight");
                } else {
                    $(this.el).removeClass("highlight");
                }
            }, this);
        }
    });
    Object.defineProperties(EditModeChanger.prototype, {
        text: { get: function() { return this.name; }}
    });

    var ToolbarView = base.View.extend({
        tagName: "ul",
        className: "toolbar",
        initialize: function(props) {
            // XXX: does not work, as the layer is not yet initialized
            // panemanager needs to be initialized before initializing children
            // same in general for parents, needs to be fixed in base.View
            // props.layerview.editmodes.forEach(function(name) {
            //     this.append(EditModeChanger, {name: name});
            // });
            editmodes.EditModes.prototype.Modes.map(function(Mode) {
                return Mode.prototype.name;
            }).forEach(function(name) {
                if (name === "addlibaction") return;
                this.append(new EditModeChanger({name: name}));
            }, this);
        }
    });

    var LibItemView = base.View.extend({
        tagName: "li",
        events: {
            "click": "setAddLibActionNode"
        },
        initialize: function(props) {
            this.layer = props.layer;
            this.model.bind("change:label", this.render);
        },
        setAddLibActionNode: function() {
            this.layer.activity.set({selected: this.model});
            this.layer.activity.save();
        }
    });
    Object.defineProperties(LibItemView.prototype, {
        text: { get: function() {
            return this.model.get('label') || "unnamed";
        } }
    });

    var LibraryView = EditModeChanger.extend({
        collectionname: "actions",
        events: {
            "click li": "select"
        },
        name: editmodes.AddLibAction.prototype.name,
        tagName: "ul",
        initialize: function(props) {
            this.layer = props.layer;
            this.collection = this.layer[this.collectionname];
            this.init_children();
            this.collection.bind("add", this.handle_add, this);
            this.collection.bind("reset", this.handle_reset, this);
            this.bind("editmode", function(name) {
                if (name === this.name) {
                    $(this.selected).addClass("highlight");
                } else {
                    $(this.selected).removeClass("highlight");
                }
            }, this);
        },
        handle_add: function(model) {
            var view = this.append(new LibItemView({
                name: model.id,
                layer: this.layer,
                model: model
            }));
            $(this.el).append(view.render().el);
        },
        handle_reset: function() {
            this.removeChildren();
            this.init_children();
            this.render();
        },
        init_children: function() {
            this.collection.toArray().forEach(function(model) {
                this.append(new LibItemView({
                    name: model.id,
                    layer: this.layer,
                    model: model
                }));
            }, this);
        },
        select: function(event) {
            $(this.selected).removeClass("highlight");
            this.selected = event.target;
            $(this.selected).addClass("highlight");
        }
    });
    Object.defineProperties(LibraryView.prototype, {
        text: {value: ""}
    });

    return {
        DebugInfo: DebugInfo,
        LibraryView: LibraryView,
        PaneManager: PaneManager,
        PropertiesView: PropertiesView,
        ToolbarView: ToolbarView
    };
});
