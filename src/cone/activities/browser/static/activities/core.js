/*
 * activities
 * ==========
 * 
 * An Activity diagram Editor.
 * 
 * Copyright (c) 2011, BlueDynamics Alliance, Austria, Germany, Switzerland
 * All rights reserved.
 * 
 * Contributors
 * ------------
 * 
 * - Robert Niederreiter
 * 
 * Requires
 * --------
 * 
 * - jQuery 1.4.2
 * - jQuery Tools 1.2.5
 * - jQuery templates beta 1
 * - bdajax 1.0.2
 */

define(['order!jquery',  
        'order!cdn/jquery.tmpl.js', "cdn/raphael.js",
        './model', "./storage", "./menubar", "./settings",
       "./element_views"], function() {

           var diagram_template = $.template(null, $("#diagram_template"));
           var canvas = $.template(null, $("#canvas"));

           activities.MenubarPanel = Backbone.View.extend({
               initialize: function(id){
                   this.id = id;
                   this.actions = new activities.actions.Menubar(this.id);
               },
               render: function(){
                   this.actions.render();
               }
           });

           var DiagramCanvasView = Backbone.View.extend({
               initialize:function(){
                   Backbone.View.prototype.initialize.call(this);
                   this.el.append('<div id="' + this.options.name + '" />');
                   this.canvas = Raphael(this.options.name, 600, 300);
               },
               events: {
                   "click" : "canvas_clicked",
                   "add_new_element" : "add_new_element"
               },
               render:function(){
               },
               canvas_clicked: function(event){
                   this.el.trigger('clicked_on_empty_space', 
                                   [this.model, {x: event.offsetX,
                                                 y: event.offsetY}]);
               },
               add_new_element: function(event, type, position){
                   this.options.strategy.add_new_element(event, type, position);
               }

           });

           var DiagramView = Backbone.View.extend({
               initialize:function(name){
                   this.activity = this.model.activity;
                   _.bindAll(this, "render_element");
                   this.name = name;
                   this.width = 600;
                   this.height = 300;
                   this.strategy = {};
                   if(this.activity)
                       this.activity.bind("add", this.render_element);

               },
               render_element: function(elem){
                   elem.createView(this.canvas.canvas).render();
               },
               render:function(){
                   if(this.activity === undefined){
                       return this;
                   }
                   $.tmpl(diagram_template, {name: this.name,
                                             width: this.width,
                                             height: this.height}).appendTo(this.el);
                   this.canvas = new DiagramCanvasView({width: this.width,
                                                        height: this.height,
                                                        name: 'canvas-' + this.name,
                                                        strategy: this.strategy,
                                                        el:this.$(".activity_diagram"),
                                                        model:this.activity});
                   this.canvas.render();
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
                   this.strategy = {
                       activity: this.model.activity,
                       add_new_element: function(event, type, position){
                           var elem = this.activity.create(type, {ui_data: position});
                       }
                   };
               }
           });

           
           window.ActivitiesView = Backbone.View.extend({

               initialize: function(selector) {

                   _.bindAll(this, "render", "reset_top_panel");
                   
                   var app_model = new activities.app_model();
                   this.app_model = app_model;

                   app_model.bind("change", this.render);
                   app_model.bind("change:top_panel", this.reset_top_panel);

                   this.el.append($('<div id="toppanel"></div><div id="toplayer" />'));

                   app_model.fetch();

                   new TopLevelDiagramView({model:app_model.get("layers").at(0),
                                            el:this.$("#toplayer")}).render();

                   for(var i=1;i<6;i++){
                       
                       new DiagramView({model:app_model.get("layers").at(i),
                                        el:this.$("#toplayer")
                                        .after('<div id="layer-' + i + '" />')
                                        .next()})
                           .render();
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
               }
           });
       });
