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
            // id is used by backbone internally to figure out what
            // was added to the storage already. name is used by us to
            // implement a hierarchical storage on top of the flat
            // localStorage.
            if (!model.id) {
                if (model.name) {
                    model.id = model.attributes.id = model.name;
                } else {
                    model.id = model.attributes.id = guid();
                }
            }
            if (!model.name) {
                model.name = model.id;
            }
            this.data[model.name] = model;
            this.save();
            return model;
        },
        update: function(model) {
            if (!model.name) {
                model.name = model.id;
            }
            this.data[model.name] = model;
            this.save();
            return model;
        },
        find: function(model) {
            if (!model.name) {
                model.name = model.id;
            }
            return this.data[model.name];
        },
        findAll: function() {
            return _.values(this.data);
        },
        destroy: function(model) {
            if (!model.name) {
                model.name = model.id;
            }
            delete this.data[model.name];
            // XXX: this might be the place to cleanup empty entries
            // from the localstorage
            this.save();
            return model;
        }
    });

    // XXX: proper cleanup is missing:
    // - sometimes not all models are deleted from a collection

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
            var name = obj.name || obj.id;
            return memo + pathsep + name;
        }, '');
    };

    var Model = Backbone.Model.extend({
        abspath: abspath,
        location: location,
        // XXX: define create in analogy to coll.create with addition
        // factory.
        constructor: function(attr, opts) {
            _.bindAll(this, "eventForwarder");
            this.name = opts && opts.name;
            this.parent = opts && opts.parent;
            Backbone.Model.apply(this, arguments);
        },
        defchild: function(Proto, attr, opts) {
            if (opts.parent === undefined) {
                opts.parent = this;
            }
            var child = new Proto(attr, opts);
            child.bind("all", this.eventForwarder);
            return child;
        },
        eventForwarder: function() {
            // call with exact same arguments as we were called
            this.trigger.apply(this, arguments);
        }
    });

    var Root = Model.extend({
        fetch: undefined,
        save: undefined
    });

    var Collection = Backbone.Collection.extend({
        abspath: abspath,
        location: location,
        model: Model,
        // XXX: hook into create to set parent
        // create: function() {
        //     var model = Backbone.Collection.create.apply(this, arguments);
        //     model.parent = parent;
        //     return model;
        // },
        constructor: function(attr, opts) {
            this.name = opts && opts.name;
            this.parent = opts && opts.parent;
            Backbone.Collection.apply(this, arguments);
        },
        // XXX: not sure whether a good idea, its not called early
        // enough, we are safer of to take id and collection as
        // replacement for name and parent, as done now above in
        // abspath.
        // _add: function() {
        //     var model = Backbone.Collection.prototype._add.apply(this, arguments);
        //     if (model.id) {
        //         if (model.name === undefined) {
        //             model.name = model.id;
        //         }
        //     }
        //     if (model.collection) {
        //         model.parent = model.collection;
        //     }
        //     return model;
        // },
        destroyAll: function() {
            _.forEach(this.toArray(), function(model) { model.destroy(); });
        }
    });

    Backbone.sync = function(method, model, success, error) {
        // model is either a collection or a model
        var resp;
        var store;

        // XXX: persist store on the models instead of recreating?
        //store = model.localStorage || model.collection.localStorage;
        if (model.collection) {
            store = new Store(model.collection.abspath());
        } else if (model instanceof Collection) {
            // Collections don't store anything themselves, they
            // are only a container for their models
            store = new Store(model.abspath());
        } else {
            store = new Store(model.parent.abspath());
        }

        switch (method) {
        case "create":
            resp = store.create(model);
            break;
        case "read":
            if (model instanceof Collection) {
                resp = store.findAll();
            } else {
                resp = store.find(model);
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
