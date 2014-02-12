var copy = require('shallow-copy');
var glob = require('glob');
var uniq = require('nub');
var path = require('path');

module.exports = function (bundle, fn, cb) {
    var files = [];
    
    bundle.on('package', function (file, pkg) {
        if (!pkg) pkg = {};
        if (!pkg.__dirname) pkg.__dirname = path.dirname(file);
        fn(copy(pkg), function (xs) {
            files.push.apply(files, xs);
        });
    });
    
    bundle.on('bundle', function (stream) {
        stream.on('end', function () {
            cb(uniq(files));
        });
    });
};
