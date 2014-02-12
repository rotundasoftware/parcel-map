var browserify = require('browserify');
var glob = require('glob');
var parcelMap = require('../');

glob(__dirname + '/views/*', function (err, files) {
    (function next () {
        if (files.length === 0) return;
        var file = files.shift();
        var b = browserify(file);
        var opts = {
            keys: [ 'style' ],
            defaults: { style: '*.whatever' }
        };
        parcelMap(b, opts, function (graph) {
            console.log(file, graph);
        });
        b.bundle().on('end', next);
    })();
});
