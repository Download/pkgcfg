#!/usr/bin/env node
var log; try {log = require('picolog')} catch(e){}
var err = log && log.error || console.error
var out = log && log.info || console.info
var spawn = require('child_process').spawn
var pkg = require('pkgcfg')()

function exec(script) {
	var argv = process.argv.slice(3)
	var cmd = (script + ' ' + argv.join(' ')).trim()
	var win = process.platform === 'win32'
	var sh = win && 'cmd' || 'sh'
	var flag = win && '/c' || '-c'
	out('> run: ' + cmd)
	cmd = win ? '"' + cmd + '"' : cmd
	var opts = {env:process.env, windowsVerbatimArguments:win, stdio:'inherit'}
	spawn(sh, [flag, cmd], opts).on('close', function(c){process.exit(c)})
}

var name = process.argv[2]
if (!name) {err('ERROR: No script name provided'); process.exit(1)}
if (!pkg.scripts) {err('ERROR: No scripts found'); process.exit(1)}
if (!pkg.scripts[name]) {err('ERROR: No script named "' + name + '" found'); process.exit(1)}

exec(pkg.scripts[name], function (error, stdout, stderr) {
	stderr && err(stderr)
	stdout && out(stdout)
	error && err(error)
})
