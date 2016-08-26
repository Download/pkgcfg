var log = require('picolog');
var chalk = require('chalk');
var expect = require('chai').expect;

var pkgcfg = require('./pkgcfg');

describe('pkgcfg', function(){
	it('is a function', function(){
		expect(pkgcfg).to.be.a('function');
	});

	var pkg = pkgcfg();

	it('returns an object representation of package.json', function(){
		expect(pkg).to.have.a.property('name');
		expect(pkg.name).to.equal('pkgcfg');
		expect(pkg).to.have.a.property('version');
		expect(pkg).to.have.a.property('description');
	});

	// "calls-transform": "{test}",
	it('calls transform functions associated to tags that it encounters during parsing', function(){
		log.info('{test} => calls test()');
		var called = false;
		function test(pkg, node) {called = true;}
		pkgcfg.registry.register('test', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test', test);}
	});

	// "calls-transform-with-dash": "{test-with-dash}",
	it('calls transform functions with names containing a dash', function(){
		log.info('{test-with-dash} => calls test()');
		var called = false;
		function test(pkg, node) {called = true;}
		pkgcfg.registry.register('test-with-dash', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test-with-dash', test);}
	});

	// "calls-transform-with-colon": "{test:with:colon}",
	it('calls transform functions with names containing a colon', function(){
		log.info('{test:with:colon} => calls test()');
		var called = false;
		function test(pkg, node) {called = true;}
		pkgcfg.registry.register('test:with:colon', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test:with:colon', test);}
	});

	// "calls-transform-with-dot": "{test.with.dot}",
	it('calls transform functions with names containing a dot', function(){
		log.info('{test.with.dot} => calls test()');
		var called = false;
		function test(pkg, node) {called = true;}
		pkgcfg.registry.register('test.with.dot', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test.with.dot', test);}
	});

	// "calls-transform-with-quote": "{test'with'quote}",
	it('calls transform functions with names containing a quote', function(){
		log.info("{test'with'quote} => calls test()");
		var called = false;
		function test(pkg, node) {called = true;}
		pkgcfg.registry.register("test'with'quote", test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister("test'with'quote", test);}
	});

	// "yields-text-unmodified-for-unmatched-tags": "{test}",
	it('yields text unmodified for unmatched tags', function(){
		log.info('{test} => unmatched tag, yields text unmodified');
		var pkg = pkgcfg();
		expect(pkg.test['yields-text-unmodified-for-unmatched-tags']).to.equal('{test}');
	});

	// "yields-undefined-for-matched-tags-returning-undefined": "{test}",
	it('yields undefined for matched tags returning undefined', function(){
		log.info('{test} => calls test(), yields undefined');
		var called = false;
		function test(pkg, node) {called = true; return undefined;}
		pkgcfg.registry.register('test', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
			expect(pkg.test['yields-undefined-for-matched-tags-returning-undefined']).to.equal(undefined);
		} finally {pkgcfg.registry.unregister('test', test);}
	});

	// "yields-null-for-matched-tags-returning-null": "{test-with-matched-tag-returning-null}",
	it('yields \'null\' for matched tags returning null', function(){
		log.info('{test} => calls test(), yields null');
		var called = false;
		function test() {called = true; return null;}
		pkgcfg.registry.register('test', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
			expect(pkg.test['yields-null-for-matched-tags-returning-null']).to.equal(null);
		} finally {pkgcfg.registry.unregister('test', test);}
	});

	// "calls-transform-with-arg": "{test-with-arg some arg}",
	it('calls transform functions with a string argument', function(){
		log.info('{test-with-arg some arg} => calls test(\'some arg\')');
		var called = false;
		function test(pkg, node, arg) {
			expect(arg).to.equal('some arg');
			called = true;
		}
		pkgcfg.registry.register('test-with-arg', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test-with-arg', test);}
	});

	// "calls-transform-with-arg-object": "{test-with-arg-object {'some':'object'}}",
	it('calls transform functions with an object argument', function(){
		log.info('{test-with-arg-object {\'some\':\'object\'}} => calls test({some:\'object\'})');
		var called = false;
		function test(pkg, node, arg) {
			expect(arg).to.be.an('object');
			expect(arg.some).to.equal('object');
			called = true;
		}
		pkgcfg.registry.register('test-with-arg-object', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test-with-arg-object', test);}
	});

	// "calls-transform-with-arg-array": "{test-with-arg-array ['some','array']}",
	it('calls transform functions with array arguments', function(){
		log.info('{test-with-arg-array [\'some\',\'array\']} => calls test([\'some\',\'array\'])');
		var called = false;
		function test(pkg, node, arg) {
			expect(arg).to.be.an('array');
			expect(arg[0]).to.equal('some');
			expect(arg[1]).to.equal('array');
			called = true;
		}
		pkgcfg.registry.register('test-with-arg-array', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test-with-arg-array', test);}
	});

	// "calls-transform-with-arg-list": "{test-with-arg-list ('some','list')}",
	it('calls transform functions with arguments list', function(){
		log.info('{test-with-arg-list (\'some\',\'list\')} => calls test(\'some\', \'list\')');
		var called = false;
		function test(pkg, node, arg0, arg1) {
			expect(arg0).to.be.a('string');
			expect(arg0).to.equal('some');
			expect(arg1).to.be.a('string');
			expect(arg1).to.equal('list');
			called = true;
		}
		pkgcfg.registry.register('test-with-arg-list', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test-with-arg-list', test);}
	});

	// "calls-transform-with-unbalanced-close": "{test-with-unbalanced-close 'unbalanced } close'}",
	it('calls transform functions with quoted unbalanced close markers', function(){
		log.info('{test-with-unbalanced-close \'unbalanced } close\'} => calls test(\'some\', \'list\')');
		var called = false;
		function test(pkg, node, arg) {
			expect(arg).to.be.a('string');
			expect(arg).to.equal('unbalanced } close');
			called = true;
		}
		pkgcfg.registry.register('test-with-unbalanced-close', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test-with-unbalanced-close', test);}
	});

	// "calls-transform-with-unbalanced-close": "{test-with-unbalanced-close 'unbalanced } close'}",
	it('calls transform functions with quoted unbalanced close markers', function(){
		log.info('{test-with-unbalanced-close \'unbalanced } close\'} => calls test(\'some\', \'list\')');
		var called = false;
		function test(pkg, node, arg) {
			expect(arg).to.be.a('string');
			expect(arg).to.equal('unbalanced } close');
			called = true;
		}
		pkgcfg.registry.register('test-with-unbalanced-close', test);
		try {
			var pkg = pkgcfg();
			expect(called).to.equal(true);
		} finally {pkgcfg.registry.unregister('test-with-unbalanced-close', test);}
	});

	it('maintains a registry of package transforms', function(){
		expect(pkgcfg).to.have.a.property('registry');
	});

	describe('registry', function(){
		function hello(pkg, node, text) {
			log.info('executing hello transform');
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
				var pkg = pkgcfg();
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
				expect(tags.indexOf('hello')).to.not.equal(-1);
			});
		});

		describe('unregister', function(){
			it('removes the given package transform function from the given tag', function(){
				expect(pkgcfg.registry.getTransformTags().length).to.equal(2);
				pkgcfg.registry.unregister('hello', hello);
				expect(pkgcfg.registry.getTransformTags().length).to.equal(1);
				expect(pkgcfg.registry.getTransformTags().indexOf('hello')).to.equal(-1);
				var pkg = pkgcfg();
				expect(pkg.test.register).to.equal('{hello}');
			});
		});

		it('contains a built-in transform {pkg}', function(){
			expect(pkgcfg.registry.getTransformTags().indexOf('pkg')).not.to.equal(-1);
		});
	});
});

describe('built-in transform', function(){
	describe('{pkg}', function(){
		var pkg = pkgcfg();

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
		it('resolves references containing a dash', function(){
			log.info('{pkg test.data.with-dash} => ok');
			expect(pkg.test['with-dash']).to.be.a('string');
			expect(pkg.test['with-dash']).to.equal('ok');
		});

		// "with-colon": "{pkg test.data.with:colon}",
		it('resolves references containing a colon', function(){
			log.info('{pkg test.data.with:colon} => ok');
			expect(pkg.test['with-colon']).to.be.a('string');
			expect(pkg.test['with-colon']).to.equal('ok');
		});

		// "with-dot": "{pkg ['test','data','with.dot']}",
		it('resolves references containing a dot', function(){
			log.info('{pkg [\'test\',\'data\',\'with.dot\']} => ok');
			expect(pkg.test['with-dot']).to.be.a('string');
			expect(pkg.test['with-dot']).to.equal('ok');
		});

		// "with-quote": "{pkg ['test','data','with''quote']}",
		it('resolves references containing a quote', function(){
			log.info('{pkg [\'test\',\'data\',\'with\'\'quote\']} => ok');
			expect(pkg.test["with-quote"]).to.be.a('string');
			expect(pkg.test['with-quote']).to.equal('ok');
		});

		// "indirect": "{pkg test.primitive}",
		it('resolves indirect references', function(){
			log.info('{pkg test.primitive} => pkgcfg');
			expect(pkg.test['indirect']).to.be.a('string');
			expect(pkg.test['indirect']).to.equal('pkgcfg');
		});

		// "tag-within-tag": "{echo {pkg name}}"
		it('resolves references within other tags', function(){
			log.info('{echo {pkg name}} => pkgcfg');
			var called = false;
			function echo(pkg, node, arg) {
				var expected = 'pkgcfg';
				expect(arg).to.equal(expected);
				called = arg === expected;
				return arg;
			}
			pkgcfg.registry.register('echo', echo);
			try {
				var pkg = pkgcfg();
				expect(pkg.test['tag-within-tag']).to.be.a('string');
				expect(pkg.test['tag-within-tag']).to.equal('pkgcfg');
			} finally {pkgcfg.registry.unregister('echo', echo);}
		});
	});
});
