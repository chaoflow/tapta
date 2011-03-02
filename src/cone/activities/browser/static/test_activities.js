(function($) {
    
    tests = {
        
        create_test_model_1: function() {
            var model = {
                __type: activities.model.ACTIVITY,
                __name: 'model_1',
                __parent: null,
                children: {
                    start: {
                        __type: activities.model.INITIAL,
                        label: 'Start',
                        description: 'Description Start'
                    },
                    fork: {
                        __type: activities.model.FORK,
                        label: 'Fork',
                        description: 'Description Fork'
                    },
                    join: {
                        __type: activities.model.JOIN,
                        label: 'Join',
                        description: 'Description Join'
                    },
                    decision: {
                        __type: activities.model.DECISION,
                        label: 'Decision',
                        description: 'Description Decision'
                    },
                    merge: {
                        __type: activities.model.MERGE,
                        label: 'Merge',
                        description: 'Description Merge'
                    },
                    action_1: {
                        __type: activities.model.ACTION,
                        label: 'Action 1',
                        description: 'Description Action 1'
                    },
                    action_2: {
                        __type: activities.model.ACTION,
                        label: 'Action 2',
                        description: 'Description Action 2'
                    },
                    action_3: {
                        __type: activities.model.ACTION,
                        label: 'Action 3',
                        description: 'Description Action 3'
                    },
                    end: {
                        __type: activities.model.FINAL,
                        label: 'End',
                        description: 'Description End'
                    },
                    edge_1: {
                        __type: activities.model.EDGE,
                        source: 'start',
                        target: 'fork',
                        label: '',
                        description: ''
                    },
                    edge_2: {
                        __type: activities.model.EDGE,
                        source: 'fork',
                        target: 'action_1',
                        label: '',
                        description: ''
                    },
                    edge_3: {
                        __type: activities.model.EDGE,
                        source: 'fork',
                        target: 'action_2',
                        label: '',
                        description: ''
                    },
                    edge_4: {
                        __type: activities.model.EDGE,
                        source: 'action_1',
                        target: 'action_3',
                        label: '',
                        description: ''
                    },
                    edge_5: {
                        __type: activities.model.EDGE,
                        source: 'action_2',
                        target: 'join',
                        label: '',
                        description: ''
                    },
                    edge_6: {
                        __type: activities.model.EDGE,
                        source: 'action_3',
                        target: 'decision',
                        label: '',
                        description: ''
                    },
                    edge_7: {
                        __type: activities.model.EDGE,
                        source: 'action_3',
                        target: 'join',
                        label: '',
                        description: ''
                    },
                    edge_8: {
                        __type: activities.model.EDGE,
                        source: 'decision',
                        target: 'merge',
                        label: '',
                        description: ''
                    },
                    edge_9: {
                        __type: activities.model.EDGE,
                        source: 'join',
                        target: 'merge',
                        label: '',
                        description: ''
                    },
                    edge_10: {
                        __type: activities.model.EDGE,
                        source: 'merge',
                        target: 'end',
                        label: '',
                        description: ''
                    }
                }
            }
            return model;
        },
        
        create_test_model_2: function() {
            var model = {
                __type: activities.model.ACTIVITY,
                __name: 'model_2',
                __parent: null,
                children: {
                    act_a: {
                        __type: activities.model.INITIAL,
                        label: 'Action A',
                        description: 'Description Action A'
                    },
                    dec_a: {
                        __type: activities.model.DECISION,
                        label: 'Decision A',
                        description: 'Description Decision A'
                    },
                    act_b: {
                        __type: activities.model.ACTION,
                        label: 'Action B',
                        description: 'Description Action B'
                    },
                    act_c: {
                        __type: activities.model.ACTION,
                        label: 'Action C',
                        description: 'Description Action C'
                    },
                    mer_a: {
                        __type: activities.model.MERGE,
                        label: 'Merge A',
                        description: 'Description Merge A'
                    },
                    act_d: {
                        __type: activities.model.ACTION,
                        label: 'Action D',
                        description: 'Description Action D'
                    },
                    fork_a: {
                        __type: activities.model.FORK,
                        label: 'Fork A',
                        description: 'Description Fork A'
                    },
                    act_e: {
                        __type: activities.model.ACTION,
                        label: 'Action E',
                        description: 'Description Action E'
                    },
                    act_f: {
                        __type: activities.model.ACTION,
                        label: 'Action F',
                        description: 'Description Action F'
                    },
                    act_g: {
                        __type: activities.model.ACTION,
                        label: 'Action G',
                        description: 'Description Action G'
                    },
                    act_h: {
                        __type: activities.model.FINAL,
                        label: 'Final',
                        description: 'Description Final'
                    },
                    e_1: {
                        __type: activities.model.EDGE,
                        source: 'act_a',
                        target: 'dec_a',
                        label: '',
                        description: ''
                    },
                    e_2: {
                        __type: activities.model.EDGE,
                        source: 'dec_a',
                        target: 'act_b',
                        label: '',
                        description: ''
                    },
                    e_3: {
                        __type: activities.model.EDGE,
                        source: 'dec_a',
                        target: 'act_c',
                        label: '',
                        description: ''
                    },
                    e_4: {
                        __type: activities.model.EDGE,
                        source: 'act_b',
                        target: 'mer_a',
                        label: '',
                        description: ''
                    },
                    e_5: {
                        __type: activities.model.EDGE,
                        source: 'act_c',
                        target: 'mer_a',
                        label: '',
                        description: ''
                    },
                    e_6: {
                        __type: activities.model.EDGE,
                        source: 'mer_a',
                        target: 'act_d',
                        label: '',
                        description: ''
                    },
                    e_7: {
                        __type: activities.model.EDGE,
                        source: 'act_d',
                        target: 'fork_a',
                        label: '',
                        description: ''
                    },
                    e_8: {
                        __type: activities.model.EDGE,
                        source: 'fork_a',
                        target: 'act_e',
                        label: '',
                        description: ''
                    },
                    e_9: {
                        __type: activities.model.EDGE,
                        source: 'fork_a',
                        target: 'act_f',
                        label: '',
                        description: ''
                    },
                    e_10: {
                        __type: activities.model.EDGE,
                        source: 'fork_a',
                        target: 'act_g',
                        label: '',
                        description: ''
                    },
                    e_11: {
                        __type: activities.model.EDGE,
                        source: 'act_e',
                        target: 'act_h',
                        label: '',
                        description: ''
                    },
                    e_12: {
                        __type: activities.model.EDGE,
                        source: 'act_f',
                        target: 'act_h',
                        label: '',
                        description: ''
                    },
                    e_13: {
                        __type: activities.model.EDGE,
                        source: 'act_g',
                        target: 'act_h',
                        label: '',
                        description: ''
                    },
                }
            }
            return model;
        },
        
        run: function() {
            module("activities.model.Model");
            
            var model = new activities.model.Model(
                tests.create_test_model_1());
            
            test("Model.node", function() {
                equals(model.node('decision').__name,
                       'decision', "model.node('decision').__name");
            });
            
            test("Model.filtered", function() {
                equals(model.filtered(activities.model.EDGE).length,
                       10, "model.filtered(activities.model.EDGE)");
                equals(model.filtered(activities.model.ACTION).length,
                       3, "filtered(activities.model.ACTION)");
                var res = model.filtered(
                    activities.model.EDGE,
                    model.node('action_1'));
                equals(res, 0,
                       "filtered(activities.model.ACTION, " +
                       "model.node('action_1'))");
            });
            
            test("Model.incoming", function() {
                var res = model.incoming(model.node('decision'));
                equals(res.length,
                       1, "model.incoming(model.node('decision'))");
                res = model.incoming(model.node('merge'));
                equals(res.length,
                       2, "model.incoming(model.node('merge'))");
                equals(!res[0].source || !res[0].target,
                       false, "res[0].source && res[0].target");
            });
            
            test("Model.outgoing", function() {
                var res = model.outgoing(model.node('decision'));
                // equals(2,
                equals(res.length,
                       1, "model.outgoing(model.node('decision'))");
                res = model.outgoing(model.node('merge'));
                equals(res.length,
                       1, "model.outgoing(model.node('merge'))");
                equals(!res[0].source || !res[0].target,
                       false, "res[0].source && res[0].target");
            });
            
            test("Model.source", function() {
                var source = model.source(model.node('edge_1'));
                equals(source.__type == activities.model.INITIAL,
                       true, "source.__type == activities.model.INITIAL");
                equals(source.__name == 'start',
                       true, "source.__name == 'start'");
                equals(source.__parent == 'model_1',
                       true, "source.__parent == 'model_1'");
            });
            
            test("Model.target", function() {
                var target = model.target(model.node('edge_1'));
                equals(target.__type == activities.model.FORK,
                       true, "target.__type == activities.model.FORK");
                equals(target.__name == 'fork',
                       true, "target.__name == 'fork'");
                equals(target.__parent == 'model_1',
                       true, "target.__parent == 'model_1'");
            });
            
            test("Model.initial", function() {
                equals(model.initial().__name,
                       'start', "model.initial().__name");
            });
            
            test("Model.create[Node|Edge]", function() {
                var source = model.createNode(activities.model.ACTION);
                equals(source.__name.length, 36, "source.__name.length");
                equals(source.__parent, 'model_1', "source.__parent");
                equals(source.incoming_edges.length,
                       0, "source.incoming_edges");
                equals(source.outgoing_edges.length,
                       0, "source.outgoing_edges");
                var target = model.createNode(activities.model.ACTION);
                var edge = model.createEdge(source.__name, target.__name);
                equals(edge.__name.length, 36, "edge.__name.length");
                equals(edge.source.length, 36, "edge.source.length");
                equals(edge.target.length, 36, "edge.target.length");
                equals(edge.__name == source.outgoing_edges[0],
                       true, "edge.__name == source.outgoing_edges[0]");
                equals(edge.__name == target.incoming_edges[0],
                       true, "edge.__name == target.incoming_edges[0]");
                equals(edge.source == source.__name,
                       true, "edge.source == source.__name");
                equals(edge.target == target.__name,
                       true, "edge.target == target.__name");
            });
            
            test("Model.remove", function() {
                var model = new activities.model.Model();
                var a1 = model.createNode(activities.model.ACTION);
                var a2 = model.createNode(activities.model.ACTION);
                var a3 = model.createNode(activities.model.ACTION);
                var a4 = model.createNode(activities.model.ACTION);
                var a5 = model.createNode(activities.model.ACTION);
                var e1 = model.createEdge(a1.__name, a2.__name);
                var e2 = model.createEdge(a1.__name, a3.__name);
                var e3 = model.createEdge(a1.__name, a4.__name);
                var e4 = model.createEdge(a1.__name, a5.__name);
                equals(model.filtered(activities.model.ACTION).length,
                       5, "model.filtered(activities.model.ACTION).length");
                equals(model.filtered(activities.model.EDGE).length,
                       4, "model.filtered(activities.model.EDGE).length");
                // XXX: dottedpath
                model.remove(a5.__name);
                equals(model.filtered(activities.model.ACTION).length,
                       4, "model.filtered(activities.model.ACTION).length");
                equals(model.filtered(activities.model.EDGE).length,
                       3, "model.filtered(activities.model.EDGE).length");
                // XXX: dottedpath
                model.remove(a1.__name);
                equals(model.filtered(activities.model.ACTION).length,
                       3, "model.filtered(activities.model.ACTION).length");
                equals(model.filtered(activities.model.EDGE).length,
                       0, "model.filtered(activities.model.EDGE).length");
            });
            
            module("activities.ui.Grid");
            
            var grid = new activities.ui.Grid();
            
            test("Grid.[set|get]", function() {
                grid.set(0, 0, 'foo');
                grid.set(1, 0, 'bar');
                equals(grid.get(0, 0),
                       'foo', "grid.get(0, 0) == 'foo'");
                equals(grid.get(1, 0),
                       'bar', "grid.get(1, 0) == 'bar'");
                equals(typeof(grid.get(1, 1)),
                       "undefined", 'typeof(grid.get(1, 1)) == "undefined"');
            });
            
            test("Grid.before_X at zero position", function() {
                grid.before_X(0, 0, 'baz');
                equals(grid.get(0, 0),
                       'baz', "grid.get(0, 0) == 'baz'");
                equals(grid.get(1, 0),
                       'foo', "grid.get(1, 0) == 'foo'");
                equals(grid.get(2, 0),
                       'bar', "grid.get(2, 0) == 'bar'");
            });
            
            test("Grid.before_X at none zero position, new column", function() {
                // expect ['baz', 'foo', 'bar']
                grid.before_X(1, 0, 'bam');
                equals(grid.get(0, 0),
                       'baz', "grid.get(0, 0) == 'baz'");
                equals(grid.get(1, 0),
                       'bam', "grid.get(1, 0) == 'bam'");
                equals(grid.get(2, 0),
                       'foo', "grid.get(2, 0) == 'foo'");
                equals(grid.get(3, 0),
                       'bar', "grid.get(3, 0) == 'bar'");
            });
            
            test("Grid.before_X at none zero position, free position",
                 function() {
                grid.set(2, 0, null);
                // expect ['baz', 'bam', null, 'bar']
                grid.before_X(3, 0, 'foo');
                equals(grid.get(0, 0),
                       'baz', "grid.get(0, 0) == 'baz'");
                equals(grid.get(1, 0),
                       'bam', "grid.get(1, 0) == 'bam'");
                equals(grid.get(2, 0),
                       'foo', "grid.get(2, 0) == 'foo'");
                equals(grid.get(3, 0),
                       'bar', "grid.get(3, 0) == 'bar'");
            });
            
            grid = new activities.ui.Grid();
            
            test("Grid.before_Y", function() {
                grid.set(0, 0, 'foo');
                grid.set(0, 1, null);
                grid.set(0, 2, 'bar');
                grid.set(0, 3, null);
                grid.before_Y(0, 0, 'baz');
                equals(grid.get(0, 0),
                       'baz', "grid.get(0, 0) == 'baz'");
                equals(grid.get(0, 1),
                       'foo', "grid.get(0, 1) == 'foo'");
                grid.before_Y(0, 2, 'bam');
                equals(grid.get(0, 2),
                       'bam', "grid.get(0, 2) == 'bam'");
                equals(grid.get(0, 4),
                       'bar', "grid.get(0, 4) == 'bar'");
            });
        }
    }
    
})(jQuery);