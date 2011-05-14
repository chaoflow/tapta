define([
    'require',
    'cdn/qunit.js',
    './localstorage'
], function(require) {
    // dependencies we need a handle for
    var storage = require('./localstorage');
    var Collection = storage.Collection;
    var Model = storage.Model;

    module('Storage');

    test("location and abspath", function() {
        var A = {name:'A'};
        var B = {name:'B', parent:A};
        var C = {name:'C', parent:B};
        equal(storage.abspath(storage.location(A)), '/A');
        equal(storage.abspath(storage.location(B)), '/A/B');
        equal(storage.abspath(storage.location(C)), '/A/B/C');
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


    // XXX: fix this
    test("Collection, Model, Collection, Model", function() {
        var Parent = Model.extend({
            initialize: function() {
                this.col = new Collection();
                this.col.name = "col";
                this.col.parent = this;
            }
        });
        var pcol = new Collection();
        pcol.name = "parent_collection";
        pcol.model = Parent;
        pcol.create({c: 3});
        pcol.last().col.create({d: 4});
        var newpcol = new Collection();
        newpcol.name = "parent_collection";
        newpcol.model = Parent;
        newpcol.fetch();
        equal(newpcol.last().get('c'), 3);
        newpcol.last().col.fetch();
        equal(newpcol.last().col.last().get('d'), 4);
        pcol.destroyAll();
        // XXX: proper cleanup
    });
    
    localStorage.removeItem(test_root.abspath());
}); 
