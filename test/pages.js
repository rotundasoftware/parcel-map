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
    t.plan(4);
    var expected = {};
    
    expected.packages = {};
    expected.packages['df225df2f82bff75d4a79f9b8bc636660b793588'] = {
        name: 'page4',
        style: '*.css',
        __dirname: __dirname + '/files/page4'
    };
    expected.packages['7bc290756c03d0bcc98403c5525d6cc87884184f'] = {
        style: 'a.css',
        __dirname: __dirname + '/files/page4/node_modules/a'
    };
    expected.packages['34ebb1455c45b0dc17fb895897456f1a2977f34e'] = {
        style: 'b.css',
        __dirname: __dirname + '/files/page4/node_modules/b'
    };
    
    expected.dependencies = {};
    expected.dependencies['df225df2f82bff75d4a79f9b8bc636660b793588'] = [
        '34ebb1455c45b0dc17fb895897456f1a2977f34e',
        '7bc290756c03d0bcc98403c5525d6cc87884184f'
    ];
    expected.dependencies['34ebb1455c45b0dc17fb895897456f1a2977f34e'] = [
        '7bc290756c03d0bcc98403c5525d6cc87884184f'
    ];
    expected.dependencies['7bc290756c03d0bcc98403c5525d6cc87884184f'] = [
        '34ebb1455c45b0dc17fb895897456f1a2977f34e'
    ];
    
    expected.assets = {};
    expected.assets[__dirname + '/files/page4/beep.css']
        = 'df225df2f82bff75d4a79f9b8bc636660b793588'
    ;
    expected.assets[__dirname + '/files/page4/node_modules/a/a.css']
        = '7bc290756c03d0bcc98403c5525d6cc87884184f'
    ;
    expected.assets[__dirname + '/files/page4/node_modules/b/b.css']
        = '34ebb1455c45b0dc17fb895897456f1a2977f34e'
    ;
    
    var b = browserify(__dirname + '/files/page4');
    parcelMap(b, opts, function (err, graph) {
        t.error(err);
        t.deepEqual(graph.packages, expected.packages);
        t.deepEqual(graph.dependencies, expected.dependencies);
        t.deepEqual(graph.assets, expected.assets);
    });
    b.bundle();
});
