define(['jquery', 'cdn/jquery.tmpl', "cdn/raphael.js",
        './model', "./storage", "./menubar", "./settings",
       "./element_views", "./strategies"], function() {

           var diagram_template = $.template(null, $("#diagram_template"));

           /* The Menubar sets up the menu actions and renders their button representations */
           activities.MenubarPanel = Backbone.View.extend({
               initialize: function(id){
                   this.id = id;
                   this.actions = new activities.actions.Menubar(this.id);
               },
               render: function(){
                   this.actions.render();
               }
           });

           /* The Diagram maintains the diagram with its canvas and local menu bars
            * It also decides which strategy to use
            */
           var DiagramView = Backbone.View.extend({
               initialize:function(name){
                   this.activity = this.model.activity;
                   _.bindAll(this, "render_element", "element_drag",
                            "activity_clicked");
                   this.name = name;
                   this.width = 600;
                   this.height = 300;
                   this.strategy = activities.strategy.simple(this.activity);
                   this.bind_events();
               },
               bind_events: function(){
                   if(this.activity){
                       this.activity.bind("add", this.render_element);
                       this.activity.bind("elem_click", this.element_clicked);
                       this.activity.bind("activity_click", this.activity_clicked);
                       this.activity.bind("elem_drag", this.element_drag);
                   }
               },
               reset: function(activity){
                   this.activity = activity;
                   this.strategy = activities.strategy.simple(activity);
                   this.bind_events();
                   this.el.empty();
                   this.render();
               },
               events: {
                   "click" : "canvas_clicked",
                   "add_new_element" : "add_new_element"
               },
               activity_clicked: function(node){
                   this.trigger("update_activity", node.get("activity"));
               },
               element_clicked: function(event){
               },
               element_drag: function(data){
                   this.strategy.dragging(data.context, data.rel_movement, 
                                          data.abs_movement);
               },
               canvas_clicked: function(event){
                   this.el.trigger('clicked_on_empty_space', 
                                   [this.model, {x: event.offsetX,
                                                 y: event.offsetY}]);
               },
               add_new_element: function(event, type, position){
                   this.strategy.add_new_element(event, type, position);
               },
               render_element: function(elem){
                   elem.createView(this.canvas).render();
               },
               render:function(){
                   if(this.activity === undefined){
                       return this;
                   }
                   $.tmpl(diagram_template, {name: this.name,
                                             width: this.width,
                                             height: this.height}).appendTo(this.el);
                   var canvas_container = this.el.find('.activity_diagram')[0];
                   this.canvas = Raphael(canvas_container, this.height, this.width);
                   return this;
               }
           });

           var TopLevelDiagramView = DiagramView.extend({
               initialize:function(){
                   // New computer
                   if(this.model.activity === undefined){
                       this.model.activity = new activities.model.Activity();
                   }
                   DiagramView.prototype.initialize.call(this, "top_level_diagram");
                   this.strategy = activities.strategy.simple(this.model.activity);
               }
           });

           /* Global view class */
           window.ActivitiesView = Backbone.View.extend({

               initialize: function(selector) {

                   _.bindAll(this, "render", "reset_top_panel");
                   
                   var app_model = new activities.app_model();
                   this.app_model = app_model;

                   app_model.bind("change:top_panel", this.reset_top_panel);

                   this.el.append($('<div id="toppanel"></div><div id="toplayer" />'));

                   app_model.fetch();

                   var diagrams = [];

                   diagrams[0] = new TopLevelDiagramView(
                       {model:app_model.get("layers").at(0),
                        el:this.$("#toplayer")});
                   
                   for(var i=5;i!=0;i--){
                       
                       diagrams[i] = new DiagramView({model:app_model.get("layers").at(i),
                                                      el:this.$("#toplayer")
                                                      .after('<div id="layer-' + i + '" />')
                                                      .next()});
                   }
                   for(var i=0;i<6;i++){
                       if(i<5){
                           diagrams[i].bind("update_activity", (function(index){
                               return function(activity){
                                   diagrams[index + 1].reset(activity);
                               };
                           })(i));
                       }
                       diagrams[i].render();
                   }
                   // New computer
                   if(app_model.get("top_panel") === undefined){
                       app_model.set({top_panel:[{class: "MenubarPanel",
                                                  args: "toppanel"}]});
                       app_model.save();
                   }
               },

               reset_top_panel: function(app_model){
                   this.$("#toppanel").empty()
                       . append($('<div class="actions" />'));
                   _.each(app_model.get("top_panel"), function(panel){
                       var panel_item = new activities[panel.class](panel.args);
                       panel_item.render();
                   });
               },
           });
       });
