'use strict';

const should = require('should'),
      StudioHelper = require('../StudioHelper'),
      path = require('path'),
      Promise = require('bluebird'),
      mainFolder = '57fd20b96c6e79438855b47f',
      testFolder1 = '57fa91c86c6e79d9761b0a4e',
      testFolder2 = '57fa91cd6c6e790b7d1b0a4e';

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

  describe('#getUploadInformation', function () {
    it('should return information needed for upload', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      let files = [path.join(getFolder('folders/testfolder1'), 'file1.js'), path.join(getFolder('folders/testfolder1'), 'file-2.js')];
      let uploadFiles = studio.getUploadInformation(files, 'someMadeUpFolder');

      uploadFiles.length.should.equal(2);
      uploadFiles[0].should.have.property('action', 'upload');
      uploadFiles[0].should.have.property('name').which.is.a.String();
      uploadFiles[0].should.have.property('name').which.is.a.String();
      uploadFiles[0].should.have.property('localFolder').which.is.a.String();
      uploadFiles[0].should.have.property('type').which.is.a.String();
      uploadFiles[0].should.have.property('sha1').which.is.a.String();
      uploadFiles[0].should.have.property('data').which.is.an.instanceOf(Buffer);
      uploadFiles[0].folderId.should.equal('someMadeUpFolder');
    });
  })

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
        res.status.should.equal('ok');
        return res.result.name.should.equal('createFolderTest');
      });
    });

    /*
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
    });*/
  });

  describe('#createDirectoryFolders', function () {
    let addedTestFolder;
    let studio = new StudioHelper({
      studio: 'helper.studio.crasman.fi'
    });

    beforeEach(function () {
      // create push folder
      return studio.createFolder({
        parentId: mainFolder,
        name: 'copyDirectoryFolders-test'
      }).then(function (res) {
        addedTestFolder = res.result.id;
        return res.status.should.equal('ok');
      });
    });

    it('should create folders found in local directory', function () {
      return studio.createDirectoryFolders({
        folderId: addedTestFolder,
        localFolder: getFolder('folders')
      }).then(function (res) {
        return res.should.have.lengthOf(2);
      })
    });

    it('should create folders and sub folders found in local directory', function () {
      return studio.createDirectoryFolders({
        folderId: addedTestFolder,
        localFolder: getFolder('folders'),
        includeSubFolders: true
      }).then(function (res) {
        res.forEach(function (folder){
          folder.status.should.equal('ok');
        })
        return res.should.have.lengthOf(8);
      })
    });

    it('should not create folders if already created', function () {
      return studio.createDirectoryFolders({
        folderId: addedTestFolder,
        localFolder: getFolder('folders'),
        includeSubFolders: true
      }).then(function (res) {
        let createResIds = [];
        res.forEach(function (folder){
          folder.status.should.equal('ok');
          createResIds.push(folder.result.id);
        })
        res.should.have.lengthOf(8);
        return studio.createDirectoryFolders({
          folderId: addedTestFolder,
          localFolder: getFolder('folders'),
          includeSubFolders: true
        }).then(function (res) {

          // Ids should be the same as before
          for(let i=0, l=res.length; i<l; i++) {
            createResIds.indexOf(res[i].result.id).should.not.equal(-1);
            //res[i].result.id.should.equal(createRes[i].result.id);
          }

          return res.should.have.lengthOf(8);
        })
      })
    });

    afterEach(function () {
      // clean up folder
      return studio.deleteFolder(addedTestFolder).then(function (res) {
        return res.status.should.equal('ok');
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
        let addedFolderId = res.result.id;
        return studio.deleteFolder(addedFolderId).then(function (res) {
          return res.status.should.equal('ok');
        });
      });
    })
  });

  describe('#push', function () {
    describe('settings.folder[].includeChildFolders === false', function () {
      before(function () {

        let studio = new StudioHelper({
          studio: 'helper.studio.crasman.fi'
        });

        return Promise.resolve([testFolder1, testFolder2]).mapSeries(function(folder) {
          return studio.getFiles(folder).then(function (files) {
            let fileIds = [];

            for(let i=0, l=files.length; i<l; i++) {
              fileIds.push(files[i].id);
            }
            return studio.deleteFiles(fileIds);
          });
        }).then(function (res) {
          return Promise.resolve(res);
        });
      });

      it('should push files to multiple folders', function () {
        let studio = new StudioHelper({
          studio: 'helper.studio.crasman.fi'
        });

        return studio.push({
          folders: [{
            folderId: testFolder1,
            localFolder: getFolder('folders/testfolder1')
          }, {
            folderId: testFolder2,
            localFolder: getFolder('folders/testfolder2')
          }]
        }).then(function (res) {
          return res.should.have.lengthOf(4);
        })
      });
    });

    /*
    describe('#push - settings.includeChildFolders', function () {
      let addedPushFolder;
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      before(function () {
        // create push folder
        return studio.createFolder({
          parentId: mainFolder,
          name: 'push-includeChildFolders'
        }).then(function (res) {
          addedPushFolder = res.result.id;
          return res.status.should.equal('ok');
        });
      });

      it('should create folders and push to them', function () {
        return studio.push({
          folders: [{
            folderId: addedPushFolder,
            localFolder: getFolder('folders'),
            includeSubFolders: true
          }]
        }).then(function (res) {
          return res.should.have.lengthOf(4);
        })
      });

      after(function () {
        // clean up folder
        return studio.deleteFolder(addedPushFolder).then(function (res) {
          return res.status.should.equal('ok');
        });
      });
    });*/
  });

  describe('#deleteFiles', function () {
    it('should delete files', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      return studio.getFiles(testFolder1).then(function (files) {
        let fileIds = [];

        for(let i=0, l=files.length; i<l; i++) {
          fileIds.push(files[i].id);
        }

        fileIds.length.should.be.above(0);
        return studio.deleteFiles(fileIds).then(function (res) {
          return res.result.should.equal(true);
        });
      })

    });
  });

  describe('#uploadFiles', function () {
    let uploadFilesFolderId;

    before(function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      return studio.createFolder({
        parentId: mainFolder,
        name: 'uploadFilesTest'
      }).then(function (res) {
        uploadFilesFolderId = res.result.id;

        Promise.resolve(res);
      });
    });

    it('should upload files to specific folder', function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });


      let files = [path.join(getFolder('folders/testfolder1'), 'file1.js'), path.join(getFolder('folders/testfolder1'), 'file-2.js')];

      return studio.uploadFiles(files, uploadFilesFolderId).then(function (res) {
        res.should.have.lengthOf(2);
        res[0].status.should.equal('ok');
        return res[1].status.should.equal('ok');
      });
    });

    after(function () {
      let studio = new StudioHelper({
        studio: 'helper.studio.crasman.fi'
      });

      return studio.deleteFolder(uploadFilesFolderId).then(function (res) {
        return Promise.resolve(res);
      });
    });
  });
});
