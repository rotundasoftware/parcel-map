var copy = require('shallow-copy');
var glob = require('glob');

module.exports = function (bundle, fn, cb) {
    fn = function (pkg, f) {
        if (!pkg) return [];
        f([ pkg.style ].filter(Boolean));
    };
    
    var graph = {};
    
    bundle.on('dep', function (dep) {
        if (dep.entry) {
            graph[dep.id] = {};
        }
        console.log(dep.id, dep.deps);
    });
    
    bundle.on('package', function (file, pkg) {
        
        
        fn(copy(pkg), function (files) {
            //console.error(files);
        });
    });
    
    bundle.on('bundle', function (stream) {
        stream.on('end', function () { cb(graph) });
    });
};
