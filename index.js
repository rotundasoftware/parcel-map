var copy = require('shallow-copy');
var glob = require('glob');
var uniq = require('nub');
var path = require('path');
var shasum = require('shasum');
var fs = require('fs');
var EventEmitter = require( 'events' ).EventEmitter;
var mothership = require( 'mothership' );

module.exports = function (bundle, opts, cb) {
    var eventEmitter = new EventEmitter();

    var keypaths = opts.keys || opts.key || opts.k;
    var packageFilter = opts.packageFilter;
    if (!keypaths) keypaths = [];
    if (!Array.isArray(keypaths)) keypaths = [ keypaths ];
    var defaults = opts.defaults || opts.d || {};
    
    var files = opts.files || {};
    var packages = opts.packages || {};
    var dependencies = {};
    
    var pkgCount = {};
    var pending = 1;
    var mainFile;
    
    var onDep = function onDep(dep) {
        var files = values(dep.deps || {});
        if(dep.entry) mainFile = dep.id;

        if (files.length === 0) return;
        var deps = {};
        files.forEach(function (file) { deps[file] = true });
        dependencies[dep.id] = deps;
    };

    var onPackage = function onPackage(file, pkg) {
        mothership( file, function() { return true; }, function( err, res ) {
            if(err) {
                eventEmitter.emit( 'error', err );
                if (cb) return cb(err);
            }

            // if a file has no mothership package.json, it is not relevant for
            // the purposes of a parcel. parcels do not care about 'orphaned' js files.
            if(!res) return;
        
            var pkg = res.pack;
            var dir = path.dirname( res.path );

           // var dir = pkg.__dirname || path.dirname( file );

            files[file] = dir;

            if( packages[dir] ) {
                return; // if we've already registered this package, don't do it again (avoid cycles)
            }

            if(typeof packageFilter === 'function') pkg = packageFilter(pkg, dir);
            
            pkg.__path = dir;
            
            packages[dir] = pkg;
            pkgCount[dir] = 0;
            
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
        });
    };
    
    bundle.on( 'dep', onDep );
    bundle.on( 'package', onPackage );
    
    bundle.once('bundle', function (stream) {
        stream.on('end', function () {
            process.nextTick(done);
        });
    });

    return eventEmitter;
    
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

        var mainPackageDir;
        if(files[mainFile])
            mainPackageDir = files[mainFile];
        else {
            // if the main file has no package.json, we never get a package event.
            // However, we need a main package, so create one!
            mainPackageDir = path.dirname(mainFile);
            packages[mainPackageDir] = {};
        }
        
        var result = {
            packages: Object.keys(packages).reduce(function (acc, dir) {
                // we used to get rid of packages that dont have assets or directly
                // but we want to know about them if they ahve indirect dependencies.
                // just keep all packages around for now, see where it gets us.
                // if (pkgCount[dir] === 0 && !packages[dir].view) {
                //     return acc;
                // }
                
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
            }, {}),
            mainPackageId: getPkgId(mainPackageDir)
        };

        if (cb) cb(null, result);
        eventEmitter.emit( 'done', result );
        
        var outfile = opts.o || opts.outfile;
        if (outfile) fs.writeFile(outfile, JSON.stringify(result, null, 2));
    }
    
    function depReducer (acc, file) {
        var deps = Object.keys(dependencies[file]);
        var dir = files[file];
        var pkgid = dir;
        
        acc[pkgid] = deps
            .map(function (id) {
                if (pkgid === files[id]) return null;
                var did = files[id];
                //if (pkgCount[did] === 0) return false;
                return files[id];
            })
            .filter(Boolean)
        ;
        return acc;
    }
};

// function mothership(start, ismothership, cb) {
//   (function findShip (root) {
//     findParentDir(root, 'package.json', function (err, packageDir) {
//       if (err) return cb(err);
//       if (!packageDir) return cb();

//       var pack;
//       try {
//         pack = fs.readFileSync( path.join(packageDir, 'package.json'), 'utf8' );
//         if (ismothership(pack)) return cb(null, { path: path.join(packageDir, 'package.json'), pack: pack });
//         findShip(path.resolve(root, '..'));
//       } catch (e) {
//         cb(e);
//       }
//     });

//   })(start);
// }

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
