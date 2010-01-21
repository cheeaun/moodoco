var Docs = {
	
	githubRepoTitle: '',
	githubRepo: '',
	githubAPI: {
		branches: 'http://github.com/api/v2/json/repos/show/{repo}/branches',
		scripts: 'http://github.com/api/v2/json/blob/show/{repo}/{sha}/Source/scripts.json',
		docs: 'http://github.com/api/v2/json/blob/show/{repo}/{sha}/Docs/{path}'
	},
	
	stripRootPath: null,
	replaceRootPath: [],
	
	data: {},
	searchData: [],
	
	start: function(){
		if (!Docs.githubRepo) return;
		
		$('repo-title').set('text', Docs.githubRepoTitle);
		var docTitle = document.title = Docs.githubRepoTitle + ' ' + document.title;
		
		if (!window.applicationCache && window.google && google.gears) Docs.setupGears();
		
		Docs.$menu = $('menu');
		Docs.$docs = $('docs');
		
		Docs.setupDocs();
		
		var setHash = '';
		var winScroll = new Fx.Scroll(window, {
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
		
		Docs.$docs.addEvent('click:relay(.methods a)', function(e){
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
			}
		});
		
		Docs.debugApplicationCache();
		
		Docs.addEvent('docs:ready', function(){
			Docs.gettingScripts = false;
			document.body.removeClass('busy');
			
			var prevHash = location.hash.slice(1);
			if (prevHash){
				var splitHash = prevHash.split('-');
				var el = $(splitHash[0]);
				if (el){
					el.setStyle('display', 'block');
					document.title = docTitle + ' - ' + splitHash[0];
				}
				if (splitHash[1]) scrollTo(prevHash);
			}
			
			Docs.hashPoll = (function(){
				var hash = location.hash.slice(1);
				if (hash == prevHash) return;
				prevHash = hash;
				var splitHash = hash.split('-');
				var el = $(splitHash[0]);
				if (el && el.getStyle('display') == 'none'){
					el.setStyle('display', 'block').getSiblings().setStyle('display', 'none');
					document.title = docTitle + ' - ' + splitHash[0];
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
			url: Docs.githubAPI.branches.substitute({repo: Docs.githubRepo}),
			onSuccess: function(data){
				if (!data || !data.branches || !data.branches.master) return;
				Docs.masterTree = data.branches.master;
				new Request.JSONP({
					url: Docs.githubAPI.scripts.substitute({
						repo: Docs.githubRepo,
						sha: Docs.masterTree
					}),
					onSuccess: function(data){
						if (!data || !data.blob || !data.blob.data) return;
						var data = JSON.decode(data.blob.data);
						Docs.fetchDocs(data);
					}
				}).send();
			}
		}).send();
	},
	
	fetchDocs: function(data){
		var complete = function(){
			Docs.generateMenu(data);
			localStorage[Docs.githubRepo + '-docs'] = Docs.$docs.get('html');
			localStorage[Docs.githubRepo + '-menu'] = Docs.$menu.get('html');
			localStorage[Docs.githubRepo + '-search'] = JSON.encode(Docs.searchData);
			(function(){
				Docs.fireEvent('docs:ready');
			}).delay(1000);
		};
		var requests = {};
		$each(data, function(link, category){
			$each(link, function(val, text){
				var page = category + '/' + text;
				requests[page] = new Request.JSONP({
					timeout: 3000,
					url: Docs.githubAPI.docs.substitute({
						repo: Docs.githubRepo,
						sha: Docs.masterTree,
						path: page + '.md'
					}),
					onSuccess: function(resp){
						if (!resp || !resp.blob || !resp.blob.data) return;
						md = resp.blob.data;
						Docs.parseDoc(page, md);
					}
				});
			});
		});
		new Request.Queue({
			requests: requests,
			stopOnFailure: false,
			onEnd: complete
		});
		$each(requests, function(r){
			r.send();
		});
	},
	
	generateMenu: function(data){
		var html = '<ul>';
		$each(data, function(link, category){
			html += '<li><strong>' + category + '</strong><ul>';
			$each(link, function(val, text){
				html += '<li><a href="#' + category + '/' + text + '">' + text + '</a></li>';
			});
			html += '</ul></li>'
		});
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
			var online, status, type, message;
			online = (navigator.onLine) ? 'yes' : 'no';
			status = cacheStatusValues[cache.status];
			type = e.type;
			message = 'online: ' + online;
			message+= ', event: ' + type;
			message+= ', status: ' + status;
			if (type == 'error' && navigator.onLine) {
				console.log(e);
				message+= ' (probally a syntax error in manifest)';
			}
			console.log(message);
		}

		cache.addEventListener('updateready', function(){
			cache.swapCache();
			console.log('swap cache has been called');
		}, false);

		(function(){
			console.log(cacheStatusValues[0]);
			if (cache.status != 0) cache.update();
		}).periodical(10000);
	}
	
};

$extend(Docs, new Events());