(function($) {
    
    tests = {
        
        // test model
        // supposed to be serialized/deserialized by JSON later
        // server side model > node.ext.uml.activities
        // read activities.model.Model doc.
        model: {
            __type: activities.model.ACTIVITY,
            start: {
                __type: activities.model.INITIAL
            },
            fork: {
                __type: activities.model.FORK
            },
            join: {
                __type: activities.model.JOIN
            },
            decision: {
                __type: activities.model.DECISION
            },
            merge: {
                __type: activities.model.MERGE
            },
            action_1: {
                __type: activities.model.ACTION
            },
            action_2: {
                __type: activities.model.ACTION
            },
            action_3: {
                __type: activities.model.ACTION
            },
            flow_end: {
                __type: activities.model.FLOW_FINAL
            },
            end: {
                __type: activities.model.FINAL
            },
            edge_1: {
                __type: activities.model.EDGE,
                source: 'start',
                target: 'fork'
            },
            edge_2: {
                __type: activities.model.EDGE,
                source: 'fork',
                target: 'action_1'
            },
            edge_3: {
                __type: activities.model.EDGE,
                source: 'fork',
                target: 'action_2'
            },
            edge_4: {
                __type: activities.model.EDGE,
                source: 'action_1',
                target: 'action_3'
            },
            edge_5: {
                __type: activities.model.EDGE,
                source: 'action_2',
                target: 'join'
            },
            edge_6: {
                __type: activities.model.EDGE,
                source: 'action_3',
                target: 'decision'
            },
            edge_7: {
                __type: activities.model.EDGE,
                source: 'action_3',
                target: 'join'
            },
            edge_8: {
                __type: activities.model.EDGE,
                source: 'decision',
                target: 'flow_end'
            },
            edge_9: {
                __type: activities.model.EDGE,
                source: 'decision',
                target: 'merge'
            },
            edge_10: {
                __type: activities.model.EDGE,
                source: 'join',
                target: 'merge'
            },
            edge_11: {
                __type: activities.model.EDGE,
                source: 'merge',
                target: 'end'
            }
        },
        
        run: function() {
            module("activities.model.Model");
            
            var model = new activities.model.Model(eval(uneval(tests.model)));
            
            test("activities.model.Model.filtered", function() {
                equals(11,
                       model.filtered(activities.model.EDGE).length,
                       "model.filtered(activities.model.EDGE)");
                equals(3,
                       model.filtered(activities.model.ACTION).length,
                       "filtered(activities.model.ACTION)");
                var res = model.filtered(
                    activities.model.EDGE,
                    tests.model.action_1);
                equals(0,
                       res,
                       "filtered(activities.model.ACTION, " +
                       "tests.model.action_1)");
            });
            
            test("activities.model.Model.incoming", function() {
                var res = model.incoming(model.context.decision);
                equals(1,
                       res.length,
                       "model.incoming(model.context.decision)");
                res = model.incoming(model.context.merge);
                equals(2,
                       res.length,
                       "model.incoming(model.context.merge)");
                equals(false,
                       !res[0].source || !res[0].target,
                       "res[0].source && res[0].target");
            });
            
            test("activities.model.Model.outgoing", function() {
                var res = model.outgoing(model.context.decision);
                equals(2,
                       res.length,
                       "model.outgoing(model.context.decision)");
                res = model.outgoing(model.context.merge);
                equals(1,
                       res.length,
                       "model.outgoing(model.context.merge)");
                equals(false,
                       !res[0].source || !res[0].target,
                       "res[0].source && res[0].target");
            });
            
            test("activities.model.Model.source", function() {
                var source = model.source(model.context.edge_1);
                equals(true,
                       source.__type == activities.model.INITIAL,
                       "source.__type == activities.model.INITIAL");
                equals(true,
                       source.__name == 'start',
                       "source.__name == 'start'");
                equals(true,
                       source.__parent == 'model',
                       "source.__parent == 'model'");
            });
            
            test("activities.model.Model.target", function() {
                var target = model.target(model.context.edge_1);
                equals(true,
                       target.__type == activities.model.FORK,
                       "target.__type == activities.model.FORK");
                equals(true,
                       target.__name == 'fork',
                       "target.__name == 'fork'");
                equals(true,
                       target.__parent == 'model',
                       "target.__parent == 'model'");
            });
            
            module("activities.ui.Grid");
            
            var grid = new activities.ui.Grid();
            
            test("activities.ui.Grid", function() {
                grid.set(0, 0, 'a', 10, 20);
                grid.set(1, 0, 'b', 20, 20);
                
                equals(true,
                       grid.get(0, 0)[1] == 10,
                       "grid.get(0, 0)[1] == 10");
                equals(true,
                       grid.get(1, 0)[1] == 20,
                       "grid.get(1, 0)[1] == 20");
                equals(true,
                       typeof(grid.get(1, 1)) == "undefined",
                       'typeof(grid.get(1, 1)) == "undefined"');
            });
        }
    }
    
})(jQuery);