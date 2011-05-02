define(['activities/core', 'cdn/qunit.js'], function($) {
    var Models = activities.model;
    
    tests = {
        
        create_test_model_1: function() {
            var start = new Models.Initial({label: "Start",
                                            description: "Description Start"});
            var fork = new Models.Fork({label: 'Fork',
                                        description: 'Description Fork'});
            var action_1 = new Models.Decision ({label: 'Action 1',
                                                 description: 'Description Action 1'});
            var action_2 = new Models.Action ({label: 'Action 2',
                                               description: 'Description Action 2'});
            var action_3 = new Models.Action ({label: 'Action 3',
                                               description: 'Description Action 3'});
            var join = new Models.Join({label: 'Join',
                                        description: 'Description Join'});
            var end = new Models.Final({label: 'End',
                                        description: 'Description End'});
            var decision = new Models.Decision({label: 'Decision',
                                                description: 'Description Decision'});
            var merge = new Models.Merge ({label: 'Merge',
                                           description: 'Description Merge'});
            
            var model = {
                name: 'model_1',
                children: [
                    start,
                    fork,
                    decision,
                    merge,
                    action_1,
                    action_2,
                    action_3,
                    join,
                    end,
                    new Models.Edge({source: start,
                                     target: fork,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: fork,
                                     target: action_1,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: fork,
                                     target: action_2,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: action_1,
                                     target: action_3,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: action_2,
                                     target: join,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: action_3,
                                     target: decision,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: action_3,
                                     target: join,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: decision,
                                     target: merge,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: join,
                                     target: merge,
                                     label: '',
                                     description: ''}),
                    new Models.Edge({source: merge,
                                     target: end,
                                     label: '',
                                     description: ''})
                ],

            }
            return model;
        },
        
        create_test_model_2: function() {
            var act_h = new Models.Final({label: 'Final',
                                          description: 'Description Final'});
            var act_g = new Models.Action({label: 'Action G',
                                           description: 'Description Action G'});
            var act_f = new Models.Action({label: 'Action F',
                                           description: 'Description Action F'});
            var act_e = new Models.Action({label: 'Action E',
                                           description: 'Description Action E'});
            var fork_a = new Models.Fork({label: 'Fork A',
                                          description: 'Description Fork A'});
            var act_d = new Models.Action({label: 'Action D',
                                           description: 'Description Action D'});
            var act_a = new Models.Initial({label: 'Action A',
                                            description: 'Description Action A'});
            var dec_a = new Models.Decision({label: 'Decision A',
                                             description: 'Description Decision A'});
            var act_b = new Models.Action({label: 'Action B',
                                           description: 'Description Action B'});
            var act_c = new Models.Action({label: 'Action C',
                                           description: 'Description Action C'});
            var mer_a = new Models.Merge({label: 'Merge A',
                                          description: 'Description Merge A'});
            var merge = new Models.Merge ({label: 'Merge',
                                           description: 'Description Merge'});
            var e_3 = new Models.Edge({source: dec_a,
                                   target: act_c,
                                   label: '',
                                   description: ''});
            var e_1 = new Models.Edge({source: act_a,
                                   target: dec_a,
                                   label: '',
                                   description: ''});
            var e_2 = new Models.Edge({source: dec_a,
                                   target: act_b,
                                   label: '',
                                   description: ''});
            var e_4 = new Models.Edge({source: act_b,
                                   target: mer_a,
                                   label: '',
                                   description: ''});
            var e_5 = new Models.Edge({source: act_c,
                                   target: mer_a,
                                   label: '',
                                   description: ''});
            var e_6 = new Models.Edge({source: mer_a,
                                   target: act_d,
                                   label: '',
                                   description: ''});
            var e_7 = new Models.Edge({source: act_d,
                                   target: fork_a,
                                   label: '',
                                   description: ''});
            var e_8 = new Models.Edge({source: fork_a,
                                   target: act_e,
                                   label: '',
                                   description: ''});
            var e_9 = new Models.Edge({source: fork_a,
                                   target: act_f,
                                   label: '',
                                   description: ''});
            var e_10 = new Models.Edge({source: fork_a,
                                    target: act_g,
                                    label: '',
                                    description: ''});
            var e_11 = new Models.Edge({source: act_e,
                                    target: act_h,
                                    label: '',
                                    description: ''});
            var e_12 = new Models.Edge({source: act_f,
                                    target: act_h,
                                    label: '',
                                    description: ''});
            var e_13 = new Models.Edge({source: act_g,
                                    target: act_h,
                                    label: '',
                                    description: ''});
            
            var model = {
                name: 'model_2',
                children: [
                    act_a,
                    dec_a,
                    act_b,
                    act_c,
                    mer_a,
                    act_d,
                    fork_a,
                    act_e,
                    act_f,
                    act_g,
                    act_h,
                    e_1,
                    e_2,
                    e_3,
                    e_4,
                    e_5,
                    e_6,
                    e_7,
                    e_8,
                    e_9,
                    e_10,
                    e_11,
                    e_12,
                    e_13]
            }
            return model;
        },
        
        run: function() {
            module("Models.Activity");
            
            var model = new Models.Activity(
                tests.create_test_model_1());
            test("Model.initial", function() {
                equals(model.initial().get("label"),
                       'Start', "model.initial().get(label)");
            });
            
            test("Model.create[Node|Edge]", function() {
                var source = model.create(Models.Action);
                equals(source.get("name").length, 36, "source.get(name).length");
                equals(source.get("incoming_edges").length,
                       0, "source.incoming_edges");
                equals(source.get("outgoing_edges").length,
                       0, "source.outgoing_edges");
                var target = model.create(Models.Action);
                var edge = model.createEdge(source, target);
                equals(edge.get("name").length, 36, "edge.get(name).length");
                equals(edge.get("source") instanceof Models.Element, true, 
                       "edge.source instanceof Models.Element");
                equals(edge.get("target") instanceof Models.Element, true, 
                       "edge.target instanceof Models.Element");
                equals(edge === source.get("outgoing_edges")[0],
                       true, "edge === source.get(outgoing_edges)[0]");
                equals(edge === target.get("incoming_edges")[0],
                       true, "edge.__name == target.incoming_edges[0");
                equals(edge.get("source") == source,
                       true, "edge.source == source.__name");
                equals(edge.get("target") == target,
                       true, "edge.target == target.__name");
            });
                 
            test("Model.remove", function() {
                var model = new Models.Activity();
                var a1 = model.create(Models.Action);
                var a2 = model.create(Models.Action);
                var a3 = model.create(Models.Action);
                var a4 = model.create(Models.Action);
                var a5 = model.create(Models.Action);
                var e1 = model.createEdge(a1, a2);
                var e2 = model.createEdge(a1, a3);
                var e3 = model.createEdge(a1, a4);
                var e4 = model.createEdge(a1, a5);
                equals(model.get("children").length,
                       9, "model.filtered(Models.Action).length");
                // XXX: dottedpath
                model.remove(a5);
                equals(model.get("children").length,
                       7, "model.filtered(Models.Action).length");
                // XXX: dottedpath
                model.remove(a1);
                equals(model.get("children").length,
                       3, "model.filtered(Models.Action).length");
            });
            
            module("activities.ui.ElementMatrix");
            
            var grid = new activities.ui.Grid();
            var matrix = new activities.ui.ElementMatrix(grid);
            
            test("ElementMatrix.[set|get]", function() {
                matrix.set(0, 0, 'foo');
                matrix.set(1, 0, 'bar');
                equals(matrix.get(0, 0),
                       'foo', "matrix.get(0, 0) == 'foo'");
                equals(matrix.get(1, 0),
                       'bar', "matrix.get(1, 0) == 'bar'");
                equals(typeof(matrix.get(1, 1)),
                       "undefined", 'typeof(matrix.get(1, 1)) == "undefined"');
            });
            
            test("ElementMatrix.before_X at zero position", function() {
                matrix.before_X(0, 0, 'baz');
                equals(matrix.get(0, 0),
                       'baz', "matrix.get(0, 0) == 'baz'");
                equals(matrix.get(1, 0),
                       'foo', "matrix.get(1, 0) == 'foo'");
                equals(matrix.get(2, 0),
                       'bar', "matrix.get(2, 0) == 'bar'");
            });
            
            test("ElementMatrix.before_X at none zero position, new column", function() {
                // expect ['baz', 'foo', 'bar']
                matrix.before_X(1, 0, 'bam');
                equals(matrix.get(0, 0),
                       'baz', "matrix.get(0, 0) == 'baz'");
                equals(matrix.get(1, 0),
                       'bam', "matrix.get(1, 0) == 'bam'");
                equals(matrix.get(2, 0),
                       'foo', "matrix.get(2, 0) == 'foo'");
                equals(matrix.get(3, 0),
                       'bar', "matrix.get(3, 0) == 'bar'");
            });
            
            test("ElementMatrix.before_X at none zero position, free position",
                 function() {
                matrix.set(2, 0, null);
                // expect ['baz', 'bam', null, 'bar']
                matrix.before_X(3, 0, 'foo');
                equals(matrix.get(0, 0),
                       'baz', "matrix.get(0, 0) == 'baz'");
                equals(matrix.get(1, 0),
                       'bam', "matrix.get(1, 0) == 'bam'");
                equals(matrix.get(2, 0),
                       'foo', "matrix.get(2, 0) == 'foo'");
                equals(matrix.get(3, 0),
                       'bar', "matrix.get(3, 0) == 'bar'");
            });
            
            matrix = new activities.ui.ElementMatrix();
            
            test("ElementMatrix.before_Y", function() {
                matrix.set(0, 0, 'foo');
                matrix.set(0, 1, null);
                matrix.set(0, 2, 'bar');
                matrix.set(0, 3, null);
                matrix.before_Y(0, 0, 'baz');
                equals(matrix.get(0, 0),
                       'baz', "matrix.get(0, 0) == 'baz'");
                equals(matrix.get(0, 1),
                       'foo', "matrix.get(0, 1) == 'foo'");
                matrix.before_Y(0, 2, 'bam');
                equals(matrix.get(0, 2),
                       'bam', "matrix.get(0, 2) == 'bam'");
                equals(matrix.get(0, 4),
                       'bar', "matrix.get(0, 4) == 'bar'");
            });
            
            module("activities.ui.Grid");
            
            grid = new activities.ui.Grid();
            grid.res_x = 10.0;
            grid.res_y = 10.0;
            
            test("Grid.nearest", function() {
                equals(grid.nearest(0, 0)[0] + ',' + grid.nearest(0, 0)[1],
                       '0,0', 'grid.nearest(0, 0)');
                equals(grid.nearest(4, 5)[0] + ',' + grid.nearest(4, 5)[1],
                       '0,1', 'grid.nearest(4, 5)');
                equals(grid.nearest(15, 14)[0] + ',' + grid.nearest(15, 14)[1],
                       '2,1', 'grid.nearest(15, 14)');
                grid.res_x = 30;
                grid.res_y = 50;
                equals(grid.nearest(30, 24)[0] + ',' + grid.nearest(30, 24)[1],
                       '1,0', 'grid.nearest(30, 24)');
                equals(grid.nearest(30, 50)[0] + ',' + grid.nearest(30, 50)[1],
                       '1,1', 'grid.nearest(30, 50)');
            });
        }
    }
    
});
