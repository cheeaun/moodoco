Moodoco
=======

Moodoco is a purely web-based client-side MooTools documentation generator with HTML5 offline capabilities. It uses the [GitHub API](http://develop.github.com/) to fetch all the Markdown documentation files from the repository and stores them offline in [localStorage](http://dev.w3.org/html5/webstorage/). Then, the page and related CSS/JS files are cached offline with [applicationCache](http://www.w3.org/TR/html5/offline.html).

As of now, localStorage is supported in Firefox 3.5+, Chrome 4, Safari 4 and Internet Explorer 8. For applicationCache, it's supported in Firefox 3.5+ and Safari. For browsers not supporting applicationCache, it falls back to [Google Gears](http://code.google.com/apis/gears/), if installed. Moodoco has been tested to work on Firefox 3.5 and Chrome.
