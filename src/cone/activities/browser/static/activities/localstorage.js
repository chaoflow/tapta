define([
    'require',
    'cdn/underscore.js',
    'cdn/backbone.js',
    './settings'
], function(require) {
    var settings = require('./settings');
    var KEY = settings.localstorage_key;

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

    Store.guid = guid;

    _.extend(Store.prototype, {
        save: function() {
            localStorage.setItem(this.name, JSON.stringify(this.data));
        },
        create: function(model) {
            if (model.abspath) {
                if (!model.id) {
                    if (model.name) {
                        model.id = model.attributes.id = model.name;
                    } else {
                        model.id = model.attributes.id = model.name = guid();
                    }
                }
                this.data[model.name] = model;
            } else {
                // XXX: compat
                if(!model.id){
                    model.id = model.attributes.id = guid();
                }
                this.data[model.id] = model;
            }
            this.save();
            return model;
        },
        update: function(model) {
            if (model.abspath) {
                this.data[model.name] = model;
            } else {
                // XXX: compat
                this.data[model.id] = model;
            }
            this.save();
            return model;
        },
        find: function(model) {
            if (model.abspath) {
                return this.data[model.name];
            } else {
                // XXX: compat
                return this.data[model.id];
            }
        },
        findAll: function() {
            return _.values(this.data);
        },
        destroy: function(model) {
            if (model.abspath) {
                delete this.data[model.name];
            } else {
                // XXX: compat
                delete this.data[model.id];
            }
            this.save();
            return model;
        }
    });

    // XXX: proper cleanup is missing:
    // - sometimes not all models are deleted from a collection
    // - the collection key is not deleted

    var location = function(obj) {
        if (!obj) { obj = this; }
        if (obj.parent) {
            return location(obj.parent).concat(obj);
        } else if (obj.collection) {
            return location(obj.collection).concat(obj);
        } else {
            return [obj];
        }
    };

    var abspath = function(location) {
        var pathsep = '/';
        if (!location) { location = this.location(); }
        return _.reduce(location, function(memo, obj) {
            return memo + pathsep + obj.name;
        }, '');
    };

    var defchild = function(Proto, name, parent) {
        var child = new Proto();
        child.name = name;
        child.parent = parent || this;
        child.fetch();
        return child;
    };

    var Root = Backbone.Model.extend({
        abspath: abspath,
        defchild: defchild,
        fetch: undefined,
        location: location,
        save: undefined
    });

    var Model = Backbone.Model.extend({
        abspath: abspath,
        defchild: defchild,
        location: location
    });

    var Collection = Backbone.Collection.extend({
        abspath: abspath,
        defchild: defchild,
        location: location,
        model: Model,
        destroyAll: function() {
            _.forEach(this.toArray(), function(model) { model.destroy(); });
        }
    });

    Backbone.sync = function(method, model, success, error) {
        // model is either a collection or a model
        var resp;
        var store;
        try {
            store = model.localStorage || model.collection.localStorage;
        } catch (e) {
            if (e.type !== "non_object_property_load") {
                throw e;
            }
        }
        if (!store) {
            // XXX: persist store on the models instead of recreating?
            if (model.collection) {
                store = new Store(model.collection.abspath());
            } else if (model instanceof Collection) {
                // Collections don't store anything themselves, they
                // are only a container for their models
                store = new Store(model.abspath());
            } else {
                store = new Store(model.parent.abspath());
            }
        }

        switch (method) {
        case "create":
            resp = store.create(model);
            break;
        case "read":
            if (model.abspath) {
                if (model instanceof Collection) {
                    resp = store.findAll();
                } else {
                    resp = store.find(model);
                }
            } else {
                // XXX: compat
                resp = model.id ? store.find(model) : store.findAll();
            }
            break;
        case "update":
            resp = store.update(model);
            break;
        case "delete":
            resp = store.destroy(model);
            break;
        }
        
        if (resp) {
            success(resp);
        } else {
            error("Record not found");
        }
    };

    return {
        abspath: abspath,
        location: location,
        Collection: Collection,
        Model: Model,
        Root: Root,
        Store: Store
    };
});

