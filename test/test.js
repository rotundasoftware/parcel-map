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
    var b = browserify(__dirname + '/files/page1');
    var expected = { assets: {}, packages: {}, dependencies: {} };
    var hy = shasum(path.dirname(require.resolve('widget/style.css')) + '!');
    var hx = shasum(__dirname + '/files/page1!' + hy);
    
    expected.packages[hx] = {
        style: '*.css',
        __path: __dirname + '/files/page1'
    };
    expected.packages[hy] = {
        style: '*.css',
        __path: path.dirname(require.resolve('widget/style.css'))
    };
    expected.assets[__dirname + '/files/page1/beep.css'] = hx;
    expected.assets[__dirname + '/files/page1/index.js'] = hx;
    expected.assets[__dirname + '/files/page1/upper.js'] = hx;
    expected.assets[require.resolve('widget/style.css')] = hy;
    expected.assets[require.resolve('widget/index.js')] = hy;
    expected.assets[require.resolve('widget/index.jade')] = hy;
    
    expected.dependencies[hx] = [ hy ];
    expected.dependencies[hy] = [];
    
    parcelMap(b, opts, function (err, graph) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.assets, expected.assets);
        t.deepEqual(graph.dependencies, expected.dependencies);
    });
    b.bundle();
});

test('page2', function (t) {
    t.plan(3);
    var b = browserify(__dirname + '/files/page2');
    var expected = { assets: {}, packages: {} };
    
    var hx = shasum(__dirname + '/files/page2!');
    expected.packages[hx] = {
        name: 'page2',
        __path: __dirname + '/files/page2'
    };
    expected.assets[__dirname + '/files/page2/whee.whatever'] = hx;
    expected.assets[__dirname + '/files/page2/index.js'] = hx;
    
    parcelMap(b, opts, function (err, graph) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.assets, expected.assets);
        t.deepEqual(graph.dependencies, {});
    });
    b.bundle();
});

test('page3', function (t) {
    t.plan(3);
    var b = browserify(__dirname + '/files/page3');
    var expected = { assets: {}, packages: {}, dependencies: {} };
    var hx = shasum(__dirname + '/files/page3!' );
    
    expected.packages[hx] = {
        name : 'page3',
        __path: __dirname + '/files/page3'
    };

    expected.assets[__dirname + '/files/page3/index.js'] = hx;

    parcelMap(b, opts, function (err, graph) {
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.assets, expected.assets);
        t.deepEqual(graph.dependencies, {});
    });
    b.bundle();
});

test('page4 (cycles)', function (t) {
    t.plan(4);
    var expected = {};

    var expectedShasums = {};
    expectedShasums.b = shasum( __dirname + "/files/page4/node_modules/b!" );
    expectedShasums.a = shasum( __dirname + "/files/page4/node_modules/a!" + expectedShasums.b );
    expectedShasums.page4 = shasum( __dirname + "/files/page4!" + expectedShasums.a + "," + expectedShasums.b );

    expected.packages = {};
    expected.packages[ expectedShasums.page4 ] = {
        name: 'page4',
        style: [ '*.css', '*.blah' ],
        __path: __dirname + '/files/page4'
    };
    expected.packages[ expectedShasums.a ] = {
        style: 'a.css',
        __path: __dirname + '/files/page4/node_modules/a'
    };
    expected.packages[ expectedShasums.b ] = {
        style: 'b.css',
        __path: __dirname + '/files/page4/node_modules/b'
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

    var b = browserify(__dirname + '/files/page4');
    parcelMap(b, opts, function (err, graph) {
        t.error(err);
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.dependencies, expected.dependencies);
        t.deepEqual(graph.assets, expected.assets);
    });
    b.bundle();
});


test('page5', function (t) {
    t.plan(4);
    var b = browserify(__dirname + '/files/page5');
    var expected = { assets: {}, packages: {}, dependencies: {} };
    var hy = shasum(__dirname + '/files' + '!');
    var hx = shasum(__dirname + '/files/page5!' + hy);

    expected.packages[hx] = {
        style: ['*.css'],
        __path: __dirname + '/files/page5'
    };
    expected.packages[hy] = {
        style: 'common.css',
        __path: __dirname + '/files'
    };
    expected.assets[__dirname + '/files/page5/index.js'] = hx;
    expected.assets[__dirname + '/files/page5/beep.css'] = hx;
    expected.assets[__dirname + '/files/common.css'] = hy;
    expected.assets[__dirname + '/files/common.js'] = hy;

    expected.dependencies[hx] = [ hy ];

    var b = browserify(__dirname + '/files/page5');
    parcelMap(b, opts, function (err, graph) {
        t.error(err);
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.dependencies, expected.dependencies);
        t.deepEqual(graph.assets, expected.assets);
    });
    b.bundle();
});

test('page6', function(t) {
    t.plan(4);
    var b = browserify(__dirname + '/files/page6' );

    var expectedDependencies = {};

    var underscoreShasum = shasum( path.join( __dirname, 'files/page6/node_modules/underscore' ) + "!" );
    var page6Shasum = shasum( path.join( __dirname, 'files/page6' ) + "!" + underscoreShasum );

    expectedDependencies[ page6Shasum ] = [ underscoreShasum ];

    parcelMap(b, {}, function (err, graph) {
        t.error(err);
        t.deepEqual( graph.dependencies, expectedDependencies );
        t.ok( graph.packages[ underscoreShasum ] );
        t.ok( graph.packages[ page6Shasum ] );
    });
    b.bundle();
})