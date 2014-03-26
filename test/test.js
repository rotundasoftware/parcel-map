var browserify = require('browserify');
var parcelMap = require( '../' );

var b = browserify(__dirname + '/files/page6' );
var opts = {
};
parcelMap(b, opts, function (err, graph) {
    console.log(graph);
});
b.bundle();
