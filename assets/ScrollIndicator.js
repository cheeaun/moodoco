var ScrollIndicator = new Class({
	
	Implements: [Options, Events],
	
	options: {
	},
	
	initialize: function(element, options){
		this.element = document.id(element);
		this.setOptions(options);
		this.build();
	},
	
	build: function(){
		var self = this;
		var element = this.element.setStyle('overflow', 'hidden');
		
		this.scrollbar = new Element('div', {
			'class': 'scrollindicator',
			styles: {
				visibility: 'hidden'
			}
		}).inject(document.body);
		
		var w = element.offsetWidth, h = element.offsetHeight;
		var visible = (w == 0 && h == 0) ? false : (w > 0 && h > 0) ? true : (element.getStyle('display') != 'none');
		
		var timer;
		var positioned = false;
		element.addEvent('scroll', function(e){
			$clear(timer);
			if (!visible && !positioned){
				self.position();
				positioned = true;
			}
			self.show().scroll();
			timer = (function(){
				self.hide();
			}).delay(1000);
		});
		
		this.position();
		this.scroll.delay(1000, this);
		
		window.addEvent('resize', function(){
			positioned = false;
			self.position();
			self.scroll();
		});
	},
	
	position: function(){
		var element = this.element;
		var scrollSizeY = this.scrollSizeY = element.getScrollSize().y;
		var coordinates = element.getCoordinates();
		var height = this.height = coordinates.height-4;
		this.top = element.offsetTop;
		this.scrollbar.setStyles({
			left: coordinates.right - 2 - this.scrollbar.getSize().x,
			height: (height/scrollSizeY)*height
		});
		return this;
	},
	
	scroll: function(){
		var scrollY = this.element.getScroll().y;
		this.scrollbar.setStyle('top', this.top + 2 + (scrollY/this.scrollSizeY)*this.height);
		return this;
	},
	
	show: function(){
		this.scrollbar.setStyle('visibility', 'visible');
		return this;
	},
	
	hide: function(){
		this.scrollbar.setStyle('visibility', 'hidden');
		return this;
	}
	
});