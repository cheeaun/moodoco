/*
---
description: provides the Fx.Push class for a decelerating motion given a start speed.

license: MIT-style

authors:
- Ben Lenarts

requires:
- core/1.2.4: [Fx, Element.Style]

provides: [Fx.Push]

credits:
  Q42 (http://q42.nl), for allowing me to release this code as open-source

...
*/

Fx.Push = new Class({

  Extends: Fx,

  options: {
    style: true,
    modifiers: { x: 'left', y: 'top' },
    friction: 0,
    limit: false,
    bounce: 0
	},

  initialize: function(element, options) {
    this.element = document.id(element);
    this.parent(options);
    this.position = {};
  },

  start: function(sx, sy) {
    var m = this.options.modifiers, p = this.position, s = this.options.style;
    for (d in m) if (m[d]) this.position[d] = (s ? this.element.getStyle(m[d]) : this.element[m[d]]).toInt();
    this.speed = {x: sx||0, y: sy||0};
    this.time = 0;
    this.startTimer();
    this.onStart();
    this.lastStepTime = this.time;
    return this;
  },

  step: function() {
    var s = this.speed, time = $time();
    var isDone = this.options.friction ? (Math.abs(s.x) + Math.abs(s.y)) < 0.001 : (time > this.time + this.options.duration);
    if (isDone) { 
      this.complete();
      return;
    }

    // decelerate
    var multiplier = 1 - this.options.friction;
    for (d in s) s[d] *= multiplier;

    // move
    var interval = time - this.lastStepTime, p = this.position;
    for (d in p) p[d] += this.speed[d] * interval;

    // limit & bounce
    if (this.options.limit) {
      var l = this.options.limit;
      var b = this.options.bounce;
      for (d in p) {
        if      (p[d] < l[d][0]) { p[d] = l[d][0]; s[d] = b * -s[d]; }
        else if (p[d] > l[d][1]) { p[d] = l[d][1]; s[d] = b * -s[d]; }
      }
    }

    // update DOM
    for (var z in p) {
      var modifier = this.options.modifiers[z];
      if (!modifier) continue;
      var value = p[z].toInt();
      if (this.options.style) this.element.setStyle(modifier, value);
      else this.element[modifier] = value;
    }

    this.lastStepTime = time;
  }
});

/*
---
description: provides the Drag.Flick class which extends Drag by adding momentum to the dragged object.

license: MIT-style

authors:
- Ben Lenarts

requires:
- Fx.Push
- more/1.2.4.2: Drag

provides: [Drag.Flick]

credits:
  Q42 (http://q42.nl), for allowing me to release this code as open-source

...
*/

Drag.Flick = new Class({

  Extends: Drag,

  constants: { 
    sampleFrequency: 50,
    sensitivity: 0.3
  },

  options: {/*
    onMoveEnd: $empty(thisElement),*/
    friction: 0.1,
    bounce: 0
  },

  initialize: function(element, options) {
    this.parent(element, options);
    this.sliding = new Fx.Push(this.element, this.options);
    this.sliding.addEvent('complete', this.fireEvent.bind(this, 'moveEnd'));
    this.addEvent('snap', this.startSampling.bind(this));
  },

  start: function(event) {
    this.sliding.cancel();
    this.parent(event);
    this.samples = {};
    this.speed = {'x': 0, 'y': 0};
  },

  startSampling: function() {
    this.sampleHandle = this.sample.periodical(1000 / this.constants.sampleFrequency, this);
  },

  stop: function(event) {
    this.parent(event);
    $clear(this.sampleHandle);
    var s = this.speed;
    if (this.options.invert) for (d in s) s[d] *= -1;
    this.sliding.start(this.speed.x, this.speed.y);
  },

  sample: function() {
    var ss = this.samples;
    ss.prev = ss.curr;
    ss.curr = $merge({time: $time()}, this.mouse.now);
    if (!ss.prev) return;

    var s = this.speed, dt = ss.curr.time - ss.prev.time, 
        sens = this.constants.sensitivity, sens1 = 1 - sens;
    for (d in s) s[d] = ((ss.curr[d] - ss.prev[d]) / dt) * sens + s[d] * sens1;
  }

});
