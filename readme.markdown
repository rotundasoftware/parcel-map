# parcel-map

gather asset information from file globs in package.json 

You can use this module to build a static asset pipeline to work alongside
browserify's dependency graph.

[![build status](https://secure.travis-ci.org/rotundasoftware/parcel-map.png)](http://travis-ci.org/rotundasoftware/parcel-map)

# example

``` js
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

``` json
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
{ packages: 
   { bfcdcec7d6792ddedd77018b58c2982b7629dd32: 
      { style: '*.css',
        __dirname: '/home/substack/projects/parcel-map/example/views/page1' },
     '197659f6bb4c3492b8fb0d88a21d06f066c3a29d': 
      { style: '*.css',
        __dirname: '/home/substack/projects/parcel-map/example/node_modules/widget' } },
  assets: 
   { '/home/substack/projects/parcel-map/example/views/page1/beep.css': 'bfcdcec7d6792ddedd77018b58c2982b7629dd32',
     '/home/substack/projects/parcel-map/example/views/page1/images/beep.jpg': 'bfcdcec7d6792ddedd77018b58c2982b7629dd32',
     '/home/substack/projects/parcel-map/example/node_modules/widget/style.css': '197659f6bb4c3492b8fb0d88a21d06f066c3a29d' } }
```

Note how parcel-map found the local css in `page1/beep.css` and the image
`page1/beep.jpg` from the default `"images/*.jpg"` glob.

It also found the `widget/style.css` from the widget module, because widget was
included from `index.js`, so the lookup rules were triggered and the
package.json in `widget/` was processed through the parcel-map rules.

You can generate this parcel map output with the API directly or you can use
parcel-map as a
[browserify-plugin](https://github.com/substack/node-browserify#plugins):

```
$ browserify -p [ parcel-map -k style -o map.json ] views/page1 > static/bundle.js
```

# methods

``` js
var parcelMap = require('parcel-map');
```

## parcelMap(bundle, opts, cb)

Pass in a browserify `bundle` and some `opts` in order to generate the parcel
map and get the result in `cb(err, parcelMap)`.

`parcelMap` is an object with `packages` and `assets` keys:

* `parcelMap.packages` maps package.json shasums to package.json contents.
* `parcelMap.assets` maps asset file paths captured from
[glob expansion](https://npmjs.org/package/glob)
to the containing package.json's shasum.

The `opts` options are:

* `opts.defaults` - an object mapping dotted keypaths into the package.json with
default values to use when there is no field present in the package.json at the
location indicated
* `opts.keys` - an array of keys, dotted keypath strings, or array keypaths that
traverse into the package.json to values that are
[glob strings](https://npmjs.org/package/glob).

# install

With [npm](https://npmjs.org) do:

```
npm install parcel-map
```

# license

MIT
