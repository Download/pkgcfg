# pkgcfg <sup><sub>0.3.0</sub></sup>
**One configuration to rule them all**

## install
```sh
npm install --save-dev pkgcfg
```

## What is it?
Inspired by an [article](http://blog.keithcirkel.co.uk/why-we-should-stop-using-grunt/) from Keith Cirkel
promoting the use of `npm` for build scripting and the use of `package.json` for configuration, I tried to
follow his advice. But I quickly learned the downside of JSON as a format, because it can make for some
very redundant configuration. Consider an example where you have a standard project layout as follows:

You keep sources in the `src` folder, tests in the `test` folder, build files to `dist`, name your main
source file after your project, name test files after the source files they test by adding `.spec.js` to their
name and you name your minified distribution and map files after your project, appending `.min.js` and `.min.js.map`
to them, respectively.

Your template JSON wouldn't be very reusable at all:
```js
{
  "name": "my-project",
  "version": 1.0.0,
  "main": "src/my-project.js",
  "main-test": "test/my-project.spec.js",
  "build-min": "dist/my-project.min.js",
  "build-map": "dist/my-project.min.js.map",
  ...
}
```

There is lots and lots of redundancy here. If we copy this template when we create a new project, we
basically need to replace almost all of it. Enter tools like Yeoman.

But what if we could make a reference from one node in the JSON to another? That would
already be a huge help. Just compare the previous sample with this:

```js
{
  "name": "my-project",
  "version": 1.0.0,
  "main": "src/{pkg name}.js",
  "main-test": "test/{pkg name}.spec.js",
  "build-min": "dist/{pkg name}.min.js",
  "build-map": "dist/{pkg name}.min.js.map",
  ...
}
```

What a difference! We only need to change the `name` attribute and all other nodes in the JSON
that are referencing it will automatically be filled in. If we use `pkgcfg` to parse the JSON
that is.

## How does it work?
In the example above, `{pkg name}` tells `pkgcfg` that this snippet should be *transformed* using
the package transform `pkg`, which is built-in and implements a simple reference mechanism based
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
```

will result in the string `text with ' in content` being passed to `tag`.

In all cases, any tags contained inside the text-content will also be processed. This will happen before
the result is passed to the transform associated with `tag`. E.g:

```
{tag Hello, {user}!}
```

`{user}` will be transformed first and if it yields `Alice`, then `Hello, Alice!` will be passed on to `tag`.

Normally, the raw text inside the tag will be passed to the transform as a string, but by adding a modifier,
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

Finally, the list modifiers will let `pkgcfg` pass multiple arguments to the transform:

```
{tag ('wow', 'multiple', 'arguments')}
```

`tag` will receive it's payload in three arguments instead of the usual one.

## Roll your own
The cool thing is that `pkgcfg` actually offers a minimalistic framework to add custom transforms.
And writing your own transforms is super easy!

Let's write one that yields the value of some environment variable.

TODO

## Copyright
Copyright 2016 by [Stijn de Witt](http://StijnDeWitt.com). Some rights reserved.

## License
[Creative Commons Attribution 4.0 (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/)