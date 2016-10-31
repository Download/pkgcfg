var log; try {log=require('ulog')('pkgcfg')} catch(e){log = console}
var fs = require('fs')
var path = require('path')
var objectPath = require("object-path")
var root = typeof window == 'object' ? window : (typeof global == 'object' ? global : this)
var rootCfg; try{rootCfg = require('../../package.json')}catch(e){} try{rootCfg = rootCfg || (typeof process != 'undefined' && JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'))))}catch(e){}

function pkgcfg(pkg, cfg) {
	cfg = cfg || rootCfg || {}
	pkg = (typeof pkg == 'string' && JSON.parse(fs.readFileSync(pkg))) || pkg || cfg
	var tags = Object.keys(registeredTransforms)
	addTags(tags, availableTags(cfg))
	addTags(tags, pkg !== cfg && availableTags(pkg) || [])
	return processTags(pkg, pkg, tags)
}

pkgcfg.QuietError = function(msg) {
  var obj = {}
  this.message = msg
  this.name = 'QuietError'
  Error.captureStackTrace(obj, pkgcfg.QuietError)
  Object.defineProperty(this, 'stack', {get: function(){return obj.stack}})
}
pkgcfg.QuietError.prototype = Object.create(Error.prototype)
pkgcfg.QuietError.prototype.constructor = pkgcfg.QuietError

function pkg(pkg, node, path) {
	var result = objectPath.get(pkg, path)
	if (result === undefined) {throw new pkgcfg.QuietError('{pkg ' + path + '} cannot be resolved.')}
	return result
}

pkgcfg.registry = {
	register: register,
	unregister: unregister,
	getTransform: getTransform,
	getTransformTags: getTransformTags
}

var registeredTransforms = {}
pkgcfg.registry.register('pkg', pkg)
module.exports = pkgcfg

// IMPLEMENTATION //

function processTags(pkg, node, tags) {
	// array
	if (node instanceof Array) {return processArray(pkg, node, tags)}
	// non-null object
	if (node && (typeof node == 'object')) {return processObject(pkg, node, tags)}
	// primitives, null, undefined
	if (typeof node !== 'string') {return node} // primitive, no need to clone
	// strings (that might contain transform tags)
	return processString(pkg, node, tags)
}

function processArray(pkg, node, tags) {
	var result = []
	for (var i=0; i<node.length; i++) {
		result.push(processTags(pkg, node[i], tags))
	}
	return result
}

function processObject(pkg, node, tags) {
	var result = {}
	var keys = Object.keys(node)
	for (var i=0; i<keys.length; i++) {
		result[keys[i]] = processTags(pkg, node[keys[i]], tags)
	}
	return result
}

function processString(pkg, node, tags) {
	var next, input = node, result = [], complex=false;
	while ((next = nextTag(pkg, input, tags)) !== null) {
		var before = input.substring(0, next.idx)
		if (before) {result.push(before)}
		var remaining = input.substring(next.idx + next.tag.length + 1)
		var body = tagBody(remaining)
		if (body) {
			var payload = body.arg ? processString(pkg, body.arg, tags) : body.arg;
			var transformed = transform(pkg, node, next.tag, payload)
			var isStr = typeof transformed == 'string'
			if (!isStr) {complex = true}
			if (!isStr || transformed !== node) {transformed = processTags(pkg, transformed, tags)}
			result.push(transformed)
			input = remaining.substring(body.end + 1)
		}
		else { // invalid, return original text
			result.push('{' + next.tag + remaining)
		}
	}
	if (input) {result.push(input)}
	return complex ? (result.length === 1 ? result[0] : result) : result.join('')
}

function nextTag(pkg, tokenstream, tags) {
	var NOTFOUND = 999999999
	var next = {tag:null, idx:NOTFOUND}
	for (var i=0,tag; tag=tags[i]; i++) {
		var exp = new RegExp('{' + tag + '[\\s\\.\\}\\[\\{\\(]')
		var idx = tokenstream.search(exp)
		if ((idx !== -1) && (idx < next.idx) && (tokenstream[idx+tag.length+1])) {
			next.idx = idx
			next.tag = tag
		}
	}
	return next.tag ? next : null
}

function availableTags(cfg) {
	var tags = []
	addTags(tags, cfg.pkgcfg && cfg.pkgcfg.tags && Object.keys(cfg.pkgcfg.tags) || [])
	addTags(tags, cfg.devDependencies && extractTags(cfg.devDependencies) || [])
	addTags(tags, cfg.dependencies && extractTags(cfg.dependencies) || [])
	return tags
}

function extractTags(deps) {
	return Object.keys(deps)
			.filter(function(x){return x !== 'pkgcfg' && (x.indexOf('pkg') === 0) && x.length > 3})
			.map(function(x){return x.substring(3)})
}

function addTags(tags, add) {
	for (var i=0,tag; tag=add[i]; i++) {
		if (tags.indexOf(tag) === -1) {
			tags.push(tag)
		}
	}
}

function loadTag(pkg, tag) {
	var name = (pkg.pkgcfg && pkg.pkgcfg.tags && pkg.pkgcfg.tags[tag]) || (rootCfg && rootCfg.pkgcfg && rootCfg.pkgcfg.tags && rootCfg.pkgcfg.tags[tag]) || ('pkg' + tag)
	try {
		require(name)
		if (! registeredTransforms[tag]) {
			throw new Error('Succesfully loaded package ' + name + ', but it did not register a tag function for tag `{' + tag + '}`.')
		}
	}
	catch(e){
		throw new Error('Unable to load pkgcfg tag function for tag `{' + tag + '}`: ' + e.message + '\nTry: npm install ' + name)
	}
}

function tagBody(tokenstream) {
	// loop through the string, parsing it as we go through it
	// return the fully resolved tagBody
	var result = {arg:null, end:-1}
	var inString=false
	var esc = false
	var open=0
	var whitespace = /\s/
	for (var i=0; i<tokenstream.length; i++) {
		var token = tokenstream[i]
		if (!inString) {
			if (token === '{') {
				open++
			}
			if (token === '}') {
				if (!open) {
					result.end = i
					if (result.arg && result.arg[0] === '\'' && result.arg[result.arg.length-1] === '\'') {
						result.arg = result.arg.substring(1, result.arg.length-1)
					}
					return result
				}
				open--
			}
			if (token === '\'') {
				inString = true
				if (esc) {continue}
			}
			if (result.arg===null && token.search(whitespace)===0) {continue}
		}
		else { // inString
			if (token === '\'') {
				inString = false
				esc = true
			}
		}
		if (result.arg === null) {
			result.arg = ''
		}
		result.arg += token
		esc = false
	}
	return null
}

function transform(pkg, node, tag, arg) {
	try {
		var args = [pkg, node]
		if (! registeredTransforms[tag]) {loadTag(pkg, tag)}
		if (arg !== null) {
			if (typeof arg == 'string') {
				var a = arg.trim()
				if (((a[0] === '[') && a[a.length -1] === ']') ||
					((a[0] === '{') && a[a.length -1] === '}')) {
					try {arg = JSON.parse(convertQuotes(a))} catch(e){}
					args.push(arg)
				}
				else if ((a[0] === '(') && a[a.length -1] === ')') {
					a = '[' + a.substring(1, a.length -1) + ']'
					try {arg = JSON.parse(convertQuotes(a))} catch(e){}
					Array.prototype.push.apply(args, arg)
				}
				else {
					args.push(arg)
				}
			}
			else {
				args.push(arg)
			}
		}
		var result = registeredTransforms[tag].apply(root, args)
		log.log('tag: %s(%s) => ', tag, args, result)
		return result
	}
	catch(error) {
		var err = error instanceof pkgcfg.QuietError 
			? log.log
			: log.error
		err('Error applying tag {%s (%s)}: ', tag, args, error)
		return node
	}
}

function register(tag, func) {
	log.assert(tag, 'Parameter `tag` is required: ', tag)
	log.assert(typeof tag == 'string', 'Parameter `tag` must be a string: ', tag)
	log.assert(!registeredTransforms[tag], 'Tag ' + tag + ' is already registered: ', registeredTransforms[tag])
	log.assert(['toString', 'valueOf', 'toJSON'].indexOf(tag) === -1, '`%s` is a reserved word and may not be used as a tag.', tag)
	var usedReservedChars = ['{','}','[',']','(',')'].filter(function(x){return tag.indexOf(x) !== -1})
	log.assert(usedReservedChars.length === 0, 'Parameter `tag` contains reserved character(s): ', usedReservedChars)
	log.assert(func, 'Parameter `func` is required: ', func)
	log.assert(typeof func == 'function', 'Parameter `func` must be a function: ', func)
	registeredTransforms[tag] = func
}

function unregister(tag, func) {
	log.assert(registeredTransforms[tag] && registeredTransforms[tag] === func, 'Unable to unregister the tag. The supplied function is not currently registered with the supplied tag %s.', tag)
	log.assert(['toString', 'valueOf', 'toJSON'].indexOf(tag) === -1, '`%s` is a reserved word and may not be used as a tag.', tag)
	delete registeredTransforms[tag]
}

function getTransform(tag) {
	return registeredTransforms[tag]
}

function getTransformTags() {
	return Object.keys(registeredTransforms)
}

function convertQuotes(payload) {
	if (!payload || typeof payload != 'string') {return payload}
	var result = ''
	var inString = false
	var esc = false
	for (var i=0; i<payload.length; i++) {
		var token = payload[i]
		if (inString) {
			if (token === '\'') {
				if (esc) {
					// 2 consecutive quotes inside a string are escaped to a single quote
					result += '\''
					esc = false
				}
				else {
					// encountered a quote... might be first of multiple, flag but do nothing yet
					esc = true
				}
			}
			else {
				if (esc) {
					// the previous quote stands on it's own, so it's a string terminator
					result += '"'
					inString = false
				}
				esc = false
				result += token
			}
		}
		else { // ! inString
			if (token === '\'') {
				result += '"'
				inString = true
			}
			else {
				result += token
			}
		}
	}
	if (esc) {
		result += '"'
	}
	log.log('convertQuotes(' + payload + ') ==> ', result)
	return result
}
