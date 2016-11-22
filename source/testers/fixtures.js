'use strict';

var Normalizer = require('html-normalizer');
var _ = require('lodash');
var chai = require('chai');
var Promise = require('bluebird');
var utils = require('../utils');
var expect = chai.expect;
var excludedAttributes = [];

function excludeAttribute(attr) {
  excludedAttributes.push(attr);
}

function normalizer() {
  var COMPARE_ALL_ATTRIBUTES_STYLES_AND_CLASSES = {
    attributes: null,
    attributesExcluded: excludedAttributes,
    styles: null,
    classNames: null
  };

  return new Normalizer(COMPARE_ALL_ATTRIBUTES_STYLES_AND_CLASSES);
}

function cleanRenderedHtml(html) {
  return (html ? normalizer().domString(html.trim()) : '');
}

function parseComponentRenderedHtml(resolve, reject, error, result) {
  if (error) {
    return reject('TestFixtures: Failed to render component html.');
  }

  var html = result;

  if (_.isObject(result)) {
    html = result.html;
  }

  return resolve(cleanRenderedHtml(html));
}

function promiseRenderedHtml(renderer, fixture, resolve, reject) {
  var callback = parseComponentRenderedHtml.bind(null, resolve, reject);

  callback.global = {};

  renderer(fixture, callback);
}

function renderHtml(renderer, fixture) {
  return new Promise(promiseRenderedHtml.bind(null, renderer, fixture));
}

function onFailedComponentRender(error) {
  throw new Error(error);
}

function compareRenderedHtml(context, testCase) {
  var actualHtml = renderHtml(context.renderer, testCase.fixture).catch(onFailedComponentRender);
  var expectedHtml = cleanRenderedHtml(testCase.expectedHtml);

  return expect(actualHtml).to.eventually.equal(expectedHtml);
}

function createTest(context, testCase) {
  it('should render component using ' + testCase.name + ' input', compareRenderedHtml.bind(null, context, testCase));
}

function createTestCases(testCases, fixture) {
  testCases.push({
    name: fixture.testName,
    fixture: fixture.data,
    expectedHtml: fixture.expectedHtml
  });
}

function givenSpecificInputData(context, testCases) {
  testCases.forEach(createTest.bind(null, context));
}

function testFixtures(context, opts) {
  var options = opts || {};
  var testCases = [];

  if (!context.renderer) {
    Object.assign(context, {
      renderer: utils.getRenderer()
    });
  }

  if (!context.renderer) {
    throw new Error('TestFixtures: Cannot automatically locate renderer, please specify one.');
  }

  utils.getFixtures(context).forEach(createTestCases.bind(null, testCases));

  if (context.options.fixturesPath && !testCases.length) {
    throw new Error('TestFixtures: No fixtures found in specified location');
  }

  options.mochaOperation('Given specific input data', givenSpecificInputData.bind(null, context, testCases));
}

module.exports = utils.runWithMochaOperation.bind(null, null, testFixtures);
module.exports.only = utils.runWithMochaOperation.bind(null, 'only', testFixtures);
module.exports.skip = utils.runWithMochaOperation.bind(null, 'skip', testFixtures);

module.exports.excludeAttribute = excludeAttribute;
