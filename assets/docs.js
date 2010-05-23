var Docs = {
	
	githubRepoTitle: '',
	githubRepo: '',
	githubAPI: {
		branches: 'http://github.com/api/v2/json/repos/show/{repo}/branches',
		oldScripts: 'http://github.com/api/v2/json/blob/show/{repo}/{sha}/Source/scripts.json',
		scripts: 'http://github.com/api/v2/json/blob/show/{repo}/{sha}/package.yml',
		docs: 'http://github.com/api/v2/json/blob/show/{repo}/{sha}/Docs/{path}'
	},
	
	// Yes, faster.
	fasterProxy: 'http://jsonptunnel.appspot.com/?extMethod=get&extURL=',
	
	stripRootPath: null,
	replaceRootPath: [],
	replacePages: null,
	
	data: {},
	searchData: [],
	
	start: function(){
		if (!Docs.githubRepo) return;
		
		$('repo-title').set('text', Docs.githubRepoTitle);
		var docTitle = document.title = Docs.githubRepoTitle + ' ' + document.title;
		
		Docs.$menu = $('menu');
		Docs.$docs = $('docs');
		
		var dragOpts = {
			style: false,
			invert: true,
			modifiers: {
				x: 'scrollLeft',
				y: 'scrollTop'
			},
			stopPropagation: true
		};

		Docs.setupTouch();
		
		// iPad
		if (navigator.platform == 'iPad' || Docs.isiPad){
			Docs.isiPad = true;
			
			document.addEvent('mousemove', function(e){
				e.preventDefault();
			});
			
			new Element('link', {
				rel: 'stylesheet',
				href: 'assets/docs.ipad.css'
			}).inject(document.head);
			
			var methodButton = new Element('a', {
				id: 'method-button',
				href: '#',
				text: 'Methods',
				events: {
					mousedown: function(e){
						e.preventDefault();
						var d = $$('#docs .doc').filter(function(el){
							return el.isDisplayed();
						})[0];
						d.getElement('.methods').toggle();
					},
					click: function(e){
						e.stop();
					}
				},
				styles: {
					display: 'none'
				}
			}).inject('container');
			
			var heading = $('header').getElement('h1');
			
			var updateButton = new Element('a', {
				href: '#',
				text: 'Update',
				id: 'update-button',
				events: {
					click: function(e){
						e.preventDefault();
						if (confirm('This will update the documentation files. Continue?')){
							methodButton.hide();
							Docs.updateLocalStorage();
						}
					}
				}
			}).inject(heading, 'after');
			
			heading.addEvent('click', function(e){
				e.stopPropagation();
				updateButton.setStyle('display', 'inline');
			});
			
			document.body.addEvent('click', function(){
				$$('.methods').hide();
				updateButton.hide();
			});
			
			var startDrag = false;
			
			new Drag.Flick('menu', $extend(dragOpts, {
				onStart: function(){
					startDrag = true;
					$('menu').addClass('dragging');
				},
				onComplete: function(){
					$('menu').removeClass('dragging');
					(function(){
						startDrag = false;
					}).delay(1);
				}
			}));
			
			new Drag.Flick('docs', $extend(dragOpts, {
				friction: 0.03
			}));
			
			Docs.$menu.addEvents({
				'mousedown:relay(a)': function(e){
					e.preventDefault();
				},
				'mouseup:relay(a)': function(e){
					if (startDrag){
						e.preventDefault();
					} else {
						location.hash = this.get('href');
					}
				},
				'click:relay(a)': function(e){
					e.preventDefault();
				}
			});
		}
		
		if (!window.applicationCache && window.google && google.gears) Docs.setupGears();
		
		Docs.setupDocs();
		
		var setHash = '';
		var winScroll = new Fx.Scroll(Docs.isiPad ? 'docs' : window, {
			transition: 'circ:out',
			link: 'cancel',
			onComplete: function(){
				if (setHash) location.hash = setHash;
			}
		});
		
		var scrollTo = function(h){
			setHash = h;
			winScroll.toElement(setHash.replace(/^#/, ''));
		};
		
		if (!Docs.isiPad) Docs.$docs.addEvent('click:relay(.methods a)', function(e){
			e.preventDefault();
			scrollTo(this.get('href'));
		});
		
		Docs.$docs.addEvent('click:relay(.doc-link)', function(e){
			e.preventDefault();
			scrollTo(this.get('href'));
		});
		
		var ab = new Awesomebar('awesomebar', {
			onSelect: function(e, url){
				e.preventDefault();
				scrollTo(url);
				ab.hide();
				if (Docs.isiPad) $('awesomebar').blur();
			}
		});
		
		Docs.debugApplicationCache();
		
		Docs.addEvent('docs:ready', function(){
			Docs.gettingScripts = false;
			document.body.removeClass('busy');
			
			var startDrag = false;
			if (Docs.isiPad){
				new ScrollIndicator('menu');
				
				$$('#docs .methods').addEvents({
					'mousedown:relay(a)': function(e){
						e.preventDefault();
					},
					'mouseup:relay(a)': function(e){
						if (startDrag){
							e.preventDefault();
						} else {
							scrollTo(this.get('href'));
						}
					},
					'click:relay(a)': function(e){
						e.preventDefault();
					}
				}).each(function(el){
					new Drag.Flick(el, $extend(dragOpts, {
						onStart: function(){
							startDrag = true;
						},
						onComplete: function(){
							(function(){
								startDrag = false;
							}).delay(1);
						}
					}));
					new ScrollIndicator(el);
				});
				
				$('method-button').show();
			}
			
			var prevHash = location.hash.slice(1);
			if (prevHash){
				var splitHash = prevHash.split('-');
				var el = $(splitHash[0]);
				if (el){
					el.show();
					var h = splitHash[0];
					document.title = docTitle + ' - ' + h;
					var menuLinks = $$('#menu a');
					menuLinks.filter('.selected').removeClass('selected');
					var selected = menuLinks.filter('[href$=' + h + ']').addClass('selected');
					if (Docs.isiPad) selected[0].scrollIntoView(true);
				}
				if (splitHash[1]) scrollTo(prevHash);
			}
			
			if (Docs.isiPad) var siDocs = new ScrollIndicator('docs');
			
			Docs.hashPoll = (function(){
				var hash = location.hash.slice(1);
				if (hash == prevHash) return;
				prevHash = hash;
				var splitHash = hash.split('-');
				var el = $(splitHash[0]);
				if (el && !el.isDisplayed()){
					el.show().getSiblings().hide();
					var h = splitHash[0];
					document.title = docTitle + ' - ' + h;
					var menuLinks = $$('#menu a');
					menuLinks.filter('.selected').removeClass('selected');
					menuLinks.filter('[href$=' + h + ']').addClass('selected');
					if (Docs.isiPad) siDocs.position();
				}
				if (splitHash[1]){
					scrollTo(hash);
				} else {
					setHash = null;
					winScroll.toTop();
				}
			}).periodical(500);
			
			if (window.location.hash == '') window.location = Docs.$menu.getElement('a').get('href');
			
			ab.reposition().feed(Docs.searchData);
		});
		
		document.addEvent('keydown', function(e){
			if (e.key == 'u' && e.shift){
				e.stop();
				Docs.updateLocalStorage();
			}
		});
	},
	
	setupTouch: function(){
		try {
			document.createEvent("TouchEvent");
		} catch(e) {
			return;
		}

		['touchstart', 'touchmove', 'touchend'].each(function(type){
			Element.NativeEvents[type] = 2;
		});
		
		var mapping = {
			mousedown: 'touchstart',
			mousemove: 'touchmove',
			mouseup: 'touchend'
		};

		var condition = function(event){
			var touch = event.event.changedTouches[0];
			event.page = {
				x: touch.pageX,
				y: touch.pageY
			};
			return true;
		};

		for (var e in mapping){
			Element.Events[e] = {
				base: mapping[e],
				condition: condition
			};
		}
	},
	
	setupGears: function(){
		Docs.localServer = google.gears.factory.create('beta.localserver');
		Docs.store = Docs.localServer.createManagedStore('moodoco');
		Docs.store.manifestUrl = 'manifest.json';
		Docs.store.checkForUpdate();
	},
	
	setupDocs: function(){
		if (window.localStorage){
			var docsHTML = localStorage[Docs.githubRepo + '-docs'];
			var menuHTML = localStorage[Docs.githubRepo + '-menu'];
			var searchData = localStorage[Docs.githubRepo + '-search'];
			if (docsHTML && menuHTML && searchData){
				Docs.$docs.set('html', docsHTML);
				Docs.$menu.set('html', menuHTML);
				Docs.searchData = JSON.decode(searchData);
				(function(){
					Docs.fireEvent('docs:ready');
				}).delay(500);
				return;
			}
		}
		
		Docs.getScriptsJSON();
	},
	
	getScriptsJSON: function(){
		Docs.gettingScripts = true;
		document.body.addClass('busy');
		
		new Request.JSONP({
			url: Docs.fasterProxy + Docs.githubAPI.branches.substitute({repo: Docs.githubRepo}),
			callbackKey: '_callback',
			onSuccess: function(data){
				if (!data || !data.branches || !data.branches.master) return;
				Docs.masterTree = data.branches.master;
				var success = false;
				// new system
				new Request.JSONP({
					url: Docs.fasterProxy + Docs.githubAPI.scripts.substitute({
						repo: Docs.githubRepo,
						sha: Docs.masterTree
					}),
					callbackKey: '_callback',
					timeout: 3000,
					onSuccess: function(data){
						if (!data || !data.blob || !data.blob.data) return;
						success = true;
						Docs.oldSystem = false;
						var d = data.blob.data.match(/\-\s?\".*\.js\"/g).map(function(file){
							return file.replace(/\-\s?\"Source\//, '').replace('\.js\"', '')
						});
						d = Docs.replaceDocs(d);
						Docs.fetchDocs(d);
					},
					onFailure: function(){
						if (success) return;
						// the old system
						new Request.JSONP({
							url: Docs.fasterProxy + Docs.githubAPI.oldScripts.substitute({
								repo: Docs.githubRepo,
								sha: Docs.masterTree
							}),
							callbackKey: '_callback',
							onSuccess: function(data){
								if (!data || !data.blob || !data.blob.data) return;
								Docs.oldSystem = true;
								var data = JSON.decode(data.blob.data);
								Docs.fetchDocs(data);
							}
						}).send();
					}
				}).send();
			}
		}).send();
	},
	
	replaceDocs: function(data){
		if (!Docs.replacePages) return;
		data.each(function(page, i){
			if (typeof Docs.replacePages[page] == 'undefined') return;
			var replacement = Docs.replacePages[page];
			if (replacement){
				data[i] = replacement;
			} else {
				data.erase(page);
			}
		});
		return data;
	},
	
	fetchDocs: function(data){
		var complete = function(){
			Docs.generateMenu(data);
			localStorage[Docs.githubRepo + '-docs'] = Docs.$docs.get('html');
			localStorage[Docs.githubRepo + '-menu'] = Docs.$menu.get('html');
			localStorage[Docs.githubRepo + '-search'] = JSON.encode(Docs.searchData);
			(function(){
				Docs.load(100);
				Docs.fireEvent('docs:ready');
			}).delay(1000);
		};
		var requests = {};
		var reqLength = 0;
		
		if (Docs.oldSystem){
			$each(data, function(link, category){
				$each(link, function(val, text){
					var page = category + '/' + text;
					requests[page] = new Request.JSONP({
						timeout: 3000,
						url: Docs.fasterProxy + Docs.githubAPI.docs.substitute({
							repo: Docs.githubRepo,
							sha: Docs.masterTree,
							path: page + '.md'
						}),
						callbackKey: '_callback',
						onSuccess: function(resp){
							if (!resp || !resp.blob || !resp.blob.data) return;
							md = resp.blob.data;
							Docs.parseDoc(page, md);
						}
					});
					reqLength++;
				});
			});
		} else {
			data.each(function(page){
				requests[page] = new Request.JSONP({
					timeout: 3000,
					url: Docs.fasterProxy + Docs.githubAPI.docs.substitute({
						repo: Docs.githubRepo,
						sha: Docs.masterTree,
						path: page + '.md'
					}),
					callbackKey: '_callback',
					onSuccess: function(resp){
						if (!resp || !resp.blob || !resp.blob.data) return;
						md = resp.blob.data;
						Docs.parseDoc(page, md);
					}
				});
				reqLength++;
			});
		}
		
		var r = 1;
		var rq = new Request.Queue({
			requests: requests,
			onEnd: complete,
			onSuccess: function(){
				Docs.load(r++/reqLength*100);
			},
			onFailure: function(){
				(function(){
					rq.resume();
				}).delay(3000);
			}
		});
		$each(requests, function(r){
			r.send();
		});
	},
	
	load: function(percentage){
		if (!this.loader) this.loader = $('loader').set('tween', {
			link: 'cancel',
			unit: '%'
		});
		var width = (percentage == 100) ? 0 : (percentage + '%');
		this.loader.tween('width', width);
	},
	
	generateMenu: function(data){
		var html = '<ul>';
		if (Docs.oldSystem){
			$each(data, function(link, category){
				html += '<li><strong>' + category + '</strong><ul>';
				$each(link, function(val, text){
					html += '<li><a href="#' + category + '/' + text + '">' + text + '</a></li>';
				});
				html += '</ul></li>'
			});
		} else {
			var d = (function(data){
				var cat, hash = {};
				for (var i=0, l=data.length; i<l; i++){
					var d = data[i].split('/');
					var c = d.shift();
					var t = d;
					if (c != cat){
						hash[c] = [t];
						cat = c;
					} else {
						hash[c].push(t);
					}
				}
				return hash;
			})(data);
			$each(d, function(link, category){
				html += '<li><strong>' + category + '</strong><ul>';
				$each(link, function(text){
					html += '<li><a href="#' + category + '/' + text + '">' + text + '</a></li>';
				});
				html += '</ul></li>'
			});
		}
		html += '</ul>';
		
		Docs.$menu.set('html', html);
	},
	
	parseDoc: function(page, md){
		var html = new Showdown.converter().makeHtml(md);
		var container = new Element('div', {html: html});
		
		container.getElements('a[href^=#]').each(function(a){
			var href = '#' + page + '-' + a.get('href').slice(1);
			a.set('href', href).addClass('doc-link').addClass('parsed-link');
		});
		
		if (Docs.stripRootPath){
			container.getElements('a[href^=' + Docs.stripRootPath + ']:not(.parsed-link)').each(function(a){
				var href = a.get('href').replace(/\/?#/, '-').replace(Docs.stripRootPath, '#');
				a.set('href', href).addClass('doc-link').addClass('parsed-link');
			});
		}
		
		if (Docs.replaceRootPath.length){
			Docs.replaceRootPath.each(function(p){
				container.getElements('a[href]:not(.parsed-link)').filter(p.query).each(function(a){
					var href = a.get('href').replace(p.path, p.realPath);
					a.set('href', href).addClass('parsed-link');
				});
			});
		}
		
		// anchorize the headings
		var anchor = /\{#(.*)\}/;
		container.getElements('h1, h2, h3, h4, h5, h6').each(function(h){
			var text = h.get('text');
			var matches = text.match(anchor);
			if (!matches || !matches.length) return;
			var hash = page + '-' + matches[1];
			var url = '#' + hash;
			var t = text.replace(anchor, '').trim();
			h.set({
				id: hash,
				html: '<a href="' + url + '" class="doc-link">' + t + '</a>'
			});
			var splitT = t.split(':').map(String.trim);
			var pDesc = h.getNext('p');
			var desc = pDesc ? pDesc.get('text').clean() : '';
			Docs.searchData.push({
				primary: t,
				secondary: desc,
				url: url
			});
		});
		
		// collect methods list
		var docLinks = container.getElements('.doc-link');
		
		var prevText, classes = {};
		docLinks.each(function(docLink){
			var splitLink = docLink.get('text').split(':').map(String.trim);
			var text = splitLink[1] || splitLink[0];
			var url = docLink.get('href');
			var tag = docLink.getParent().get('tag');
			switch (tag){
				case 'h1':
					prevText = text;
					classes[text] = {
						url: url,
						methods: {}
					};
					break;
				case 'h2':
					classes[prevText].methods[text] = url;
					break;
			}
		});
		
		var content = '<div class="content">' + container.get('html') + '</div>';
		
		var html = '<ul>';
		$each(classes, function(c, klass){
			html += '<li><strong><a href="' + c.url + '">' + klass + '</a></strong>';
			if (c.methods){
				html += '<ul>';
				$each(c.methods, function(url, m){
					html += '<li><a href="' + url + '">' + m.replace(/^\$([^\$])/, '$1') + '</a></li>';
				});
				html += '</ul>';
			}
			html += '</li>';
		});
		html += '</ul>';
		
		var methods = '<div class="methods">' + html + '</div>';
		
		var doc = new Element('div', {
			id: page,
			'class': 'doc',
			html : methods + content,
			styles: {
				display: 'none'
			}
		});
		
		doc.getElements('pre code').light({mode: 'inline', path: 'assets/', fuel: 'js'});
		
		doc.inject(Docs.$docs);
	},
	
	updateLocalStorage: function(){
		if (Docs.gettingScripts) return;
		$clear(Docs.hashPoll);
		Docs.$menu.set('html', '');
		Docs.$docs.set('html', '');
		Docs.searchData = [];
		Docs.getScriptsJSON();
	},
	
	// slightly modified from http://jonathanstark.com/blog/2009/09/27/debugging-html-5-offline-application-cache/
	debugApplicationCache: function(){
		if (!window.applicationCache || !window.console || !window.console.log) return;
		
		var cacheStatusValues = 'uncached idle checking downloading updateready obsolete'.split(' ');

		var cache = window.applicationCache;
		cache.addEventListener('cached', logEvent, false);
		cache.addEventListener('checking', logEvent, false);
		cache.addEventListener('downloading', logEvent, false);
		cache.addEventListener('error', logEvent, false);
		cache.addEventListener('noupdate', logEvent, false);
		cache.addEventListener('obsolete', logEvent, false);
		cache.addEventListener('progress', logEvent, false);
		cache.addEventListener('updateready', logEvent, false);

		function logEvent(e){
			var online = (navigator.onLine) ? 'yes' : 'no';
			var status = cacheStatusValues[cache.status];
			var type = e.type;
			var message = 'online: ' + online;
			message += ', event: ' + type;
			message += ', status: ' + status;
			if (type == 'error' && navigator.onLine) {
				console.log(e);
				message += ' (probally a syntax error in manifest)';
			}
			console.log(message);
		}

		cache.addEventListener('updateready', function(){
			if (cacheStatusValues[cache.status] != 'idle') {
				cache.swapCache();
				console.log('swap cache has been called');
			}
		}, false);

		(function(){
			try {
				cache.update();
			} catch(e) {}
		}).periodical(10000);
	}
	
};

$extend(Docs, new Events());