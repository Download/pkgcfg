# pkgcfg <sup><sub>0.9.1</sub></sup>
## One configuration to rule them all

[![npm](https://img.shields.io/npm/v/pkgcfg.svg)](https://npmjs.com/package/pkgcfg)
[![license](https://img.shields.io/npm/l/pkgcfg.svg)](https://creativecommons.org/licenses/by/4.0/)
[![travis](https://img.shields.io/travis/Download/pkgcfg.svg)](https://travis-ci.org/Download/pkgcfg)
[![greenkeeper](https://img.shields.io/david/Download/pkgcfg.svg)](https://greenkeeper.io/)
![mind BLOWN](https://img.shields.io/badge/mind-BLOWN-ff69b4.svg)

<sup><sub><sup><sub>.</sub></sup></sub></sup>

![logo](https://rawgit.com/download/pkgcfg/0.3.5/logo.png)

<sup><sub><sup><sub>.</sub></sup></sub></sup>


## Install

```sh
npm install --save pkgcfg
```


## Usage

Add `pkgcfg` `tags` to your `package.json`:

*package.json:*
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "main": "src/my-project.js",
  "min": "dist/${name}.min.js",
  "map": "dist/${name}.min.js.map",
  "dependencies": {
    "pkgcfg": "^0.9.1"
  }
}
```

Then, read your *package.json* with `pkgcfg`:

```js
var pkg = require('pkgcfg')()  // <-- note the extra pair of braces
console.info(pkg.min)          // 'dist/my-project.min.js'
console.info(pkg.map)          // 'dist/my-project.min.js.map'
```

By default, `pkgcfg` will read in *package.json*, but you can read
any other JSON file by passing the path to the file as an argument:

```js
var myJSON = require('pkgcfg')('./path/to/my.json')
```

Use [$](#ref) from the [built-in tags](#built-in-tags), `npm install`
one or more of the [external tags](#external-tags), or
[roll your own tags](#roll-your-own). You can even
[use pkgcfg tags in NPM run scripts](#using-pkgcfg-tags-in-npm-run-scripts)!

> Remember that the standard NPM tooling does not understand `pkgcfg` tags, so you can't use them in the `name`, `version`, `dependencies` etc fields.


## What is it?

Inspired by an [article](http://blog.keithcirkel.co.uk/why-we-should-stop-using-grunt/) 
from Keith Cirkel promoting the use of `npm` for build scripting and the use of `package.json` 
for configuration, I tried to follow his advice. But I quickly learned the downside of JSON 
as a format, because it is completely static and lacks even the simplest dynamic behavior, 
such as referencing other nodes in the tree, environment variables, simple conditionals etc. 

`pkgcfg` is a pluggable system to allow simple dynamic behavior to be specified in a JSON 
document, which is then executed by `pkgcfg` when it loads the JSON.


## How does it work?

In the example above, `${name}` tells `pkgcfg` that this snippet should be *transformed* using
the tag function `$`, which is built-in and implements a simple reference mechanism based
on [object-path](https://npmjs.org/package/object-path).

The syntax should feel pretty natural to anyone that has worked with templating libraries before.
This is the basic form:

```
      tag{text-content}
       ^ ^     ^      ^
      /  |     |       \
   tag  open argument    close
```

An unbalanced close marker after the tag will close the tag. If your text contains close markers, 
you can use quotes to prevent them from being interpreted:

```
       tag{'text with } symbol'}
           ^                  ^
            \                /
  prevent interpretation of open/close symbols
```

If your text contains quotes, then you can escape these inside quoted text by replacing them 
with 2 consecutive quotes:

```
  tag{'text with '' in content'}
                  ^
                  |
             escaped quote
```

will result in the string `text with ' in content` being passed to `tag`.

In all cases, any tags contained inside the text-content will also be processed. 
This will happen before the result is passed to the tag function associated with `tag`. 

E.g:

```
tag{Hello, user{name}!}
```

`user{name}` will be transformed first and if it yields `Alice`, then `Hello, Alice!` 
will be passed on to `tag`.

Normally, the raw text inside the tag will be passed to the tag function as a string, 
but by adding a modifier, you can let pkgcfg use `JSON.parse` to turn the text into an 
object or array:

```
tag{['some', 'text', 'with '' in it']}
```

In this case, `pkgcfg` will replace all single quotes (except escaped ones) into double quotes:

```
["some", "text", "with ' in it"]
```

and then call `JSON.parse` on it to get you a real array.

The same thing can be done with objects:

```
tag{{'some': 'object', 'with':'a '' in it'}}
```

Finally, the list modifiers will let `pkgcfg` pass multiple arguments to the tag function:

```
tag{('wow', 'multiple', 'arguments')}
```

`tag` will receive it's payload in three arguments instead of the usual one.


## Built-in tags

The tags listed below are part of `pkgcfg` itself and require no extra dependencies.


### ${ref}
Yields the value of the referenced JSON node.

#### ref
Required, String.
A valid [object-path](https://www.npmjs.com/package/object-path) expression to another 
node in the JSON.

#### examples
```json
{
  "name": "pkgcfg-example",
  "version": "1.0.0",
  "test": "Project ${name} ${version} is using pkgcfg!",
}
```
In this example, `name` and `version` are two very simple object-path expressions that 
will yield `'pkgcfg-example'` and `'1.0.0'` respectively. But `object-path` allows much 
more complex expressions. E.g.:

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
  "test": "${nested.object.array.1}"
}
```
In this example, `${nested.object.array.1}` will yield `'element-1'`. For more details see the [object-path documentation](https://github.com/mariocasciaro/object-path).

**NOTE:** Loops are not supported:
```json
{
  "start": "${end}",
  "end": "${start}"
}
```
This will create an infinite loop and likely crash your program. Don't do this!


## Using external tags

`pkgcfg` allows you to use tags coming from external packages.

By convention, the name of the external package needed to use the tag has the
form `pkg<tag>`, where `<tag>` is the name of the tag. For example, the `env{}`
tag is contained in `pkgenv`, the `eval{}` tag in `pkgeval` etc.

To use tags from external packages:

### `npm install` those packages.
E.G.: `npm install --save pkgenv`

### Make sure the tags from those packages are available for use
Pkgcfg will only transform tags it knows about. There are three ways to let
it know about tags coming from external packages:

* have it *discover* tags based on the dependencies in *package.json*
* *register* the tags in *package.json*
* *register* the tags in the config being transformed
* `require` the package before using `pkgcfg`
<sup><sub><sup><sub>.</sub></sup></sub></sup>

#### have `pkgcfg` discover tags based on dependencies
`pkgcfg` will look at the keys `dependencies` and `devDependencies` in your
*package.json* and if they contain any packages whose name starts with `'pkg'`,
it will register the tag based on the rest of the name. E.g. for a dependency
named `'pkgenv'`, it will discover the tag `'env'`. No need to explicitly
`require` the package containing the tag before using `pkgcfg`:

```js
var pkg = require('pkgcfg')() // requires `pkgenv` automatically when needed
```

> Auto-discovery should work for all external tags listed on this page.

#### register the tags in *package.json*
For tags coming from packages that don't follow the naming convention, you
can explicitly register the tags you are using by adding an entry `pkgcfg`
to your *package.json* with a `"tags"` attribute, which should be an object with
the tag name as key and the name of the package this tag comes from as the value:

*package.json*
```json
{
  "pkgcfg": {
    "tags": {
      "env": "pkgenv"
    }
  }
}
```
`pkgcfg` will automatically `require('pkgenv')` when it encounters the `env{}` tag.
No need to explicitly require it yourself:

```js
var pkg = require('pkgcfg')() // requires `pkgenv` automatically when needed
```

#### register the tags in the config being transformed
You can also add a key named `pkgcfg` to the JSON being transformed. 
The format is exactly the same as for *package.json*:

*my-json.json*
```json
{
  "pkgcfg": {
    "tags": {
      "env": "pkgenv"
    }
  }
}
```

Any tags registered in *package.json* will also be available.

`pkgcfg` will automatically `require('pkgenv')` when it encounters the `env{}` tag.
No need to explicitly require it yourself:

```js
var pkg = require('pkgcfg')('my-json.json') // requires `pkgenv` automatically when needed
```

#### require an external tag
This method is most explicit. It will work everywhere, but requires you to know
beforehand which tags are used.

Just call `require` before you call `pkgcfg`:

```js
require('pkgenv') // <-- make sure `env{}` tag is available
var pkg = require('pkgcfg')()
```


## External tags

### [env](https://www.npmjs.com/package/pkgenv){(name, [defaultValue])}
Reference environment variables.
* `npm install --save` [pkgenv](https://www.npmjs.com/package/pkgenv)

### [eval](https://www.npmjs.com/package/pkgeval){expr}
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
function pkgenv(root, parents, node, name, defaultValue) {

}
```

The function should accept at least 3 arguments, which will be passed to it by `pkgcfg` 
when invoking the tag:

* `root`: The root node of the config being processed
* `parents`: An array containing all parents of the current node, closes parent last.
* `node`: The node currently being processed.

If the tag needs to accept arguments, add these as extra arguments to the
function as well. In this case we add 2 extra arguments, `name` and `defaultValue`,
which can be used to pass the name of the environment variable to read and the
default value to use when the environment variable is undefined.

Now implement the business logic of your tag. In this case it's some code to
access `process.env` to read the environment. Here is the full function:

```js
function pkgenv(root, parents, node, name, defaultValue) {
  if (!name) name = 'NODE_ENV'
  if (!defaultValue) defaultValue = ''
	return process.env[name] || defaultValue
}
```


### Register the tag
After we have created a tag function, we need to register it with `pkgcfg`:

```js
pkgcfg.registry.register('env', pkgenv)
```

Pkgcfg assumes that tags register themselves upon first `require` and
are never unregistered. However, in some scenario's (e.g. testing) it may be
desirable to call `unregister` to unregister the tag again:

```js
pkgcfg.registry.unregister('env', pkgenv)
```

Using the knowledge from above, let's write the full `pkgenv` module:

```js
var pkgcfg = require('pkgcfg')

function pkgenv(pkg, node, name, defaultValue) {
  if (!name) {name = 'NODE_ENV'}
  if (!defaultValue) {defaultValue = ''}
	return process.env[name] || defaultValue
}

pkgcfg.registry.register('env', pkgenv)
module.exports = pkgenv
```

### (Optional) Publish your tag to NPM
Place your tag module in an NPM package, preferably called `pkg<tag>` and with
`pkgcfg` in it's list of keywords, so others can re-use your brilliant code.
Add some tests as well. Have a look at the [pkgenv](https://github.com/download/pkgenv)
package to see an example.


### (Optional) Let me know!
Add an issue in this project's [issue tracker](https://github.com/download/pkgcfg/issues)
to let me know of your package and I will add it to the list of external packages above.

> I registered a whole bunch of names starting with `pkg` that I felt I wanted to
> implement one day. If you want to make a certain tag and I have that name registered,
> just drop me an issue and I'll transfer that name to you.

<sup><sub><sup><sub>.</sub></sup></sub></sup>

## Using pkgcfg tags in NPM run scripts

Even though normal NPM tooling does not understand `pkgcfg` tags, you can still
use them in the `scripts` section, via the `run` command that comes with `pkgcfg`.

### run [script]

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "main": "src/my-project.js",
  "scripts": {
    "echo": "run pkgcfg-echo",
    "pkgcfg-echo": "echo Hello, ${name} ${version}!"
  },
  "dependencies": {
    "pkgcfg": "^0.9.1"
  }
}
```
> Note how we avoided using any `pkgcfg` tags in the `echo` script. It just uses `run` to call the `pkgcfg-echo` script.

Now, you can call echo the old-fashioned way:

```sh
$ npm run echo

> my-project@1.0.0 echo c:\ws\my-project
> run pkgcfg-echo

Hello, my-project 1.0.0!
```

I recommend you have a look at the [NPM scripts docs](https://docs.npmjs.com/misc/scripts) to
learn how NPM treats the `scripts` section in your `package.json` before you dive in and
start hacking. Avoid adding `pkgcfg` tags to the following standard NPM scripts, because they
are expected to work using `npm [script]`, which they won't if you use tags there:

* `publish`, `prepublish`, `postpublish`
* `install`, `preinstall`, `postinstall`
* `uninstall`, `preuninstall`, `postuninstall`
* `version`, `preversion`, `postversion`
* `test`, `pretest`, `posttest`
* `start`, `prestart`, `poststart`
* `stop`, `prestop`, `poststop`
* `restart`, `prerestart`, `postrestart`

You can still make use of `pkgcfg` for these scripts, just use `run` to run a different
script and in that other script, use `pkgcfg` tags:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "start": "run smart-start",
    "smart-start": "echo Yippee! We can use pkgcfg tags in ${name}!"
  },
  "dependencies": {
    "pkgcfg": "^0.9.1"
  }
}
```

## Example project

If you want a simple example project demonstrating how `pkgcfg` works, check out [pkgcfg-example](https://github.com/download/pkgcfg-example).


## Contributing
To hack on this code, fork this repo to your own account and clone the fork to your local machine.

### Install
Go to the root folder of the cloned project and run `npm install` to install the dependencies:

```sh
$ npm install
added 39 packages from 306 contributors in 4.156s
```

### Run tests
Then, run the Mocha tests:

```sh
$ npm test

> pkgcfg@0.9.1 test C:\ws\pkgcfg
> mocha pkgcfg.spec.js


  pkgcfg
    √ is a function
    √ returns an object representation of package.json
$test{} => calls $test(root, parents, node)
    √ calls transform functions associated to tags that it encounters during parsing
    ...

  39 passing (95ms)
```

The tests should all pass. To re-run the tests whenever you make a change, use 

```sh
$ npm run dev
```

This will run Mocha with the `--watch` flag.

### Write code and create a PR
You can now work on the code. Don't forget to create a branch for your new feature. Add some tests and make sure they pass. Then, commit and push your changes and create a PR. 

## Logging
This project supports logging with [ulog](https://github.com/download/ulog). To enable debug 
logging for this package, set the `DEBUG` environment variable to include `pkgcfg`: 

*Windows*
```sh
C:\>set DEBUG=pkgcfg
```

*Unix/Mac*
```sh
$ DEBUG=pkgcfg
```

Now, `pkgcfg` will log debug information as it runs. For example here is some output produced
when running the tests with this environment variable set:

```sh
tag: ${[object Object],[object Object],[object Object],${name},name} =>  pkgcfg
tag: ${[object Object],[object Object],[object Object],${repository.type},repository.type} =>  git
tag: ${[object Object],[object Object],[object Object],${repository},repository} =>  { type: 'git', url: 'https://github.com/download/pkgcfg.git' }
tag: ${[object Object],[object Object],[object Object],${test.data},test.data} =>  { array: [ 'one config to rule them all', 'with', 'pkgcfg' ],
  'with-dash': 'ok',
  'with:colon': 'ok',
  'with.dot': 'ok',
  'with\'quote': 'ok' }
tag: ${[object Object],[object Object],[object Object],${keywords},keywords} =>  [ 'package.json', 'configuration', 'pkgcfg', 'pkgenv', 'pkgeval' ]
tag: ${[object Object],[object Object],[object Object],${test.data.array},test.data.array} =>  [ 'one config to rule them all', 'with', 'pkgcfg' ]
Error applying tag ${[object Object],[object Object],[object Object],${unresolved.transforms.return.unmodified.text},unresolved.transforms.return.unmodified.text}:  { Error
    at Object.$ (C:\ws\pkgcfg\pkgcfg.js:47:35)
    at transform (C:\ws\pkgcfg\pkgcfg.js:225:42)
    ...
    at bootstrap_node.js:502:3
  message: '${unresolved.transforms.return.unmodified.text} cannot be resolved.',
  name: 'QuietError' }
tag: ${[object Object],[object Object],[object Object],${test.data.array.length},test.data.array.length} =>  3
tag: ${[object Object],[object Object],[object Object],${test.data.array.2},test.data.array.2} =>  pkgcfg
tag: ${[object Object],[object Object],[object Object],${test.data.with-dash},test.data.with-dash} =>  ok
tag: ${[object Object],[object Object],[object Object],${test.data.with:colon},test.data.with:colon} =>  ok
convertQuotes(['test','data','with.dot']) ==>  ["test","data","with.dot"]
...
```


## Issues

Add an issue in this project's [issue tracker](https://github.com/download/pkgcfg/issues)
to let me know of any problems you find, or questions you may have.


## Copyright

Copyright 2018 by [Stijn de Witt](http://StijnDeWitt.com). Some rights reserved.


## License

[Creative Commons Attribution 4.0 (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/)
