'use strict';

var fs = require('fs-extra');
var path = require('path');
var glob = require('glob');
var istanbul = require('istanbul');
var utils = require('../utils');
var packageInfo = require(utils.getHelpers().rootPath + '/package');
var collector = new istanbul.Collector();
var instrumenter = new istanbul.Instrumenter({
  noCompact: true
});
var coverageFiles = [];

function preparePathForIgnore(prependPath, ignoredPath) {
  return path.resolve(prependPath, ignoredPath, '**');
}

function gatherCoverageFilesFromSource(sourcePath) {
  var config = utils.getHelpers().config.coverage;
  var files = glob.sync(path.resolve(utils.getHelpers().rootPath, sourcePath, '**/*.js'), {
    ignore: config.excludes.map(preparePathForIgnore.bind(this, utils.getHelpers().rootPath))
  });

  coverageFiles.push.apply(coverageFiles, files);
}

function instrumentFile(filePath) {
  var fileContent = fs.readFileSync(filePath, 'utf8');
  var data = {};

  instrumenter.instrumentSync(fileContent, filePath);

  data[filePath] = instrumenter.lastFileCoverage();

  utils.setHelpers('coverage', data);
}

function checkRequiredName(requirePath) {
  return coverageFiles.indexOf(requirePath) > -1;
}

function replaceRequiredContent(code, requirePath) {
  return instrumenter.instrumentSync(code, requirePath);
}

function createReport(reporter) {
  var config = utils.getHelpers().config.coverage;
  var dest = config.dest;

  istanbul.Report.create(reporter, {
    dir: dest + '/' + reporter
  }).writeReport(collector, true);
}

function createCoverage() {
  var config = utils.getHelpers().config.coverage;

  collector.add(utils.getHelpers().coverage);
  collector.add(utils.getHelpers().coverageBrowser);

  config.reporters.forEach(createReport);
}

function initialize() {
  /* eslint no-underscore-dangle: 0 */

  global.__coverage__ = utils.getHelpers().coverage;

  utils.getSourcePaths().forEach(gatherCoverageFilesFromSource);
  coverageFiles.forEach(instrumentFile);
  istanbul.hook.hookRequire(checkRequiredName, replaceRequiredContent);

  process.on('exit', createCoverage);
}

function instrumentBrowserFile(sourcePath, generatedSrcPath, filePath) {
  var fileContent = fs.readFileSync(filePath, 'utf8');
  var coveragePath = path.resolve(utils.getHelpers().rootPath, sourcePath);
  var realPath = filePath.replace(generatedSrcPath, coveragePath);
  var moduleBody = fileContent;

  if (fileContent.substring(0, 10) === '$_mod.def(') {
    var startIndex = fileContent.indexOf('{') + 1;
    var endIndex = fileContent.lastIndexOf('}');

    moduleBody = fileContent.substring(startIndex, endIndex);
  }

  var instrumentedModuleBody = instrumenter.instrumentSync(moduleBody, realPath);

  fileContent = fileContent.replace(moduleBody, instrumentedModuleBody);

  fs.writeFileSync(filePath, fileContent, 'utf8');
}

function gatherBrowserCoverageFilesFromSource(sourcePath) {
  var bundleBasePath = path.resolve(utils.getHelpers().outputPath, 'source');
  var config = utils.getHelpers().config.coverage;
  var bundlePath = path.resolve(bundleBasePath, packageInfo.name + '$' + packageInfo.version);
  var generatedSrcPath = path.resolve(bundlePath, sourcePath);

  glob.sync(path.resolve(generatedSrcPath, '**/*.js'), {
    ignore: config.excludes.map(preparePathForIgnore.bind(this, bundlePath))
  }).forEach(instrumentBrowserFile.bind(this, sourcePath, generatedSrcPath));
}

function initializeBrowser() {
  utils.getSourcePaths().forEach(gatherBrowserCoverageFilesFromSource);
}

module.exports.initialize = initialize;
module.exports.initializeBrowser = initializeBrowser;
