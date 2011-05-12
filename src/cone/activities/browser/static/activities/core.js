define(['jquery', 'cdn/jquery.tmpl', "cdn/raphael.js",
        './model', "./storage", "./menubar", "./settings",
       "./element_views"], function() {

           var diagram_template = $.template(null, $("#diagram_template"));
           var properties_template = $.template(null, $("#properties_template"));

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

           var PropertiesView = Backbone.View.extend({
               initialize: function(){
                   _.bindAll(this, "handle_click", "handle_update");
                   this.options.activity.bind("elem_click", this.handle_click);
               },
               handle_click: function(elem){
                   var attrs = {};
                   this.elem = elem;
                   if(elem instanceof activities.model.Action){
                       attrs.hidden = {
                           activity_id: elem.get("activity_id"),
                           id: elem.id,
                           cid: elem.cid
                       };
                       attrs.singleline = {
                           name: elem.get("name") || ""
                       };
                       attrs.multiline = {
                           description: elem.get("description") || ""
                       };
                   }
                   this.render(attrs);
                   this.el.find('input[type=button]').unbind().bind("click", this.handle_update);
               },
               handle_update: function(a,b,c,d){
                   if(this.elem instanceof activities.model.Action){
                       this.elem.set({
                           name: this.el.find("input[name=name]").val(),
                           description: this.el.find("input[name=description").val()
                       });
                       this.elem.save();
                   }
               },
               render: function(attrs){
                   this.el.empty();
                   $.tmpl(properties_template, attrs).appendTo(this.el);
               }
           });

           /* The Diagram maintains the diagram with its canvas and local menu bars
            */
           var DiagramView = Backbone.View.extend({
               initialize:function(name){
                   this.activity = this.model.activity;
                   _.bindAll(this, "render_child", "element_drag",
                            "activity_clicked", "reset");
                   this.name = name;
                   this.width = 600;
                   this.height = 300;
                   this.el.height(this.height + 12);
                   $.tmpl(diagram_template, {name: this.name,
                                             width: this.width,
                                             height: this.height}).appendTo(this.el);
                   this.canvas_container = this.el.find(".canvas_container");
                   var canvas_width = innerWidth - 240;
                   this.canvas_container.width(canvas_width);
                   this.bind_events();
                   this.model.bind("change", this.reset);
                   this.properties_view = new PropertiesView({
                       el:$(this.el.find(".element_properties")[0]),
                       activity: this.activity
                   });

               },
               bind_events: function(){
                   if(this.activity){
                       this.activity.unbind();
                       this.activity.bind("add", this.render_child);
                       this.activity.bind("change:name", this.render_child);
                       this.activity.bind("change:description", this.render_child);
                       this.activity.bind("elem_click", this.element_clicked);
                       this.activity.bind("activity_click", this.activity_clicked);
                       this.activity.bind("elem_drag", this.element_drag);
                   }
               },
               reset: function(model){
                   this.activity = this.model.activity;
                   this.properties_view = new PropertiesView({
                       el:$(this.el.find(".element_properties")[0]),
                       activity: this.activity});
                   this.bind_events();
                   this.canvas_container.empty();
                   this.render();
               },
               events: {
                   "click" : "canvas_clicked",
                   "add_new_element" : "add_new_element"
               },
               activity_clicked: function(node){
                   this.trigger("update_activity", node.activity);
               },
               element_clicked: function(event){
               },
               element_drag: function(data){
                   this.activity.dragging(data.context, data.rel_movement, 
                                          data.abs_movement);
               },
               canvas_clicked: function(event){
                   this.el.trigger('clicked_on_empty_space', 
                                   [this.model, {x: event.offsetX,
                                                 y: event.offsetY}]);
               },
               add_new_element: function(event, type, position){
                   this.activity.create(type, position);
               },
               render_child: function(elem){
                   elem.getView(this.canvas).render();
               },
               render:function(){
                   if(this.activity === undefined){
                       return this;
                   }
                   this.canvas = Raphael(this.canvas_container[0], this.canvas_container.width(), this.height);
                   var here = this;
                   _.each(this.activity.children(), function(child){
                       here.render_child(child);
                   });
                   return this;
               }
           });

           var TopLevelDiagramView = DiagramView.extend({
               initialize:function(){
                   // New computer
                   if(this.model.activity === undefined){
                       this.model.updateActivity(new activities.model.Activity());
                   }
                   DiagramView.prototype.initialize.call(this, "top_level_diagram");
               }
           });

           /* Global view class */
           window.ActivitiesView = Backbone.View.extend({

               initialize: function(selector) {

                   _.bindAll(this, "render", "reset_top_panel", "save");
                   
                   var app_model = new activities.app_model();
                   this.app_model = app_model;

                   app_model.bind("change:top_panel", this.reset_top_panel);

                   this.el.append($('<div id="toppanel"></div><div id="toplayer" />'));

                   app_model.fetch();
                   $(document).bind("save", this.save);

                   var diagrams = [];

                   diagrams[0] = new TopLevelDiagramView({
                       model:app_model.layers.at(0),
                       el:this.$("#toplayer")
                   });
                   
                   for(var i=5;i!=0;i--){
                       
                       diagrams[i] = new DiagramView({model:app_model.layers.at(i),
                                                      el:this.$("#toplayer")
                                                      .after('<div id="layer-' + i + '" />')
                                                      .next()});
                   }
                   for(var i=0;i<6;i++){
                       if(i<5){
                           diagrams[i].bind("update_activity", (function(index){
                               return function(activity){
                                   app_model.layers.at(index + 1).updateActivity(activity);
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
               save: function(){
                   this.app_model.save();
               }
           });
       });
