var browserify = require('browserify');
var glob = require('glob');
var path = require('path');
var parcelMap = require('../');

glob(__dirname + '/views/*', function (err, files) {
    (function next () {
        if (files.length === 0) return;
        var file = files.shift();
        var b = browserify(file);
        parcelMap(b, mapF, function (graph) {
            console.log(file, graph);
        });
        b.bundle().on('end', next);
    })();
});

function mapF (pkg, f) {
    var dir = pkg.__dirname;
    var xs = (Array.isArray(pkg.style) ? pkg.style : [ pkg.style ])
        .filter(Boolean)
    ;
    var expanded = [];
    (function next () {
        if (xs.length === 0) return f(expanded);
        var x = path.join(dir, xs.shift());
        glob(x, function (err, exp) {
            expanded.push.apply(expanded, exp);
            next();
        });
    })();
}
