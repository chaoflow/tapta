define([
    'require',
    'jquery',
    './base',
    './panes',
    './layerviews'
], function(require) {
    var DEBUG = require('./debug'),
        base = require('./base'),
        panes = require('./panes'),
        LayersView = require('./layerviews').LayersView;

    var AppView = panes.PaneManager.extend({
        panescfg: [
            {name: "center", content: [
                 {
                     ViewProto: LayersView,
                     // will be evaluated in the context of the new AppView
                     propscallback: function() {
                         return {name: "layers", model: this.model};
                     }
                 }
            ]},
            {name: "bottom", content: [
                {
                    ViewProto: base.View.extend({
                        className: "destroyall",
                        extraClassNames: ["cell", "position-10", "width-2"],
                        render: function() { $(this.el).text("DESTROY ALL"); return this; }
                    }),
                    props: {name: "destroyall"}
                }
            ], extraClassNames: ["row"]}
        ],
        events: {"click .destroyall": "destroyall"},
        destroyall: function() {
            localStorage.clear();
            console.log("Content of localstorage destroyed");
            this.model.fetch();
            this.render();
        }
    });

    return {
        AppView: AppView
    };
});
