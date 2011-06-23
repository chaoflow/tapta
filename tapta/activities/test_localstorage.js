define([
    'require',
    'vendor/qunit.js',
    'vendor/underscore.js',
    'vendor/backbone.js',
    './localstorage'
], function(require) {
    // dependencies we need a handle for
    var storage = require('./localstorage');
    var Collection = storage.Collection;
    var Model = storage.Model;

    module('TaPTa Storage');

    test("Backbone.Model.extend behaves as expected", function() {
        // a custom constructor
        Mod = Backbone.Model.extend({
            a: 1,
            constructor: function(attrs, opts) {
                this.b = opts && opts.b;
                // it is important to pass the arguments list, not the
                // names we gave its components
                Backbone.Model.apply(this, arguments);
            },
            initialize: function(attrs, opts) {
                this.d = 4;
            }
        });
        mod = new Mod({c:3}, {b:2, e:5});
        equal(Mod.prototype.a, 1, "Extended attr ended up on prototype");
        equal(mod.a, 1, "Extended attr is visible as proprty on model");
        equal(mod.b, 2, "Custom constructor was used");
        equal(mod.get('c'), 3,
              "Model has initial attribute, i.e original constructor was called"
             );
        equal(mod.d, 4, "Custom initialized was called");
        equal(mod.e, undefined, "Other option was ignored");
    });

    test("Backbone.Collection.extend behaves as expected", function() {
        // a custom constructor
        Coll = Backbone.Collection.extend({
            a: 1,
            constructor: function(attrs, opts) {
                this.b = opts && opts.b;
                // it is important to pass the arguments list, not the
                // names we gave its components
                Backbone.Collection.apply(this, arguments);
            },
            initialize: function(attrs, opts) {
                this.d = 4;
            }
        });
        coll = new Coll({c:3}, {b:2, e:5});
        equal(Coll.prototype.a, 1, "Extended attr ended up on prototype");
        equal(coll.a, 1, "Extended attr is visible as proprty on collel");
        equal(coll.b, 2, "Custom constructor was used");
        equal(coll.first().get('c'), 3,
              "Member model based on intial data was created");
        equal(coll.d, 4, "Custom initialized was called");
        equal(coll.e, undefined, "Other option was ignored");
    });

    test("storage.Collection uses storage.Model as default model", function() {
        var coll = new Collection();
        equal(coll.model, Model, "Collection model is default Model");
    });

    test("Its possible to define a custom model for collections", function() {
        var Mod = Model.extend();
        var Coll = Collection.extend({model: Mod});
        var coll = new Coll();
        equal(coll.model, Mod, "Collection model is our model");
    });

    test("Name and parent are picked from opts", function() {
        var mod = new Model(undefined, {name: 'mod', parent: 'par'});
        equal(mod.name, 'mod', "Name made it for model");
        equal(mod.parent, 'par', "Parent made it for model");

        mod = new Model({a:1}, {name: 'mod', parent: 'par'});
        equal(mod.get('a'), 1, "Initial attribute made it");
        equal(mod.name, 'mod', "Name made it for model alongside attr");
        equal(mod.parent, 'par', "Parent made it for model alongside attr");

        var coll = new Collection(undefined, {name: 'coll', parent: 'par'});
        equal(coll.name, 'coll', "Name made it for collection");
        equal(coll.parent, 'par', "Parent made it for collection");

        coll = new Collection({a:1}, {name: 'coll', parent: 'par'});
        equal(coll.first().get('a'), 1, "Initial attribute ended up in model");
        equal(coll.name, 'coll', "Name made it for collection alongside attr");
        equal(coll.parent, 'par', "Parent made it for collection alongside attr");

        // now with another level of extend
        var Mod = Model.extend({prop:1});
        var Coll = Collection.extend({model:Mod});

        mod = new Mod({}, {name: 'mod', parent: 'par'});
        equal(mod.prop, 1, "Property is there");
        equal(mod.name, 'mod', "Name made it for model");
        equal(mod.parent, 'par', "Parent made it for model");

        mod = new Mod({a:1}, {name: 'mod', parent: 'par'});
        equal(mod.prop, 1, "Property is there");
        equal(mod.get('a'), 1, "Initial attribute made it");
        equal(mod.name, 'mod', "Name made it for model alongside attr");
        equal(mod.parent, 'par', "Parent made it for model alongside attr");

        coll = new Coll([], {name: 'coll', parent: 'par'});
        equal(coll.name, 'coll', "Name made it for collection");
        equal(coll.parent, 'par', "Parent made it for collection");

        coll = new Coll({a:1}, {name: 'coll', parent: 'par'});
        equal(coll.first().get('a'), 1, "Initial attribute ended up in model");
        ok(coll.first() instanceof Mod, "Auto-created model is correct type");
        equal(coll.name, 'coll', "Name made it for collection alongside attr");
        equal(coll.parent, 'par', "Parent made it for collection alongside attr");
    });

    test("Model/Collection abspath", function() {
        var A = new Model();
        var B = new Collection();
        var C = new Model();
        var D = new Model();
        var E = new Collection();
        A.name = 'A';
        B.name = 'B';
        B.parent = A;
        C.name = 'C';
        C.parent = B;
        D.name = 'D';
        D.parent = C;
        E.name = 'E';
        E.parent = D;
        deepEqual(A.abspath(), '/A');
        deepEqual(B.abspath(), '/A/B');
        deepEqual(C.abspath(), '/A/B/C');
        deepEqual(D.abspath(), '/A/B/C/D');
        deepEqual(E.abspath(), '/A/B/C/D/E');
    });

    var test_root = new Model();
    test_root.name = 'test_root';
    localStorage.removeItem(test_root.abspath());

    test("CRUD named models", function() {
        // create
        var model1 = new Model({a: 1});
        var model2 = new Model({a: 2});
        model1.name = "model1";
        model2.name = "model2";
        model1.parent = model2.parent = test_root;
        model1.save();
        model2.save();

        // read
        var model1n = new Model();
        var model2n = new Model();
        model1n.name = "model1";
        model2n.name = "model2";
        model1n.parent = model2n.parent = test_root;
        model1n.fetch();
        model2n.fetch();
        equal(model1n.get('a'), 1, "Create and read 1");
        equal(model2n.get('a'), 2, "Create and read 2");

        // update
        model1n.set({a: 10});
        model1.fetch();
        equal(model1.get('a'), 1, "Not updated without save");
        model1n.save();
        model1.fetch();
        equal(model1.get('a'), 10, "Updated after save");

        // delete
        model1.destroy();
        model2.destroy();
        var model1nn = new Model();
        var model2nn = new Model();
        model1nn.name = "model1";
        model2nn.name = "model2";
        model1nn.parent = model2nn.parent = test_root;
        model1nn.fetch();
        model2nn.fetch();
        equal(model1nn.get('a'), undefined, "Gone after delete 1");
        equal(model2nn.get('a'), undefined, "Gone after delete 2");
    });

    test("CRUD named collections with unnamed models", function() {
        var coll1 = new Collection();
        var coll2 = new Collection();
        coll1.name = 'coll1';
        coll2.name = 'coll2';
        coll1.parent = coll2.parent = test_root;
        coll1.fetch();
        coll2.fetch();
        var model11 = coll1.create({a: 1});
        var model12 = coll1.create({a: 2});
        var model21 = coll2.create({b: 1});
        var model22 = coll2.create({b: 2});

        var coll1n = new Collection();
        var coll2n = new Collection();
        coll1n.name = 'coll1';
        coll2n.name = 'coll2';
        coll1n.parent = coll2n.parent = test_root;
        coll1n.fetch();
        coll2n.fetch();

        var map = function(model) {
            return model.attributes;
        };
        deepEqual(
            _.map(coll1.toArray(), map),
            _.map(coll1n.toArray(), map)
        );
        deepEqual(
            _.map(coll2.toArray(), map),
            _.map(coll2n.toArray(), map)
        );
        // XXX update
        // XXX delete
    });

    test("Collection with name and model", function() {
        var col = new Collection();
        col.name = "test_collection";
        col.fetch();
        col.create({a: 1});
        var newcol = new Collection();
        newcol.name = "test_collection";
        newcol.fetch();
        equal(newcol.first().get('a'), 1);
        newcol.destroyAll();
        // XXX: proper cleanup
    });

    test("Adding model without collection and KEY fails", function() {
        var model = new Model({a: 1});
        raises(model.save, "Model without collection and KEY");
    });

    test("Collection with simple parent", function() {
        var parent = {KEY: "parent"};
        parent.col = new Collection();
        parent.col.parent = parent;
        parent.col.name = "col";
        parent.col.create({b: 2});
        var newparent = {KEY: "parent"};
        newparent.col = new Collection();
        newparent.col.parent = parent;
        newparent.col.name = "col";
        newparent.col.fetch();
        equal(newparent.col.last().get('b'), 2);
        newparent.col.destroyAll();
        // XXX: proper cleanup
    });

    test("IndexedCollection", function() {
        var idxcoll = new storage.IndexedCollection();
        idxcoll.add({a:1});
        var mod2 = new storage.Model({a:2});
        idxcoll.add(mod2);
        var mod1 = idxcoll.models[0];
        deepEqual(mod1.attributes, {a: 1, idx: 0},
                  "Plain obj receives idx");
        deepEqual(mod2.attributes, {a: 2, idx: 1},
                  "Model receives idx");
        idxcoll.insert({a: 11}, {idx: 0});
        var mod11 = idxcoll.models[0];
        deepEqual(mod11.attributes, {a: 11, idx: 0},
                  "Plain obj can be inserted");
        var mod21 = new storage.Model({a:21});
        idxcoll.insert(mod21, {idx: 1});
        deepEqual(mod21.attributes, {a: 21, idx: 1},
                  "Model can be inserted");
        deepEqual(
            idxcoll.map(function(model) {
                return model.attributes;
            }),
            [
                {a: 11, idx: 0},
                {a: 21, idx: 1},
                {a: 1,  idx: 2},
                {a: 2,  idx: 3}
            ],
            "Overall order fits");
        idxcoll.remove(mod21);
        deepEqual(
            idxcoll.map(function(model) {
                return model.attributes;
            }),
            [
                {a: 11, idx: 0},
                {a: 1,  idx: 1},
                {a: 2,  idx: 2}
            ],
            "Removing reindexes");
    });

    localStorage.removeItem(test_root.abspath());
}); 
