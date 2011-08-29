define([
    'require'
], function(require) {
    var en = {
        // Layer labels
        layer0: "Layer 1",
        layer1: "Layer 2",
        layer2: "Layer 3",
        layer3: "Layer 4",
        layer4: "Layer 5",
        layer5: "Layer 6",
        // edit mode changers
        select: "Select",
        addnewaction: "New Action",
        addnewdecmer: "New Decision/Merge",
        addnewforkjoin: "New Fork/Join",
        subtract: "Remove"
    };

    var l10n = function(str) {
        var lstr = en[str];
        if (lstr === undefined) {
            console.warn("No localization for: " + str);
            lstr = str;
        }
        return lstr;
    };

    return l10n;
});
