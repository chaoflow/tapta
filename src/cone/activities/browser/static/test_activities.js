(function($) {
	
    tests = {
        
        // test model
        // supposed to be serialized/deserialized by JSON later
        // server side model > node.ext.uml.activities
        // XXX: incoming_edges and outgoing_edges should be computed on
        //      model init
        model: {
            type: activities.model.ACTIVITY,
            children: {
                start: {
                    type: activities.model.INITIAL,
                    incoming_edges: [],
                    outgoing_edges: ['edge_1']
                },
                fork: {
                    type: activities.model.FORK,
                    incoming_edges: ['edge_1'],
                    outgoing_edges: ['edge_2', 'edge_3']
                },
                join: {
                    type: activities.model.JOIN,
                    incoming_edges: ['edge_5', 'edge_7'],
                    outgoing_edges: ['edge_10']
                },
                decision: {
                    type: activities.model.DECISION,
                    incoming_edges: ['edge_6'],
                    outgoing_edges: ['edge_8', 'edge_9']
                },
                merge: {
                    type: activities.model.MERGE,
                    incoming_edges: ['edge_9', 'edge_10'],
                    outgoing_edges: ['edge_11']
                },
                action_1: {
                    type: activities.model.ACTION,
                    incoming_edges: ['edge_2'],
                    outgoing_edges: ['edge_4']
                },
                action_2: {
                    type: activities.model.ACTION,
                    incoming_edges: ['edge_3'],
                    outgoing_edges: ['edge_5']
                },
                action_3: {
                    type: activities.model.ACTION,
                    incoming_edges: ['edge_4'],
                    outgoing_edges: ['edge_6', 'edge_7']
                },
                flow_end: {
                    type: activities.model.FLOW_FINAL,
                    incoming_edges: ['edge_8'],
                    outgoing_edges: []
                },
                end: {
                    type: activities.model.FINAL,
                    incoming_edges: ['edge_11'],
                    outgoing_edges: []
                },
                edge_1: {
                    type: activities.model.EDGE,
                    source: 'start',
                    target: 'fork'
                },
                edge_2: {
                    type: activities.model.EDGE,
                    source: 'fork',
                    target: 'action_1'
                },
                edge_3: {
                    type: activities.model.EDGE,
                    source: 'fork',
                    target: 'action_2'
                },
                edge_4: {
                    type: activities.model.EDGE,
                    source: 'action_1',
                    target: 'action_3'
                },
                edge_5: {
                    type: activities.model.EDGE,
                    source: 'action_2',
                    target: 'join'
                },
                edge_6: {
                    type: activities.model.EDGE,
                    source: 'action_3',
                    target: 'decision'
                },
                edge_7: {
                    type: activities.model.EDGE,
                    source: 'action_3',
                    target: 'join'
                },
                edge_8: {
                    type: activities.model.EDGE,
                    source: 'decision',
                    target: 'flow_end'
                },
                edge_9: {
                    type: activities.model.EDGE,
                    source: 'decision',
                    target: 'merge'
                },
                edge_10: {
                    type: activities.model.EDGE,
                    source: 'join',
                    target: 'merge'
                },
                edge_11: {
                    type: activities.model.EDGE,
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
                       model.filtered(activities.model.EDGE).length,
                       "model.filtered(activities.model.EDGE)");
                equals(3,
                       model.filtered(activities.model.ACTION).length,
                       "filtered(activities.model.ACTION)");
                var res = model.filtered(
                    activities.model.EDGE,
                    tests.model.children.action_1);
                equals(0,
                       res,
                       "filtered(activities.model.ACTION, " +
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
                       source.type == activities.model.INITIAL,
                       "source.type == activities.model.INITIAL");
            });
            
            test("activities.model.Model.target", function() {
                var target = model.target(model.context.children.edge_1);
                equals(true,
                       target.type == activities.model.FORK,
                       "target.type == activities.model.FORK");
            });
        }
    }
	
})(jQuery);