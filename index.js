var copy = require('shallow-copy');
var glob = require('glob');
var uniq = require('nub');
var path = require('path');
var shasum = require('shasum');
var fs = require('fs');

module.exports = function (bundle, opts, cb) {
    var keypaths = opts.keys || opts.key || opts.k;
    if (!keypaths) keypaths = [];
    if (!Array.isArray(keypaths)) keypaths = [ keypaths ];
    var defaults = opts.defaults || opts.d || {};
    
    var files = {};
    var packages = {};
    var dependencies = {};
    
    var pkgCount = {};
    var pkgFiles = {};
    var pending = 1;
    
    var onDep = function onDep(dep) {
        var files = values(dep.deps || {});
        if (files.length === 0) return;
        var deps = {};
        files.forEach(function (file) { deps[file] = true });
        dependencies[dep.id] = deps;
    };

    var onPackage = function onPackage(file, pkg) {
        if (!pkg) pkg = {};
        
        var dir = pkg.__dirname;
        if (!dir) dir = pkg.__dirname = path.dirname(file);
        
        packages[dir] = pkg;
        pkgCount[dir] = 0;
        pkgFiles[file] = dir;
        
        var globs = getKeys(keypaths, defaults, copy(pkg));
        if (typeof globs === 'string') globs = [ globs ];
        if (!globs) globs = [];
        pending ++;
        
        (function next () {
            if (globs.length === 0) return done();

            var gfile = path.resolve(dir, globs.shift());

            glob.sync(gfile).forEach(function (file) {
                files[file] = dir;
                pkgCount[dir] ++;
            });
            next();
        })();
    };
    
    bundle.on( 'dep', onDep );
    bundle.on( 'package', onPackage );
    
    bundle.once('bundle', function (stream) {
        stream.on('end', function () {
            process.nextTick(done);
        });
    });
    
    function done () {
        if (-- pending !== 0) return;
        var pkgdeps = Object.keys(dependencies).reduce(depReducer, {});
        var getPkgId = (function () {
            var pkgids = {};
            var walked = {};
            return function get (dir) {
                if (pkgids[dir]) return pkgids[dir];
                walked[dir] = true;
                var deps = (pkgdeps[dir] || [])
                    .filter(function (x) { return !walked[x] })
                    .map(get)
                    .sort()
                ;
                pkgids[dir] = shasum(dir + '!' + deps.join(','));
                return pkgids[dir];
            }
        })();

        // clean up in case we are keeping the bundle instance around (e.g. for watching)
        bundle.removeListener( 'dep', onDep );
        bundle.removeListener( 'package', onPackage );
        
        var result = {
            packages: Object.keys(packages).reduce(function (acc, dir) {
                if (pkgCount[dir] === 0 && !packages[dir].view) {
                    return acc;
                }
                
                var pkgid = getPkgId(dir);
                acc[pkgid] = packages[dir];
                return acc;
            }, {}),
            assets: Object.keys(files).reduce(function (acc, file) {
                acc[file] = getPkgId(files[file]);
                return acc;
            }, {}),
            dependencies: Object.keys(pkgdeps).reduce(function (acc, dir) {
                var pkgid = getPkgId(dir);
                acc[pkgid] = pkgdeps[dir].map(getPkgId);
                return acc;
            }, {})
        };
        if (cb) cb(null, result);
        
        var outfile = opts.o || opts.outfile;
        if (outfile) fs.writeFile(outfile, JSON.stringify(result, null, 2));
    }
    
    function depReducer (acc, file) {
        var deps = Object.keys(dependencies[file]);
        var dir = pkgFiles[file];
        var pkgid = dir;
        
        acc[pkgid] = deps
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
    })
    .reduce(function (acc, g) { return acc.concat(g) }, [])
    .filter(Boolean);
}

function values (obj) {
    return Object.keys(obj).map(function (key) { return obj[key] });
}

function findPackagePath (file, cb) {
    if (file === '/') return cb(null, undefined);
    
    var dir = path.dirname(file);
    var pkgfile = path.join(dir, 'package.json');
    fs.exists(pkgfile, function (ex) {
        if (ex) return cb(null, pkgfile);
        findPackagePath(dir, cb);
    });
}
