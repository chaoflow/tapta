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
        relevantlists.forEach(function(obj) {
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
            if (props === undefined) props = {};
            // these two are used by this.abspath
            if (props.name) this.name = props.name;
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

            if (props.html) this.html = props.html;
            if (props.text) this.text = props.text;

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
            //classes.forEach(function(cls) { $(this.el).addClass(cls); }, this);
            this.addClass(classstr);

            if (DEBUG.view.init) console.groupEnd();
        },
        abspath: abspath,
        accumulate: accumulate,
        location: location,
        // XXX: move this to jquery
        addClass: function(name) {
            this.el.setAttribute("class", _.compact([
                name, this.el.getAttribute("class")
            ]).join(" "));
        },
        adopt: function(child, name) {
            if (child.parent) throw "Child already has parent";
            if (name) child.name = name;
            if (child.name === undefined) throw "Child needs name";
            if (child.name in this.child) throw "Name collision";
            child.parent = this;
            this.child[child.name] = child;
            return child;
        },
        append: function(child) {
            this.adopt(child);
            this.children.push(child);
            return child;
        },
        insert: function(idx, child) {
            this.adopt(child);
            this.children.splice(idx, 0, child);
            return child;
        },
        removeChildren: function() {
            this.children.forEach(function(child) { child.remove(); });
            this.child = {};
            this.children = [];
        },
        // XXX: move this to jquery
        removeClass: function(name) {
            this.el.setAttribute("class", _.compact(
                _.without(this.el.getAttribute("class").split(" "), name)
            ).join(" "));
        },
        render: function() {
            this.el.setAttribute("id", this.abspath());
            for (var key in this.attrs) {
                this.el.setAttribute(key, this.attrs[key]);
            }
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
            this.children.forEach(function(child) {
                $(this.el).append(child.render().el);
            }, this);
            return this;
        },
        traverse: function(path) {
            var ourpath = this.abspath();
            if (path.substr(0, ourpath.length) !== ourpath) {
                throw "head of path does not match";
            }
            var relpath = path.substr(ourpath.length),
                relpath_ = _.compact(relpath.split('/'));
            var views = scanl("acc.child[x]", this, relpath_).filter(function(x) {
                return (x.model !== undefined);
            });
            // last view with a model
            var view = views.pop();
            // XXX: add rest to result as [1]
            return [view];
        },
        triggerReverse: function(name, info) {
            info.reverse = true;
            this.children.forEach(function(child) {
                child.trigger(name, info);
                child.triggerReverse(name, info);
            }, this);
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
