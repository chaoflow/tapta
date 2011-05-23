define([
    'require',
    'cdn/underscore',
    'cdn/backbone.js'
], function(require) {
    var DEBUG_RENDER = true;
    var View = Backbone.View.extend({
        defchild: function(View, props) {
            var child = new View(props);
            child.name = props.name;
            child.parent = props.parent || this;
            child.bind("all", _.bind(this.eventForwarder, this));
            var realrender = child.render;
            child.render = function() {
                console.log("DEBUG:RENDER: " + (child.name || "unnamed view"));
                debugger;
                realrender.apply(this, arguments);
            };
            return child;
        },
        eventForwarder: function() {
            this.trigger.apply(this, arguments);
        }
    });
    return {View: View};
});
