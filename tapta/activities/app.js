define([
    'require',
    './panes',
    './view'
], function(require) {
    var model = require('./model'),
        panes = require('./panes'),
        Layers = require('./view').Layers;

    var AppView = panes.PaneManager.extend({
        panescfg: [
            {name: "center", content: [
                [Layers, function() {
                    // will be evaluated in the context of the new AppView
                    return {name: "layers", model: this.model};
                }]
            ]}
        ]
        // initialize: function() {
        //     _.bindAll(this, 'render');
        //     // the layers view piggy-backs on our model as
        //     // this.model.layers is not a collection but just a plain
        //     // list for now.
        //     // this.layers = this.defchild(Layers, {
        //     //     // this element already exists in the App template
        //     //     // XXX: the id should be unique
        //     //     el: this.$('#layers'),
        //     //     model: this.model,
        //     //     name: "layers"
        //     // });
        //     // var app = this;
        //     // this.$("#destroyall").click(function() {
        //     //     localStorage.clear();
        //     //     app.model.fetch();
        //     //     app.render();
        //     // });
    });

    return {
        AppView: AppView
    };
});
