var log = require('picolog');
var pkgcfg = require('./pkgcfg');
var expect = require('chai').expect;

describe('pkgcfg', function(){
	it('is a function', function(){
		expect(pkgcfg).to.be.a('function');
	});
	it('has a property `registry`', function(){
		expect(pkgcfg).to.have.a.property('registry');
	});

	describe('registry', function(){
		it('is an object', function(){
			expect(pkgcfg.registry).to.be.an('object');
		});
		it('has properties `register`, `unregister`, `getTransform` and `getTransformTags`', function(){
			expect(pkgcfg.registry).to.have.a.property('register');
			expect(pkgcfg.registry).to.have.a.property('unregister');
			expect(pkgcfg.registry).to.have.a.property('getTransform');
			expect(pkgcfg.registry).to.have.a.property('getTransformTags');
		});

		describe('register', function(){
			it('is a function', function(){
				expect(pkgcfg.registry.register).to.be.a('function');
			});
			it('can be used to register a new transform', function(){
				expect(pkgcfg.registry.getTransformTags().length).to.equal(1);

				pkgcfg.registry.register('hello', function(pkg, node, text) {
					log.log('executing hello transform');
					return 'Hello' + (text ? ', ' + text : '') + '!'
				});

				expect(pkgcfg.registry.getTransformTags().length).to.equal(2);
				expect(pkgcfg.registry.getTransformTags().indexOf('hello')).not.to.equal(-1);

				var pkg = pkgcfg('package.json');
				expect(pkg.test.register).to.equal('Hello!');

			});
		});

		describe('register', function(){
			it('is a function', function(){
				expect(pkgcfg.registry.register).to.be.a('function');
			});
		});

		it('contains a built-in transform `pkg`', function(){
			expect(pkgcfg.registry.getTransformTags().indexOf('pkg')).not.to.equal(-1);
		});


	});

	describe('when called', function(){
		var pkg = pkgcfg('package.json');
		it('returns an object representation of package.json when given a valid path', function(){
			expect(pkg).to.have.a.property('name');
			expect(pkg.name).to.equal('pkgcfg');
			expect(pkg).to.have.a.property('version');
			expect(pkg).to.have.a.property('description');
		});
		it('resolves `pkg` references to primitive values', function(){
			log.info('{pkg name} => \'pkgcfg\'');
			expect(pkg.test.primitive).to.equal(pkg.name);
		});
		it('resolves `pkg` references to primitive values on paths with multiple entries', function(){
			log.info('{pkg repository.type} => \'git\'');
			expect(pkg.test.primitive).to.equal(pkg.name);
		});
		it('resolves `pkg` references to objects', function(){
			log.info('{pkg repository} => {type:\'git\', ..}');
			expect(pkg.test.object).to.be.an('object');
			expect(pkg.test.object).to.have.a.property('type');
			expect(pkg.test.object.type).to.equal('git');
		});
		it('resolves `pkg` references to objects on paths with multiple entries', function(){
			log.info('{pkg test.data} => {array:[\'one config to ..\', ..], ..}');
			expect(pkg.test['nested-object']).to.be.an('object');
			expect(pkg.test['nested-object']).to.have.a.property('array');
			expect(pkg.test['nested-object'].array).to.be.an('array');
			expect(pkg.test['nested-object'].array[2]).to.equal('pkgcfg');
		});
		it('resolves `pkg` references to arrays', function(){
			log.info('{pkg keywords} => [\'package.json\', ...]');
			expect(pkg.test.array).to.be.an('array');
			expect(pkg.test.array).to.have.a.property('0');
			expect(pkg.test.array[0]).to.equal('package.json');
		});
		it('resolves `pkg` references to arrays on paths with multiple entries', function(){
			log.info('{pkg test.data.array} => [\'one config to ..\', ...]');
			expect(pkg.test['nested-array']).to.be.an('array');
			expect(pkg.test['nested-array']).to.have.a.property('2');
			expect(pkg.test['nested-array'][2]).to.equal('pkgcfg');
		});
	});
});