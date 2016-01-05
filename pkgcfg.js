var fs = require('fs');
var log = require('picolog');
var objectPath = require("object-path");

var global = typeof window == 'object' ? window : (typeof global == 'object' ? global : this);

function pkgcfg(pkg) {
	if (! pkg) {pkg = '../../package.json';}
	if (typeof pkg == 'string') {pkg = JSON.parse(fs.readFileSync(pkg));}
	var root = pkg;
	processed = process(pkg, root);
	return processed;
}

var registeredTransforms = {};
pkgcfg.registry = {
	register: register,
	unregister: unregister,
	getTransform: getTransform,
	getTransformTags: getTransformTags
};

pkgcfg.registry.register('pkg', function(pkg, node, arg) {
	var result;
	if (arg) {
		result = objectPath.get(pkg, arg);
	}
	if (result === undefined) {return '{pkg' + arg + '}';}
	return result;
});

module.exports = pkgcfg;

function register(tag, func) {
	log.assert(tag, 'Parameter `tag` is required when registering a package transform: ', tag);
	log.assert(typeof tag == 'string', 'Parameter `tag` must be a string: ', tag);
	log.assert(!registeredTransforms[tag], 'A package transform with that tag is already registered: ', registeredTransforms[tag]);
	log.assert(['toString', 'valueOf', 'toJSON'].indexOf(tag) === -1, '`%s` is a reserved word and may not be used as a tag for a package transform.', tag);
	var usedReservedChars = ['{','}','[',']','(',')'].filter(
		function(x){
			return tag.indexOf(x) !== -1;
		}
	);
	log.assert(usedReservedChars.length === 0, 'Parameter `tag` contains reserved character(s): ', usedReservedChars);
	log.assert(func, 'Parameter `func` is required when registering a package transform: ', func);
	log.assert(typeof func == 'function', 'Parameter `func` must be a function when registering a package transform: ', func);
	registeredTransforms[tag] = func;
}

function unregister(tag, func) {
	log.assert(registeredTransforms[tag] && registeredTransforms[tag] === func, 'Unable to unregister the package transform. The supplied function is not currently registered with the supplied tag %s.', tag);
	log.assert(['toString', 'valueOf', 'toJSON'].indexOf(tag) === -1, '`%s` is a reserved word and may not be used as a tag for a package transform.', tag);
	delete registeredTransforms[tag];
}

function getTransform(tag) {
	return registeredTransforms[tag];
}

function getTransformTags() {
	return Object.keys(registeredTransforms);
}

function process(pkg, node) {
	// array
	if (node instanceof Array) {return processArray(pkg, node);}
	// non-null object
	if (node && (typeof node == 'object')) {return processObject(pkg, node);}
	// primitives, null, undefined
	if (typeof node !== 'string') {return node;} // primitive, no need to clone
	// strings (that might contain transform tags)
	return processString(pkg, node);
}

function processArray(pkg, node) {
	var result = [];
	for (var i=0; i<node.length; i++) {
		result.push(process(pkg, node[i]));
	}
	return result;
}

function processObject(pkg, node) {
	var result = {};
	var keys = Object.keys(node);
	for (var i=0; i<keys.length; i++) {
		result[keys[i]] = process(pkg, node[keys[i]]);
	}
	return result;
}

function processString(pkg, node) {
	var next, input = node, result = [], complex=false;
	while ((next = nextTag(input)) !== null) {
		var before = input.substring(0, next.idx);
		if (before) {result.push(before);}
		var remaining = input.substring(next.idx + next.tag.length + 1);
		var body = tagBody(remaining);
		if (body) {
			var payload = body.process ? processString(pkg, body.arg) : body.arg;
			var transformed = transform(pkg, node, next.tag, payload);
			var isStr = typeof transformed == 'string';
			if (!isStr) {complex = true;}
			if (!isStr || transformed.indexOf('{' + next.tag) !== 0) { // prevent recursion
				// 2nd pass
				transformed = process(pkg, transformed);
			}
			result.push(transformed);
			input = remaining.substring(body.end + 1);
		}
		else { // invalid, return original text
			result.push('{' + next.tag + remaining);
		}
	}
	if (input) {result.push(input);}
	return complex ? (result.length === 1 ? result[0] : result) : result.join('');
}

function nextTag(tokenstream) {
	var tags = Object.keys(registeredTransforms);
	var NOTFOUND = 999999999;
	var next = {tag:null, idx:NOTFOUND};
	for (var i=0; i<tags.length; i++) {
		var idx = tokenstream.indexOf('{' + tags[i]);
		if ((idx !== -1) && (idx < next.idx)) {
			next.idx = idx;
			next.tag = tags[i];
		}
	}
	return next.tag ? next : null;
}

function tagBody(tokenstream) {
	// loop through the string, parsing it as we go through it
	// return the fully resolved tagBody, or null if we encounter illegal state
	var result = {process:null, arg:null, end:-1};
	var inString=false;
	var esc = false;
	var open=0;
	var whitespace = /\s/;
	for (var i=0; i<tokenstream.length; i++) {
		var token = tokenstream[i];
		if (result.process === null) {
			if (token.match(whitespace)) {continue;}
			if (token === '}') {result.end = i; return result;} // 0
			result.process = inString = token === '\'';
			result.arg = inString ? '' : token;
			continue;
		}
		if (inString) {
			if (token === '\'') {
				inString = !inString;
				esc = true;
				continue;
			}
		}
		if (token === '}') {result.end = i; return result;} // 1 or 2
		result.arg += token;
		if (esc && (token === '\'')) {inString = true; continue;}
	}
	return null;
}

function transform(pkg, node, tag, arg) {
	try {
		var result = registeredTransforms[tag](pkg, node, arg);
		log.log('Package transform: %s(%s) => ', tag, arg, result);
		return registeredTransforms[tag](pkg, node, arg);
	}
	catch(error) {
		log.error('Error applying package transform `%s`: ', tag, error);
		return node;
	}
}

