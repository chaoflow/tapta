define([
    'require',
    'vendor/underscore.js',
    'vendor/backbone.js',
    './debug'
], function(require) {
    var DEBUG = require('./debug');
    var location = function(obj) {
        if (!obj) { obj = this; }
        if (obj.parent) {
            return location(obj.parent).concat(obj);
        } else if (obj.collection) {
            return location(obj.collection).concat(obj);
        } else {
            return [obj];
        }
    };

    var abspath = function(location) {
        var pathsep = '/';
        if (!location) { location = this.location(); }
        return _.reduce(location, function(memo, obj) {
            var name = obj.name || obj.id;
            return memo + pathsep + name;
        }, '');
    };

    // lists is a list of lists. return groups of lists that contain
    // the item and have a common head relative to the item. map is
    // optional and will be used to retrieve items from the lists.
    var groups = function(lists, item, map) {
        var groups = [];
        // only lists containing the item are relevant
        var relevantlists = _.select(lists, function(obj) {
            var list = map ? map(obj) : obj;
            return _.include(list, item);
        });
        _.each(relevantlists, function(obj) {
            var list = map ? map(obj) : obj;
            var grouphead = head(list, item);
            var group = _.detect(groups, function(group) {
                for (var i=0; i<grouphead.length; i++) {
                    if (grouphead[i] !== group.head[i]) {
                        return false;
                    }
                }
                return true;
            });
            if (group === undefined) {
                group = {head: grouphead, members: [obj]};
                groups.push(group);
            } else {
                group.members.push(obj);
            }
        });
        return groups;
    };

    var head = function(list, item) {
        if (item === undefined) return _.head(list);
        if (list.indexOf(item) === -1) throw "Item not in list";
        return _.head(list, _.indexOf(list, item));
    };

    var startswith = function(list, head) {
        if (head === undefined) return false;
        for (var i=0; i<head.length; i++) {
            if (list[i] !== head[i]) return false;
        }
        return true;
    };

    var tail = function(list, item) {
        if (item === undefined) return _.tail(list);
        if (list.indexOf(item) === -1) throw "Item not in list";
        return _.tail(list, _.indexOf(list, item)+1);
    };

    var View = Backbone.View.extend({
        extraClassNames: [],
        propagateEvents: true,
        // consider using initialize, with the downside that
        // subclasses need to "super"-call, and the upside, that its
        // clearer what is called when.
        constructor: function(props) {
            // these two are used by this.abspath
            if (props && props.name) this.name = props.name;
            if (props && props.parent) this.parent = props.parent;
            if (DEBUG.view.init) console.group("init:"+this.abspath());

            // children by name and in an ordered list
            this.child = {};
            this.children = [];

            if (props.attrs) this.attrs = _.extend(this.attrs || {},
                                                   props.attrs);

            if (DEBUG.view.render) {
                var realrender = this.render;
                this.render = function() {
                    console.group("render:"+this.abspath());
                    var rval = realrender.apply(this, arguments);
                    console.groupEnd();
                    return rval;
                };
            }
            _.bindAll(this, "render");

            Backbone.View.apply(this, arguments);

            if (DEBUG.view.events) {
                this.bind("all", function(event) {
                    // XXX: hack to reduce noise
                    if (event === "dndmove") return;
                    console.group("event:"+this.abspath());
                    console.log(arguments);
                    console.groupEnd();
                });
            }

            // add name and extraClassNames as additional classes
            // XXX: maybe should happen during render
            var classes = [this.name],
                existing = this.el.getAttribute("class");
            if (existing) classes = [existing].concat(classes);
            classes = classes.concat(this.extraClassNames);
            if (props && props.extraClassNames) {
                classes = classes.concat(props.extraClassNames);
            }
            // XXX: this does now work with SVG elements
            //_.each(classes, function(cls) { $(this.el).addClass(cls); }, this);
            this.el.setAttribute("class", classes.join(" "));

            if (DEBUG.view.init) console.groupEnd();
        },
        abspath: abspath,
        location: location,
        append: function(ViewProto, props) {
            var child = this.defchild(ViewProto, props);
            if (child.name === undefined) throw "Child needs name";
            if (this.child[child.name] !== undefined) throw "Name collision";
            // XXX: rethink this, do we need default store for named children?
            // check eg. ActivityView with svg for an alternative
            this.child[child.name] = child;
            this.children.push(child);
            return child;
        },
        defchild: function(ViewProto, props) {
            props = props || {};
            // XXX: remove explicit setting of props.parent
            props.parent = props.parent || this;
            var child = new ViewProto(props);
            // XXX: As now also the SVG elements play nice with
            // delegateEvents, I'm pretty sure we can soon kick the event
            // propagation. triggerReverse might still be nice to have.
            if (child.propagateEvents) {
                child.bind("all", _.bind(function(name, info) {
                    if (!info.reverse) this.trigger.apply(this, arguments);
                }, this));
            }
            return child;
        },
        removeChildren: function() {
            _.each(this.children, function(child) { child.remove(); });
            this.child = {};
            this.children = [];
        },
        render: function() {
            if ((DEBUG.view.renderempty) && (this.children.length === 0)) {
                $(this.el).text("empty:"+this.abspath());
            }
            _.each(this.children, function(child) {
                $(this.el).append(child.render().el);
            }, this);
            return this;
        },
        triggerReverse: function(name, info) {
            info.reverse = true;
            _.each(this.children, function(child) {
                child.trigger(name, info);
                child.triggerReverse(name, info);
            });
        }
    });

    return {
        abspath: abspath,
        groups: groups,
        head: head,
        location: location,
        startswith: startswith,
        tail: tail,
        View: View
    };
});
