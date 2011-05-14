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

    // XXX: proper cleanup is missing:
    // - sometimes not all models are deleted from a collection
    // - the collection key is not deleted

    var locationIterator = function(obj) {
        if (!obj) { obj = this; }
        if (obj.parent) {
            return locationIterator(obj.parent).concat(obj);
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

    var Model = Backbone.Model.extend({
        abspath: abspath,
        location: locationIterator,

        getKey: function() {
            if (!this.collection) {
                if (!this.KEY) {
                    throw "Model without collection and KEY";
                };
                // not sure how much sense this makes
                return this.KEY;
            }
            return this.collection.getKey();
        }
    });

    var Collection = Backbone.Collection.extend({
        abspath: abspath,
        location: locationIterator,

        destroyAll: function() {
            _.forEach(this.toArray(), function(model) { model.destroy(); });
        },
        getKey: function() {
            if (!this.name) {
                throw "Collection needs a name!";
            }
            var prefix;
            if (!this.parent) {
                prefix = KEY;
            } else if (this.parent.KEY) {
                prefix = KEY + "/" + this.parent.KEY;
            } else {
                prefix = this.parent.getKey();
                if (!prefix) {
                    throw "Parent returned undefined key";
                }
                if (!this.parent.id) {
                    this.parent.id = this.parent.attributes.id = guid();
                }
                prefix = prefix + "/" + this.parent.id;
            }
            return prefix + "/" + this.name;
        },
        model: Model
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
            store = new Store(model.getKey());
        }

        switch (method) {
        case "create":
            resp = store.create(model);
            break;
        case "read":
            resp = model.id ? store.find(model) : store.findAll();
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
        locationIterator: locationIterator,
        Collection: Collection,
        Model: Model,
        Store: Store
    };
});

