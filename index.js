var copy = require('shallow-copy');
var glob = require('glob');
var uniq = require('nub');
var path = require('path');

module.exports = function (bundle, fn, cb) {
    var files = [];
    var pending = 1;
    
    bundle.on('package', function (file, pkg) {
        if (!pkg) pkg = {};
        var dir = path.dirname(file);
        if (!pkg.__dirname) pkg.__dirname = dir;
        
        var globs = fn(copy(pkg));
        if (typeof globs === 'string') globs = [ globs ];
        if (!globs) globs = [];
        pending ++;
        
        (function next () {
            if (globs.length === 0) return done();
            
            var gfile = path.resolve(dir, globs.shift());
            glob(gfile, function (err, exp) {
                files.push.apply(files, exp);
                next();
            });
        })();
    });
    
    bundle.on('bundle', function (stream) {
        stream.on('end', done);
    });
    
    function done () {
        if (-- pending !== 0) return;
        cb(uniq(files));
    }
};
