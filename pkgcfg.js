var
fs = require('fs'),
pkg = JSON.parse(fs.readFileSync('package.json')),
objectPath = require('object-path'),
path = require('path');

function pkgcfg(path) {
	var root = path ? objectPath.get(pkg, path) : pkg;
	resolved = resolve(root);
	return resolved;
}

function resolve(root, node, resolveTree) {
	return root;
}

module.exports = pkgcfg;