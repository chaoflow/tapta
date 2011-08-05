define([
    'require'
], function(require) {
    var enable = true,
        DEBUG = {
            controller: true && enable,
            spaceout: true && enable,
            panes: true && enable,
            view: {
                events: true && enable,
                init: true && enable,
                render: true && enable,
                renderempty: false && enable
            },
            model: {
                events: true && enable
            }
        };

    return DEBUG;
});
