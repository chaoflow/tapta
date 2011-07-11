define([
    'require',
    'jquery',
    './base',
    './panes',
    './view'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        panes = require('./panes'),
        Layers = require('./view').Layers;

    var AppView = panes.PaneManager.extend({
        panescfg: [
            {name: "top", content: [
                {
                    ViewProto: base.View.extend({
                        className: "destroyall",
                        render: function() { $(this.el).text("DESTROY ALL"); return this; }
                    }),
                    props: {name: "destroyall"}
                }
            ]},
            {name: "center", content: [
                 {
                     ViewProto: Layers,
                     propscallback: function() {
                         // will be evaluated in the context of the new AppView
                         return {name: "layers", model: this.model};
                     }
                 }
            ]}
        ]
        // initialize: function() {
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
