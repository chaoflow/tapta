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

    // return the objects list of prototypes, closest first
    var prototypesOf = function(obj) {
        var proto = Object.getPrototypeOf(obj);
        return proto ? [proto].concat(prototypesOf(proto)) : [];
    };

    // accumulate some property over the prototype chain
    var accumulate = function(name, obj) {
        if (!name) throw "Need property name!";
        obj = obj || this;
        return [obj].concat(prototypesOf(obj)).reduce(function(acc, x) {
            if (!x.hasOwnProperty(name)) return acc;
            return acc.concat(x[name] || []);
        }, []);
    };

    // create a set off properties that toggle a state
    // - name of the state
    // - on, function called to turn on
    // - off, function called to turn off
    var defineToggleProperty = function(name, on_name, on, off_name, off, obj) {
        var _name = "_" + name,
            props = {};
        props[name] = {
            get: function() { return this[_name]; },
            set: function(val) {
                if (val === this[_name]) return;
                if (val) {
                    this[on_name]();
                } else {
                    this[off_name]();
                }
                this[_name] = val;
            }
        };
        props[on_name] = {value: on};
        props[off_name] = {value: off};
        if (obj) Object.defineProperties(obj, props);
        return props;
    };

    var View = Backbone.View.extend({
        extraClassNames: [],
        propagateEvents: false,
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

            props.id = this.abspath();
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

            this.html = props.html;
            this.text = props.text;

            if (DEBUG.view.events) {
                this.bind("all", function(event) {
                    // XXX: hack to reduce noise
                    if (event === "dndmove") return;
                    console.group("event:"+this.abspath());
                    console.log(arguments);
                    console.groupEnd();
                });
            }

            if (props.extraClassNames) {
                this.extraClassNames = props.extraClassNames;
            }

            // XXX: the order in which things are called sucks!!!
            // maybe give up the concept of constructor vs initialize
            // and do all in one with proper "super" calls
            // accumulate name, className and extraClassNames for CSS
            var classstr = _(
                [].concat(this.accumulate("name"))
                    .concat(this.accumulate("className"))
                    .concat(this.accumulate("extraClassNames"))
            ).chain().compact().uniq().value().join(" ");

            // XXX: this does not work with SVG elements
            //_.each(classes, function(cls) { $(this.el).addClass(cls); }, this);
            this.addClass(classstr);

            if (DEBUG.view.init) console.groupEnd();
        },
        abspath: abspath,
        accumulate: accumulate,
        location: location,
        addClass: function(name) {
            this.el.setAttribute("class", _.compact([
                name, this.el.getAttribute("class")
            ]).join(" "));
        },
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
            if ((DEBUG.view.renderempty) &&
                (this.children.length === 0) &&
                (this.html === undefined) &&
                (this.text === undefined))
            {
                $(this.el).text("empty:"+this.abspath());
            }
            if (this.text) {
                $(this.el).text(this.text);
            }
            if (this.html) {
                $(this.el).append(this.html);
            }
            _.each(this.children, function(child) {
                $(this.el).append(child.render().el);
            }, this);
            return this;
        },
        traverseToModel: function(path) {
            var ourpath = this.abspath();
            if (path.substr(0, ourpath.length) !== ourpath) {
                throw "head of path does not match";
            }
            var rest = _.compact(path.substr(ourpath.length).split('/'));
            // last view with a model
            return scanl("acc.child[x]", this, rest).filter(function(x) {
                return (x.model !== undefined);
            }).pop().model;
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
        accumulate: accumulate,
        groups: groups,
        head: head,
        location: location,
        startswith: startswith,
        prototypesOf: prototypesOf,
        tail: tail,
        defineToggleProperty: defineToggleProperty,
        View: View
    };
});
