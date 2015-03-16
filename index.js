var copy = require('shallow-copy');
var glob = require('glob');
var uniq = require('nub');
var path = require('path');
var shasum = require('shasum');
var fs = require('fs');
var EventEmitter = require( 'events' ).EventEmitter;
var mothership = require( 'mothership' );
var _ = require( 'underscore' );
var through = require( 'through2' );

module.exports = function( bundle, opts, cb ) {
	var eventEmitter = new EventEmitter();

	var keypaths = opts.keys || opts.key || opts.k;
	var packageFilter = opts.packageFilter;
	if (!keypaths) keypaths = [];
	if (!Array.isArray(keypaths)) keypaths = [ keypaths ];
	var defaults = opts.defaults || opts.d || {};
	
	var files = opts.files || {};
	var packages = {};
	var oldPackages = opts.packages;
	var dependencies = {};
	
	var mainFile;

	var pendingRowsInPipeline = 0;

	bundle.on( 'reset', function() {
		pendingRowsInPipeline = 0;
	} );

	bundle.pipeline.get( 'label' ).unshift( through.obj( function( row, enc, next ) {
		var thisFilePath = row.file;
		var thisFileIsTheMainFile = row.entry;
		var thisFileDependencies = _.values( row.deps || {} );

		console.log( 'add to pending', pendingRowsInPipeline++ );

		if( fs.lstatSync( thisFilePath ).isDirectory() ) {
			var err = new Error( 'Parcel map can not operate on directories. Please specify the full entry point path when running browserify.' );
			eventEmitter.emit( 'error', err );
			return cb( err );
		}
	
		if( thisFileIsTheMainFile ) mainFile = thisFilePath;

		if( thisFileDependencies.length ) {
			if( ! dependencies[ thisFilePath ] ) dependencies[ thisFilePath ] = [];
			dependencies[ thisFilePath ] = dependencies[ thisFilePath ].concat( thisFileDependencies );
		}

		mothership( thisFilePath, function() { return true; }, function( err, res ) {
			if( err ) {
				eventEmitter.emit( 'error', err );
				if( cb ) return cb( err );
			}

			// if a file has no mothership package.json, it is not relevant for
			// the purposes of a parcel. parcels do not care about 'orphaned' js files.
			if( ! res ) return next();

			var pkg = res.pack;
			var dir = path.dirname( res.path );

			files[ thisFilePath ] = dir;

			// if we've already registered this package, don't do it again (avoid cycles)
			if( packages[ dir ] ) return next();
			if( typeof packageFilter === 'function' ) pkg = packageFilter( pkg, dir );
		
			pkg.__path = dir;
			
			packages[ dir ] = pkg;

			var globs = getKeys( keypaths, defaults, copy( pkg ) );
			if( typeof globs === 'string' ) globs = [ globs ];
			if( ! globs ) globs = [];
			
			_.each( globs, function( thisGlob ) {
				var thisGlobAbsPath = path.resolve( dir, thisGlob );

				glob.sync( thisGlobAbsPath ).forEach( function( thisAssetPath ) {
					files[ thisAssetPath ] = dir;
				} );
			} );

			console.log( 'yup' );
			next();
		} );
	} ), through.obj( function( row, enc, next ) {
		console.log( 'sub from pending', pendingRowsInPipeline-- );
		if( pendingRowsInPipeline === 0 ) finish();
		next();
	} ) );

	//bundle.pipeline.get( 'label' ).unshift(  );

	function finish() {
		// console.log( '*****' );
		// console.log( dependencies );
		// console.log( packages );

		packages = _.extend( {}, oldPackages, packages );

		var pkgdeps = Object.keys(dependencies).reduce( function( acc, file ) {
			var deps = dependencies[file];
			var dir = files[file];
			var pkgid = dir;
			
			if( ! acc[pkgid] ) acc[pkgid] = [];

			acc[pkgid] = acc[pkgid].concat( deps
				.map(function (id) {
					if (pkgid === files[id]) return null;
					var did = files[id];

					//if (pkgCount[did] === 0) return false;
					return did;
				})
				.filter(Boolean) ).sort();

			return acc;
		}, {});

		var pkgids = {};
		var walked = {};

		var getPkgId = (function () {
			return function get (dir) {
				if (pkgids[dir]) return pkgids[dir];

				walked[dir] = true;
				var deps = (pkgdeps[dir] || [])
					.filter(function (x) { return !walked[x] || pkgids[x]})
					.map(get)
					.sort()
				;
				pkgids[dir] = shasum(dir + '!' + deps.join(','));

				return pkgids[dir];
			}
		})();

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

		if( cb ) cb( null, result );

		eventEmitter.emit( 'done', result );
		
		var outfile = opts.o || opts.outfile;
		if (outfile) fs.writeFile(outfile, JSON.stringify(result, null, 2));
	};

	return eventEmitter;
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
