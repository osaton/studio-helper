'use strict';

let request = require('request'),
    mime = require('mime-types'),
    Promise = require('bluebird'),
    fs = require('fs'),
    path = require('path'),
    ignore = require('ignore');

Promise.longStackTraces();

const API_URL = '/studioapi/v2/',
      CHUNK_SIZE = '900000',
      CREDENTIALS_FILE = '.studio-credentials',
      IGNORE_FILE = '.studio-ignore',
      LONG_SESSION = 1;

/**
 * @example
 * var StudioHelper = require('studio-helper'),
 *     studio = new StudioHelper({
 *       studio: 'xyz.studio.crasman.fi',
 *       proxy: 'http://xyz.intra:8080/'
 *     });
 * @class
 */
class StudioHelper {

  /**
   * @param {Object}  settings
   * @param {string}  settings.studio - Studio host ('xyz.studio.crasman.fi')
   * @param {string}  [settings.proxy] - Proxy
   * @param {boolean} [settings.loginPromptEnabled=true] - Show login prompt if authentication fails
   * @param {string}  [settings.credentialsFile=.studio-credentials] - File in which credentials are saved
   * @param {string}  [settings.ignoreFile=.studio-ignore] - Utilised by [push]{@link StudioHelper#push} method. Uses gitignore {@link https://git-scm.com/docs/gitignore|spec}
   */
  constructor(settings) {
    if (!settings) {
      throw Error('StudioHelper#constructor: no settings object');
    }
    if (!settings.studio) {
      throw Error('StudioHelper#constructor: settings.studio must be set');
    }

    this.apiUrl = 'https://' + settings.studio + API_URL;
    this.authToken = '';

    this.inquirer = require('inquirer');

    this.ignore = null;

    if (settings.proxy) {
      this.setProxy(settings.proxy);
    }

    if (settings.promptSchema) {
      this.promptSchema = settings.promptSchema;
    } else {
      this.promptSchema = [{
        message: 'Username',
        type: 'input',
        name: 'name'
      }, {
        message: 'Password',
        type: 'password',
        name: 'password'
      }, {
        message: 'Yubikey token',
        type: 'input',
        name: 'token'
      }];
    }

    if (settings.credentialsFile) {
      this.credentialsFile = settings.credentialsFile;
    } else {
      this.credentialsFile = CREDENTIALS_FILE;
    }

    if (settings.ignoreFile) {
      this.ignoreFile = settings.ignoreFile;
    } else {
      this.ignoreFile = IGNORE_FILE;
    }

    this.credentials = this._getCredentials();

    if (this.ignoreFile) {
      this._addToIgnore(this.ignoreFile);
    }

    if (this.credentials && this.credentials.authToken) {
      this.setAuthToken(this.credentials.authToken);
    }

    if (settings.loginPromptEnabled) {
      this.loginPromptEnabled = settings.loginPromptEnabled;
    } else {
      this.loginPromptEnabled = true;
    }
  }

  /**
   * @private
   */
  _log(data) {
    console.log('[Studio] ' + data);
  }

  /**
   * @private
   */
  _getCredentials() {
    let data = null;

    try {
      data = JSON.parse(fs.readFileSync(this.credentialsFile, 'utf8'));
    } catch (e) {
    }

    return data;
  }

  /**
   * @private
   */
  _addToIgnore(filePath) {

    try {
      if(!this.ignore) {
        this.ignore = ignore();
      }

      this.ignore.add(fs.readFileSync(filePath, 'utf-8').toString());

      return true;
    } catch(err) {

    }
    return false;
  }

  /**
   * @private
   */
  _post(action, postData, customOptions, passAPIResponseHandling) {
    let options = {
          url: '',
          proxy: this.proxy,
          headers: {
            'X-authToken': this.authToken
          }
        },
        self = this;

    for (let key in customOptions) {
      if (customOptions.hasOwnProperty(key)) {
        options[key] = customOptions[key];
      }
    }

    if (!action) {
      throw Error('Site#_post: action not set');
    }

    options.url = this.apiUrl + action;

    return new Promise(function(resolve, reject) {
      return request.post(options, function(error, response, body) {

        /*
        if (error) {
          resolve({
            status: 'error',
            networkError: error.code,
            result: 'Connection timeout'
          });
        }*/

        if (body && passAPIResponseHandling) {
          resolve(JSON.parse(body));
        }

        return self._handleAPIResponse(error, body, self._post, action, postData, customOptions).then(function(res) {
          resolve(res);
        }).catch(function(res) {
          self._log(res.result);
        });

      }).form(postData);
    });
  }

  /**
   * @private
   */
  _put(action, data) {
    let options = {
          url: '',
          proxy: this.proxy,
          headers: {
            'X-authToken': this.authToken
          },
          body: data
        },
        self = this;

    if (!action) {
      throw Error('Site#_put: action not set');
    }

    options.url = this.apiUrl + action;

    return new Promise(function(resolve, reject) {
      request.put(options, function(error, response, body) {
        //let data = JSON.parse(body);

        return self._handleAPIResponse(error, body, self._put, action, data).then(function(res) {
          resolve(res);
        }).catch(function(res) {
          self._log(res.result);
        });
      });
    });
  }

  /**
   * @private
   */
  _get(action) {
    let options = {
          url: '',
          proxy: this.proxy,
          headers: {
            'X-authToken': this.authToken
          }
        },
        args = Array.prototype.slice.call(arguments),
        allArguments = Array.prototype.slice.call(arguments),
        self = this;

    if (!action) {
      throw Error('Site#_get: action not set');
    }

    // Remove 'action' argument
    args.shift();

    options.url = this.apiUrl + action + '/' + args.join('/');

    return new Promise(function(resolve, reject) {
      request.get(options, function(error, response, body) {

        allArguments.unshift(error, body, self._get);
        return self._handleAPIResponse.apply(self, allArguments).then(function(res) {
          resolve(res);
        }).catch(function(res) {
          self._log(res.result);
        });
      });
    });
  }

  /**
   * @private
   */
  _handleAPIResponse(error, body, lastCall) {

    let self = this,
        args = Array.prototype.slice.call(arguments),
        results;


    if(error) {
      results = {
        'result': error,
        'status': 'networkError'
      }
    } else {
      results = JSON.parse(body);
    }




    // Remove results and lastCall from arguments
    args.splice(0, 3);

    if (results.status === 'ok') {
      return Promise.resolve(results);
    }

    switch (results.code) {
      case 1:
      case 10:
      case 17:
      case 19:
      case 18:
        // Log results text if not successfull
        self._log(results.result);
        if (!this.loginPromptEnabled) {
          return Promise.reject(results);
        }
        return this._showLoginPrompt().then(function() {
          return lastCall.apply(self, args);
        });

        break;
    }


    //Functionality disabled: Let's not assume user wants to connect without proxy
    //if(results.status === 'networkError' && this.getProxy()) {
    //  this.setProxy('');
    //  return lastCall.apply(self, args);
    //}

    return Promise.reject(results);
  }

  /**
   * @private
   */
  _replaceFileChunk(folderId, uploadToken, fileData) {
    let self = this;

    return new Promise(function(resolve, reject) {
      return self._put('replace/' + folderId + '/' + uploadToken, fileData).then(function(res) {
        resolve(res);
      });
    });
  }

  /**
   * @private
   */
  _finishFileReplace(folderId, uploadToken) {
    let self = this;

    return new Promise(function(resolve, reject) {
      return self._post('replace/' + folderId + '/' + uploadToken).then(function(res) {

        resolve(res);
      });
    });
  }

  /**
   * @private
   */
  _uploadFileChunk(folderId, uploadToken, fileData) {
    let self = this;

    return new Promise(function(resolve, reject) {
      return self._put('upload/' + folderId + '/' + uploadToken, fileData).then(function(res) {
        resolve(res);
      });
    });
  }

  /**
   * TODO: chunkify file
   *
   * @private
   *
   */
  _uploadFileChunks(folderId, uploadToken, fileData) {

  }

  /**
   * @private
   */
  _finishFileUpload(folderId, uploadToken) {
    let self = this;

    return new Promise(function(resolve, reject) {
      return self._post('upload/' + folderId + '/' + uploadToken).then(function(res) {

        resolve(res);
      });
    });
  }

  /**
   * @private
   */
  _flattenArray(arr) {
    var flatArray = [];
    for (let i = 0, l = arr.length; i < l; i++) {
      if (Array.isArray(arr[i])) {
        flatArray = flatArray.concat(arr[i]);
      }
    }
    return flatArray;
  }

  /**
   * @private
   */
  _updateCredentials(data) {
    fs.writeFile(this.credentialsFile, JSON.stringify(data), function(err) {
      if (err) {
        self._log(err);
      }
    });
  }

  /**
   * @private
   */
  _showLoginPrompt() {
    let self = this;

    return new Promise(function(resolve, reject) {

      function showPrompt() {

        self.inquirer.prompt(self.promptSchema).then(function(result) {

          if (!result) {
            return;
          }

          return self.login(result.name, result.password, result.token, LONG_SESSION).then(function(res) {
            if (res.status === 'ok') {

              self._updateCredentials({
                authToken: res.result.authToken,
                username: result.name
              });

              self.setAuthToken(res.result.authToken);

              resolve(res);
            } else {

              // Show error
              self._log(res.result);

              // And prompt again
              showPrompt();
            }
          });
        });
      }

      showPrompt();
    });
  }

  /**
   * Push changes to Studio
   *
   * @example
   * studio.push({
   *   folders: [{
   *     folderId: '568a7a2aadd4532b0f4f4f5b',
   *     localFolder: 'dist/js'
   *   }, {
   *     folderId: '568a7a27add453aa1a4f4f58',
   *     localFolder: 'dist/css'
   *   }]
   * }).then(function (res) {
   *   console.log(res.length + 'files uploaded');
   * })
   * @param {Object} settings
   * @param {Array<Object>} settings.folders
   * @param {string} settings.folders[].folderId - Studio folder id
   * @param {string} settings.folders[].localFolder - Local folder path
   * @return {Promise<Array<Object>>} Array of objects with file upload information
   */
  push(settings) {
    return this.uploadFilesInFolders(settings.folders);
  }

  getFiles(folderId) {
    let self = this;

    if (!folderId) {
      throw Error('StudioHelper#getFiles: folderId not set');
    }

    return new Promise(function(resolve, reject) {
      self._get('files', folderId).then(function(res) {

        if (res.status === 'error') {
          reject(res.code);

        }

        resolve(res.result);
      });
    });
  }

  getLocalFileInfo(filePath) {
    let stats = fs.statSync(filePath),
        changed = Math.round(new Date(stats.mtime).getTime() / 1000),
        data = fs.readFileSync(filePath),
        sha1 = require('crypto').createHash('sha1').update(data).digest('hex'),
        type = mime.lookup(filePath);

    return {
      type: type,
      size: stats.size,
      changed: changed,
      sha1: sha1,
      data: data
    };
  }

  uploadFile(folderId, fileName, fileType, fileSize, sha1, fileData, localFolder) {
    let self = this;

    return new Promise(function(resolve, reject) {
      return self._post('upload/' + folderId, {
        filename: fileName,
        filetype: fileType,
        filesize: fileSize,
        sha1: sha1
      }).then(function(res) {
        if (res.result && res.result.uploadToken) {
          let uploadToken = res.result.uploadToken;
          return self._uploadFileChunk(folderId, uploadToken, fileData).then(function(res) {
            return self._finishFileUpload(folderId, uploadToken).then(function(res) {
              self._log('Uploaded: ' + localFolder + '/' + fileName);
              resolve(res);
            });
          });
        } else {
          reject(res);
        }
      }).catch(function(err) {
        self._log(err);
      });
    });
  }

  replaceFile(fileId, fileType, fileSize, sha1, fileData, fileName, localFolder) {
    let self = this;
    return new Promise(function(resolve, reject) {

      // Start upload
      return self._post('replace/' + fileId, {
        filetype: fileType,
        filesize: fileSize,
        sha1: sha1,
        createNewVersion: 1
      }).then(function(res) {

        if (res.result && res.result.uploadToken) {
          let uploadToken = res.result.uploadToken;
          return self._replaceFileChunk(fileId, uploadToken, fileData).then(function(res) {
            return self._finishFileReplace(fileId, uploadToken).then(function(res) {
              self._log('Updated: ' + localFolder + '/' + fileName);
              resolve(res);
            });
          });
        } else {
          reject(res);
        }
      });
    });
  }

  /**
   * Login
   *
   * /// Private for now
   *
   * @private
   * @param  {string} username
   * @param  {string} password
   * @param  {string} token
   * @param  {int} [longSession=1]
   * @return {Promise}
   */
  login(username, password, token, longSession) {
    let self = this;

    longSession = longSession === 0 ? longSession : 1;

    if (!username || !password) {
      throw Error('StudioHelper#login: missing username and / or password');
    }

    return new Promise(function(resolve, reject) {
      return self._post('login', {username: username, password: password, token: token, longSession: longSession}, {timeout: 10000}, true).then(function(res) {
        resolve(res);
      }, function(err) {
        resolve(err);
      });

      //resolve(username);
    });
  }

  getChangedFiles(studioFiles, localFiles, path, studioFolderId) {
    let self = this,
        fileDetailsWantedCount = 0,
        fileDetailsFetchedCount = 0,
        fileDetailsNeeded = [];

    return new Promise(function(resolve, reject) {
      let fileUploadArray = [];

      for (let i = 0, l = studioFiles.length; i < l; i++) {
        let studioFile = studioFiles[i],
            localFileIndex = localFiles.indexOf(studioFile.name);

        // File found in local and studio folder
        if (localFileIndex !== -1) {
          let fileName = localFiles[localFileIndex],
              fileStats = fs.statSync(path + '/' + fileName),
              changedTime = Math.round(new Date(fileStats.mtime).getTime() / 1000);

          if (changedTime > +studioFile.createdAt) {

            let fileInfo = self.getLocalFileInfo(path + '/' + fileName);

            fileDetailsNeeded.push({
              'id': studioFile.id,
              'sha1': fileInfo.sha1,
              'name': fileName
            });

            fileUploadArray.push({
              action: 'replace',
              folderId: studioFolderId,
              id: studioFile.id,
              type: fileInfo.type,
              size: fileInfo.size,
              localFolder: path,
              name: fileName,
              sha1: fileInfo.sha1,
              data: fileInfo.data,
              createNewVersion: 1
            });

            // Remove it from localFiles array. We only want new files to remain there
            localFiles.splice(localFileIndex, 1);
          } else {

            // Older local file, remove from localFiles
            localFiles.splice(localFileIndex, 1);
          }
        } else {
          //console.log('file not found');
        }
      }

      // Add new files that are not yet uploaded
      for (let i = 0, l = localFiles.length; i < l; i++) {
        let fileName = localFiles[i],
            fileInfo = self.getLocalFileInfo(path + '/' + fileName);

        // Add file to be replaced
        fileUploadArray.push({
          action: 'upload',
          name: fileName,
          folderId: studioFolderId,
          localFolder: path,
          type: fileInfo.type,
          size: fileInfo.size,
          sha1: fileInfo.sha1,
          data: fileInfo.data
        });
      }

      Promise.resolve(fileDetailsNeeded).map(function(file) {
        return self.getFileDetails(file.id).then(function(fileDetails) {

          if (fileDetails && fileDetails.details && fileDetails.details.sha1) {

            // If file has not been changed add it to removable files
            if (fileDetails.details.sha1 === file.sha1) {
              return file.id;
            } else {
              return null;
            }
          }
        });
      }).then(function(res) {

        // Remove unchanged files from upload array
        for (let i = res.length - 1; i >= 0; i--) {
          if (res[i]) {
            for (let j = fileUploadArray.length - 1; j >= 0; j--) {
              if (fileUploadArray[j].id === res[i]) {
                fileUploadArray.splice(j, 1);
              }
            }
          }
        }

        resolve(fileUploadArray);
      });

      if (!fileDetailsNeeded.length) {
        resolve(fileUploadArray);
      }

    });
  }

  getFileDetails(fileId) {
    let self = this;

    return new Promise(function(resolve, reject) {
      self._get('filedetails', fileId).then(function(res) {

        if (res.status === 'error') {
          reject(res.code);
        }

        resolve(res.result);
      });
    });
  }

  /**
   * Create folder
   *
   * @param {Object} settings
   * @param {Object<string>} [settings.parentId] - Studio folder in which we want to create the new folder
   * @param {Object<string>} [settings.name] - Name of the new folder
   * @return {Promise<Object>}
   */
  createFolder(settings) {
    let parentId = settings.parentId || '';
    let folderName = settings.name;

    let path = 'folders/' + parentId;

    return this._post(path, {
      name: folderName
    });
  }

  /**
   * Batch upload/replace files
   *
   * /// Private for now
   *
   * @private
   *
   * @param  {Array<object>} files
   * @return {Array<object>} result
   */

  batchUpload(files) {

    let self = this;

    let processAll = Promise.resolve(files).mapSeries(function(file) {
      switch (file.action) {
        case 'upload':
          return self.uploadFile(file.folderId, file.name, file.type, file.size, file.sha1, file.data, file.localFolder);
          break;
        case 'replace':
          return self.replaceFile(file.id, file.type, file.size, file.sha1, file.data, file.name, file.localFolder);
          break;
      }
    });

    return processAll;
  }

  /**
   * @private
   */
  _uploadChanged(folderId, files, path) {
    let self = this;

    return new Promise(function(resolve, reject) {
      return self.getFiles(folderId).then(function(studioFiles) {
        return self.getChangedFiles(studioFiles, files, path, folderId).then(function(changedFiles) {
          return self.batchUpload(changedFiles).then(function(res) {
            resolve(res);
          });
        });
      });
    });
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  getProxy() {
    return this.proxy;
  }

  setProxy(proxy) {
    this.proxy = proxy;
  }

  uploadFilesInFolders(folders) {
    let self = this,
        foldersData = [],
        ignoredFiles = [];

    for (let i = 0, l = folders.length; i < l; i++) {
      try {
        let folder = folders[i];
        let folderData = {
          folderId: folder.folderId,
          localFolder: folder.localFolder,
          includeSubFolders: folder.includeSubFolders,
          files: []
        };

        let localFiles = fs.readdirSync(folder.localFolder).filter(function(file) {

          // Filter out ignored files if any
          if (self.ignore) {
            return !!self.ignore.filter([path.join(folder.localFolder, file)]).length;
          }

          return true;
        });

        for (let j = 0, l2 = localFiles.length; j < l2; j++) {
          let itemStat = fs.lstatSync(folder.localFolder + '/' + localFiles[j]);

          if (itemStat.isFile()) {
            folderData.files.push(localFiles[j]);
          }
        }

        foldersData.push(folderData);

      } catch (e) {

      }
    }

    return Promise.resolve(foldersData).mapSeries(function(folderData) {
      return self._uploadChanged(folderData.folderId, folderData.files, folderData.localFolder);
    }).then(function(res) {
      return Promise.resolve(self._flattenArray(res));
    });
  }

}

module.exports = StudioHelper;
