'use strict';

const should = require('should'),
      StudioHelper = require('../StudioHelper'),
      path = require('path'),
      mainFolder = '57fd20b96c6e79438855b47f';

function getFolder(folderPath) {
  return path.join(__dirname, folderPath);
}

function DefaultStudio() {

}

describe('StudioHelper', function() {
  this.timeout(0);

  it('should initialize', function () {
    let studio = new StudioHelper({
      studio: 'helper.studio.crasman.fi'
    });

    studio.should.be.an.instanceOf(StudioHelper);
  });

  describe('#deleteChildFolders', function () {
    it('should delete child folders of a given folderid', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      return studio.deleteChildFolders(mainFolder).then(function (res) {
        return res.result.should.equal(true);
      });
    });
  });

  describe('#getFolders', function () {
    it('should get folders', function (done) {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      studio.getFolders(mainFolder).then(function (res) {
        if(res.status === 'ok' && Array.isArray(res.result)) {
          done();
        }
        //return res.status.should.equal('ok');
      });
    });
  });

  describe('#createFolder', function () {
    it('should create folder', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      return studio.createFolder({
        parentId: mainFolder,
        name: 'createFolderTest'
      }).then(function (res) {
        return res.status.should.equal('ok');
      });
    });

    it('should not create new folder if settings.addIfExists: false ', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      return studio.createFolder({
        parentId: mainFolder,
        name: 'createFolderTest-AddIfExists'
      }).then(function (res) {
        let addedFolderId = res.result;
        return studio.createFolder({
          parentId: mainFolder,
          name: 'createFolderTest-AddIfExists',
          addIfExists: false
        }).then(function (res) {
          // Should return the already created folder
          return addedFolderId.should.equal(res.result);
        });
      });
    });
  });

  describe('#deleteFolder', function () {
    it('should delete folder', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      return studio.createFolder({
        parentId: mainFolder,
        name: 'deleteFolderTest'
      }).then(function (res) {
        let addedFolderId = res.result;
        return studio.deleteFolder(addedFolderId).then(function (res) {
          return res.status.should.equal('ok');
        });
      });
    })
  });

  describe('#push', function () {
    it('should push files to multiple folders', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

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
