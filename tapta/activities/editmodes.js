/*
 * Provide the concept of edit modes on top of operations.  An
 * edit mode is a collection of enabled operations.  Only one edit
 * mode can be enabled on a layer, they are mutually exclusive.
 */
define([
    'require',
    'vendor/underscore.js',
    './base',
    './ops'
], function(require) {
    var base = require('./base'),
        ops = require('./ops');

    /*
     * One additional operation to change the edit mode
     */
    var ChangeEditMode = function() {
        ops.Operation.apply(this, arguments);
    };
    ChangeEditMode.prototype = new ops.Operation();
    Object.defineProperties(ChangeEditMode.prototype, {
        name: {value: "changeeditmode"},
        delegations: {value: [
            [".toolbar .editmodechanger", "click", "change"]
        ]},
        change: {value: function(event) {
            // the last element of the id is the mode name
            var name = event.target.id.split('/').slice(-1)[0];
            this.layerview.editmodename = name;
        }}
    });

    var Operations = function() { ops.Operations.apply(this, arguments); };
    Operations.prototype = new ops.Operations();
    Object.defineProperties(Operations.prototype, {
        Ops: {value: [ChangeEditMode]}
    });

    /*
     * edit modes
     */

    var EditMode = function(layerview, allops) {
        this.layerview = layerview;
        this._allops = allops;
    };
    Object.defineProperties(EditMode.prototype, {
        accumulate: {value: base.accumulate},
        name: {value: ""},
        // names of mode's enabled operations
        opnames: {value: []},
        // mode's enabled operations, subset of all operations
        ops: {get: function() {
            return this.opnames.map(function(name) {
                return this._allops[name];
            }, this);
        }}
    });
    base.defineToggleProperty(
        "activated",
        "activate", function() {
            // enable all our ops
            this.ops.forEach(function(op) { op.enabled = true; });
            // set our ops css classes on the layer view element
            $(this.layerview.el).addClass("editmode-" + this.name);
        },
        "deactivate", function() {
            // disable all our ops
            this.ops.forEach(function(op) { op.enabled = false; });
            $(this.layerview.el).removeClass("editmode-" + this.name);
        },
        EditMode.prototype
    );

    var Select = function() { EditMode.apply(this, arguments); };
    Select.prototype = new EditMode();
    Object.defineProperties(Select.prototype, {
        name: {value: "select"},
        opnames: {value: [ops.Select.prototype.name]}
    });

    var Subtract = function() { EditMode.apply(this, arguments); };
    Subtract.prototype = new EditMode();
    Object.defineProperties(Subtract.prototype, {
        name: {value: "subtract"},
        opnames: {value: [ops.Subtract.prototype.name]}
    });

    var MODES = [Select, Subtract];

    var EditModes = function(layerview) {
        // return, if only used as a prototype
        if (layerview === undefined) return;
        this.layerview = layerview;

        // access active mode and its name directly from the layer view
        var this_ = this;
        Object.defineProperties(layerview, {
            editmode: { get: function() { return this_.activemode; }},
            editmodename: {
                get: function() { return this_.activemodename; },
                set: function(name) { this_.activemodename = name; }
            }
        });

        // a set of operations to be used by the edit modes
        this.ops = new Operations(layerview);

        // create our mode instances
        this.accumulate("Modes").forEach(function(Mode) {
            var mode = new Mode(layerview, this.ops);
            if (!mode.name) throw "Mode needs name!";
            this[mode.name] = mode;
        }, this);

        // enable change mode operation
        this.ops.changeeditmode.enabled = true;
    };
    Object.defineProperties(EditModes.prototype, {
        accumulate: {value: base.accumulate},
        activemode: {get: function() { return this._activemode; }},
        activemodename: {
            get: function() { return this._activemode && this._activemode.name; },
            set: function(name) {
                if (this.activemodename === name) return;
                if (this.activemode) this.activemode.deactivate();
                this[name].activate();
                this._activemode = this[name];
                // Who uses this?
                // - highlight of specific tool
                // - debug info view changes display
                this.layerview.triggerReverse("editmode", name);
            }
        },
        Modes: {value: MODES}
    });

    return {
        EditModes: EditModes
    };
});
