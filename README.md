Moodoco
=======

About
-----

Moodoco is a purely web-based client-side MooTools documentation generator with HTML5 offline capabilities. It uses the [GitHub API](http://develop.github.com/) to fetch all the Markdown documentation files from the repository and stores them offline in [localStorage](http://dev.w3.org/html5/webstorage/). Then, the page and related CSS/JS files are cached offline with [applicationCache](http://www.w3.org/TR/html5/offline.html).

As of now, localStorage is supported in Firefox 3.5+, Chrome 4, Safari 4 and Internet Explorer 8. For applicationCache, it's supported in Firefox 3.5+ and Safari. For browsers not supporting applicationCache, it falls back to [Google Gears](http://code.google.com/apis/gears/), if installed. Moodoco has been tested to work on Firefox 3.5 and Chrome.

Contributions are welcomed.

Licensed under the [MIT license](http://www.opensource.org/licenses/mit-license.php).

Notes
-----

* On first load, Moodoco will fetch **all** Markdown files from the repository. If there are a lot of files, for example from the [MooTools More repository](http://github.com/mootools/mootools-more/), it'll take some time.
* The .htaccess file is needed because cache.manifest **must** be served as text/cache-manifest.
* When fetching the Markdown files, some of the requests might fail. If things don't look right, press 'Shift+R' to force re-fetch the Markdown files.
* Feel free to host this in your local or remote server. Since the page and documentation files are cached offline, almost **zero** requests are made to your server when loading it in your browser, offline or online.

Issues
------

Report them in the [issue tracker](http://github.com/cheeaun/moodoco/issues).