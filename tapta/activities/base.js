define([
    'require',
    'vendor/underscore.js',
    'vendor/backbone.js'
], function(require) {
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
        constructor: function(props) {
            this.name = props.name;
            this.parent = props.parent;
            //console.group("init:"+this.abspath());
            _.bindAll(this, "eventForwarder");
            Backbone.View.apply(this, arguments);
            //console.groupEnd();
            this.bind("all", function() {
                if (this.logevents) {
                    console.log(arguments);
                }
            });
        },
        abspath: abspath,
        location: location,
        defchild: function(View, props) {
            props.parent = props.parent || this;
            var child = new View(props);
            child.bind("all", _.bind(this.eventForwarder, this));
            var realrender = child.render;
            child.render = function() {
                //console.group("render:"+this.abspath());
                return realrender.apply(this, arguments);
                //console.groupEnd();
            };
            return child;
        },
        eventForwarder: function() {
            this.trigger.apply(this, arguments);
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
