# parcel-map

gather asset information from file globs in package.json 

You can use this module to build a static asset pipeline to work alongside
browserify's dependency graph.

# example

```
var browserify = require('browserify');
var parcelMap = require('parcel-map');

var b = browserify(__dirname + '/views/page1');
var opts = {
    keys: [ 'style' ],
    defaults: { style: 'images/*.jpg' }
};
parcelMap(b, opts, function (err, graph) {
    console.log(graph);
});
b.bundle();
```

For a `views/page1` directory with a package.json of:

```
{
  "style": "*.css"
}
```

and these files:


```
page1/index.js
page1/upper.js
page1/beep.css
page1/iamges/beep.jpg
```

The `index.js` requires two files, the `'upper.js'` in the local directory and
`'widget'`, a module with a package.json of:

``` json
{
  "style": "*.css"
}
```

the resulting parcel-map output is:

```
{ '/home/substack/projects/parcel-map/example/views/page1/beep.css': 
   { style: '*.css',
     __dirname: '/home/substack/projects/parcel-map/example/views/page1' },
  '/home/substack/projects/parcel-map/example/views/page1/images/beep.jpg': 
   { style: '*.css',
     __dirname: '/home/substack/projects/parcel-map/example/views/page1' },
  '/home/substack/projects/parcel-map/example/node_modules/widget/style.css': 
   { style: '*.css',
     __dirname: '/home/substack/projects/parcel-map/example/node_modules/widget' } }
```

Note how parcel-map found the local css in `page1/beep.css` and the image
`page1/beep.jpg` from the default `"images/*.jpg"` glob.

It also found the `widget/style.css` from the widget module, because widget was
included from `index.js`, so the lookup rules were triggered and the
package.json in `widget/` was processed through the parcel-map rules.

# methods

``` js
var parcelMap = require('parcel-map');
```

## parcelMap(bundle, opts, cb)

Pass in a browserify `bundle` and some `opts` in order to generate the parcel
map and get the result in `cb(err, graph)`.

`graph` maps file paths from the [glob](https://npmjs.org/package/glob)
expansion of the resolved `opts.keys` and `opts.defaults` values to the
package.json of the containing module (or "parcel").

The `opts` options are:

* `opts.defaults` - an object mapping dotted keypaths into the package.json with
default values to use when there is no field present in the package.json at the
location indicated
* `opts.keys` - an array of keys, dotted keypath strings, or array keypaths that
traverse into the package.json to values that are [glob
strings](https://npmjs.org/package/glob).

# install

With [npm](https://npmjs.org) do:

```
npm install parcel-map
```

# license

MIT
