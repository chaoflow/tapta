(function($) {
	
    $(document).ready(function() {
        var diagram = new activities.ui.Diagram('#diagram_level_0');
        var action = new activities.ui.Action(diagram);
        action.x = 60;
        action.y = 100;
        
        var action = new activities.ui.Action(diagram);
        action.x = 220;
        action.y = 40;
        action.selected = true;
        action.label = 'Fooooo';
        
        var decision = new activities.ui.Decision(diagram);
        decision.x = 60;
        decision.y = 200;
        
        var decision = new activities.ui.Decision(diagram);
        decision.x = 200;
        decision.y = 150;
        
        diagram.render();
    });
    
    // activities namespace
    activities = {
        
        // model related operations
		model: {
			// activity model element types
		    INITIAL    : 0,
		    FORK       : 1,
		    JOIN       : 2,
		    DECISION   : 3,
		    MERGE      : 4,
		    FLOW_FINAL : 5,
		    FINAL      : 6,
		    ACTION     : 7,
		    EDGE       : 8
		},
		
		// rendering elements
        ui: {
            
            // constructors
            
            // Diagram element
			// refers to activity model
            Diagram: function(selector) {
                this.canvas = $(selector).get(0);
                this.context = this.canvas.getContext("2d");
                this.width = this.canvas.width;
                this.height = this.canvas.height;
                this.elements = new Array();
            },
            
            // Action element
			// refers to activity action, initial node, final node
            Action: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
                this.x = 0;
                this.y = 0;
                this.width = 100;
                this.height = 70;
                this.fillColor = '#3ce654';
                this.borderColor = '#ffc000';
                this.borderWidth = 3;
                this.label = 'Action';
                this.selected = false;
            },
            
            // Decision element
            Decision: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
                this.x = 0;
                this.y = 0;
                this.sideLength = 40;
                this.fillColor = '#c6c6c6';
                this.borderColor = '#000';
                this.borderWidth = 2;
            },
            
            // Join element
            Join: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
            },
            
            // Fork element
            Fork: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
            },
            
            // Connection element
            Connection: function(diagram) {
                this.diagram = diagram;
                this.diagram.add(this);
            }
        }
    }
    
    // activities.ui.Diagram member functions
    $.extend(activities.ui.Diagram.prototype, {
        
        // iterate over elements of diagram and call render function
        render: function() {
            for(var pt in this.elements) {
                this.elements[pt].render();
            }
        },
        
        // add element to this diagram
        add: function(elem) {
            this.elements.push(elem);
        }
        
    });
    
    // activities.ui.Action member functions
    $.extend(activities.ui.Action.prototype, {
        
        // render action
        render: function() {
            var context = this.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            context.fillStyle = this.fillColor;
            if (this.selected) {
                context.strokeStyle = this.borderColor;
                context.lineWidth = this.borderWidth;
                context.strokeRect((this.width / 2) * -1,
                                   (this.height / 2) * -1,
                                   this.width,
                                   this.height);
            }
            context.fillRect((this.width / 2) * -1,
                             (this.height / 2) * -1,
                             this.width,
                             this.height);
            context.fillStyle = '#000';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = '12px sans-serif';
            context.fillText(this.label, 0, 0, this.width);
            context.restore();
        }
        
    });
    
    // activities.ui.Decision member functions
    $.extend(activities.ui.Decision.prototype, {
        
        // render decision
        render: function() {
            var context = this.diagram.context;
            context.save();
            context.translate(this.x, this.y);
            context.rotate(45 * Math.PI / 180);
            context.fillStyle = this.fillColor;
            context.strokeStyle = this.borderColor;
            context.lineWidth = this.borderWidth;
            context.strokeRect((this.sideLength / 2) * -1,
                               (this.sideLength / 2) * -1,
                               this.sideLength,
                               this.sideLength);
            context.restore();
        }
        
    });
	
	// test model
	// supposed to be serialized/deserialized by JSON later
	// server side model > node.ext.uml.activities
	var test_activity_model = {
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
    }

})(jQuery);