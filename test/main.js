'use strict';

const should = require('should'),
      StudioHelper = require('../StudioHelper');

describe('StudioHelper', function() {
  it('should initialize', function () {
    let studio = new StudioHelper({
      studio: 'helper.studio.crasman.fi'
    });

    studio.should.be.an.instanceOf(StudioHelper);
  });
});
