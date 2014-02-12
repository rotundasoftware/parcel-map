var browserify = require('browserify');
var parcelMap = require('../');

var b = browserify(__dirname + '/views/page1');
var opts = {
    keys: [ 'style' ],
    defaults: { images: 'images/*.jpg' }
};
parcelMap(b, opts, function (err, graph) {
    console.log(graph);
});
b.bundle();
