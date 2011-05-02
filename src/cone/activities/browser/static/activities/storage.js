define(["cdn/backbone.js"], function(){
    var Store = function(name) {
        this.name = name;
        var store = localStorage.getItem(this.name);
        this.data = (store && JSON.parse(store)) || {};
    };
    
    _.extend(Store.prototype, {
        save: function() {
            localStorage.setItem(this.name, JSON.stringify(this.data));
        },
        create: function(model) {
            this.data[model.get("uid")] = model;
            this.save();
            return model;
        },
        update: function(model) {
            this.data[model.get("uid")] = model;
            this.save();
            return model;
        },
        find: function(model) {
            return this.data[model.get("uid")];
        },
        findAll: function() {
            return _.values(this.data);
        },
        destroy: function(model) {
            delete this.data[model.get("uid")];
            this.save();
            return model;
        }
    });

    globalStore = new Store("test");

    Backbone.sync = function(method, model, success, error) {
        
        var resp;
        var store = globalStore;
        
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

