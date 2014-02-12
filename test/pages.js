var test = require('tape');
var browserify = require('browserify');
var parcelMap = require('../');
var path = require('path');

var opts = {
    keys: [ 'style' ],
    defaults: { style: '*.whatever' }
};

test('page1', function (t) {
    t.plan(1);
    var b = browserify(__dirname + '/files/page1');
    var expected = {};
    expected[__dirname + '/files/page1/beep.css'] = {
        style: '*.css',
        __dirname: __dirname + '/files/page1'
    };
    expected[require.resolve('widget/style.css')] = {
        style: '*.css',
        __dirname: path.dirname(require.resolve('widget/style.css'))
    };
    parcelMap(b, opts, function (graph) {
        t.deepEqual(graph, expected);
    });
    b.bundle();
});

test('page2', function (t) {
    t.plan(1);
    var b = browserify(__dirname + '/files/page2');
    var expected = {};
    expected[__dirname + '/files/page2/whee.whatever'] = {
        name: 'page2',
        __dirname: __dirname + '/files/page2'
    };
    parcelMap(b, opts, function (graph) {
        t.deepEqual(graph, expected);
    });
    b.bundle();
});

test('page3', function (t) {
    t.plan(1);
    var b = browserify(__dirname + '/files/page3');
    parcelMap(b, opts, function (graph) {
        t.deepEqual(graph, {});
    });
    b.bundle();
});
