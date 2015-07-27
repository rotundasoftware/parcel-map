var test = require('tape');
var browserify = require('browserify');
var parcelMap = require('../');
var path = require('path');
var shasum = require('shasum');

var opts = {
    keys: [ 'style' ],
    defaults: { style: '*.whatever' }
};

test('page1', function (t) {
    t.plan(3);
    var mainPath = __dirname + '/files/page1/index.js';
    var b = browserify(mainPath);
    var expected = { assets: {}, packages: {}, dependencies: {} };
    var hy = shasum(path.dirname(require.resolve('widget/style.css')) + '!');
    var hx = shasum(__dirname + '/files/page1!' + hy);
    
    expected.packages[hx] = {
        style: '*.css',
        __path: __dirname + '/files/page1',
        __isParcel: true,
        __mainPath: mainPath,
    };
    expected.packages[hy] = {
        style: '*.css',
        __path: path.dirname(require.resolve('widget/style.css')),
        __isParcel: false
    };
    expected.assets[__dirname + '/files/page1/beep.css'] = hx;
    expected.assets[__dirname + '/files/page1/index.js'] = hx;
    expected.assets[__dirname + '/files/page1/upper.js'] = hx;
    expected.assets[require.resolve('widget/style.css')] = hy;
    expected.assets[require.resolve('widget/index.js')] = hy;
    expected.assets[require.resolve('widget/index.jade')] = hy;
    
    expected.dependencies[hx] = [ hy ];
    expected.dependencies[hy] = [];
    
    parcelMap( b, opts ).on( 'done', function( graph ) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.assets, expected.assets);
        t.deepEqual(graph.dependencies, expected.dependencies);
    } );

    b.bundle( function() {} );
});

test('page2', function (t) {
    t.plan(3);
    var mainPath = __dirname + '/files/page2/index.js';
    var b = browserify(mainPath);
    var expected = { assets: {}, packages: {} };
    
    var hx = shasum(__dirname + '/files/page2!');
    expected.packages[hx] = {
        name: 'page2',
        __path: __dirname + '/files/page2',
        __isParcel: true,
        __mainPath: mainPath
    };
    expected.assets[__dirname + '/files/page2/whee.whatever'] = hx;
    expected.assets[__dirname + '/files/page2/index.js'] = hx;
    
    parcelMap( b, opts ).on( 'done', function( graph ) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.assets, expected.assets);
        t.deepEqual(graph.dependencies, {});
    } );
    
    b.bundle( function() {} );
} );

test('page3', function (t) {
    t.plan(3);
    var mainPath = __dirname + '/files/page3/index.js';
    var b = browserify(mainPath);
    var expected = { assets: {}, packages: {}, dependencies: {} };
    var hx = shasum(__dirname + '/files/page3!' );
    
    expected.packages[hx] = {
        name : 'page3',
        __path: __dirname + '/files/page3',
        __isParcel: true,
        __mainPath: mainPath
    };

    expected.assets[__dirname + '/files/page3/index.js'] = hx;

    parcelMap( b, opts ).on( 'done', function( graph ) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.assets, expected.assets);
        t.deepEqual(graph.dependencies, {});
    } );

    b.bundle( function() {} );
} );

test('page4 (cycles)', function (t) {
    t.plan(3);
    var expected = {};
    var mainPath = __dirname + '/files/page4/index.js';

    var expectedShasums = {};
    expectedShasums.b = shasum( __dirname + "/files/page4/node_modules/b!" );
    expectedShasums.a = shasum( __dirname + "/files/page4/node_modules/a!" + expectedShasums.b );
    expectedShasums.page4 = shasum( __dirname + "/files/page4!" + expectedShasums.a + "," + expectedShasums.b );

    expected.packages = {};
    expected.packages[ expectedShasums.page4 ] = {
        name: 'page4',
        style: [ '*.css', '*.blah' ],
        __path: __dirname + '/files/page4',
        __isParcel: true,
        __mainPath: mainPath
    };
    expected.packages[ expectedShasums.a ] = {
        style: 'a.css',
        __path: __dirname + '/files/page4/node_modules/a',
        __isParcel: false
    };
    expected.packages[ expectedShasums.b ] = {
        style: 'b.css',
        __path: __dirname + '/files/page4/node_modules/b',
        __isParcel: false
    };
    
    expected.dependencies = {};
    expected.dependencies[ expectedShasums.page4 ] = [
        expectedShasums.a,
        expectedShasums.b
        
    ];
    expected.dependencies[ expectedShasums.a ] = [
        expectedShasums.b
    ];
    expected.dependencies[ expectedShasums.b ] = [
        expectedShasums.a
    ];
    
    expected.assets = {};
    expected.assets[__dirname + '/files/page4/beep.css'] = expectedShasums.page4;
    expected.assets[__dirname + '/files/page4/index.js'] = expectedShasums.page4;
    expected.assets[__dirname + '/files/page4/node_modules/a/a.css'] = expectedShasums.a;
    expected.assets[__dirname + '/files/page4/node_modules/a/index.js'] = expectedShasums.a;
    expected.assets[__dirname + '/files/page4/node_modules/b/b.css'] = expectedShasums.b;
    expected.assets[__dirname + '/files/page4/node_modules/b/index.js'] = expectedShasums.b;

    var b = browserify(mainPath);
    parcelMap( b, opts ).on( 'done', function( graph ) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.dependencies, expected.dependencies);
        t.deepEqual(graph.assets, expected.assets);
    });
    b.bundle( function() {} );
});


test('page5', function (t) {
    t.plan(3);
    var mainPath = __dirname + '/files/page5/index.js';
    var b = browserify(mainPath);
    var expected = { assets: {}, packages: {}, dependencies: {} };
    var hy = shasum(__dirname + '/files' + '!');
    var hx = shasum(__dirname + '/files/page5!' + hy);

    expected.packages[hx] = {
        style: ['*.css'],
        __path: __dirname + '/files/page5',
        __isParcel: true,
        __mainPath: mainPath
    };
    expected.packages[hy] = {
        style: 'common.css',
        __path: __dirname + '/files',
        __isParcel: false
    };
    expected.assets[__dirname + '/files/page5/index.js'] = hx;
    expected.assets[__dirname + '/files/page5/beep.css'] = hx;
    expected.assets[__dirname + '/files/common.css'] = hy;
    expected.assets[__dirname + '/files/common.js'] = hy;

    expected.dependencies[hx] = [ hy ];

    var b = browserify(__dirname + '/files/page5/index.js');
    parcelMap( b, opts ).on( 'done', function( graph ) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.dependencies, expected.dependencies);
        t.deepEqual(graph.assets, expected.assets);
    });

    b.bundle( function() {} );
});

test('page6', function(t) {
    t.plan(3);
    var mainPath = __dirname + '/files/page6/index.js';
    var b = browserify( mainPath);

    var expectedDependencies = {};

    var underscoreShasum = shasum( path.join( __dirname, 'files/page6/node_modules/underscore' ) + "!" );
    var page6Shasum = shasum( path.join( __dirname, 'files/page6' ) + "!" + underscoreShasum );

    expectedDependencies[ page6Shasum ] = [ underscoreShasum ];

    parcelMap( b, opts ).on( 'done', function( graph ) {
        t.deepEqual( graph.dependencies, expectedDependencies );
        t.ok( graph.packages[ underscoreShasum ] );
        t.ok( graph.packages[ page6Shasum ] );
    });

    b.bundle( function() {} );
})