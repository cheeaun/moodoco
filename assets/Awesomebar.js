var Awesomebar = new Class({
	
	Implements: [Options, Events],
	
	options: {
		/*
		onShow: $empty,
		onHide: $empty,
		onResult: $empty,
		*/
		className: '',
		resultsLimit: 5
	},
	
	initialize: function(element, options){
		this.element = $(element);
		this.setOptions(options);
		this.build();
	},
	
	build: function(){
		var self = this;
		var element = this.element;
		var options = this.options;
		
		var width = element.getSize().x;
		
		var coords = element.getCoordinates();
		
		var list = this.list = new Element('ul', {
			'class': 'awesomebar-list ' + options.className,
			styles: {
				width: width,
				opacity: .9
			},
			events: {
				mouseover: function(e){
					var el = e.target;
					if (el.get('tag') != 'a'){
						var els = el.getParents('a');
						if (!els.length) return;
						el = els[0];
					}
					el.addClass('selected');
					el.getParent('li').getSiblings().getElement('a').removeClass('selected')
				},
				mousedown: function(e){
					var el = e.target;
					if (el.get('tag') != 'a'){
						var els = el.getParents('a');
						if (!els.length) return;
						el = els[0];
					}
					if (!el) return;
					window.location = el.get('href');
				}
			}
		}).inject(document.body).setPosition({
			x: coords.left,
			y: coords.bottom
		});
		
		window.addEvent('resize', function(){
			var width = element.getSize().x;
			var coords = element.getCoordinates();
			list.setStyle('width', width).setPosition({
				x: coords.left,
				y: coords.bottom
			});
		});
		
		var prevValue = '';
		element.addEvents({
			keydown: function(e){
				if (e){
					if (e.key == 'up'){
						e.stop();
						if (list.get('html').trim() == '') return;
						var link = list.getElement('a.selected').removeClass('selected');
						var prev = link.getParent('li').getPrevious('li');
						if (prev){
							prev.getElement('a').addClass('selected');
						} else {
							element.focus();
							element.select();
						}
						return;
					}
					if (e.key == 'down'){
						e.stop();
						if (list.get('html').trim() == '') return;
						var link = list.getElement('a.selected');
						if (link){
							var next = link.getParent('li').getNext('li');
							if (!next) return;
							link.removeClass('selected');
							next.getElement('a').addClass('selected');
						} else {
							list.getElement('a').addClass('selected');
						}
						return;
					}
					if (e.key == 'enter'){
						if (list.get('html').trim() == '') return;
						var link = list.getElement('a.selected');
						if (!link) return;
						window.location = link.get('href');
						return;
					}
				}
				
				(function(){
					var value = element.value.clean();
					if (value == ''){
						prevValue = value;
						self.hide();
						return;
					}
					if (value == prevValue) return;
					prevValue = value;
					value = value.escapeRegExp().replace(' ', '|')
					var fdata = self.data.filter(function(d){
						return d.title.test(value, 'i') || d.desc.test(value, 'i');
					});
					var found = true;
					var html = '';
					if (fdata.length){
						var pattern = new RegExp(value, 'ig');
						fdata.sort(function(a, b){
							var at = $splat(a.title.match(pattern)).length;
							var bt = $splat(b.title.match(pattern)).length;
							var bat = bt - at;
							if (bat != 0) return bat;
							var ad = $splat(a.desc.match(pattern)).length;
							var bd = $splat(b.desc.match(pattern)).length;
							return (bd - ad);
						});
						fdata = fdata.slice(0, options.resultsLimit);
						var pat = new RegExp('(' + value + ')', 'ig');
						var rep = '<span>$1</span>';
						fdata.each(function(data){
							html += '<li><a href="' + data.url + '">'
								+ '<span class="title">' + data.title.replace(pat, rep) + '</span>'
								+ '<span class="desc">' + data.desc.replace(pat, rep) + '</span>'
							+ '</a></li>';
						});
					} else {
						html += '<li class="nada">Oops, nothing found.</li>';
						found = false;
					}
					list.set('html', html);
					var firstLink = list.getElement('li:first-child a');
					if (firstLink) firstLink.addClass('selected');
					self.show();
					self.fireEvent('result', fdata);
				}).delay(1);
			},
			focus: function(){
				if (element.value.clean() == '') return;
				if (list.get('html').trim() == ''){
					element.fireEvent('keydown');
				} else {
					self.show();
				}
				element.select();
			},
			blur: function(){
				(function(){
					self.hide();
				}).delay(50);
			},
			mouseenter: function(){
				if (element.value.clean() == '') element.focus();
			}
		});
	},
	
	feed: function(data){
		this.data = data;
	},
	
	show: function(){
		this.list.setStyle('display', 'block');
		this.fireEvent('show', this);
		return this;
	},
	
	hide: function(){
		this.list.setStyle('display', 'none');
		this.fireEvent('hide', this);
		return this;
	}
	
});