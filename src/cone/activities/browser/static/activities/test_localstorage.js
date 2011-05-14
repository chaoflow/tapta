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

    test("Collection without name fails", function() {
        var collection = new Collection();
        raises(collection.fetch, "Collection needs name!");
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
}); 
