var copy = require('shallow-copy');
var glob = require('glob');
var uniq = require('nub');
var path = require('path');
var shasum = require('shasum');
var fs = require('fs');

module.exports = function (bundle, opts, cb) {
    var keypaths = opts.keys || opts.key || opts.k;
    if (!keypaths) keypaths = [];
    if (!Array.isArray()) keypaths = [ keypaths ];
    var defaults = opts.defaults || opts.d || {};
    
    var files = {};
    var packages = {};
    var dependencies = {};
    
    var pkgCount = {};
    var pkgFiles = {};
    var pending = 1;
    
    bundle.on('dep', function (dep) {
        var files = values(dep.deps || {});
        if (files.length === 0) return;
        var deps = {};
        files.forEach(function (file) { deps[file] = true });
        dependencies[dep.id] = deps;
    });
    
    bundle.on('package', function (file, pkg) {
        if (!pkg) pkg = {};
        var dir = path.dirname(file);
        if (!pkg.__dirname) pkg.__dirname = dir;
        var pkgid = shasum(pkg);
        packages[pkgid] = pkg;
        pkgCount[pkgid] = 0;
        pkgFiles[file] = pkgid;
        
        var globs = getKeys(keypaths, defaults, copy(pkg));
        if (typeof globs === 'string') globs = [ globs ];
        if (!globs) globs = [];
        pending ++;
        
        (function next () {
            if (globs.length === 0) return done();
            
            var gfile = path.resolve(dir, globs.shift());
            glob(gfile, function (err, exp) {
                if (err) return cb(err);
                
                exp.forEach(function (file) {
                    files[file] = pkgid;
                    pkgCount[pkgid] ++;
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
        var result = {
            packages: Object.keys(packages).reduce(function (acc, key) {
                if (pkgCount[key] > 0) acc[key] = packages[key];
                return acc;
            }, {}),
            assets: files,
            dependencies: Object.keys(dependencies).reduce(depReducer, {})
        };
        if (cb) cb(null, result);
        
        var outfile = opts.o || opts.outfile;
        if (outfile) fs.writeFile(outfile, JSON.stringify(result, null, 2));
    }
    
    function depReducer (acc, file) {
        var deps = Object.keys(dependencies[file]);
        var pkgid = pkgFiles[file];
        
        acc[file] = deps
            .map(function (id) {
                if (pkgid === pkgFiles[id]) return null;
                var did = pkgFiles[id];
                if (pkgCount[did] === 0) return false;
                return pkgFiles[id];
            })
            .filter(Boolean)
        ;
        return acc;
    }
};

function getKeys (keys, defaults, pkg) {
    return uniq(keys.concat(Object.keys(defaults))).map(function (key) {
        var cur = pkg, curDef = defaults;
        if (typeof key === 'string' && /\./.test(key)) {
            key = key.split('.');
        }
        
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

function values (obj) {
    return Object.keys(obj).map(function (key) { return obj[key] });
}
