define([
    'require',
    'cdn/underscore',
    'cdn/backbone.js'
], function(require) {
    var DEBUG_RENDER = true;

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

    var View = Backbone.View.extend({
        constructor: function(props) {
            this.name = props.name;
            this.parent = props.parent;
            console.log("DEBUG:INIT:BEG: " + this.abspath());
            _.bindAll(this, "eventForwarder");
            Backbone.View.apply(this, arguments);
            console.log("DEBUG:INIT:END: " + this.abspath());
            if (this.logevents) {
                this.bind("all", function() { console.log(arguments); });
            }
        },
        abspath: abspath,
        location: location,
        defchild: function(View, props) {
            props.parent = props.parent || this;
            var child = new View(props);
            child.bind("all", _.bind(this.eventForwarder, this));
            var realrender = child.render;
            child.render = function() {
                console.log("DEBUG:RENDER: " + child.abspath());
                realrender.apply(this, arguments);
            };
            return child;
        },
        eventForwarder: function() {
            this.trigger.apply(this, arguments);
        }
    });
    return {
        abspath: abspath,
        location: location,
        View: View
    };
});
