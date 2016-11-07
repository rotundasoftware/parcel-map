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

module.exports = function( browserifyInstance, opts ) {
	var eventEmitter = new EventEmitter();

	var keypaths = opts.keys || opts.key || opts.k;
	if (!keypaths) keypaths = [];
	if (!Array.isArray(keypaths)) keypaths = [ keypaths ];
	var defaults = opts.defaults || opts.d || {};
	
	var assets = opts.assets || {};
	var packages = {};
	var oldPackages = opts.packages;
	var oldPackageDependencies = opts.dependencies;
	var dependencies = {};
	
	var mainFile;

	browserifyInstance.pipeline.get( 'label' ).unshift( through.obj( function( row, enc, next ) {
		var thisFilePath = row.file;
		var thisFileDependencies = _.values( row.deps || {} );

		this.push( row );

		if( fs.lstatSync( thisFilePath ).isDirectory() ) {
			var err = new Error( 'Parcel map can not operate on directories. Please specify the full entry point path when running browserify.' );
			eventEmitter.emit( 'error', err );
		}

		if( thisFileDependencies.length ) {
			if( ! dependencies[ thisFilePath ] ) dependencies[ thisFilePath ] = [];
			dependencies[ thisFilePath ] = dependencies[ thisFilePath ].concat( thisFileDependencies );
		}

		mothership( thisFilePath, function() { return true; }, function( err, res ) {
			if( err ) {
				eventEmitter.emit( 'error', err );
			}

			var pkg, dir;

			// the file has no mothership package.json. eventhough it is not usually relevant for
			// the purposes of parcelify, since parcelify does not care about orphaned
			// js files without any other asset types, we still have to include it in the
			// map. it might be an entry point and therefore cartero needs an ide for it.
			if( ! res ) {
				pkg = {};
				dir = path.dirname( thisFilePath );
			} else {
				pkg = res.pack;
				dir = path.dirname( res.path );
			}
			
			assets[ thisFilePath ] = dir;

			// if we've already registered this package, don't do it again (avoid cycles), but
			// do make sure we mark parcels as such, since they can contain both entry point
			// and non-entry point js files.
			if( packages[ dir ] ) {
				if( row.entry ) {
					packages[ dir ].__isParcel = true;
					packages[ dir ].__mainPath = thisFilePath;
				}

				return next();
			}

			if( typeof browserifyInstance._options.packageFilter === 'function' ) pkg = browserifyInstance._options.packageFilter( pkg, dir );
		
			pkg.__path = dir;
			pkg.__isParcel = !! row.entry;
			if( pkg.__isParcel ) pkg.__mainPath = thisFilePath;
			
			packages[ dir ] = pkg;

			var globs = getKeys( keypaths, defaults, copy( pkg ) );
			if( typeof globs === 'string' ) globs = [ globs ];
			if( ! globs ) globs = [];
			
			_.each( globs, function( thisGlob ) {
				var thisGlobAbsPath = path.resolve( dir, thisGlob );

				glob.sync( thisGlobAbsPath ).forEach( function( thisAssetPath ) {
					assets[ thisAssetPath ] = dir;
				} );
			} );

			next();
		} );
	} ) );
	
	browserifyInstance.pipeline.get( 'label' ).on( 'end', finish );

	function finish() {
		packages = _.extend( {}, oldPackages, packages );

		var pkgdeps = Object.keys(dependencies).reduce( function( acc, file ) {
			var deps = dependencies[file];
			var dir = assets[file];
			var pkgid = dir;
			
			if( ! acc[pkgid] ) acc[pkgid] = [];

			acc[pkgid] = _.unique( acc[pkgid].concat( deps
				.map(function (id) {
					if (pkgid === assets[id]) return null;
					var did = assets[id];

					//if (pkgCount[did] === 0) return false;
					return did;
				})
				.filter(Boolean) ).sort() );

			return acc;
		}, {});

		pkgdeps = _.extend( {}, oldPackageDependencies, pkgdeps );

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

		var result = {
			packages: Object.keys(packages).sort().reduce(function (acc, dir) {
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
			assets: Object.keys(assets).reduce(function (acc, file) {
				acc[file] = getPkgId(assets[file]);
				return acc;
			}, {}),
			dependencies: Object.keys(pkgdeps).reduce(function (acc, dir) {
				var pkgid = getPkgId(dir);
				acc[pkgid] = pkgdeps[dir].map(getPkgId);
				return acc;
			}, {})
		};

		eventEmitter.emit( 'done', result );
		
		var outfile = opts.o || opts.outfile;
		if (outfile) fs.writeFile(outfile, JSON.stringify(result, null, 2));
	};

	return eventEmitter;
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
