# pkgcfg <sup><sub>0.4.0</sub></sup>
## One configuration to rule them all

[![npm](https://img.shields.io/npm/v/pkgcfg.svg?maxAge=2592000)](https://npmjs.com/package/pkgcfg)
[![license](https://img.shields.io/npm/l/pkgcfg.svg)](https://creativecommons.org/licenses/by/4.0/)
[![travis](https://img.shields.io/travis/Download/pkgcfg.svg)](https://travis-ci.org/Download/pkgcfg)
[![greenkeeper](https://img.shields.io/david/Download/pkgcfg.svg?maxAge=2592000)](https://greenkeeper.io/)
![mind BLOWN](https://img.shields.io/badge/mind-BLOWN-ff69b4.svg)

<sup><sub><sup><sub>.</sub></sup></sub></sup>

![logo](https://rawgit.com/Download/pkgcfg/0.3.5/logo.png)

<sup><sub><sup><sub>.</sub></sup></sub></sup>

## Install
```sh
npm install --save pkgcfg
```

## Usage
Add `pkgcfg` `tags` to your `package.json`:

_package.json:_
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "main": "src/my-project.js",
  "min": "dist/{pkg name}.min.js",
  "map": "dist/{pkg name}.min.js.map",
}
```

Then, read your `package.json` with `pkgcfg`:
```js
var pkg = require('pkgcfg')();
console.info(pkg.min); // 'dist/my-project.min.js'
console.info(pkg.map); // 'dist/my-project.min.js.map'
```

Use [pkg](#pkg-ref) from the [built-in tags](#built-in-tags), `npm install`
one or more of the [external tags](#external-tags), or [roll your own tags](#roll-your-own).

## What is it?
Inspired by an [article](http://blog.keithcirkel.co.uk/why-we-should-stop-using-grunt/) from Keith Cirkel
promoting the use of `npm` for build scripting and the use of `package.json` for configuration, I tried to
follow his advice. But I quickly learned the downside of JSON as a format, because it is completely static
and lacks even the simplest dynamic behavior, such as referencing other nodes in the tree,
environment variables, simple conditionals etc. `pkgcfg` is a pluggable system to allow simple dynamic
behavior to be specified in the JSON document, which is then executed by `pkgcfg` when it loads the JSON.

## How does it work?
In the example above, `{pkg name}` tells `pkgcfg` that this snippet should be *transformed* using
the tag function `pkg`, which is built-in and implements a simple reference mechanism based
on [object-path](https://npmjs.org/package/object-path).

The syntax should feel pretty natural to anyone that has worked with templating libraries before.
This is the basic form:

```
      {tag text-content}
      ^ ^       ^      ^
     /  |       |       \
  open tag  argument    close
```

An unbalanced close marker after the tag will close the tag. If your text contains close markers, you can
use quotes to prevent them from being interpreted:

```
      {tag 'text-content'}
           ^            ^
            \          /
  prevent interpretation of open/close symbols
```

If your text contains quotes, then you can escape these inside quoted text by replacing them with
2 consecutive quotes:

```
  {tag 'text with '' in content'}
                   ^
                   |
            escaped quote
```

will result in the string `text with ' in content` being passed to `tag`.

In all cases, any tags contained inside the text-content will also be processed. This will happen before
the result is passed to the tag function associated with `tag`. E.g:

```
{tag Hello, {user}!}
```

`{user}` will be transformed first and if it yields `Alice`, then `Hello, Alice!` will be passed on to `tag`.

Normally, the raw text inside the tag will be passed to the tag function as a string, but by adding a modifier,
you can let pkgcfg use `JSON.parse` to turn the text into an object or array:

```
{tag ['some', 'text', 'with '' in it']}
```

In this case, `pkgcfg` will replace all single quotes (except escaped ones) into double quotes:

```
["some", "text", "with ' in it"]
```

and then call `JSON.parse` on it to get you a real array.

The same thing can be done with objects:

```
{tag {'some': 'object', 'with':'a '' in it'}}
```

Finally, the list modifiers will let `pkgcfg` pass multiple arguments to the tag function:

```
{tag ('wow', 'multiple', 'arguments')}
```

`tag` will receive it's payload in three arguments instead of the usual one.

## Built-in tags
The tags listed below are part of `pkgcfg` itself and require no extra dependencies.

### {pkg <sup>ref</sup>}
Yields the value of the referenced JSON node.

#### ref
Required, String.
A valid [object-path](https://www.npmjs.com/package/object-path) expression to another node in the JSON.

#### examples
```json
{
  "name": "pkgcfg-example",
  "version": "1.0.0",
  "test": "Project {pkg name} {pkg version} is using pkgcfg!",
}
```
In this example, `name` and `version` are two very simple object-path expressions that will
yield `'pkgcfg-example'` and `'1.0.0'` respectively. But `object-path` allows much more
complex expressions. E.g.:

```json
{
  "nested": {
    "object": {
      "array": [
        "element-0",
        "element-1"
      ]
    }
  },
  "test": "{pkg nested.object.array.1}"
}
```
In this example, `{pkg nested.object.array.1}` will yield `'element-1'`. For more details see the [object-path documentation](https://github.com/mariocasciaro/object-path).

**NOTE:** Loops are not supported:
```json
{
  "start": "{pkg end}",
  "end": "{pkg start}"
}
```
This will create an infinite loop and likely crash your program. Don't do this!

## External tags
`pkgcfg` allows you to use tags coming from external packages.

By convention, the name of the external package needed to use the tag has the
form `pkg{tag}`, where `{tag}` is the name of the tag. For example, the `{env}`
tag is contained in the package `pkgenv`, the `{eval}` tag in package `pkgeval` etc.

### Using external tags
If you are using external tags, you need to:

1. `npm install` those packages. E.G.: `npm install --save pkgenv`
2. Make sure the tags from those packages are available for use
   * `require` the package before using `pkgcfg`, or
   * *register* the tags in `package.json` (**recommended**)

#### require an external tag
Just call `require` before you call `pkgcfg`:

```js
require('pkgenv'); // <-- make sure `{env}` tag is available
var pkg = require('pkgcfg')();
```

#### register the tags in `package.json` (**recommended**)
Add an entry `pkgcfg` to your `package.json` with a `tags` attribute, which
should be an array of tags coming from external packages:

```json
{
  "pkgcfg": {
    "tags": [
      "env"
    ]
  }
}
```
Then you don't need to manually require the external packages; `pkgcfg` will
apply the naming conventions and automatically require `pkgenv`:

```js
// require('pkgenv'); // not needed, will be required automatically
var pkg = require('pkgcfg')();
```

The upside of this is that if you are using `pkgcfg` in multiple places in your
project, the tag you added will be available in all those places, without you
having to add `require` calls in all those places. And of course it also gives
you a convenient way to signal that `pkgcfg` is used, and with which external tags.

### List of external tags

#### {env <sup>(name, [defaultValue])</sup>}
Reference environment variables.
* `npm install --save` [pkgenv](https://www.npmjs.com/package/pkgenv)

#### {eval <sup>expr</sup>}
Evaluate Javascript expressions.
* `npm install --save` [pkgeval](https://www.npmjs.com/package/pkgeval)

### Anything missing?
Do you know of an available `pkgcfg` tag that's not in this list?
Please let me know by reporting an issue (or better yet, a Pull Request) to
this project's [GitHub Issue Tracker](https://github.com/download/pkgcfg/issues),
and I will add it to this list.


## Roll your own
Writing your own tags is super easy! Let's write one that yields the value
of some environment variable.

### Write the tag function
First, define a function that will contain the logic for your tag:

```js
function pkgenv(pkg, node, name='NODE_ENV', defaultValue='') {

}
```

The function should accept at least 2 arguments, `pkg` and `node`, which will
be passed to it by `pkgcfg` and which will contain the JSON object tree and the
current node in that object tree.

If the tag needs to accept arguments, add these as extra arguments to the
function as well. In this case we add 2 extra arguments, `name` and `defaultValue`,
which can be used to pass the name of the environment variable to read and the
default value to use when the environment variable is undefined.

Now implement the business logic of your tag. In this case it's some code to
access `process.env` to read the environment. Here is the full function:

```js
function pkgenv(pkg, node, name='NODE_ENV', defaultValue='') {
	return process.env[name] || defaultValue;
}
```

### Register the tag
After we have created a tag function, we need to register it with `pkgcfg`:

```js
pkgcfg.registry.register('env', pkgenv);
```

Pkgcfg assumes that tags register themselves upon first `require` and
are never unregistered. However, in some scenario's (e.g. testing) it may be
desirable to call `unregister` to unregister the tag again:

```js
pkgcfg.registry.unregister('env', pkgenv);
```

Using the knowledge from above, let's write the full `pkgenv` module:

```js
var pkgcfg = require('pkgcfg');

function pkgenv(pkg, node, name='NODE_ENV', defaultValue='') {
	return process.env[name] || defaultValue;
}

pkgcfg.registry.register('env', pkgenv);
module.exports = pkgenv;
```

### (Optional) Publish your tag to NPM
Place your tag module in an NPM package, preferably called `pkg<tag>` and with
`pkgcfg` in it's list of keywords, so others can re-use your brilliant code.
Add some tests as well. Have a look at the [pkgenv](https://github.com/download/pkgenv)
package to see an example.

### (Optional) Let me know!
Add an issue in this project's [issue tracker](https://github.com/download/pkgcfg/issues)
to let me know of your package and I will add it to the list of external packages above.

## Copyright
Copyright 2016 by [Stijn de Witt](http://StijnDeWitt.com). Some rights reserved.

## License
[Creative Commons Attribution 4.0 (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/)
