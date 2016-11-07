'use strict';

var eslint = require('eslint');
var should = require('should');

var cli = new eslint.CLIEngine();
var formatter = cli.getFormatter();

var report;

describe('Lint', function() {
  it('StudioHelper.js should pass lint rules', function(done) {
    report = cli.executeOnFiles(['StudioHelper.js']);
    if (report.errorCount > 0 || report.warningCount > 0) {
      console.log(formatter(report.results));
    }

    should(report.errorCount).equal(0);
    should(report.warningCount).equal(0);
    done();
  });

  it('test/lint.js should pass lint rules', function(done) {
    report = cli.executeOnFiles(['test/lint.js']);
    if (report.errorCount > 0 || report.warningCount > 0) {
      console.log(formatter(report.results));
    }

    should(report.errorCount).equal(0);
    should(report.warningCount).equal(0);
    done();
  });

  it('test/main.js should pass lint rules', function(done) {
    report = cli.executeOnFiles(['test/main.js']);
    if (report.errorCount > 0 || report.warningCount > 0) {
      console.log(formatter(report.results));
    }

    should(report.errorCount).equal(0);
    should(report.warningCount).equal(0);
    done();
  });
});
