﻿var log = require('picolog');
var chalk = require('chalk');
var expect = require('chai').expect;

var pkgcfg = require('./pkgcfg');

describe('pkgcfg', function(){

	it('is a function', function(){
		expect(pkgcfg).to.be.a('function');
	});

	it('returns an object representation of package.json when given a valid path', function(){
		var pkg = pkgcfg('package.json');
		expect(pkg).to.have.a.property('name');
		expect(pkg.name).to.equal('pkgcfg');
		expect(pkg).to.have.a.property('version');
		expect(pkg).to.have.a.property('description');
	});

	it('maintains a registry of package transforms', function(){
		expect(pkgcfg).to.have.a.property('registry');
	});

	describe('registry', function(){
		function hello(pkg, node, text) {
			log.log('executing hello transform');
			return 'Hello' + (text ? ', ' + text : '') + '!'
		}

		it('is an object', function(){
			expect(pkgcfg.registry).to.be.an('object');
		});

		it('has methods `register`, `unregister`, `getTransform` and `getTransformTags`', function(){
			expect(pkgcfg.registry).to.have.a.property('register');
			expect(pkgcfg.registry.register).to.be.a('function');
			expect(pkgcfg.registry).to.have.a.property('unregister');
			expect(pkgcfg.registry.unregister).to.be.a('function');
			expect(pkgcfg.registry).to.have.a.property('getTransform');
			expect(pkgcfg.registry.getTransform).to.be.a('function');
			expect(pkgcfg.registry).to.have.a.property('getTransformTags');
			expect(pkgcfg.registry.getTransformTags).to.be.a('function');
		});

		describe('register', function(){
			it('adds the given package transform function under the given tag', function(){
				expect(pkgcfg.registry.getTransformTags().length).to.equal(1);
				pkgcfg.registry.register('hello', hello);
				expect(pkgcfg.registry.getTransformTags().length).to.equal(2);
				expect(pkgcfg.registry.getTransformTags().indexOf('hello')).not.to.equal(-1);
				var pkg = pkgcfg('package.json');
				expect(pkg.test.register).to.equal('Hello!');
			});
		});

		describe('getTransform', function(){
			it('returns the package transform for the given tag', function(){
				expect(pkgcfg.registry.getTransform('pkg')).to.be.a('function');
				expect(pkgcfg.registry.getTransform('hello')).to.equal(hello);
			});
		});

		describe('getTransformTags', function(){
			it('returns an arry of registered package transform tags', function(){
				var tags = pkgcfg.registry.getTransformTags();
				expect(tags.length).to.equal(2);
				expect(tags.indexOf('pkg')).to.not.equal(-1);
				expect(tags.indexOf('hello')).to.not.equal(-1);
			});
		});

		describe('unregister', function(){
			it('removes the given package transform function from the given tag', function(){
				expect(pkgcfg.registry.getTransformTags().length).to.equal(2);
				pkgcfg.registry.unregister('hello', hello);
				expect(pkgcfg.registry.getTransformTags().length).to.equal(1);
				expect(pkgcfg.registry.getTransformTags().indexOf('hello')).to.equal(-1);
				var pkg = pkgcfg('package.json');
				expect(pkg.test.register).to.equal('{hello}');
			});
		});

		it('contains a built-in transform `pkg`', function(){
			expect(pkgcfg.registry.getTransformTags().indexOf('pkg')).not.to.equal(-1);
		});
	});
});

describe('built-in transforms', function(){
	describe('pkg', function(){
		var pkg = pkgcfg('package.json');

		// "primitive": "{pkg name}",
		it('returns the referenced primitive value', function(){
			log.info('{pkg name} => \'pkgcfg\'');
			expect(pkg.test.primitive).to.equal(pkg.name);
		});

		// "nested-primitive": "{pkg repository.type}",
		it('returns the referenced nested primitive value', function(){
			log.info('{pkg repository.type} => \'git\'');
			expect(pkg.test.primitive).to.equal(pkg.name);
		});

		// "object": "{pkg repository}",
		it('returns the referenced object', function(){
			log.info('{pkg repository} => {type:\'git\', ..}');
			expect(pkg.test.object).to.be.an('object');
			expect(pkg.test.object).to.have.a.property('type');
			expect(pkg.test.object.type).to.equal('git');
		});

		// "nested-object": "{pkg test.data}",
		it('returns the referenced nested object', function(){
			log.info('{pkg test.data} => {array:[\'one config to ..\', ..], ..}');
			expect(pkg.test['nested-object']).to.be.an('object');
			expect(pkg.test['nested-object']).to.have.a.property('array');
			expect(pkg.test['nested-object'].array).to.be.an('array');
			expect(pkg.test['nested-object'].array[2]).to.equal('pkgcfg');
		});

		// "array": "{pkg keywords}",
		it('returns the referenced array', function(){
			log.info('{pkg keywords} => [\'package.json\', ...]');
			expect(pkg.test.array).to.be.an('array');
			expect(pkg.test.array).to.have.a.property('0');
			expect(pkg.test.array[0]).to.equal('package.json');
		});

		// "nested-array": "{pkg test.data.array}",
		it('returns the referenced nested array', function(){
			log.info('{pkg test.data.array} => [\'one config to ..\', ...]');
			expect(pkg.test['nested-array']).to.be.an('array');
			expect(pkg.test['nested-array']).to.have.a.property('2');
			expect(pkg.test['nested-array'][2]).to.equal('pkgcfg');
		});

		// "unresolved": "{pkg unresolved.transforms.return.unmodified.text}",
		it('returns the text unmodified if it failed to resolve', function(){
			log.info('{pkg unresolved.transforms.return.unmodified.text} => \'{pkg unresolved.transforms.return.unmodified.text}\'');
			expect(pkg.test.unresolved).to.be.a('string');
			expect(pkg.test.unresolved).to.equal('{pkg unresolved.transforms.return.unmodified.text}');
		});

		// "array-length": "{pkg test.data.array.length}",
		it('returns the referenced array length', function(){
			log.info('{pkg test.data.array.length} => 3');
			expect(pkg.test['array-length']).to.be.a('number');
			expect(pkg.test['array-length']).to.equal(3);
		});

		// "nth-item": "{pkg test.data.array.2}",
		it('returns the referenced nth item of the array', function(){
			log.info('{pkg test.data.array.2} => pkgcfg');
			expect(pkg.test['nth-item']).to.be.a('string');
			expect(pkg.test['nth-item']).to.equal('pkgcfg');
		});

		// "with-dash": "{pkg test.data.with-dash}",
		it('resolves paths containing a dash', function(){
			log.info('{pkg test.data.with-dash} => ok');
			expect(pkg.test['with-dash']).to.be.a('string');
			expect(pkg.test['with-dash']).to.equal('ok');
		});

		// "with-colon": "{pkg test.data.with:colon}",
		it('resolves paths containing a colon', function(){
			log.info('{pkg test.data.with:colon} => ok');
			expect(pkg.test['with-colon']).to.be.a('string');
			expect(pkg.test['with-colon']).to.equal('ok');
		});

		// "with-dot": "{pkg ['test','data','with.dot']}",
		it('resolves paths containing a dot', function(){
			log.info('{pkg [\'test\',\'data\',\'with.dot\']} => ok');
			expect(pkg.test['with-dot']).to.be.a('string');
			expect(pkg.test['with-dot']).to.equal('ok');
		});

		// "with-quote": "{pkg ['test','data','with''quote']}",
		it('resolves paths containing a quote', function(){
			log.info('{pkg [\'test\',\'data\',\'with\'\'quote\']} => ok');
			log.info(chalk.styles.grey.open, pkg, chalk.styles.grey.close);
			expect(pkg.test["with-quote"]).to.be.a('string');
			expect(pkg.test['with-quote']).to.equal('ok');
		});

		// "indirect": "{pkg test.primitive}",
	});
});
