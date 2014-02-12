var browserify = require('browserify');
var glob = require('glob');
var parcelMap = require('../');

var b = browserify(glob.sync(__dirname + '/views/*'));
parcelMap(b, mapF, function (graph) {
    console.log(graph);
});
b.bundle();

function mapF (pkg, f) {
    if (!pkg) return [];
    f([ pkg.style ].filter(Boolean));
}
