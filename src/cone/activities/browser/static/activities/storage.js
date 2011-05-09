define(["activities/settings", "cdn/backbone.js"], function(){

    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };

    function guid() {
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    };

    var Store = function(name) {
        this.name = name;
        var store = localStorage.getItem(this.name);
        this.data = (store && JSON.parse(store)) || {};
    };

    activities.Store = Store;
    
    _.extend(Store.prototype, {
        save: function() {
            localStorage.setItem(this.name, JSON.stringify(this.data));
        },
        create: function(model) {
            if(!model.id){
                model.id = model.attributes.id = guid();
            }
            this.data[model.id] = model;
            this.save();
            return model;
        },
        update: function(model) {
            this.data[model.id] = model;
            this.save();
            return model;
        },
        find: function(model) {
            return this.data[model.id];
        },
        findAll: function() {
            return _.values(this.data);
        },
        destroy: function(model) {
            delete this.data[model.id];
            this.save();
            return model;
        }
    });

    globalStore = new Store("test");

    Backbone.sync = function(method, model, success, error) {
        
        var resp;
        var store = model.localStorage || model.collection.localStorage;
        
        switch (method) {
        case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
        case "create":  resp = store.create(model);                            break;
        case "update":  resp = store.update(model);                            break;
        case "delete":  resp = store.destroy(model);                           break;
        }
        
        if (resp) {
            success(resp);
        } else {
            error("Record not found");
        }
    };
})

