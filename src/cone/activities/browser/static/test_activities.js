(function($) {
	
    tests = {
        
        // test model
        // supposed to be serialized/deserialized by JSON later
        // server side model > node.ext.uml.activities
        // XXX: incoming_edges and outgoing_edges should be computed on
        //      model init
        model: {
            type: activities.model.types.ACTIVITY,
            children: {
                start: {
                    type: activities.model.types.INITIAL,
                    incoming_edges: [],
                    outgoing_edges: ['edge_1']
                },
                fork: {
                    type: activities.model.types.FORK,
                    incoming_edges: ['edge_1'],
                    outgoing_edges: ['edge_2', 'edge_3']
                },
                join: {
                    type: activities.model.types.JOIN,
                    incoming_edges: ['edge_5', 'edge_7'],
                    outgoing_edges: ['edge_10']
                },
                decision: {
                    type: activities.model.types.DECISION,
                    incoming_edges: ['edge_6'],
                    outgoing_edges: ['edge_8', 'edge_9']
                },
                merge: {
                    type: activities.model.types.MERGE,
                    incoming_edges: ['edge_9', 'edge_10'],
                    outgoing_edges: ['edge_11']
                },
                action_1: {
                    type: activities.model.types.ACTION,
                    incoming_edges: ['edge_2'],
                    outgoing_edges: ['edge_4']
                },
                action_2: {
                    type: activities.model.types.ACTION,
                    incoming_edges: ['edge_3'],
                    outgoing_edges: ['edge_5']
                },
                action_3: {
                    type: activities.model.types.ACTION,
                    incoming_edges: ['edge_4'],
                    outgoing_edges: ['edge_6', 'edge_7']
                },
                flow_end: {
                    type: activities.model.types.FLOW_FINAL,
                    incoming_edges: ['edge_8'],
                    outgoing_edges: []
                },
                end: {
                    type: activities.model.types.FINAL,
                    incoming_edges: ['edge_11'],
                    outgoing_edges: []
                },
                edge_1: {
                    type: activities.model.types.EDGE,
                    source: 'start',
                    target: 'fork'
                },
                edge_2: {
                    type: activities.model.types.EDGE,
                    source: 'fork',
                    target: 'action_1'
                },
                edge_3: {
                    type: activities.model.types.EDGE,
                    source: 'fork',
                    target: 'action_2'
                },
                edge_4: {
                    type: activities.model.types.EDGE,
                    source: 'action_1',
                    target: 'action_3'
                },
                edge_5: {
                    type: activities.model.types.EDGE,
                    source: 'action_2',
                    target: 'join'
                },
                edge_6: {
                    type: activities.model.types.EDGE,
                    source: 'action_3',
                    target: 'decision'
                },
                edge_7: {
                    type: activities.model.types.EDGE,
                    source: 'action_3',
                    target: 'join'
                },
                edge_8: {
                    type: activities.model.types.EDGE,
                    source: 'decision',
                    target: 'flow_end'
                },
                edge_9: {
                    type: activities.model.types.EDGE,
                    source: 'decision',
                    target: 'merge'
                },
                edge_10: {
                    type: activities.model.types.EDGE,
                    source: 'join',
                    target: 'merge'
                },
                edge_11: {
                    type: activities.model.types.EDGE,
                    source: 'merge',
                    target: 'end'
                }
            }
        },
        
        run: function() {
            var model = new activities.model.Model(tests.model);
            
            module("activities.model.Model");
            
            test("activities.model.Model.filtered", function() {
                equals(11,
                       model.filtered(activities.model.types.EDGE).length,
                       "model.filtered(activities.model.types.EDGE)");
                equals(3,
                       model.filtered(activities.model.types.ACTION).length,
                       "filtered(activities.model.types.ACTION)");
                var res = model.filtered(
                    activities.model.types.EDGE,
                    tests.model.children.action_1);
                equals(0,
                       res,
                       "filtered(activities.model.types.ACTION, " +
                       "tests.model.children.action_1)");
            });
            
            test("activities.model.Model.incoming", function() {
                var res = model.incoming(model.context.children.decision);
                equals(1,
                       res.length,
                       "model.incoming(model.context.children.decision)");
                res = model.incoming(model.context.children.merge);
                equals(2,
                       res.length,
                       "model.incoming(model.context.children.merge)");
                equals(false,
                       !res[0].source || !res[0].target,
                       "res[0].source && res[0].target");
            });
            
            test("activities.model.Model.outgoing", function() {
                var res = model.outgoing(model.context.children.decision);
                equals(2,
                       res.length,
                       "model.outgoing(model.context.children.decision)");
                res = model.outgoing(model.context.children.merge);
                equals(1,
                       res.length,
                       "model.outgoing(model.context.children.merge)");
                equals(false,
                       !res[0].source || !res[0].target,
                       "res[0].source && res[0].target");
            });
            
            test("activities.model.Model.source", function() {
                var source = model.source(model.context.children.edge_1);
                equals(true,
                       source.type == activities.model.types.INITIAL,
                       "source.type == activities.model.types.INITIAL");
            });
            
            test("activities.model.Model.target", function() {
                var target = model.target(model.context.children.edge_1);
                equals(true,
                       target.type == activities.model.types.FORK,
                       "target.type == activities.model.types.FORK");
            });
        }
    }
	
})(jQuery);