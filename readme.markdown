# parcel-map

gather asset information from file globs in package.json 

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

For a `views/page1` directory with a 


```
``

# methods

``` js
var parcelMap = require('parcel-map');
```

## parcelMap(bundle, opts, cb)

`cb(err, graph)`

# install

With [npm](https://npmjs.org) do:

```
npm install parcel-map
```

# license

MIT
