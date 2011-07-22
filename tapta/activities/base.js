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
        // consider using initialize, with the downside that
        // subclasses need to "super"-call, and the upside, that its
        // clearer what is called when.
        constructor: function(props) {
            // these two are needed by this.abspath
            if (props.name === undefined) throw "Need a name";
            this.name = props.name;
            this.parent = props.parent;
            if (DEBUG.view.init) console.group("init:"+this.abspath());

            this.children = [];
            _.bindAll(this, "eventForwarder");
            Backbone.View.apply(this, arguments);

            if (DEBUG.view.events) {
                this.bind("all", function() {
                    console.group("event:"+this.abspath());
                    console.log(arguments);
                    console.groupEnd();
                });
            }

            // add name and extraClassNames as additional classes
            var classes = [this.name];
            classes = classes.concat(this.extraClassNames);
            classes = classes.concat(props.extraClassNames);
            _.each(classes, function(cls) { $(this.el).addClass(cls); }, this);

            if (DEBUG.view.render) {
                var realrender = this.render;
                this.render = function() {
                    console.group("render:"+this.abspath());
                    var rval = realrender.apply(this, arguments);
                    console.groupEnd();
                    return rval;
                };
            }
            if (DEBUG.view.init) console.groupEnd();
        },
        abspath: abspath,
        location: location,
        append: function(ViewProto, props) {
            if (this[props.name] !== undefined) throw "Name collision";
            var child = this.defchild(ViewProto, props);
            this[props.name] = child;
            this.children.push(child);
            return child;
        },
        defchild: function(ViewProto, props) {
            // XXX: remove explicit setting of props.parent
            props.parent = props.parent || this;
            var child = new ViewProto(props);
            child.bind("all", _.bind(this.eventForwarder, this));
            return child;
        },
        eventForwarder: function() {
            this.trigger.apply(this, arguments);
        },
        render: function() {
            if ((DEBUG.view.render) && (this.children.length === 0)) {
                $(this.el).text("empty:"+this.abspath());
            }
            _.each(this.children, function(child) {
                $(this.el).append(child.render().el);
            }, this);
            return this;
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
