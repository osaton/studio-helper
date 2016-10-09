'use strict';

const should = require('should'),
      StudioHelper = require('../StudioHelper'),
      path = require('path');

function getFolder(folderPath) {
  return path.join(__dirname, folderPath);
}

describe('StudioHelper', function() {
  this.timeout(0);

  it('should initialize', function () {
    let studio = new StudioHelper({
      studio: 'helper.studio.crasman.fi'
    });

    studio.should.be.an.instanceOf(StudioHelper);
  });

  describe('#push', function () {
    it('should push files to multiple folders', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });


      //touchFiles(['folders/testfolder1', 'folders/testfolder2']);
      console.log(getFolder('folders/testfolder1'));
      return studio.push({
        folders: [{
          folderId: '57fa91c86c6e79d9761b0a4e',
          localFolder: getFolder('folders/testfolder1')
        }, {
          folderId: '57fa91cd6c6e790b7d1b0a4e',
          localFolder: getFolder('folders/testfolder2')
        }]
      }).then(function (res) {
        return res.should.have.lengthOf(6);
      })
    });
  });
});
