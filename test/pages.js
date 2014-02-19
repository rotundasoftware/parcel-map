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
    var x = {
        style: '*.css',
        __dirname: __dirname + '/files/page1'
    };
    var hx = shasum(x);
    expected.packages[hx] = x;
    expected.assets[__dirname + '/files/page1/beep.css'] = hx;
    
    var y = {
        style: '*.css',
        __dirname: path.dirname(require.resolve('widget/style.css'))
    };
    var hy = shasum(y);
    expected.packages[hy] = y;
    expected.assets[require.resolve('widget/style.css')] = hy;
    
    expected.dependencies[hx] = [ hy ];
    
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
    
    var x = {
        name: 'page2',
        __dirname: __dirname + '/files/page2'
    };
    var hx = shasum(x);
    expected.packages[hx] = x;
    expected.assets[__dirname + '/files/page2/whee.whatever'] = hx;
    
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
    parcelMap(b, opts, function (err, graph) {
        t.deepEqual(graph.packages, {});
        t.deepEqual(graph.assets, {});
        t.deepEqual(graph.dependencies, {});
    });
    b.bundle();
});
