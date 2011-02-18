(function($) {
    
    tests = {
        
        // test model
        // supposed to be serialized/deserialized by JSON later
        // server side model > node.ext.uml.activities
        // read activities.model.Model doc.
        model: {
            __type: activities.model.ACTIVITY,
            __name: 'model',
            children: {
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
                    target: 'merge'
                },
                edge_9: {
                    __type: activities.model.EDGE,
                    source: 'join',
                    target: 'merge'
                },
                edge_10: {
                    __type: activities.model.EDGE,
                    source: 'merge',
                    target: 'end'
                }
            }
        },
        
        // another test model
        model_2: {
            __type: activities.model.ACTIVITY,
            __name: 'model_2',
            children: {
                act_a: {
                    __type: activities.model.INITIAL
                },
                dec_a: {
                    __type: activities.model.DECISION
                },
                act_b: {
                    __type: activities.model.ACTION
                },
                act_c: {
                    __type: activities.model.ACTION
                },
                mer_a: {
                    __type: activities.model.MERGE
                },
                act_d: {
                    __type: activities.model.ACTION
                },
                fork_a: {
                    __type: activities.model.FORK
                },
                act_e: {
                    __type: activities.model.ACTION
                },
                act_f: {
                    __type: activities.model.ACTION
                },
                act_g: {
                    __type: activities.model.ACTION
                },
                act_h: {
                    __type: activities.model.FINAL
                },
                e_1: {
                    __type: activities.model.EDGE,
                    source: 'act_a',
                    target: 'dec_a'
                },
                e_2: {
                    __type: activities.model.EDGE,
                    source: 'dec_a',
                    target: 'act_b'
                },
                e_3: {
                    __type: activities.model.EDGE,
                    source: 'dec_a',
                    target: 'act_c'
                },
                e_4: {
                    __type: activities.model.EDGE,
                    source: 'act_b',
                    target: 'mer_a'
                },
                e_5: {
                    __type: activities.model.EDGE,
                    source: 'act_c',
                    target: 'mer_a'
                },
                e_6: {
                    __type: activities.model.EDGE,
                    source: 'mer_a',
                    target: 'act_d'
                },
                e_7: {
                    __type: activities.model.EDGE,
                    source: 'act_d',
                    target: 'fork_a'
                },
                e_8: {
                    __type: activities.model.EDGE,
                    source: 'fork_a',
                    target: 'act_e'
                },
                e_9: {
                    __type: activities.model.EDGE,
                    source: 'fork_a',
                    target: 'act_f'
                },
                e_10: {
                    __type: activities.model.EDGE,
                    source: 'fork_a',
                    target: 'act_g'
                },
                e_11: {
                    __type: activities.model.EDGE,
                    source: 'act_e',
                    target: 'act_h'
                },
                e_12: {
                    __type: activities.model.EDGE,
                    source: 'act_f',
                    target: 'act_h'
                },
                e_13: {
                    __type: activities.model.EDGE,
                    source: 'act_g',
                    target: 'act_h'
                },
            }
        },
        
        run: function() {
            module("activities.model.Model");
            
            var model = new activities.model.Model(eval(uneval(tests.model)));
            
            test("activities.model.Model.filtered", function() {
                // equals(11,
                equals(10,
                       model.filtered(activities.model.EDGE).length,
                       "model.filtered(activities.model.EDGE)");
                equals(3,
                       model.filtered(activities.model.ACTION).length,
                       "filtered(activities.model.ACTION)");
                var res = model.filtered(
                    activities.model.EDGE,
                    model.node('action_1'));
                equals(0,
                       res,
                       "filtered(activities.model.ACTION, " +
                       "model.node('action_1'))");
            });
            
            test("activities.model.Model.incoming", function() {
                var res = model.incoming(model.node('decision'));
                equals(1,
                       res.length,
                       "model.incoming(model.node('decision'))");
                res = model.incoming(model.node('merge'));
                equals(2,
                       res.length,
                       "model.incoming(model.node('merge'))");
                equals(false,
                       !res[0].source || !res[0].target,
                       "res[0].source && res[0].target");
            });
            
            test("activities.model.Model.outgoing", function() {
                var res = model.outgoing(model.node('decision'));
                // equals(2,
                equals(1,
                       res.length,
                       "model.outgoing(model.node('decision'))");
                res = model.outgoing(model.node('merge'));
                equals(1,
                       res.length,
                       "model.outgoing(model.node('merge'))");
                equals(false,
                       !res[0].source || !res[0].target,
                       "res[0].source && res[0].target");
            });
            
            test("activities.model.Model.source", function() {
                var source = model.source(model.node('edge_1'));
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
                var target = model.target(model.node('edge_1'));
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
                grid.set(0, 0, 'foo');
                grid.set(1, 0, 'bar');
                
                equals(true,
                       grid.get(0, 0) == 'foo',
                       "grid.get(0, 0) == foo");
                equals(true,
                       grid.get(1, 0) == 'bar',
                       "grid.get(1, 0) == bar");
                equals(true,
                       typeof(grid.get(1, 1)) == "undefined",
                       'typeof(grid.get(1, 1)) == "undefined"');
            });
        }
    }
    
})(jQuery);