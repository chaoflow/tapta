define([
    'require',
    'cdn/underscore.js'
], function(require) {

    var Event = function(stack) {
        
    };

    var Stack = function(view, opts) {
        Array.apply(this);
        this.view = view;
        this.consolelog = opts && opts.consolelog;
        // ATTENTION: bindAll needs to happen before bind, because
        // bindAll replaces the function with a curried version.
        _.bindAll(this, "handler");
        view.bind("all", this.handler);
    };
    _.extend(Stack.prototype, _([]), {
        handler: function(name, load) {
            if (this.consolelog) { console.log(arguments); }
            // we just expect a callable as load, the callable can
            // decide whether to do something or just put itself on
            // the stack.
            load[0](this);
        }
    });

    return Stack;
});
