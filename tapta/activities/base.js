define([
    'require',
    'cdn/underscore',
    'cdn/backbone.js'
], function(require) {
    var View = Backbone.View.extend({
        defchild: function(View, props) {
            // XXX: children should have name and be stored in
            // this.children with an order property
            if (!props) {
                props = {};
            }
            if (props.parent === undefined) {
                props.parent = this;
            }
            var child = new View(props);
            child.bind("all", this.getEventForwarder(child));
            return child;
        },
        // same as in localstorage.Model
        getEventForwarder: function(child) {
            // XXX: How can we create an arguments object?
            // XXX: Is there something like python *args
            return _.bind(function(event, a, b, c, d, e) {
                // event = "change:foo/bar"
                // we prepend the name of the child
                var type = event.split(":")[0];
                var subtype = event.split(":").splice(1).join(":");
                var newevent = type;
                newevent += ":" + child.name;
                newevent += (subtype ? "/" + subtype : "");
                console.log(newevent, a, b, c, d, e);
                this.trigger(newevent, a, b, c, d, e);
            }, this);
        }
    });
    return {View: View};
});
