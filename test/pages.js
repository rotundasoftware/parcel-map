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
    expected.packages['766f36fe299bc4356d485794fd495c14c481e374'] = {
        name: 'page4',
        style: [ '*.css', '*.blah' ],
        __dirname: __dirname + '/files/page4'
    };
    expected.packages['827ccbacf5a0a4e67a548bc09d9915ede44b857a'] = {
        style: 'a.css',
        __dirname: __dirname + '/files/page4/node_modules/a'
    };
    expected.packages['88aa1ce0c503181494956f7e730cb1857dffab5f'] = {
        style: 'b.css',
        __dirname: __dirname + '/files/page4/node_modules/b'
    };
    
    expected.dependencies = {};
    expected.dependencies['766f36fe299bc4356d485794fd495c14c481e374'] = [
        '88aa1ce0c503181494956f7e730cb1857dffab5f',
        '827ccbacf5a0a4e67a548bc09d9915ede44b857a'
    ];
    expected.dependencies['88aa1ce0c503181494956f7e730cb1857dffab5f'] = [
        '827ccbacf5a0a4e67a548bc09d9915ede44b857a'
    ];
    expected.dependencies['827ccbacf5a0a4e67a548bc09d9915ede44b857a'] = [
        '88aa1ce0c503181494956f7e730cb1857dffab5f'
    ];
    
    expected.assets = {};
    expected.assets[__dirname + '/files/page4/beep.css']
        = '766f36fe299bc4356d485794fd495c14c481e374'
    ;
    expected.assets[__dirname + '/files/page4/node_modules/a/a.css']
        = '827ccbacf5a0a4e67a548bc09d9915ede44b857a'
    ;
    expected.assets[__dirname + '/files/page4/node_modules/b/b.css']
        = '88aa1ce0c503181494956f7e730cb1857dffab5f'
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
