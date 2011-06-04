define([
    'require',
    'cdn/underscore.js',
    'cdn/backbone.js',
    './base',
    './settings'
], function(require) {
    var base = require('./base');
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

    // XXX: move most of this to base, except the very storage

    var Model = Backbone.Model.extend({
        abspath: base.abspath,
        location: base.location,
        // XXX: define create in analogy to coll.create with addition
        // factory.
        constructor: function(attr, opts) {
            this.name = opts && opts.name;
            this.parent = opts && opts.parent;
            Backbone.Model.apply(this, arguments);
            if (this.logevents) {
                this.bind("all", function() { console.log(arguments); });
            }
        },
        defchild: function(Proto, attr, opts) {
            if (opts.parent === undefined) {
                opts.parent = this;
            }
            var child = new Proto(attr, opts);
            //child.bind("all", this.getEventForwarder(child));
            return child;
        // XXX: reintroduce with change::/path/to/child if really
        // needed, otherwise collision with events like change:selected
        // },
        // getEventForwarder: function(child) {
        //     // XXX: How can we create an arguments object?
        //     // XXX: Is there something like python *args
        //     return _.bind(function(event, a, b, c, d, e) {
        //         // event = "change:foo/bar"
        //         // we prepend the name of the child
        //         var type = event.split(":")[0];
        //         var subtype = event.split(":").splice(1).join(":");
        //         var newevent = type;
        //         newevent += ":" + child.name;
        //         newevent += (subtype ? "/" + subtype : "");
        //         console.log(newevent, a, b, c, d, e);
        //         this.trigger(newevent, a, b, c, d, e);
        //     }, this);
        }
    });

    var Root = Model.extend({
        fetch: undefined,
        save: undefined
    });

    var Collection = Backbone.Collection.extend({
        abspath: base.abspath,
        location: base.location,
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

    // A collection where each model has an idx. insert is supported
    // and updates the idx of all affected models
    var IndexedCollection = Collection.extend({
        _add: function(model, opts) {
            // elements without an idx are appended
            idx = model.get ? model.get('idx') : model.idx;
            if (idx === undefined) {
                idx = this.length;
            }
            if (model.set) {
                model.set({idx: idx}, opts);
                // only save if model exist in the db
                if (model.get('id')) {
                    model.save();
                }
            } else {
                model.idx = idx;
            }
            // ATTENTION: Backbone.Collection._add returns the model
            // but .add returns the collection.
            return Collection.prototype._add.apply(this, arguments);
        },
        comparator: function(path) {
            return path.get('idx');
        },
        insert: function(model, opts) {
            if (opts.idx === undefined) {
                throw "insert needs opts.idx";
            }
            // shift all models, starting with last model to model
            // with idx of model to be inserted.
            // not sure whether the collection resorts on each changed event
            var N = this.length-1;
            var models = this.toArray();
            for (var i=N; i>=opts.idx; i--) {
                models[i].set({idx: i+1}, opts);
                // only save if model exist in the db
                if (models[i].get('id')) {
                    models[i].save();
                }
            }
            if (model.set) {
                model.set({idx: opts.idx});
            } else {
                model.idx = opts.idx;
            }
            this._add(model, opts);
        },
        _remove: function(model, opts) {
            model = Collection.prototype._remove.apply(this, arguments);
            var N = this.length-1;
            var models = this.toArray();            
            for (var i=model.get('idx'); i<=N; i++) {
                models[i].set({idx: i}, opts);
                // only save if model exist in the db
                if (models[i].get('id')) {
                    models[i].save();
                }
            }
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
        Collection: Collection,
        IndexedCollection: IndexedCollection,
        Model: Model,
        Root: Root,
        Store: Store
    };
});
