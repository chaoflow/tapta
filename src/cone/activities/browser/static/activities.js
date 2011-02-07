(function($) {
	
	$(document).ready(function() {
		alert('foo');
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
			},
			
			// Activity element
	        Activity: function(diagram) {
	            this.diagram = diagram;
	        },
	        
	        // Decision element
	        Decision: function() {
	            
	        },
	        
	        // Join element
	        Join: function() {
	            
	        },
	        
	        // Fork element
	        Fork: function() {
	            
	        },
	        
	        // Connection element
	        Connection: function() {
	            
	        }
		}
	}
	
	// activities.ui.Diagram member functions
    $.extend(activities.ui.Diagram.prototype, {
        
    });
	
	// activities.ui.Activity member functions
	$.extend(activities.ui.Activity.prototype, {
		
	});

})(jQuery);