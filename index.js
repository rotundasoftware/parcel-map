var copy = require('shallow-copy');
var glob = require('glob');
var uniq = require('nub');
var path = require('path');

module.exports = function (bundle, opts, cb) {
    var keypaths = opts.k || opts.keys;
    if (!keypaths) keypaths = [];
    if (!Array.isArray()) keypaths = [ keypaths ];
    var defaults = opts.defaults || {};
    
    var files = {};
    var pending = 1;
    
    bundle.on('package', function (file, pkg) {
        if (!pkg) pkg = {};
        var dir = path.dirname(file);
        if (!pkg.__dirname) pkg.__dirname = dir;
        
        var globs = getKeys(keypaths, defaults, copy(pkg));
        if (typeof globs === 'string') globs = [ globs ];
        if (!globs) globs = [];
        pending ++;
        
        (function next () {
            if (globs.length === 0) return done();
            
            var gfile = path.resolve(dir, globs.shift());
            glob(gfile, function (err, exp) {
                exp.forEach(function (file) {
                    files[file] = pkg;
                });
                next();
            });
        })();
    });
    
    bundle.on('bundle', function (stream) {
        stream.on('end', done);
    });
    
    function done () {
        if (-- pending !== 0) return;
        cb(files);
    }
};

function getKeys (keys, defaults, pkg) {
    return uniq(keys, Object.keys(defaults)).map(function (key) {
        var cur = pkg, curDef = defaults;
        
        if (Array.isArray(key)) {
            for (var i = 0; i < key.length - 1; i++) {
                cur = cur && cur[key[i]];
                curDef = curDef && curDef[key[i]];
            }
            key = key[i];
        }
        return (cur && cur[key]) || (curDef && curDef[key]);
    }).filter(Boolean);
}
