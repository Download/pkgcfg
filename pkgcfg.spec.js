var pkgcfg = require('../pkgcfg');
var expect = require('chai').expect;

describe('pkgcfg', function(){
	it('is a function', function(){
		expect(pkgcfg).to.be.a('function');
	});
	it('returns an object', function(){
		expect(pkgcfg()).to.be.an('object');
	});
	it('accepts a string or array of strings as parameter', function(){
		expect(pkgcfg('keywords')).to.be.an('array');
		expect(pkgcfg(['keywords'])).to.be.an('array');
	});
	it('returns an object representation of package.json when given no arguments', function(){
		var pkg = pkgcfg();
		expect(pkg).to.have.a.property('name');
		expect(pkg.name).to.equal('pkgcfg');
		expect(pkg).to.have.a.property('version');
		expect(pkg).to.have.a.property('description');
	});
	it('returns a subtree from package.json when given an argument', function(){
		var keywords = pkgcfg('keywords');
		expect(keywords).to.be.an('array');
	});
});