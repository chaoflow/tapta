(function($) {
	
	$(document).ready(function() {
		var diagram = new activities.ui.Diagram('#diagram_level_0');
		var activity = new activities.ui.Activity(diagram);
		activity.x = 20;
		activity.y = 100;
		
		var activity = new activities.ui.Activity(diagram);
        activity.x = 220;
        activity.y = 40;
		activity.selected = true;
		activity.label = 'Fooooo';
		
		diagram.render();
	});
	
	// activities namespace
	activities = {
		
		// rendering elements
		ui: {
			
			// constructors
			
			// Diagram element
			Diagram: function(selector) {
				this.canvas = $(selector).get(0);
                this.context = this.canvas.getContext("2d");
			    this.width = this.canvas.width;
			    this.height = this.canvas.height;
				this.elements = new Array();
			},
			
			// Activity element
	        Activity: function(diagram) {
	            this.diagram = diagram;
				this.diagram.add(this);
				this.x = 0;
				this.y = 0;
				this.width = 100;
				this.height = 70;
				this.fillColor = '#3ce654';
				this.borderColor = '#ffc000';
				this.borderWidth = 3;
				this.label = 'Activity';
				this.selected = false;
	        },
	        
	        // Decision element
	        Decision: function(diagram) {
	            this.diagram = diagram;
                this.diagram.add(this);
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
	
	// activities.ui.Activity member functions
	$.extend(activities.ui.Activity.prototype, {
		
		// render activity
		render: function() {
			var context = this.diagram.context;
			context.save();
			context.translate(this.x, this.y);
            context.fillStyle = this.fillColor;
			if (this.selected) {
				context.strokeStyle = this.borderColor;
				context.lineWidth = this.borderWidth;
				context.strokeRect(0, 0, this.width, this.height);
			}
			context.fillRect(0, 0, this.width, this.height);
			context.fillStyle = '#000';
			context.textAlign = 'center';
			context.font = '12px sans-serif';
			context.fillText(this.label,
			                 this.width / 2,
							 this.height / 2,
							 this.width);
			context.restore();
        }
		
	});

})(jQuery);