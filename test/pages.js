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
        __dirname: __dirname + '/files/page1'
    };
    expected.packages[hy] = {
        style: '*.css',
        __dirname: path.dirname(require.resolve('widget/style.css'))
    };
    expected.assets[__dirname + '/files/page1/beep.css'] = hx;
    expected.assets[require.resolve('widget/style.css')] = hy;
    
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
        __dirname: __dirname + '/files/page2'
    };
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

test('page4 (cycles)', function (t) {
    var b = browserify(__dirname + '/files/page4');
    parcelMap(b, opts, function (err, graph) {
        console.log(graph); 
        t.end();
    });
    b.bundle();
});
