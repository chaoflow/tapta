(function($) {
    
    $(document).ready(function() {
        var diagram = new activities.ui.Diagram('#diagram_level_0');
        var activity = new activities.ui.Activity(diagram);
        activity.x = 60;
        activity.y = 100;
        
        var activity = new activities.ui.Activity(diagram);
        activity.x = 220;
        activity.y = 40;
        activity.selected = true;
        activity.label = 'Fooooo';
        
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

})(jQuery);