    var Action = Node.extend({
        ctrlareas: function(canvas, ui, mode) {
            var ctrl;
            if (mode.name === "selecting") {
                ctrl = this.rakeArea(canvas, ui);
            }
            return ctrl;
        },
        rakeArea: function(canvas, ui) {
            var symbol = this.elems.symbol[0].attrs;
            // calculate and draw rake, lower right corner
            var rdx = symbol.width / 3;
            var rdy = symbol.height / 3;
            var rx = symbol.x + symbol.width - rdx;
            var ry = symbol.y + symbol.height - rdy;
            // XXX: make conditional, not for lowest layer - probably just a flag
            // something like getUtility would be nice, or even acquisition.
            // Did I say acquisition? yes! this.acquire(name) will go
            // up until it finds a value
            var rake = canvas.set();
            var rect = canvas.rect(rx, ry, rdx, rdy);
            rect.attr({fill: "white",
                       stroke: "grey",
                       opacity: 10});
            // XXX: draw rake symbol
            rake.push(rect);

            // translate DOM events to user acts
            rake.click(function() {
                this.trigger("act:rake", [this.model]);
            }, this);

            // XXX: this should not be here
            this.elems.symbol.click(function(){
                this.trigger("act:select:node", [this.model]);
            }, this);
            return rake;
        }
    });
