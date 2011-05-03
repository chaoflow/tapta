define(['cdn/underscore.js', "cdn/backbone.js"], function(){
    // ************************************************************************
    // activities.model.Model
    // ************************************************************************
    // An UML Diagram contains a number different elements.
    // There is an Activity, this contains a number of children and
    // has a parent. The childrens are Nodes and Edges, the Parent is
    // an Action Node. 
    // The nodes are UML elements that have an Activity as their
    // parent, and are connected via nodes. The Action Node can have
    // an Activity as a detail.
    // An Edge is an element that points from one node to another
    // node.
    // Nodes know which Edges point away from them and which point
    // towards them. Edges know to which Node they point.
    // All Elements are implemented with Backbone.Model objects.

    
    if (!window.activities){
        window.activities = {};
    }

    var Models = {}
    activities.model = Models;
    
    Models.Element = Backbone.Model.extend({
        initialize: function(){
            this.set({name: this.get("name") || createUID(),
                      uid: createUID()});
        },
    });

    Models.Node = Models.Element.extend({
        defaults : {
            label : "",
            description : "",
            children : [],
        },
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
        },
    } , {});

    Models.Activity = Models.Element.extend({
        initialize : function(){
            // Tell the children who their father is and give them
            // names
            this.set({id:'test'})
            Models.Element.prototype.initialize.call(this);
        },
        initial : function(){
            return _(this.get("children")).chain()
                .select(function(child){
                    return child instanceof Models.Initial;
                })
                .first()
                .value();
        },
        getEdgesFor : function(node){
            return _.select(this.get("children"), function(child){
                return (child.get("target") === node 
                        || child.get("source") === node);
            });
        },
        create : function(nodeType){
            var node = new nodeType();
            var children = this.get('children');
            if(!children){
                children = new Array();
            }
            children.push(node);
            this.set({'children': children});
            return node
        },
        createEdge : function(source, target){
            var edge = this.create(Models.Edge);
            edge.set({source: source,
                       target: target});
            return edge;
        },
        remove: function(node){
            if (!node) {
                return ;
            }
            if (node instanceof Models.Edge){
                this.set({"children" : _.without(this.get("children"), node)});
            } else {
                var obsolete = this.getEdgesFor(node).concat([node]);
                this.set({children: _.without.apply(this, 
                                                    [this.get("children")]
                                                    .concat(obsolete)) });
            }
        },
    } , {display_name : "Activity"});

    Models.Initial = Models.Node.extend({} ,
                                        {display_name : "Initial Node"});

    Models.Fork = Models.Node.extend({} ,
                                     {display_name : "Fork"});

    Models.Join = Models.Node.extend({} ,
                                     {display_name : "Join"});

    Models.Decision = Models.Node.extend({} ,
                                         {display_name : "Decision"});

    Models.Merge = Models.Node.extend({} ,
                                      {display_name : "Merge"});

    Models.Final = Models.Node.extend({} ,
                                      {display_name : "Final Node"});

    Models.Action = Models.Node.extend({} ,
                                       {display_name : "Action"});

    Models.Edge = Models.Element.extend({
        defaults : {
            label : "",
            description : ""
        },
        initialize : function(){
            Models.Element.prototype.initialize.call(this);
        }
    }, {display_name : "Edge"});


    /*
     * create uid
     * http://stackoverflow.com/questions/105034/
     */ 
    function createUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
            .replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' 
                    ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }).toUpperCase();
    }
});
