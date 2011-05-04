require(["activities/settings"], function(){

    if (!window.activities.ui){
        window.activities.ui = {};
    }

    activities.ui = {
        
        /*
         * lookup diagram on object.
         * object is either diagram or diagram element
         */
        getDiagram: function(obj) {
            return obj.isDiag ? obj : obj.diagram;
        },
        
        /*
         * toggles control canvas with diagram canvas
         */
        toggleCanvas: function(name) {
            var canvas = $('#diagram_' + name);
            var control = $('#control_' + name);
            if (canvas.css('z-index') == 1) {
                canvas.css('z-index', 0);
                control.css('z-index', 1);
            } else {
                canvas.css('z-index', 1);
                control.css('z-index', 0);
            }
        }
    }

    // ************************************************************************
    // activities.ui.Rendering
    // ************************************************************************
    
    activities.ui.Rendering = function() {
        var settings = activities.settings.rendering;
        this.shadowOffsetX = settings.shadowOffsetX;
        this.shadowOffsetY = settings.shadowOffsetY;
        this.shadowBlur = settings.shadowBlur;
        this.shadowColor = settings.shadowColor;
        
        this.textColor = settings.textColor;
        this.textAlign = settings.textAlign;
        this.textBaseline = settings.textBaseline;
        
        this.lineHeight = settings.lineHeight;
        this.fontSize = settings.fontSize;
        this.fontStyle = settings.fontStyle;
        
        this.defaultRounding = settings.defaultRounding;
    };
    
    activities.ui.Rendering.prototype = {
        
        /*
         * return canvas context font configuration
         */
        font: function() {
            return this.fontSize + 'px ' + this.fontStyle;
        },
        
        /*
         * turn shadow drawing on.
         */
        shadowOn: function(ctx) {
            ctx.shadowOffsetX = this.shadowOffsetX;
            ctx.shadowOffsetY = this.shadowOffsetY;
            ctx.shadowBlur = this.shadowBlur;
            ctx.shadowColor = this.shadowColor;
        },
        
        /*
         * turn shadow drawing off.
         */
        shadowOff: function(ctx) {
            ctx.shadowOffsetX = 0.0;
            ctx.shadowOffsetY = 0.0;
            ctx.shadowBlur = 0.0;
        },
        
        /*
         * draw circle at x0,y0 with given radius
         */
        circle: function(ctx, r) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2, true);
            ctx.closePath();
        },
        
        /*
         * draw filled circle
         */
        fillCircle: function(ctx, color, radius, shadow) {
            ctx.fillStyle = color;
            if (shadow) {
                this.shadowOn(ctx);
            }
            this.circle(ctx, radius);
            ctx.fill();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw stroke circle 
         */
        strokeCircle: function(ctx, color, radius, lineWidth, shadow) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            if (shadow) {
                this.shadowOn(ctx);
            }
            this.circle(ctx, radius);
            ctx.stroke();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw rounded rect
         */
        rect: function(ctx, x1, y1, x2, y2, r) {
            var r2d = Math.PI / 180;
            
            //ensure that the radius isn't too large for x
            if ((x2 - x1) - (2 * r) < 0) {
                r = ((x2 - x1) / 2);
            }
            
            //ensure that the radius isn't too large for y
            if((y2 - y1) - (2 * r) < 0) {
                r = ((y2 - y1) / 2);
            }
            
            ctx.beginPath();
            ctx.moveTo(x1 + r, y1);
            ctx.lineTo(x2 - r, y1);
            ctx.arc(x2 - r, y1 + r, r, r2d * 270, r2d * 360, false);
            ctx.lineTo(x2, y2 - r);
            ctx.arc(x2 - r, y2 - r, r, r2d * 0, r2d * 90, false);
            ctx.lineTo(x1 + r, y2);
            ctx.arc(x1 + r, y2 - r, r, r2d * 90, r2d * 180, false);
            ctx.lineTo(x1, y1 + r);
            ctx.arc(x1 + r, y1 + r, r, r2d * 180, r2d * 270, false);
            ctx.closePath();
        },
        
        /*
         * draw filled rect
         */
        fillRect: function(ctx,
                           color,
                           width,
                           height,
                           shadow,
                           radius) {
            if (!radius && radius != 0) {
                radius = this.defaultRounding;
            }
            ctx.fillStyle = color;
            if (shadow) {
                this.shadowOn(ctx);
            }
            var x = width / 2;
            var y = height / 2;
            this.rect(ctx, x * -1, y * -1, x, y, radius);
            ctx.fill();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw stroke rect
         */
        strokeRect: function(ctx,
                             color,
                             lineWidth,
                             width,
                             height,
                             shadow,
                             radius) {
            if (!radius && radius != 0) {
                radius = this.defaultRounding;
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            if (shadow) {
                this.shadowOn(ctx);
            }
            var x = width / 2;
            var y = height / 2;
            this.rect(ctx, x * -1, y * -1, x, y, radius);
            ctx.stroke();
            if (shadow) {
                this.shadowOff(ctx);
            }
        },
        
        /*
         * draw label
         */
        drawLabel: function(ctx, label, width) {
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.textBaseline = this.textBaseline;
            ctx.font = this.font();
            ctx.fillText(label, 0, 0, width);
        },
        
        /*
         * render control layer and diagram layer
         */
        render: function() {
            this.renderCtl();
            this.renderDiag();
        }
    };

    activities.ui.Element = function() {
        activities.ui.Rendering.call(this);
        this.node = null;
        this.diagram = null;
        this.triggerColor = null;
        
        this.renderLabel = false;
        this.selected = false;
        
        this.label = null;
        this.description = null;
        
        this.showOverlay = false;
    };
    activities.ui.Element.prototype = new activities.ui.Rendering;
    
    $.extend(activities.ui.Element.prototype, {
        
        // event handler. note that event handlers are called unbound, so
        // working with ``this`` inside event handlers does not work.
        
        /*
         * set selected item.
         */
        setSelected: function(obj, event) {
            var diagram = obj.diagram;
            var selected = diagram.selected;
            
            // case pending action
            if (diagram.editor.actions.pending()) {
                // if obj unselected, select exclusive 
                if (!obj.selected && selected.length > 0) {
                    selected = diagram.unselect();
                }
                obj.selected = true;
                selected.push(obj);
            
            // case ctrl pressed
            } else if (activities.glob.keys.pressed(activities.events.CTL)) {
                // case unselect
                if (obj.selected) {
                    var idx = selected.indexOf(obj);
                    diagram.selected = selected = _.without(selected, obj);
                    obj.selected = false;
                // case select
                } else {
                    selected.push(obj);
                    obj.selected = true;
                }
            
            // case single select
            } else {
                if (selected.length > 0) {
                    selected = diagram.unselect();
                }
                selected.push(obj);
                obj.selected = true;
            }
            obj.showOverlay = false;
            diagram.render();
            diagram.editor.properties.display(obj);
        },
        
        /*
         * turn on info rendering
         */
        infoOn: function(obj, event) {
            if (activities.glob.keys.pressed(activities.events.CTL)) {
                return;
            }
            obj.showOverlay = true;
        },
        
        /*
         * turn off info rendering
         */
        infoOff: function(obj, event) {
            obj.showOverlay = false;
            obj.diagram.render();
        },
        
        /*
         * render info
         */
        renderInfo: function(obj, event) {
            if (obj.showOverlay) {
                obj.diagram.render();
            }
        },
    });
    
    
    // ************************************************************************
    // activities.ui.Node
    // ************************************************************************
    
    activities.ui.Node = function() {
        activities.ui.Element.call(this);
        this.x = 0;
        this.y = 0;
        
        var settings = activities.settings.node;
        this.edgeOffset = settings.edgeOffset;
        this.borderWidth = settings.borderWidth;
        
        this.fillColor = settings.fillColor;
        this.borderColor = settings.borderColor;
        
        this.selectedFillColor = settings.selectedFillColor;
        this.selectedBorderColor = settings.selectedBorderColor;
    };
    activities.ui.Node.prototype = new activities.ui.Element;
    
    $.extend(activities.ui.Node.prototype, {
        
        SHAPE_RECT: 0,
        SHAPE_CIRCLE: 1,
        
        /*
         * bind node to dispatcher
         */
        bind: function() {
            // event subscription
            var diagram = this.diagram;
            var dnd = activities.glob.dnd;
            var dsp = diagram.dispatcher;
            var events = activities.events;
            var handler = activities.handler;
            dsp.subscribe(events.MOUSE_IN, this, this.infoOn);
            dsp.subscribe(events.MOUSE_OUT, this, this.infoOff);
            dsp.subscribe(events.MOUSE_MOVE, this, this.renderInfo);
            dsp.subscribe(events.MOUSE_IN, this, handler.setPointer);
            dsp.subscribe(events.MOUSE_DOWN, this, dnd.dragOn);
            dsp.subscribe(events.MOUSE_DOWN, this, this.setSelected);
            dsp.subscribe(events.MOUSE_DOWN, this, handler.doAction);
            dsp.subscribe(events.MOUSE_WHEEL, this, dnd.zoom);
            dsp.subscribe(events.MOUSE_MOVE, this, dnd.drag);
            dsp.subscribe(events.MOUSE_UP, this, dnd.drop);
            dsp.subscribe(events.MOUSE_UP, this, dnd.panOff);
        },
        
        /*
         * unbind node from dispatcher
         */
        unbind: function() {
            var dsp = this.diagram.dispatcher;
            var events = activities.events;
            dsp.unsubscribe(events.MOUSE_IN, this);
            dsp.unsubscribe(events.MOUSE_OUT, this);
            dsp.unsubscribe(events.MOUSE_DOWN, this);
            dsp.unsubscribe(events.MOUSE_WHEEL, this);
            dsp.unsubscribe(events.MOUSE_MOVE, this);
            dsp.unsubscribe(events.MOUSE_UP, this);
        },
        
        /*
         * translate coordinate direction for element edge start/end
         * translation.
         */
        translateDirection: function(x, y, x_diff, y_diff, angle) {
            if (x - this.x >= 0 && y - this.y >= 0) {
                return [this.x + x_diff, this.y + y_diff, angle - 180];
            }
            if (x - this.x >= 0 && y - this.y <= 0) {
                return [this.x + x_diff, this.y - y_diff, 180 - angle];
            }
            if (x - this.x <= 0 && y - this.y <= 0) {
                return [this.x - x_diff, this.y - y_diff, angle];
            }
            if (x - this.x <= 0 && y - this.y >= 0) {
                return [this.x - x_diff, this.y + y_diff, angle * -1];
            }
        }
    });
    
    
    // ************************************************************************
    // activities.ui.CircleNode
    // ************************************************************************
    
    activities.ui.CircleNode = function(radius) {
        activities.ui.Node.call(this);
        this.radius = radius;
    };
    activities.ui.CircleNode.prototype = new activities.ui.Node;
    
    $.extend(activities.ui.CircleNode.prototype, {
        
        /*
         * Translate element coordinate for edge source by given following
         * point coordinate.
         */
        translateEdge: function(x, y) {
            var gk = y - this.y;
            var ak = this.x - x;
            var angle = Math.abs(Math.atan(gk / ak) * 90 / (Math.PI / 2));
            var rad = this.radius + this.edgeOffset;
            var cos = Math.cos(Math.PI * angle / 180.0);
            var sin = Math.sin(Math.PI * angle / 180.0);
            var x_diff = rad * cos;
            var y_diff = rad * sin;
            return this.translateDirection(x, y, x_diff, y_diff, angle);
        },
        
        /*
         * render control layer
         */
        renderCtl: function() {
            var ctx = this.diagram.ctl_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            this.fillCircle(ctx, this.triggerColor, this.radius);
            ctx.restore();
        },
        
        /*
         * render diagram layer
         */
        renderDiag: function() {
            var fillColor, borderColor;
            if (!this.selected) {
                fillColor = this.fillColor;
                borderColor = this.borderColor;
            } else {
                fillColor = this.selectedFillColor;
                borderColor = this.selectedBorderColor;
            }
            var ctx = this.diagram.diag_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            this.fillCircle(ctx, fillColor, this.radius, true);
            this.strokeCircle(ctx, borderColor, this.radius, this.borderWidth);
            ctx.restore();
        }
    });
    
    
    // ************************************************************************
    // activities.ui.RectNode
    // ************************************************************************
    
    activities.ui.RectNode = function(width, height, rotation) {
        activities.ui.Node.call(this);
        this.width = width;
        this.height = height;
        this.rotation = rotation;
    };
    activities.ui.RectNode.prototype = new activities.ui.Node;
    
    $.extend(activities.ui.RectNode.prototype, {
        
        /*
         * Translate element coordinate for edge source by given following
         * point coordinate.
         */
        translateEdge: function(x, y) {
            var width = this.width;
            var height = this.height;
            var gk = height / 2;
            var ak = width / 2;
            var marker = Math.abs(Math.atan(gk / ak) * 90 / (Math.PI / 2));
            gk = y - this.y;
            ak = this.x - x;
            var angle = Math.abs(Math.atan(gk / ak) * 90 / (Math.PI / 2));
            var angle_orgin = angle;
            if (this.rotation > 0) {
                angle -= this.rotation;
            }
            var x_diff, y_diff;
            if (angle >= marker) {
                angle = 90 - angle;
                // XXX: offset by cos/sin
                // ak = height / 2; //+ this.edgeOffset;
                ak = height / 2 + this.edgeOffset;
                gk = ak * Math.tan(Math.PI * angle / 180.0);
                x_diff = gk;
                y_diff = ak;
            } else {
                // XXX: offset by cos/sin
                // ak = width / 2; // + this.edgeOffset;
                ak = width / 2 + this.edgeOffset;
                gk = ak * Math.tan(Math.PI * angle / 180.0);
                x_diff = ak;
                y_diff = gk;
            }
            if (this.rotation > 0) {
                var cos = Math.cos(Math.PI * this.rotation / 180.0);
                var sin = Math.sin(Math.PI * this.rotation / 180.0);
                var x_new = x_diff * cos - y_diff * sin;
                var y_new = y_diff * cos + x_diff * sin;
                x_diff = x_new;
                y_diff = y_new;
            }
            return this.translateDirection(x, y, x_diff, y_diff, angle_orgin);
        },
        
        /*
         * render control layer
         */
        renderCtl: function() {
            var ctx = this.diagram.ctl_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.rotation) {
                ctx.rotate(this.rotation * Math.PI / 180);
            }
            this.fillRect(ctx, this.triggerColor, this.width, this.height);
            ctx.restore();
        },
        
        /*
         * render diagram layer
         */
        renderDiag: function() {
            // diagram layer
            var fillColor, borderColor;
            if (!this.selected) {
                fillColor = this.fillColor;
                borderColor = this.borderColor;
            } else {
                fillColor = this.selectedFillColor;
                borderColor = this.selectedBorderColor;
            }
            var ctx = this.diagram.diag_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.rotation) {
                ctx.rotate(this.rotation * Math.PI / 180);
            }
            this.fillRect(
                ctx, fillColor, this.width, this.height, true);
            this.strokeRect(
                ctx, borderColor, this.borderWidth, this.width, this.height);
            ctx.restore();
            
            if (this.renderLabel) {
                var label = this.label;
                ctx.save();
                ctx.translate(this.x, this.y);
                this.drawLabel(ctx, label, 200);
                ctx.restore();
            }
        }
    });
    
    
    // ************************************************************************
    // activities.ui.Initial
    // ************************************************************************
    
    activities.ui.Initial = function() {
        activities.ui.CircleNode.call(this, 20);
    };
    activities.ui.Initial.prototype = new activities.ui.CircleNode;
    
    
    // ************************************************************************
    // activities.ui.Final
    // ************************************************************************
    
    activities.ui.Final = function() {
        activities.ui.CircleNode.call(this, 20);
    };
    activities.ui.Final.prototype = new activities.ui.CircleNode;
    
    $.extend(activities.ui.Final.prototype, {
        
        /*
         * render diagram layer
         */
        renderDiag: function() {
            var fillColor, borderColor;
            if (!this.selected) {
                fillColor = this.fillColor;
                borderColor = this.borderColor;
            } else {
                fillColor = this.selectedFillColor;
                borderColor = this.selectedBorderColor;
            }
            ctx = this.diagram.diag_ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            this.fillCircle(ctx, borderColor, this.radius, true);
            this.fillCircle(ctx, fillColor, this.radius - this.borderWidth);
            this.fillCircle(ctx, borderColor, this.radius / 2);
            ctx.restore();
        }
    });
    
    
    // ************************************************************************
    // activities.ui.Action
    // ************************************************************************
    
    activities.ui.Action = function() {
        activities.ui.RectNode.call(this, 100, 70, 0);
        this.renderLabel = true;
    };
    activities.ui.Action.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Decision
    // ************************************************************************
    
    activities.ui.Decision = function() {
        activities.ui.RectNode.call(this, 40, 40, 45);
        this.renderLabel = true;
    };
    activities.ui.Decision.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Merge
    // ************************************************************************
    
    activities.ui.Merge = function() {
        activities.ui.RectNode.call(this, 40, 40, 45);
    };
    activities.ui.Merge.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Join
    // ************************************************************************
    
    activities.ui.Join = function() {
        activities.ui.RectNode.call(this, 10, 80, 0);
    };
    activities.ui.Join.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Fork
    // ************************************************************************
    
    activities.ui.Fork = function() {
        activities.ui.RectNode.call(this, 10, 80, 0);
    };
    activities.ui.Fork.prototype = new activities.ui.RectNode;
    
    
    // ************************************************************************
    // activities.ui.Edge
    // ************************************************************************
    
    activities.ui.Edge = function() {
        activities.ui.Element.call(this);
        var settings = activities.settings.edge;
        this.color = settings.color;
        this.lineWidth = settings.lineWidth;
        this.arrowLength = settings.arrowLength;
        this.selectedColor = settings.selectedColor;
        this.source = null;
        this.target = null;
        this.renderLabel = true;
        this.kinks = new Array();
    };
    activities.ui.Edge.prototype = new activities.ui.Element;
    
    $.extend(activities.ui.Edge.prototype, {
        
        /*
         * bind edge to dispatcher
         */
        bind: function() {
            var dsp = this.diagram.dispatcher;
            var dnd = activities.glob.dnd;
            var events = activities.events;
            var handler = activities.handler;
            dsp.subscribe(events.MOUSE_IN, this, this.infoOn);
            dsp.subscribe(events.MOUSE_OUT, this, this.infoOff);
            dsp.subscribe(events.MOUSE_MOVE, this, this.renderInfo);
            dsp.subscribe(events.MOUSE_IN, this, handler.setPointer);
            dsp.subscribe(events.MOUSE_DOWN, this, this.setSelected);
            dsp.subscribe(events.MOUSE_DOWN, this, handler.doAction);
            dsp.subscribe(events.MOUSE_WHEEL, this, dnd.zoom);
        },
        
        /*
         * unbind edge from dispatcher
         */
        unbind: function() {
            var dsp = this.diagram.dispatcher;
            var events = activities.events;
            dsp.unsubscribe(events.MOUSE_IN, this);
            dsp.unsubscribe(events.MOUSE_OUT, this);
            dsp.unsubscribe(events.MOUSE_DOWN, this);
            dsp.unsubscribe(events.MOUSE_MOVE, this);
            dsp.unsubscribe(events.MOUSE_WHEEL, this);
        },
        
        /*
         * translate edge start- and endpoint relative to corresponding source
         * and target object
         */
        translate: function(source, target) {
            var x, y;
            if (this.kinks.length != 0) {
                x = this.kinks[0].x;
                y = this.kinks[0].y;
            } else {
                x = target.x;
                y = target.y;
            }
            this._start = source.translateEdge(x, y);
            
            if (this.kinks.length != 0) {
                var last = this.kinks.length - 1;
                x = this.kinks[last].x;
                y = this.kinks[last].y;
            } else {
                x = source.x;
                y = source.y;
            }
            this._end = target.translateEdge(x, y);
        },
        
        /*
         * return zero position between start and end point
         */
        zero: function() {
            return [
                this._start[0] + ((this._end[0] - this._start[0]) / 2),
                this._start[1] + ((this._end[1] - this._start[1]) / 2)
            ];
        },
        
        /*
         * render edge path
         */
        renderPath: function(ctx) {
            ctx.beginPath();
            ctx.moveTo(this._start[0], this._start[1]);
            var kink;
            for (var idx in this.kinks) {
                kink = this.kinks[idx];
                ctx.lineTo(kink.x, kink.y);
            }
            ctx.lineTo(this._end[0], this._end[1]);
            ctx.closePath();
        },
        
        /*
         * render edge root bubble
         */
        renderRoot: function(ctx) {
            ctx.translate(this._start[0], this._start[1]);
            this.circle(ctx, this.lineWidth);
        },
        
        /*
         * render edge arrow
         */
        renderArrow: function(ctx) {
            var len = this.arrowLength;
            ctx.translate(this._end[0], this._end[1]);
            ctx.rotate(this._end[2] * Math.PI / 180);
            ctx.beginPath();
            ctx.lineTo(len * -1, len / 3);
            ctx.lineTo(len * -1, len * -1 / 3);
            ctx.lineTo(0, 0);
            ctx.closePath();
        },
        
        /*
         * render edge
         */
        render: function() {
            var diagram = this.diagram;
            var source = diagram.elements[diagram.r_mapping[this.source.id]];
            var target = diagram.elements[diagram.r_mapping[this.target.id]];
            
            // do not render edge if source and target refer to same 
            // diagram position
            if (source.x == target.x && source.y == target.y) {
                return;
            }
            
            // translate edge start and endpoint
            this.translate(source, target);
            
            // control layer
            var ctx = diagram.ctl_ctx;
            ctx.save();
            ctx.strokeStyle = this.triggerColor;
            ctx.lineWidth = this.lineWidth + 3;
            ctx.lineCap = 'round';
            this.renderPath(ctx);
            ctx.stroke();
            ctx.restore();
            
            // diagram layer
            var strokeStyle, fillStyle;
            if (!this.selected) {
                strokeStyle = this.color;
                fillStyle = this.color;
            } else {
                strokeStyle = this.selectedColor;
                fillStyle = this.selectedColor;
            }
            ctx = diagram.diag_ctx;
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            this.renderPath(ctx);
            ctx.stroke();
            ctx.restore();
            
            // root
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.fillStyle = strokeStyle;
            ctx.lineWidth = 1;
            this.renderRoot(ctx);
            ctx.fill();
            ctx.restore();
            
            // arrow
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.fillStyle = strokeStyle;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            this.renderArrow(ctx);
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            
            // label
            if (this.renderLabel) {
                var label = this.label;
                var zero = this.zero();
                ctx.save();
                ctx.translate(zero[0], zero[1]);
                this.drawLabel(ctx, label, 200);
                ctx.restore();
            }
        }
    });
    
    
    // ************************************************************************
    // activities.ui.Kink
    // ************************************************************************
    
    /*
     * represents a kink of an edge.
     */
    activities.ui.Kink = function() {
        this.x = null;
        this.y = null;
    };

    // ************************************************************************
    // activities.ui.Overlay
    // ************************************************************************
    
    activities.ui.Overlay = function(element) {
        activities.ui.Rendering.call(this);
        this.element = element;
        this.diagram = element.diagram;
        
        var settings = activities.settings.overlay;
        this.padding = settings.padding;
        this.fillColor = settings.fillColor;
        this.borderColor = settings.borderColor;
        this.alpha = settings.alpha;
        this.textColor = settings.textColor;
        this.textAlign = 'left';
        this.textBaseline = 'top';
    };
    activities.ui.Overlay.prototype = new activities.ui.Rendering;
    
    $.extend(activities.ui.Overlay.prototype, {
        
        /*
         * render info overlay
         */
        render: function() {
            var ctx = this.diagram.diag_ctx;
            ctx.save();
            
            var element = this.element;
            var label = element.label;
            var description = element.description.split('\n');
            
            var lines = ['Label:'];
            lines = lines.concat([label]);
            lines = lines.concat(['', 'Description:']);
            lines = lines.concat(description);
            
            var lineHeight = this.lineHeight;
            var padding = this.padding;
            
            ctx.font = this.font();
            var width = ctx.measureText(label).width + 2 * padding;
            var height = (lines.length * lineHeight) + 2 * padding;
            
            var line, line_width;
            for (var i in lines) {
                line = lines[i];
                line_width = ctx.measureText(line).width;
                if (line_width > width) {
                    width = line_width + 2 * padding;
                }
            }
            
            var x, y;
            if (element.zero) {
                var zero = element.zero();
                x = zero[0];
                y = zero[1];
            } else {
                x = element.x;
                y = element.y;
            }
            
            var diagram = element.diagram;
            var current = diagram.currentCursor({
                pageX: activities.glob.mouse.x,
                pageY: activities.glob.mouse.y
            });
            current = diagram.translateCursor(current[0], current[1]);
            
            var offset = [current[0] - x, current[1] - y];
            x = x + offset[0] + width / 2;
            y = y + offset[1] + height / 2;
            
            ctx.translate(x, y);
            ctx.globalAlpha = this.alpha;
            this.fillRect(ctx, this.fillColor, width, height, false, 3);
            this.strokeRect(ctx, this.borderColor, 3, width, height);
            ctx.globalAlpha = 1.0;
            
            ctx.fillStyle = this.textColor;
            ctx.textAlign = this.textAlign;
            ctx.textBaseline = this.textBaseline;
            
            x = width / 2 * -1 + padding;
            y = height / 2 * -1 + padding;
            ctx.translate(x, y);
            y = 0;
            for (var i in lines) {
                ctx.fillText(lines[i], 0, y, width);
                y = y + lineHeight;
            }
            ctx.restore();
        }
    });  

});
