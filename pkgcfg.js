var fs = require('fs');
var objectPath = require('object-path');
var appRoot = require('app-root-path');
var log; try {require.resolve('picolog'); log=require('picolog');} catch(e){}

var global = typeof window == 'object' ? window : (typeof global == 'object' ? global : this);

function pkgcfg(pkg) {
	if (! pkg) {pkg = appRoot + '/package.json';}
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


function pkg(pkg, node, path) {
	var result = objectPath.get(pkg, path);
	if (result === undefined) {throw new pkgcfg.QuietError('{pkg ' + path + '} cannot be resolved.');}
	return result;
}

pkgcfg.registry.register('pkg', pkg);

pkgcfg.QuietError = function(msg) {
	this.constructor.call(this, msg);
}
pkgcfg.QuietError.prototype.constructor = Error;

module.exports = pkgcfg;


// IMPLEMENTATION //

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
				inString = false;
				esc = true;
				continue;
			}
		}
		if (token === '}') {result.end = i; return result;} // 1 or 2
		result.arg += token;
		if (esc && (token === '\'')) {inString = true;}
		esc = false;
	}
	return null;
}

function transform(pkg, node, tag, arg) {
	try {
		if (typeof arg == 'string') {
			var a = arg.trim();
			if (((a[0] === '[') && a[a.length -1] === ']') ||
				((a[0] === '{') && a[a.length -1] === '}')) {
				try {arg = JSON.parse(convertQuotes(a));} catch(e){}
			}
		}
		var result = registeredTransforms[tag](pkg, node, arg);
		log && log.log('Package transform: %s(%s) => ', tag, arg, result);
		return registeredTransforms[tag](pkg, node, arg);
	}
	catch(error) {
		var err = error instanceof pkgcfg.QuietError
			? log && log.debug || function(){}
			: log && log.error || (typeof console == 'object') && console.error || function(){};
		err('Error applying package transform `%s`: ', tag, error);
		return node;
	}
}

function register(tag, func) {
	log && log.assert(tag, 'Parameter `tag` is required when registering a package transform: ', tag);
	log && log.assert(typeof tag == 'string', 'Parameter `tag` must be a string: ', tag);
	log && log.assert(!registeredTransforms[tag], 'A package transform with that tag is already registered: ', registeredTransforms[tag]);
	log && log.assert(['toString', 'valueOf', 'toJSON'].indexOf(tag) === -1, '`%s` is a reserved word and may not be used as a tag for a package transform.', tag);
	var usedReservedChars = ['{','}','[',']','(',')'].filter(
		function(x){
			return tag.indexOf(x) !== -1;
		}
	);
	log && log.assert(usedReservedChars.length === 0, 'Parameter `tag` contains reserved character(s): ', usedReservedChars);
	log && log.assert(func, 'Parameter `func` is required when registering a package transform: ', func);
	log && log.assert(typeof func == 'function', 'Parameter `func` must be a function when registering a package transform: ', func);
	registeredTransforms[tag] = func;
}

function unregister(tag, func) {
	log && log.assert(registeredTransforms[tag] && registeredTransforms[tag] === func, 'Unable to unregister the package transform. The supplied function is not currently registered with the supplied tag %s.', tag);
	log && log.assert(['toString', 'valueOf', 'toJSON'].indexOf(tag) === -1, '`%s` is a reserved word and may not be used as a tag for a package transform.', tag);
	delete registeredTransforms[tag];
}

function getTransform(tag) {
	return registeredTransforms[tag];
}

function getTransformTags() {
	return Object.keys(registeredTransforms);
}

function convertQuotes(payload) {
	if (!payload || typeof payload != 'string') {return payload};
	var result = '';
	var inString = false;
	var esc = false;
	for (var i=0; i<payload.length; i++) {
		var token = payload[i];
		if (inString) {
			if (token === '\'') {
				if (esc) {
					// 2 consecutive quotes inside a string are escaped to a single quote
					result += '\'';
					esc = false;
				}
				else {
					// encountered a quote... might be first of multiple, flag but do nothing yet
					esc = true;
				}
			}
			else {
				if (esc) {
					// the previous quote stands on it's own, so it's a string terminator
					result += '"';
					inString = false;
				}
				esc = false;
				result += token;
			}
		}
		else {
			if (token === '\'') {
				result += '"';
				inString = true;
			}
			else {
				result += token;
			}
		}
	}
	if (esc) {
		result += '"';
	}
	log && log.debug('convertQuotes(' + payload + ') ==> ', result);
	return result;
}
