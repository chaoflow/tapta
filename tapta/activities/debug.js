define([
    'require'
], function(require) {
    var enabled = true,
        DEBUG = {
            controller: true && enabled,
            editmodes: true && enabled,
            model: {
                events: true && enabled
            },
            ops: true && enabled,
            panes: true && enabled,
            spaceout: true && enabled,
            view: {
                events: true && enabled,
                init: true && enabled,
                render: true && enabled,
                renderempty: false && enabled
            }
        };

    return DEBUG;
});
