define([
    'require',
    'cdn/underscore',
    'cdn/backbone.js'
], function(require) {
    var View = Backbone.View.extend({
        defchild: function(View, props) {
            props.parent = props.parent || this;
            var child = new View(props);
            child.bind("all", _.bind(this.eventForwarder, this));
            return child;
        },
        eventForwarder: function() {
            this.trigger.apply(this, arguments);
        }
    });
    return {View: View};
});
