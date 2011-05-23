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

    // a state catches all events of a parent and enables the event to
    // change the state
    var State = function(props) {
            this.consolelog = props.consolelog;
            this.parent = props.parent;
            // ATTENTION: bindAll needs to happen before bind, because
            // bindAll replaces the function with a curried version.
            _.bindAll(this, "handler", "setState");
            this.parent.bind("all", this.handler);
    };
    State.prototype = {
        handler: function(name, load) {
            // events we process can change the state, we ignore the
            // resulting events
            if (this.consolelog) { console.log(arguments); }
            if (name === "change:state") { return; }
            // we just expect a callable as load, the callable can
            // decide whether to do something or just put itself on
            // the stack.
            load[0](this);
        },
        getState: function() {
            return this.state;
        },
        setState: function(state) {
            if (this.state !== state) {
                this.state = state;
            }
            this.parent.trigger("change:state", [this.state]);
        }
    };

    return {
        Stack: Stack,
        State: State
    };
});
