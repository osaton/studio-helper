'use strict';
/*eslint max-nested-callbacks: ["error", 10]*/
const should = require('should'),
      StudioHelper = require('../StudioHelper'),
      path = require('path'),
      Promise = require('bluebird'),
      mainFolder = '57fd20b96c6e79438855b47f', // Replace folder id if you're not using helper Studio for testing
      studioHost = 'helper.studio.crasman.fi', // Replace host if you're not using helper Studio for testing
      strictSSL = true; // Change to false if using self-signed certificate

require('mocha-sinon');

let getFolder = function (folderPath) {
  return path.join(__dirname, folderPath);
}

describe('StudioHelper', function() {
  this.timeout(0);

  beforeEach(function () {
    let log = console.log;
    this.sinon.stub(console, 'log', function() {
      return log.apply(log, arguments);
    });
  });

  it('should initialize', function () {
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    should(studio).be.an.instanceOf(StudioHelper);
  });

  describe('#getUploadInformation', function () {
    it('should return information needed for upload', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
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
  });


  describe('#deleteChildFolders', function () {
    it('should delete child folders of a given folderid', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.deleteChildFolders(mainFolder).then(function (res) {
        return res.result.should.equal(true);
      });
    });
  });

  describe('#getFolderSettings', function () {
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    it('should get folder settings', function () {
      return studio.getFolderSettings(mainFolder).then(function (res) {
        res.result.should.have.property('fileCacheMaxAge');
        res.result.should.have.property('fileCacheProtected');
        res.result.should.have.property('apiFolder');
        res.result.should.have.property('noversioning');
        res.result.should.have.property('public');

        /*
        // Add these later when the types are correct
        res.result.fileCacheMaxAge.should.be.type('number');
        res.result.fileCacheProtected.should.be.type('boolean');
        res.result.apiFolder.should.be.type('boolean');
        res.result.noversioning.should.be.type('boolean');
        res.result.public.should.be.type('boolean');*/

        return res.status.should.equal('ok');
      });
    });
  });

  describe('#updateFolderSettings', function () {
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    it('should change settings', function () {
      return studio.getFolderSettings(mainFolder).then(function (res) {
        let originalSettings = res.result;
        let newSettings = JSON.parse(JSON.stringify(originalSettings));

        delete newSettings.public;

        /*
        // Add these later when the types are correct
        res.result.fileCacheMaxAge.should.be.type('number');
        res.result.fileCacheProtected.should.be.type('boolean');
        res.result.apiFolder.should.be.type('boolean');
        res.result.noversioning.should.be.type('boolean');*/

        newSettings.fileCacheMaxAge = originalSettings.fileCacheMaxAge > 0 ? 0 : 1000;
        newSettings.fileCacheProtected = originalSettings.fileCacheProtected ? 0 : 1;
        newSettings.apiFolder = originalSettings.apiFolder ? 0 : 1;
        newSettings.noversioning = originalSettings.noversioning ? 0 : 1;

        return studio.updateFolderSettings(mainFolder, newSettings).then(function (res2) {
          // TODO: check that settings have changed
          return res2.status.should.equal('ok');
        });
      });
    })
  });

  describe('#getFolders', function () {
    let addedTestFolder;
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    before(function () {
      // create push folder
      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'copyDirectoryFolders-test'
      }).then(function (res) {
        addedTestFolder = res.result.id;
        return res.status.should.equal('ok');
      });
    });

    it('should get folders', function (done) {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      studio.getFolders(mainFolder).then(function (res) {
        if (res.status === 'ok' && Array.isArray(res.result)) {
          done();
        }
        //return res.status.should.equal('ok');
      });
    });

    after(function () {
      // clean up folder
      return studio.deleteFolder(addedTestFolder).then(function (res) {
        return res.status.should.equal('ok');
      });
    });
  });

  describe('#createFolder', function () {
    it('should create folder', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'createFolderTest'
      }).then(function (res) {
        res.status.should.equal('ok');
        return res.result.name.should.equal('createFolderTest');
      });
    });

    it('should return the already created folder if addIfExists === false', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'createFolderTest-logging',
      }).then(function (res) {
        res.status.should.equal('ok');
        let addedFolder = res.result.id;
        return studio.createFolder({
          'parentId': mainFolder,
          'name': 'createFolderTest-logging',
        }).then(function () {
          res.result.id.should.equal(addedFolder);
          return res.result.name.should.equal('createFolderTest-logging');
        });
      });
    });

    it('should create folder and log result if logCreated === true', function () {
      console.log.reset();
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'createFolderTest-logging',
        'logCreated': true
      }).then(function (res) {
        res.status.should.equal('ok');

        console.log.calledWith('[Studio] Created folder: createFolderTest-logging').should.equal(true);
        return res.result.name.should.equal('createFolderTest-logging');
      });
    });

    it('should not log if folder already exists when addIfExists === false and logCreated === true', function () {
      console.log.reset();
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'createFolderTest-logging',
        'addIfExists': false,
        'logCreated': true
      }).then(function (res) {
        res.status.should.equal('ok');
        console.log.calledWith('[Studio] Created folder: createFolderTest-logging').should.equal(false);
        return res.result.name.should.equal('createFolderTest-logging');
      });
    });
  });

  describe('#uploadFiles', function () {
    let uploadFilesFolderId;

    before(function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'uploadFilesTest'
      }).then(function (res) {
        uploadFilesFolderId = res.result.id;

        Promise.resolve(res);
      });
    });

    it('should upload files to specific folder', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });


      let files = [path.join(getFolder('folders/testfolder1'), 'file1.js'), path.join(getFolder('folders/testfolder1'), 'file-2.js')];

      return studio.uploadFiles(files, uploadFilesFolderId).then(function (res) {
        res.should.have.lengthOf(2);
        res[0].status.should.equal('ok');
        return res[1].status.should.equal('ok');
      });
    });

    it('should upload empty files', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      let files = [path.join(getFolder('files'), '0-file')];

      return studio.uploadFiles(files, uploadFilesFolderId).then(function (res) {
        res.should.have.lengthOf(1);
        return res[0].status.should.equal('ok');
      });
    });

    it('should upload files over 25MB', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      let files = [path.join(getFolder('files'), '13m-file')];

      return studio.uploadFiles(files, uploadFilesFolderId).then(function (res) {
        res.should.have.lengthOf(1);
        return res[0].status.should.equal('ok');
      });
    });

    after(function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.deleteFolder(uploadFilesFolderId).then(function (res) {
        return Promise.resolve(res);
      });
    });
  });

  describe('#replaceFiles', function () {
    let uploadFilesFolderId;
    let addedTestFiles;
    let localTestFiles = [path.join(getFolder('files'), '13m-file'), path.join(getFolder('folders/testfolder1'), 'file1.js')];
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    before(function () {
      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'uploadFilesTest'
      }).then(function (res) {
        uploadFilesFolderId = res.result.id;
        return studio.uploadFiles(localTestFiles, uploadFilesFolderId).then(function (res) {
          res.should.have.lengthOf(2);
          addedTestFiles = res;
          Promise.resolve(res);
        });
      });
    });

    it('should replace files', function () {
      //console.log(addedTestFiles);
      let files = [{
        'fileId': addedTestFiles[0].result.createdFileId,
        'localFile': localTestFiles[0]
      }, {
        'fileId': addedTestFiles[1].result.createdFileId,
        'localFile': localTestFiles[1]
      }];

      //console.log(files);
      return studio.replaceFiles(files).then(function(res) {
        res[0].status.should.equal('ok');
        res[1].status.should.equal('ok');
      });
    });

    after(function () {
      return studio.deleteFolder(uploadFilesFolderId).then(function (res) {
        return Promise.resolve(res);
      });
    });
  });

  describe('#createDirectoryFolders', function () {
    let addedTestFolder;
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    beforeEach(function () {
      // create push folder
      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'copyDirectoryFolders-test'
      }).then(function (res) {
        addedTestFolder = res.result.id;
        return res.status.should.equal('ok');
      });
    });

    it('should create folders found in local directory', function () {
      return studio.createDirectoryFolders({
        'folderId': addedTestFolder,
        'localFolder': getFolder('folders')
      }).then(function (res) {
        return res.should.have.lengthOf(2);
      })
    });

    it('should create folders and sub folders found in local directory', function () {
      return studio.createDirectoryFolders({
        'folderId': addedTestFolder,
        'localFolder': getFolder('folders'),
        'includeSubFolders': true
      }).then(function (res) {
        res.forEach(function (folder) {
          folder.status.should.equal('ok');
        });
        return res.should.have.lengthOf(8);
      })
    });

    it('should not create folders if already created', function () {
      return studio.createDirectoryFolders({
        'folderId': addedTestFolder,
        'localFolder': getFolder('folders'),
        'includeSubFolders': true
      }).then(function (res) {
        let createResIds = [];
        res.forEach(function (folder) {
          folder.status.should.equal('ok');
          createResIds.push(folder.result.id);
        })
        res.should.have.lengthOf(8);
        return studio.createDirectoryFolders({
          'folderId': addedTestFolder,
          'localFolder': getFolder('folders'),
          'includeSubFolders': true
        }).then(function (res) {
          // Ids should be the same as before
          for (let i=0, l=res.length; i<l; i++) {
            createResIds.indexOf(res[i].result.id).should.not.equal(-1);
            //res[i].result.id.should.equal(createRes[i].result.id);
          }

          return res.should.have.lengthOf(8);
        })
      })
    });

    it('should return past results if cache === true', function () {
      return studio.createDirectoryFolders({
        'folderId': addedTestFolder,
        'localFolder': getFolder('folders'),
        'includeSubFolders': true,
        'cache': true
      }).then(function (res) {
        let createResIds = [];
        res.forEach(function (folder) {
          folder.status.should.equal('ok');
          createResIds.push(folder.result.id);
        })
        res.should.have.lengthOf(8);
        return studio.createDirectoryFolders({
          'folderId': addedTestFolder,
          'localFolder': getFolder('folders'),
          'includeSubFolders': true
        }).then(function (res) {
          // Ids should be the same as before
          for (let i=0, l=res.length; i<l; i++) {
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
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.createFolder({
        'parentId': mainFolder,
        'name': 'deleteFolderTest'
      }).then(function (res) {
        let addedFolderId = res.result.id;
        return studio.deleteFolder(addedFolderId).then(function (res) {
          return res.status.should.equal('ok');
        });
      });
    })
  });

  describe('#push', function () {
    describe('settings.folder[].includeSubFolders === false', function () {
      let testFolder1, testFolder2;
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      before(function () {
        // create push folder
        return studio.createFolder({
          'parentId': mainFolder,
          'name': 'push-testFolder1'
        }).then(function (res) {
          testFolder1 = res.result.id;
          res.status.should.equal('ok');
          return studio.createFolder({
            'parentId': mainFolder,
            'name': 'push-testFolder2'
          }).then(function (res) {
            testFolder2 = res.result.id;
            return res.status.should.equal('ok');
          });
        });

        return Promise.resolve([testFolder1, testFolder2]).mapSeries(function(folder) {
          return studio.getFiles(folder).then(function (files) {
            let fileIds = [];

            for (let i=0, l=files.length; i<l; i++) {
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
          'studio': studioHost,
          'strictSSL': strictSSL
        });

        return studio.push({
          'folders': [{
            'folderId': testFolder1,
            'localFolder': getFolder('folders/testfolder1')
          }, {
            'folderId': testFolder2,
            'localFolder': getFolder('folders/testfolder2')
          }]
        }).then(function (res) {
          return res.should.have.lengthOf(4);
        })
      });
    });


    describe('settings.folder[].includeSubFolders === true', function () {
      let addedPushFolder;
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      beforeEach(function () {
        // create push folder
        return studio.createFolder({
          'parentId': mainFolder,
          'name': 'push-includeChildFolders'
        }).then(function (res) {
          addedPushFolder = res.result.id;
          return res.status.should.equal('ok');
        });
      });

      it('should create folders and push to them', function () {
        console.log.reset();
        return studio.push({
          'folders': [{
            'folderId': addedPushFolder,
            'localFolder': getFolder('folders'),
            'includeSubFolders': true
          }]
        }).then(function (res) {
          console.log.calledWith('[Studio] Created folder: testfolder2').should.equal(true);
          console.log.calledWith('[Studio] Created folder: subsubsubfolder1').should.equal(true);
          return res.should.have.lengthOf(10);
        })
      });

      it('createdFolderSettings: should create folders, update folder settings with correct cache times and push to them', function () {
        console.log.reset();
        return studio.push({
          'folders': [{
            'folderId': addedPushFolder,
            'localFolder': getFolder('folders/testfolder1/subfolder1'),
            'includeSubFolders': true,
            'createdFolderSettings': {
              '/subsubfolder1': {
                'fileCacheMaxAge': 1000
              },
              '/subsubfolder2/subsubsubfolder1': {
                'fileCacheMaxAge': 2
              }
            }
          }]
        }).then(function (res) {
          console.log.calledWith('[Studio] Created folder: subsubfolder1').should.equal(true);
          console.log.calledWith('[Studio] Updated folder: subsubfolder1 => {"fileCacheMaxAge":1000}').should.equal(true);
          console.log.calledWith('[Studio] Created folder: subsubfolder2').should.equal(true);
          console.log.calledWith('[Studio] Updated folder: subsubfolder2 => {"fileCacheMaxAge":2}').should.equal(false);
          console.log.calledWith('[Studio] Created folder: subsubsubfolder1').should.equal(true);
          console.log.calledWith('[Studio] Updated folder: subsubsubfolder1 => {"fileCacheMaxAge":2}').should.equal(true);
          return res.should.have.lengthOf(3);
        })
      });

      it('createdFolderSettings: should not create or update folders again', function () {
        console.log.reset();
        return studio.push({
          'folders': [{
            'folderId': addedPushFolder,
            'localFolder': getFolder('folders/testfolder1/subfolder1'),
            'includeSubFolders': true,
            'createdFolderSettings': {
              '/subsubfolder1': {
                'fileCacheMaxAge': 1000
              },
              '/subsubfolder2/subsubsubfolder1': {
                'fileCacheMaxAge': 2
              }
            }
          }]
        }).then(function (res) {
          console.log.calledWith('[Studio] Created folder: subsubfolder1').should.equal(true);
          console.log.calledWith('[Studio] Updated folder: subsubfolder1 => {"fileCacheMaxAge":1000}').should.equal(true);
          console.log.calledWith('[Studio] Created folder: subsubfolder2').should.equal(true);
          console.log.calledWith('[Studio] Updated folder: subsubfolder2 => {"fileCacheMaxAge":2}').should.equal(false);
          console.log.calledWith('[Studio] Created folder: subsubsubfolder1').should.equal(true);
          console.log.calledWith('[Studio] Updated folder: subsubsubfolder1 => {"fileCacheMaxAge":2}').should.equal(true);
          console.log.reset();
          res.should.have.lengthOf(3);
          return studio.push({
            'folders': [{
              'folderId': addedPushFolder,
              'localFolder': getFolder('folders/testfolder1/subfolder1'),
              'includeSubFolders': true,
              'createdFolderSettings': {
                '/subsubfolder1': {
                  'fileCacheMaxAge': 1000
                },
                '/subsubfolder2/subsubsubfolder1': {
                  'fileCacheMaxAge': 2
                }
              }
            }]
          }).then(function (res2) {
            console.log.calledWith('[Studio] Created folder: subsubfolder1').should.equal(false);
            console.log.calledWith('[Studio] Updated folder: subsubfolder1 => {"fileCacheMaxAge":1000}').should.equal(false);
            console.log.calledWith('[Studio] Created folder: subsubfolder2').should.equal(false);
            console.log.calledWith('[Studio] Updated folder: subsubfolder2 => {"fileCacheMaxAge":2}').should.equal(false);
            console.log.calledWith('[Studio] Created folder: subsubsubfolder1').should.equal(false);
            console.log.calledWith('[Studio] Updated folder: subsubsubfolder1 => {"fileCacheMaxAge":2}').should.equal(false);
            return res2.should.have.lengthOf(0);
          });
        })
      });

      it('should not create folders again', function () {
        console.log.reset();
        return studio.push({
          'folders': [{
            'folderId': addedPushFolder,
            'localFolder': getFolder('folders/testfolder1/subfolder1'),
            'includeSubFolders': true
          }]
        }).then(function (res) {
          res.should.have.lengthOf(3);
          console.log.calledWith('[Studio] Created folder: subsubfolder2').should.equal(true);
          console.log.calledWith('[Studio] Created folder: subsubsubfolder1').should.equal(true);
          console.log.reset();
          return studio.push({
            'folders': [{
              'folderId': addedPushFolder,
              'localFolder': getFolder('folders/testfolder1/subfolder1'),
              'includeSubFolders': true
            }]
          }).then(function () {
            console.log.calledWith('[Studio] Created folder: subsubfolder2').should.equal(false);
            return console.log.calledWith('[Studio] Created folder: subsubsubfolder1').should.equal(false);
          })
        });
      });

      it('should not upload unchanged files again', function () {
        return studio.push({
          'folders': [{
            'folderId': addedPushFolder,
            'localFolder': getFolder('folders/testfolder1/subfolder1'),
            'includeSubFolders': true
          }]
        }).then(function (res) {
          res.should.have.lengthOf(3);
          return studio.push({
            'folders': [{
              'folderId': addedPushFolder,
              'localFolder': getFolder('folders/testfolder1/subfolder1'),
              'includeSubFolders': true
            }]
          }).then(function (res) {
            return res.should.have.lengthOf(0);
          })
        });
      });

      it('should upload changed files', function () {
        return studio.push({
          'folders': [{
            'folderId': addedPushFolder,
            'localFolder': getFolder('folders/testfolder1/subfolder1'),
            'includeSubFolders': true
          }]
        }).then(function (res) {
          res.should.have.lengthOf(3);
          return studio.push({
            'folders': [{
              'folderId': addedPushFolder,
              'localFolder': getFolder('folders/testfolder1/subfolder1'),
              'includeSubFolders': true
            }]
          }).then(function (res) {
            return res.should.have.lengthOf(0);
          })
        });
      });


      after(function () {
        // clean up folder
        return studio.deleteFolder(addedPushFolder).then(function (res) {
          return res.status.should.equal('ok');
        });
      });
    });
  })

  describe('#deleteFiles', function () {
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    before(function () {
      let files = [path.join(getFolder('folders/testfolder1'), 'file1.js'), path.join(getFolder('folders/testfolder1'), 'file-2.js')];

      return studio.uploadFiles(files, mainFolder).then(function (res) {
        res.should.have.lengthOf(2);
        res[0].status.should.equal('ok');
        return res[1].status.should.equal('ok');
      });
    })

    it('should delete files', function () {
      let studio = new StudioHelper({
        'studio': studioHost,
        'strictSSL': strictSSL
      });

      return studio.getFiles(mainFolder).then(function (files) {
        let fileIds = [];

        for (let i=0, l=files.length; i<l; i++) {
          fileIds.push(files[i].id);
        }

        fileIds.length.should.be.above(0);
        return studio.deleteFiles(fileIds).then(function (res) {
          return res.result.should.equal(true);
        });
      });
    });
  });

  describe('Prompt test', function () {
    //let addedTestFolder;
    let studio = new StudioHelper({
      'studio': studioHost,
      'strictSSL': strictSSL
    });

    it('only one prompt should be shown', function () {
      console.log.reset();

      studio.setAuthToken('');
      return studio.createDirectoryFolders({
        'folderId': mainFolder,
        'localFolder': getFolder('folders'),
        'includeSubFolders': true,
        'cache': true
      }).then(function () {
        console.log.calledWith('[Studio] AuthToken missing').should.equal(true);
        return should(console.log.calledOnce).equal(true);
      });
    });
  });
});
