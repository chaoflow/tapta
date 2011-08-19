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
            // XXX: the concept of center does not make sense for rows
            {name: "top", content: [
                {
                    ViewProto: base.View.extend({
                        extraClassNames: ["cell", "position-4", "width-1"],
                        name: "save",
                        text: "SAVE"
                    })
                },
                // {
                //     ViewProto: base.View.extend({
                //         extraClassNames: ["cell", "position-5", "width-1"],
                //         name: "load",
                //         text: "LOAD"
                //     })
                // },
                {
                    ViewProto: base.View.extend({
                        extraClassNames: ["cell", "position-7", "width-1"],
                        name: "destroyall",
                        text: "DESTROY ALL"
                    })
                }
            ], extraClassNames: ["menubar", "row"]},
            {name: "center", content: [
                 {
                     ViewProto: LayersView,
                     // will be evaluated in the context of the new AppView
                     propscallback: function() {
                         return {name: "layers", model: this.model};
                     }
                 }
            ]}
        ],
        events: {
            "click .destroyall": "destroyall",
            "click .load": "load",
            "click .save": "save"
        },
        destroyall: function() {
            localStorage.clear();
            console.log("Content of localstorage destroyed");
            this.model.fetch();
            this.render();
        },
        load: function() {
        },
        save: function() {
            var content = JSON.stringify(localStorage),
                uriContent = "data:application/octet-stream,"
                    + encodeURIComponent(content);
            window.open(uriContent, 'taptastorage');
        }
    });

    return {
        AppView: AppView
    };
});
