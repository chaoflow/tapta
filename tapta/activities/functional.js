define([
    'require'
], function(require) {

    ////// to-function.js without duck-typing apply/call
    // original copyright note, code slightly modified:
    /*
     * Author: Oliver Steele
     * Copyright: Copyright 2007 by Oliver Steele.  All rights reserved.
     * License: MIT License
     * Homepage: http://osteele.com/javascripts/functional
     * Created: 2007-07-11
     * Version: 1.0.2
     *
     *
     * This defines "string lambdas", that allow strings such as `x+1` and
     * `x -> x+1` to be used in some contexts as functions.
     */

    ////// based on code from
    /*
     * Author: Oliver Steele
     * Copyright: Copyright 2007 by Oliver Steele.  All rights reserved.
     * License: MIT License
     * Homepage: http://osteele.com/javascripts/functional
     * Source: http://osteele.com/javascripts/functional/functional.js
     * Changes: http://osteele.com/javascripts/functional/CHANGES
     * Created: 2007-07-11
     * Version: 1.0.2
     *
     *
     * This file defines some higher-order methods and functions for
     * functional and function-level programming.
     */

    /// ^ String lambdas

    /**
     * Turns a string that contains a JavaScript expression into a
     * `Function` that returns the value of that expression.
     *
     * If the string contains a `->`, this separates the parameters from the body:
     * >> 'x -> x + 1'.lambda()(1) -> 2
     * >> 'x y -> x + 2*y'.lambda()(1, 2) -> 5
     * >> 'x, y -> x + 2*y'.lambda()(1, 2) -> 5
     *
     * Otherwise, if the string contains a `_`, this is the parameter:
     * >> '_ + 1'.lambda()(1) -> 2
     *
     * Otherwise if the string begins or ends with an operator or relation,
     * prepend or append a parameter.  (The documentation refers to this type
     * of string as a "section".)
     * >> '/2'.lambda()(4) -> 2
     * >> '2/'.lambda()(4) -> 0.5
     * >> '/'.lambda()(2,4) -> 0.5
     * Sections can end, but not begin with, `-`.  (This is to avoid interpreting
     * e.g. `-2*x` as a section).  On the other hand, a string that either begins
     * or ends with `/` is a section, so an expression that begins or ends with a
     * regular expression literal needs an explicit parameter.
     *
     * Otherwise, each variable name is an implicit parameter:
     * >> 'x + 1'.lambda()(1) -> 2
     * >> 'x + 2*y'.lambda()(1, 2) -> 5
     * >> 'y + 2*x'.lambda()(1, 2) -> 5
     *
     * Implicit parameter detection ignores strings literals, variable names that
     * start with capitals, and identifiers that precede `:` or follow `.`:
     * >> map('"im"+root', ["probable", "possible"]) -> ["improbable", "impossible"]
     * >> 'Math.cos(angle)'.lambda()(Math.PI) -> -1
     * >> 'point.x'.lambda()({x:1, y:2}) -> 1
     * >> '({x:1, y:2})[key]'.lambda()('x') -> 1
     *
     * Implicit parameter detection mistakenly looks inside regular expression
     * literals for variable names.  It also doesn't know to ignore JavaScript
     * keywords and bound variables.  (The only way you can get these last two is
     * with a function literal inside the string.  This is outside the intended use
     * case for string lambdas.)
     *
     * Use `_` (to define a unary function) or `->`, if the string contains anything
     * that looks like a free variable but shouldn't be used as a parameter, or
     * to specify parameters that are ordered differently from their first
     * occurrence in the string.
     *
     * Chain `->`s to create a function in uncurried form:
     * >> 'x -> y -> x + 2*y'.lambda()(1)(2) -> 5
     * >> 'x -> y -> z -> x + 2*y+3*z'.lambda()(1)(2)(3) -> 14
     *
     * `this` and `arguments` are special:
     * >> 'this'.call(1) -> 1
     * >> '[].slice.call(arguments, 0)'.call(null,1,2) -> [1, 2]
     */
    String.prototype.lambda = function() {
        var params = [],
            expr = this,
            sections = expr.split(/\s*->\s*/m);
        if (sections.length > 1) {
            while (sections.length) {
                expr = sections.pop();
                params = sections.pop().split(/\s*,\s*|\s+/m);
                sections.length && sections.push('(function('+params+'){return ('+expr+')})');
            }
        } else if (expr.match(/\b_\b/)) {
            params = '_';
        } else {
            // test whether an operator appears on the left (or right), respectively
            var leftSection = expr.match(/^\s*(?:[+*\/%&|\^\.=<>]|!=)/m),
                rightSection = expr.match(/[+\-*\/%&|\^\.=<>!]\s*$/m);
            if (leftSection || rightSection) {
                if (leftSection) {
                    params.push('$1');
                    expr = '$1' + expr;
                }
                if (rightSection) {
                    params.push('$2');
                    expr = expr + '$2';
                }
            } else {
                // `replace` removes symbols that are capitalized, follow '.',
                // precede ':', are 'this' or 'arguments'; and also the insides of
                // strings (by a crude test).  `match` extracts the remaining
                // symbols.
                var vars = this.replace(/(?:\b[A-Z]|\.[a-zA-Z_$])[a-zA-Z_$\d]*|[a-zA-Z_$][a-zA-Z_$\d]*\s*:|this|arguments|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '').match(/([a-z_$][a-z_$\d]*)/gi) || []; // '
                for (var i = 0, v; v = vars[i++]; )
                    params.indexOf(v) >= 0 || params.push(v);
            }
        }
        return new Function(params, 'return (' + expr + ')');
    };

    /// Turn on caching for `string` -> `Function` conversion.
    String.prototype.lambda.cache = function() {
        var proto = String.prototype,
            cache = {},
            uncached = proto.lambda,
            cached = function() {
                var key = '#' + this; // avoid hidden properties on Object.prototype
                return cache[key] || (cache[key] = uncached.call(this));
            };
        cached.cached = function(){};
        cached.uncache = function(){proto.lambda = uncached};
        proto.lambda = cached;
    };


    /// ^^ Coercion

    /**
     * Returns a `Function` that perfoms the action described by this
     * string.  If the string contains a `return`, applies
     * `new Function` to it.  Otherwise, this function returns
     *  the result of `this.lambda()`.
     * >> '+1'.toFunction()(2) -> 3
     * >> 'return 1'.toFunction()(1) -> 1
     */
    String.prototype.toFunction = function() {
        var body = this;
        if (body.match(/\breturn\b/))
            return new Function(this);
        return this.lambda();
    };

    /**
     * Returns this function.  `Function.toFunction` calls this.
     * >> '+1'.lambda().toFunction()(2) -> 3
     */
    Function.prototype.toFunction = function() {
        return this;
    };

    /**
     * Coerces `fn` into a function if it is not already one,
     * by calling its `toFunction` method.
     * >> Function.toFunction(function() {return 1})() -> 1
     * >> Function.toFunction('+1')(2) -> 3
     *
     * `Function.toFunction` requires an argument that can be
     * coerced to a function.  A nullary version can be
     * constructed via `guard`:
     * >> Function.toFunction.guard()('1+') -> function()
     * >> Function.toFunction.guard()(null) -> null
     *
     * `Function.toFunction` doesn't coerce arbitrary values to functions.
     * It might seem convenient to treat
     * `Function.toFunction(value)` as though it were the
     * constant function that returned `value`, but it's rarely
     * useful and it hides errors.  Use `Functional.K(value)` instead,
     * or a lambda string when the value is a compile-time literal:
     * >> Functional.K('a string')() -> "a string"
     * >> Function.toFunction('"a string"')() -> "a string"
     */
    Function.toFunction = function(value) {
        return value.toFunction();
    };


    /// ^^ Utilities

    /**
     * Returns a function identical to this function except that
     * it prints its arguments on entry and its return value on exit.
     * This is useful for debugging function-level programs.
     */
    Function.prototype.traced = function(name) {
        var fn = this;
        name = name || fn;
        return function() {
            console.group(name);
            console.debug('apply(', this, ',', arguments, ')');
            var rval = fn.apply(this, arguments);
            console.debug('-> ', rval);
            console.groupEnd();
            return rval;
        };
    };



    // XXX: wrong naming ?
    var extend = function(obj1, obj2) {
        return _.extend({}, obj1, obj2);
    };

    var slice = Array.prototype.slice;

    var foldl = function(fn, acc, list, object) {
        fn = Function.toFunction(fn);
        for (var i = 0; i < list.length; i++) {
            acc = fn.call(object, acc, list[i]);
        }
        return acc;
    };

    var foldl1 = function(fn, list, object) {
        var acc = slice.call(list, 0, 1)[0];
        list = slice.call(list, 1);
        if (list.lenght == 0) return acc;
        return foldl(fn, acc, list, object);
    };

    var foldr = function(fn, acc, list, object) {
        fn = Function.toFunction(fn);
        for (var i = list.length-1; i >= 0; i--) {
            acc = fn.call(object, list[i], acc);
        }
        return acc;
    };

    var foldr1 = function(fn, list, object) {
        var acc = list.slice(-1)[0];
        list = list.slice(0,list.length-1);
        return foldr(fn, acc, list, object);
    };

    var scanl = function(fn, acc, list, object) {
        var accs = [acc];
        fn = Function.toFunction(fn);
        for (var i = 0; i < list.length; i++) {
            acc = fn.call(object, acc, list[i]);
            accs.push(acc);
        }
        return accs;
    };

    var scanl1 = function(fn, list, object) {
        var acc = list.slice(0,1)[0];
        list = list.slice(1);
        return scanl(fn, acc, list, object);
    };

    var scanr = function(fn, acc, list, object) {
        fn = Function.toFunction(fn);
        var accs = [acc];
        for (var i = list.length-1; i >= 0; i--) {
            accs.unshift(fn.call(object, list[i], accs[0]));
        }
        return accs;
    };

    var scanr1 = function(fn, list, object) {
        var acc = list.slice(-1)[0];
        list = list.slice(0,list.length-1);
        return scanr(fn, acc, list, object);
    };

    var map = function(fn, list, object) {
        fn = Function.toFunction(fn);
        var res = [];
        for (var i = 0; i < list.length; i++) {
            res[i] = fn.call(object, list[i], i);
        }
        return res;
    };

    var map_ = function(fn, sequence, object) {
        fn = Function.toFunction(fn);
        return _.map(sequence, fn, object);
    };

    var without = function(fn, seq, obj) {
        // XXX: fn = fn.toFunction && fn.toFunction()
        fn = Function.toFunction(fn);
        return foldl(function(acc, x) {
            return fn(x) ? acc : acc.concat([x]);
        }, [], seq);
    };

    var maximum = function(seq) {
        return foldl1("acc, x -> x > acc ? x : acc", seq);
    };

    var sum = function(seq) {
        return foldl1("acc+x", seq);
    };

    // only unary functions so far
    var compose = function(/*fn1, fn2, ...*/) {
        return foldl1(function(acc, fn) {
            return function(x) {
                return acc(fn(x));
            };
        }, arguments);
    };

    // currently only supports binary -> unary
    var partial = function(fn, x, obj) {
        return function(y) {
            return fn.call(obj, x, y);
        };
    };

    var install = function() {
        _.extend(window, functional);
    };

    var functional = {
        compose: compose,
        extend: extend,
        foldl: foldl,
        foldl1: foldl1,
        foldr: foldr,
        foldr1: foldr1,
        install: install,
        map: map,
        map_: map_,
        maximum: maximum,
        partial: partial,
        scanl: scanl,
        scanl1: scanl1,
        scanr: scanr,
        scanr1: scanr1,
        sum: sum,
        without: without
    };
    return functional;
});
