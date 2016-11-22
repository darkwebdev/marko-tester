'use strict';

var exec = require('child_process').exec;
var path = require('path');
var glob = require('glob');
var Mocha = require('mocha');
var args = require('optimist').argv;
var utils = require('../utils');
var mocha = new Mocha({
  ui: 'bdd',
  reporter: 'spec',
  grep: args.grep,
  ignoreLeaks: false,
  globals: ['document', 'window', 'GLOBAL_LASSO']
});
var timeout;

function addPathToMocha(testFile) {
  mocha.addFile(testFile);
}

function searchPathForTests(sourcePath) {
  var testFiles = glob.sync(path.resolve(utils.getHelpers().rootPath, sourcePath, '**/*acceptance.js'));

  testFiles.forEach(addPathToMocha);
}

function startMocha() {
  mocha.run(function exitMarkoTester(failures) {
    process.exit(failures);
  });
}

function clearTimeout() {
  if (timeout) {
    clearTimeout(timeout);
  }
}

function startApp(startCommand) {
  /* eslint no-console: 0 */

  console.log('\n\nStarting your app using `' + startCommand + '` command.\n\n');

  exec(startCommand);
}

function stopApp(stopCommand) {
  /* eslint no-console: 0 */

  console.log('\n\nShutting down your app using `' + stopCommand + '` command.\n\n');

  exec(stopCommand);
}

function testAcceptance() {
  var configuration = utils.loadConfiguration();

  utils.getSourcePaths().forEach(searchPathForTests);

  startApp(configuration.acceptance.startCommand);

  timeout = setTimeout(startMocha, configuration.acceptance.startTimeout);

  process.on('SIGINT', clearTimeout);
  process.on('exit', stopApp.bind(this, configuration.acceptance.stopCommand));
}

module.exports = testAcceptance;
