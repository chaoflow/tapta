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
            
            test("Model.filtered", function() {
                // equals(11,
                equals(model.filtered(activities.model.EDGE).length,
                       10,
                       "model.filtered(activities.model.EDGE)");
                equals(model.filtered(activities.model.ACTION).length,
                       3,
                       "filtered(activities.model.ACTION)");
                var res = model.filtered(
                    activities.model.EDGE,
                    model.node('action_1'));
                equals(res,
                       0,
                       "filtered(activities.model.ACTION, " +
                       "model.node('action_1'))");
            });
            
            test("Model.incoming", function() {
                var res = model.incoming(model.node('decision'));
                equals(res.length,
                       1,
                       "model.incoming(model.node('decision'))");
                res = model.incoming(model.node('merge'));
                equals(res.length,
                       2,
                       "model.incoming(model.node('merge'))");
                equals(!res[0].source || !res[0].target,
                       false,
                       "res[0].source && res[0].target");
            });
            
            test("Model.outgoing", function() {
                var res = model.outgoing(model.node('decision'));
                // equals(2,
                equals(res.length,
                       1,
                       "model.outgoing(model.node('decision'))");
                res = model.outgoing(model.node('merge'));
                equals(res.length,
                       1,
                       "model.outgoing(model.node('merge'))");
                equals(!res[0].source || !res[0].target,
                       false,
                       "res[0].source && res[0].target");
            });
            
            test("Model.source", function() {
                var source = model.source(model.node('edge_1'));
                equals(source.__type == activities.model.INITIAL,
                       true,
                       "source.__type == activities.model.INITIAL");
                equals(source.__name == 'start',
                       true,
                       "source.__name == 'start'");
                equals(source.__parent == 'model',
                       true,
                       "source.__parent == 'model'");
            });
            
            test("Model.target", function() {
                var target = model.target(model.node('edge_1'));
                equals(target.__type == activities.model.FORK,
                       true,
                       "target.__type == activities.model.FORK");
                equals(target.__name == 'fork',
                       true,
                       "target.__name == 'fork'");
                equals(target.__parent == 'model',
                       true,
                       "target.__parent == 'model'");
            });
            
            module("activities.ui.Grid");
            
            var grid = new activities.ui.Grid();
            
            test("Grid.[set|get]", function() {
                grid.set(0, 0, 'foo');
                grid.set(1, 0, 'bar');
                
                equals(grid.get(0, 0),
                       'foo',
                       "grid.get(0, 0) == 'foo'");
                equals(grid.get(1, 0),
                       'bar',
                       "grid.get(1, 0) == 'bar'");
                equals(typeof(grid.get(1, 1)),
                       "undefined",
                       'typeof(grid.get(1, 1)) == "undefined"');
            });
            
            test("Grid.before_X at zero position", function() {
                grid.before_X(0, 0, 'baz');
                
                equals(grid.get(0, 0),
                       'baz',
                       "grid.get(0, 0) == 'baz'");
                equals(grid.get(1, 0),
                       'foo',
                       "grid.get(1, 0) == 'foo'");
                equals(grid.get(2, 0),
                       'bar',
                       "grid.get(2, 0) == 'bar'");
            });
            
            test("Grid.before_X at none zero position, new column", function() {
                // expect ['baz', 'foo', 'bar']
                grid.before_X(1, 0, 'bam');
                
                equals(grid.get(0, 0),
                       'baz',
                       "grid.get(0, 0) == 'baz'")
                equals(grid.get(1, 0),
                       'bam',
                       "grid.get(1, 0) == 'bam'");
                equals(grid.get(2, 0),
                       'foo',
                       "grid.get(2, 0) == 'foo'")
                equals(grid.get(3, 0),
                       'bar',
                       "grid.get(3, 0) == 'bar'")
            });
            
            test("Grid.before_X at none zero position, free position",
                 function() {
                     
                grid.set(2, 0, null);
                // expect ['baz', 'bam', null, 'bar']
                grid.before_X(3, 0, 'foo');
                
                equals(grid.get(0, 0),
                       'baz',
                       "grid.get(0, 0) == 'baz'")
                equals(grid.get(1, 0),
                       'bam',
                       "grid.get(1, 0) == 'bam'");
                equals(grid.get(2, 0),
                       'foo',
                       "grid.get(2, 0) == 'foo'")
                equals(grid.get(3, 0),
                       'bar',
                       "grid.get(3, 0) == 'bar'")
            });
        }
    }
    
})(jQuery);