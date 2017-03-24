'use strict';

const request = require('request'),
      mime = require('mime-types'),
      Promise = require('bluebird'),
      fs = require('fs'),
      path = require('path'),
      os = require('os'),
      Cryptr = require('cryptr'),
      ignore = require('ignore'),
      throat = require('throat')(Promise),
      ProgressBar = require('progress');

//Promise.longStackTraces();

const API_URL = '/studioapi/v2/',
      CHUNK_SIZE = 4000000,
      MAX_CONCURRENT_CONNECTIONS = 1,
      CREDENTIALS_FILE = '.studio-credentials',
      CREDENTIALS_SECRET_BASE = 'not/that/secret/by/itself/!:(',
      IGNORE_FILE = '.studio-ignore',
      //PROMPT_EXPIRE_TIME = 120000,
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
   * @typedef {Object} ResultObj
   * @property {string} status "ok" or "error"
   * @property {number} code 0 for success
   * @property {string|Object|Array|boolean} result Results
   */

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

    this.credentialsSecret = this._createCredentialsSecret(CREDENTIALS_SECRET_BASE);
    this.cryptr = new Cryptr(this.credentialsSecret);
    this.apiUrl = 'https://' + settings.studio + API_URL;
    this.authToken = '';

    this.inquirer = require('inquirer');
    this.prompt = this.inquirer.createPromptModule();

    this.loginPromptLimiterTimeout = 3000;
    this.loginPromptShownTime = null;

    this.ignore = null;

    if (settings.proxy) {
      this.setProxy(settings.proxy);
    }

    if (settings.credentialsFile) {
      this.credentialsFile = settings.credentialsFile;
    } else {
      this.credentialsFile = CREDENTIALS_FILE;
    }

    this.credentials = this._getCredentials();

    if (this.credentials && this.credentials.authToken) {
      this.setAuthToken(this.credentials.authToken);
    }

    if (settings.promptSchema) {
      this.promptSchema = settings.promptSchema;
    } else {
      this.promptSchema = [{
        'message': 'Username',
        'type': 'input',
        'name': 'name',
        'default': this.credentials && this.credentials.username || ''
      }, {
        'message': 'Password',
        'type': 'password',
        'name': 'password'
      }, {
        'message': 'Yubikey token',
        'type': 'input',
        'name': 'token'
      }];
    }

    if (settings.ignoreFile) {
      this.ignoreFile = settings.ignoreFile;
    } else {
      this.ignoreFile = IGNORE_FILE;
    }

    if (this.ignoreFile) {
      this._addToIgnore(this.ignoreFile);
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
  _getFirstMac() {
    let allowed = ['eth0', 'eth1', 'en0', 'en1'];
    let interfaces = os.networkInterfaces();

    for (let iface in interfaces) {
      if (interfaces.hasOwnProperty(iface)) {
        let interfaceArr = interfaces[iface];

        if (allowed.indexOf(iface) !== -1) {
          for (let i = 0, l = interfaceArr.length; i<l; i++) {
            let addressData = interfaceArr[i];

            if (!addressData.internal && addressData.mac) {
              return addressData.mac;
            }
          }
        }
      }
    }

    return '';
  }

  /**
   * @private
   */
  _createCredentialsSecret(secretBase) {
    // Include mac address in secret
    let mac = this._getFirstMac();
    // Add parts of current path for little bit of extra secrecy :P
    let currentDirParts = __dirname.split('').map((l,i) => (i + 1) % 3 ? l : '').join('');
    // And cpu model
    let cpuModel = '';

    let cpus = os.cpus();
    if (cpus && cpus.length) {
      cpuModel = cpus[0].model;
    }

    return secretBase + mac + currentDirParts + cpuModel;
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

    if (data) {
      data = this._getDecryptedData(data);
    }

    return data;
  }

  /**
   * @private
   */
  _addToIgnore(filePath) {
    try {
      if (!this.ignore) {
        this.ignore = ignore();
      }

      this.ignore.add(fs.readFileSync(filePath, 'utf-8').toString());

      return true;
    } catch (err) {

    }
    return false;
  }

  /**
   * @private
   */
  _post(action, postData, customOptions, passAPIResponseHandling) {
    let options = {
          'url': '',
          'proxy': this.proxy,
          'headers': {
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

    return new Promise(function(resolve) {
      return request.post(options, function(error, response, body) {
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
          'url': '',
          'proxy': this.proxy,
          'headers': {
            'X-authToken': this.authToken
          },
          'body': data
        },
        self = this;

    if (!action) {
      throw Error('Site#_put: action not set');
    }

    options.url = this.apiUrl + action;

    return new Promise(function(resolve) {
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
          'url': '',
          'proxy': this.proxy,
          'headers': {
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

    return new Promise(function(resolve) {
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
  _delete(action) {
    let options = {
          'url': '',
          'proxy': this.proxy,
          'headers': {
            'X-authToken': this.authToken
          }
        },
        args = Array.prototype.slice.call(arguments),
        allArguments = Array.prototype.slice.call(arguments),
        self = this;

    if (!action) {
      throw Error('Site#_post: action not set');
    }

    args.shift();

    options.url = this.apiUrl + action + '/' + args.join('/');

    return new Promise(function(resolve) {
      request.delete(options, function(error, response, body) {
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

    if (error) {
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
        if (!this.promptVisible) {
          self._log(results.result);
        }

        if (!this.loginPromptEnabled) {
          return Promise.reject(results);
        }

        return this._showLoginPrompt().then(function() {
          return lastCall.apply(self, args);
        });
    }


    //Functionality disabled: Let's not assume user wants to connect without proxy
    //if(results.status === 'networkError' && this.getProxy()) {
    //  this.setProxy('');
    //  return lastCall.apply(self, args);
    //}

    return Promise.reject(results);
  }

  _showProgressBar(fileName, dataLength) {
    let columns = process.stdout.columns || 100

    // Workaround for non TTY context
    if (!process.stderr.cursorTo) {
      process.stderr.columns = columns;
      process.stderr.isTTY = true;
      process.stderr.cursorTo = function (column) {
        process.stderr.write('\u001b[' + columns + 'D');
        if (column) {
          process.stderr.write('\u001b[' + column + 'C');
        }
      };
      process.stderr.clearLine = function () {
        this.cursorTo(0)
        process.stderr.write('\u001b[K');
      };
    }

    return new ProgressBar('[Studio] Uploading ' + fileName + ' [:bar] :percent', {
      'complete': '=',
      'incomplete': ' ',
      'width': 20,
      'clear': true,
      'total': dataLength
    });
  }


  _splitData(data) {
    let chunks = [];
    let len = 0;

    if (data.length <= CHUNK_SIZE) {
      return [data];
    }

    while (len < data.length) {
      chunks.push(data.slice(len, Math.min(len + CHUNK_SIZE, data.length)));
      len += CHUNK_SIZE;
    }

    return chunks;
  }

  /**
   * @private
   */
  _replaceFileChunks(folderId, uploadToken, fileData, fileName) {
    let self = this;
    let chunks = this._splitData(fileData);
    let chunkThroat = throat(MAX_CONCURRENT_CONNECTIONS);
    let bar;

    if (chunks.length) {
      bar = this._showProgressBar(fileName, fileData.length);
    }

    return Promise.resolve(chunks).map(function(data) {
      return chunkThroat(function () {
        return self._put('replace/' + folderId + '/' + uploadToken, data).then(function(res) {
          if (bar) {
            bar.tick(data.length);
          }
          return Promise.resolve(res);
        });
      });
    });
  }

  /**
   * @private
   */
  _finishFileReplace(folderId, uploadToken) {
    let self = this;

    return new Promise(function(resolve) {
      return self._post('replace/' + folderId + '/' + uploadToken).then(function(res) {
        resolve(res);
      });
    });
  }

  /**
   * @private
   */
  _uploadFileChunks(folderId, uploadToken, fileData, fileName) {
    let self = this;
    let chunks = this._splitData(fileData);
    let chunkThroat = throat(MAX_CONCURRENT_CONNECTIONS);
    let bar;

    if (chunks.length) {
      bar = this._showProgressBar(fileName, fileData.length);
    }

    return Promise.resolve(chunks).map(function(data) {
      return chunkThroat(function () {
        return self._put('upload/' + folderId + '/' + uploadToken, data).then(function(res) {
          if (bar) {
            bar.tick(data.length);
          }
          return Promise.resolve(res);
        });
      });
    });
  }

  /**
   * @private
   */
  _finishFileUpload(folderId, uploadToken) {
    let self = this;

    return new Promise(function(resolve) {
      return self._post('upload/' + folderId + '/' + uploadToken).then(function(res) {
        resolve(res);
      });
    });
  }

  /**
   * @private
   */
  _flattenArray(arr) {
    let self = this;

    return arr.reduce(function(memo, el) {
      let items = Array.isArray(el) ? self._flattenArray(el) : [el];
      return memo.concat(items);
    }, []);
  }
  /**
   * @private
   */
  _getEncryptedData(data) {
    let encryptedData = null;
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        if (!encryptedData) {
          encryptedData = {};
        }

        encryptedData[key] = this.cryptr.encrypt(data[key]);
      }
    }
    return encryptedData;
  }

  /**
   * @private
   */
  _getDecryptedData(data) {
    let decryptedData = null;
    let decrypted = false;

    try {
      for (let key in data) {
        if (data.hasOwnProperty(key)) {
          if (!decryptedData) {
            decryptedData = {};
          }

          decryptedData[key] = this.cryptr.decrypt(data[key]);

          // Test that authToken is formatted correctly
          if (key === 'authToken' && /^[\w:\-]+$/.test(decryptedData[key])) {
            decrypted = true;
          }
        }
      }
    } catch (e) {}

    return decrypted ? decryptedData : null;
  }

  /**
   * @private
   */
  _updateCredentials(data) {
    let self = this;

    data = this._getEncryptedData(data);

    fs.writeFile(this.credentialsFile, JSON.stringify(data), function(err) {
      if (err) {
        self._log(err);
      }
    });
  }

  _createDirFolders(folderData) {
    let self = this;
    let localFolders = self.getLocalFolders(folderData.localFolder);
    let folderJobs = [];

    //console.log(folderData);

    let getFolderSettings = function (localFolder, folderName, allSettings) {
      //console.log('getting settings');
      //console.log(folderData);

      if (!allSettings) {
        return null;
      }

      let folderPath = path.join(localFolder, folderName);

      for (let key in allSettings) {
        if (allSettings.hasOwnProperty(key)) {
          let regEx = new RegExp(key);

          // Return first matching result
          if (regEx.test(folderPath)) {
            return allSettings[key];
          }
        }
      }

      //console.log(allSettings);

      return null;
    }

    for (let i=0, l=localFolders.length; i<l; i++) {
      folderJobs.push(this.createFolder({
        'parentId': folderData.folderId,
        'name': localFolders[i],
        'localFolder': folderData.localFolder,
        'logCreated': folderData.logCreated,
        'folderSettings': getFolderSettings(folderData.localFolder, localFolders[i], folderData.createdFolderSettings),
        'addIfExists': false
      }));
    }

    return Promise.all(folderJobs).then(function (parentRes) {
      if (folderData.includeSubFolders && parentRes.length) {
        let folderJobs = [];

        for (let i=0, l=parentRes.length; i<l; i++) {
          let folder = parentRes[i].result;
          folderJobs.push(self._createDirFolders({
            'folderId': folder.id,
            'localFolder': path.join(folderData.localFolder, folder.name),
            'logCreated': folderData.logCreated,
            'createdFolderSettings': folderData.createdFolderSettings,
            //'folderSettings': getFolderSettings(folderData.localFolder, folder.name, folderData.createdFolderSettings),
            'includeSubFolders': true
          }));
        }

        if (folderJobs.length) {
          // Create child folders
          return Promise.all(folderJobs).then(function (childRes) {
            // and concat results with parent data
            parentRes = parentRes.concat(childRes);
            return Promise.resolve(parentRes);
          });
        } else {
          return Promise.resolve(parentRes);
        }
      } else {
        return Promise.resolve(parentRes);
      }
    });
  }


  /**
   * Create folders found in local directory if not already created
   * @async Returns Promise
   * @param {Object} folderData
   * @param {string} folderData.folderId - Studio folder id
   * @param {string} folderData.localFolder - Local folder path
   * @param {boolean} [folderData.includeSubFolders=false] - Create sub folders
   * @param {boolean} [folderData.cache=true] - Cache results
   * @param {boolean} [folderData.logCreated=false] - Log successfully created folders
   * @returns {ResultObj[]} [ResultObj.result]{@link CreateFolderResult}
   */
  createDirectoryFolders(folderData) {
    let self = this;

    if (!this._createDirectoryFolderCache) {
      this._createDirectoryFolderCache = {};
    }
    //console.log(folderData);
    //console.log('je');
    // If data has been cached already, resolve
    if (this._createDirectoryFolderCache[folderData.folderId]) {
      return Promise.resolve(this._createDirectoryFolderCache[folderData.folderId]);
    }

    return this._createDirFolders(folderData, this._createDirFoldersData).then(function (res) {
      let flatRes = self._flattenArray(res);
      if (folderData.cache) {
        self._createDirectoryFolderCache[folderData.folderId] = flatRes;
      }
      return Promise.resolve(self._flattenArray(flatRes));
    });
  }


  /**
   * @private
   */
  _showLoginPrompt() {
    let self = this;

    return new Promise(function(resolve) {
      let showPrompt;
      let promptCheck;

      showPrompt = function() {
        self.promptVisible = true;

        self.prompt(self.promptSchema).then(function(result) {
          if (!result) {
            return;
          }

          return self.login(result.name, result.password, result.token, LONG_SESSION).then(function(res) {
            if (res.status === 'ok') {
              self.setAuthToken(res.result.authToken);

              self._updateCredentials({
                'authToken': res.result.authToken,
                'username': result.name
              });

              self.promptVisible = false;
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

      promptCheck = function() {
        setTimeout(() => {
          //console.log('setTimeout');
          if (!self.promptVisible) {
            resolve();
          } else {
            promptCheck();
          }
        }, 100);
      }

      if (self.promptVisible) {
        promptCheck();
      } else {
        showPrompt();
      }
    });
  }

  /**
   * Get local directory folders
   *
   * @param {string} path
   * @return {Array<string>} folders
   */

  getLocalFolders(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
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
   *   }, {
   *     folderId: '568a7a27add453aa1a4f4f58',
   *     localFolder: 'dist/',
   *     includeSubFolders: true,
   *     createdFolderSettings: {
   *       'dist/master': { // Regex match
   *         cacheMaxAge: 64800
   *       },
   *       'dist/dev': {  // Regex match
   *         cacheMaxAge: 2
   *       }
   *     }
   *   }]
   * }).then(function (res) {
   *   console.log(res.length + 'files uploaded');
   * })
   * @async Returns Promise
   * @param {Object} settings
   * @param {Array<Object>} settings.folders
   * @param {string} settings.folders[].folderId - Studio folder id
   * @param {string} settings.folders[].localFolder - Local folder path
   * @param {boolean} [settings.folders[].includeSubFolders=false] - Create and upload sub folders
   * @param {Object} [settings.folders[].createdFolderSettings=null] - Object with paths (glob pattern) as keys and FolderUpdateSettings object as value. See example.
   * @return {Array<Object>} Array of objects with file upload information
   */
  push(settings) {
    let self = this;
    let createFolderJobs = [];

    for (let i=settings.folders.length-1; i>=0; i--) {
      let folderData = settings.folders[i];

      if (folderData.includeSubFolders) {
        folderData.logCreated = true;
        folderData.includeSubFolders = true;
        createFolderJobs.push(this.createDirectoryFolders(folderData));
        //settings.folders.splice(i, 1);
      }
    }

    return Promise.all(createFolderJobs).then(function (res) {
      let createdFolders = self._flattenArray(res);
      let pushFolders = [];

      createdFolders.forEach(function (folderRes) {
        //console.log(folderRes);
        /*if (cacheTimes) {
          for (let key in cacheTimes) {
            if (cacheTimes.hasOwnProperty(key)) {
              console.log(key);
              console.log(folderData);
            }
          }
        }*/
        pushFolders.push({
          'folderId': folderRes.result.id,
          'localFolder': folderRes.result.localFolder
        });
      });

      // Concat the normally inserted folders to this array
      pushFolders = pushFolders.concat(settings.folders);

      return self.uploadFilesInFolders(pushFolders);
    });
  }

  /**
   * Get files of a folder
   *
   * @private for now
   * @param {string} folderId - Studio folder id
   * @return {Promise<Array<Object>>}
   **/
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

  /**
   * Delete files
   *
   * @private for now
   * @param {Array<string>} files - Array of file ids
   * @return {Promise<Object>}
   **/
  deleteFiles(files) {
    let self = this;

    return Promise.resolve(files).mapSeries(function(file) {
      //return self._delete('file', file);
      return self._delete('file', file);
    }).then(function (res) {
      let resArr = res;

      // Check that all delete actions are ok
      for (let i=0, l=resArr.length; i<l; i++) {
        if (resArr[i].result === false) {
          return Promise.resolve({
            'status': 'error',
            'result': false,
            'code': -1
          });
        }
      }

      return Promise.resolve({
        'status': 'ok',
        'result': true,
        'code': 0
      });
    });
  }

  getLocalFileInfo(filePath) {
    let stats = fs.statSync(filePath),
        size = stats.size,
        changed = Math.round(new Date(stats.mtime).getTime() / 1000),
        data = fs.readFileSync(filePath),
        type = mime.lookup(filePath),
        sha1;

    // Studio doesn't let you upload empty files, se we add one space as content
    if (data.length === 0) {
      data = ' ';
      size = 1;
    }

    sha1 = require('crypto').createHash('sha1').update(data).digest('hex');

    return {
      'type': type,
      'size': size,
      'changed': changed,
      'sha1': sha1,
      'data': data
    };
  }

  /**
   * @private
   */
  uploadFile(folderId, fileName, fileType, fileSize, sha1, fileData, localFolder) {
    let self = this;

    return new Promise(function(resolve, reject) {
      return self._post('upload/' + folderId, {
        'filename': fileName,
        'filetype': fileType,
        'filesize': fileSize,
        'sha1': sha1
      }).then(function(res) {
        if (res.result && res.result.uploadToken) {
          let uploadToken = res.result.uploadToken;
          return self._uploadFileChunks(folderId, uploadToken, fileData, fileName).then(function() {
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
        'filetype': fileType,
        'filesize': fileSize,
        'sha1': sha1,
        'createNewVersion': 1
      }).then(function(res) {
        if (res.result && res.result.uploadToken) {
          let uploadToken = res.result.uploadToken;
          return self._replaceFileChunks(fileId, uploadToken, fileData, fileName).then(function() {
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
   * Get required information about files for upload
   *
   * @private for now
   * @param {Array<string>} files - files with paths
   * @param {string} folderId - Studio folder id
   * @return {Array<Object>} Array of file information objects
   */
  getUploadInformation(files, folderId) {
    let uploadReadyFiles = [];

    for (let i = 0, l = files.length; i < l; i++) {
      let filePath = path.dirname(files[i]),
          fileName = path.basename(files[i]),
          fileInfo = this.getLocalFileInfo(filePath + '/' + fileName);

      // Add file to be replaced
      uploadReadyFiles.push({
        'action': 'upload',
        'name': fileName,
        'folderId': folderId,
        'localFolder': filePath,
        'type': fileInfo.type,
        'size': fileInfo.size,
        'sha1': fileInfo.sha1,
        'data': fileInfo.data
      });
    }

    return uploadReadyFiles;
  }

  /**
   * Get required information about files for replacement
   *
   * @private for now
   * @param {Array<Object>} files
   * @param {string} files[].fileId - Studio file id
   * @param {string} files[].localFile - Local file path
   */
  getReplaceInformation(files) {
    let replaceReadyFiles = [];

    for (let i = 0, l = files.length; i < l; i++) {
      let fileId = files[i].fileId,
          localFile = files[i].localFile,
          filePath = path.dirname(localFile),
          fileName = path.basename(localFile),
          fileInfo = this.getLocalFileInfo(localFile);

      replaceReadyFiles.push({
        'action': 'replace',
        'id': fileId,
        'type': fileInfo.type,
        'size': fileInfo.size,
        'localFolder': filePath,
        'name': fileName,
        'sha1': fileInfo.sha1,
        'data': fileInfo.data,
        'createNewVersion': 1
      });
    }

    return replaceReadyFiles;
  }

  /**
   * Upload files to a specified folder
   * @private for now
   * @param  {Array<string>} files - file with path
   * @param  {string} folderId - Studio folder id
   * @return {Promise<Array<Object>>}
   */
  uploadFiles(files, folderId) {
    if (!folderId) {
      throw Error('StudioHelper#uploadFiles: folderId not set');
    }

    let uploadFiles = this.getUploadInformation(files, folderId);

    return this.batchUpload(uploadFiles);
  }

  /**
   * Replace files
   * @private for now
   * @param {Array<Object>} files
   * @param {string} files[].fileId - Studio file id
   * @param {string} files[].localFile - Local file path
   * @return {Promise<Array<Object>>}
   */
  replaceFiles(files) {
    let replaceFiles = this.getReplaceInformation(files);
    return this.batchUpload(replaceFiles);
  }

  _uploadChanged(folderId, files, path) {
    let self = this;

    return new Promise(function(resolve) {
      return self.getFiles(folderId).then(function(studioFiles) {
        return self.getChangedFiles(studioFiles, files, path, folderId).then(function(changedFiles) {
          return self.batchUpload(changedFiles).then(function(res) {
            resolve(res);
          });
        });
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

    return new Promise(function(resolve) {
      return self._post('login', {
        'username': username,
        'password': password,
        'token': token,
        'longSession': longSession
      }, { 'timeout': 10000 }, true).then(function(res) {
        resolve(res);
      }, function(err) {
        resolve(err);
      });

      //resolve(username);
    });
  }

  getChangedFiles(studioFiles, localFiles, path, studioFolderId) {
    let self = this,
        fileDetailsNeeded = [];

    return new Promise(function(resolve) {
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
              'action': 'replace',
              'folderId': studioFolderId,
              'id': studioFile.id,
              'type': fileInfo.type,
              'size': fileInfo.size,
              'localFolder': path,
              'name': fileName,
              'sha1': fileInfo.sha1,
              'data': fileInfo.data,
              'createNewVersion': 1
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
          'action': 'upload',
          'name': fileName,
          'folderId': studioFolderId,
          'localFolder': path,
          'type': fileInfo.type,
          'size': fileInfo.size,
          'sha1': fileInfo.sha1,
          'data': fileInfo.data
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
   * @typedef {Object} CreateFolderResult
   * @property {string} id Created folder id
   * @property {string} name Local folder name, might be different in Studio
   * @property {string} localFolder Local folder path
   */

  /**
   * Create folder
   * @async Returns a promise
   * @param {Object} settings
   * @param {string} settings.name - Name of the new folder
   * @param {string} [settings.parentId] - Studio folder in which we want to create the new folder
   * @param {boolean} [settings.addIfExists=true] - Return the already created folder id if false
   * @param {string} [settings.localFolder] - local folder path
   * @param {boolean} [settings.logCreated=false] - log created folders
   * @param {FolderUpdateSettings} [settings.folderSettings] - folder settings to apply after creation
   * @returns {ResultObj} [ResultObj.result]{@link CreateFolderResult}
   */
  createFolder(settings) {
    let self = this;
    let parentId = settings.parentId || '';
    let folderName = settings.name;
    let localFolderPath = settings.localFolder || '';
    let addIfExists = settings.addIfExists === false ? false : true;
    let logging = settings.logCreated === true ? true : false;
    let folderSettings = settings.folderSettings;
    let apipath = 'folders/' + parentId;

    console.log(localFolderPath);

    if (addIfExists) {
      return this._post(apipath, {
        'name': folderName
      }).then(function (res) {
        let resData;
        if (res.status === 'ok') {
          resData = {
            'status': 'ok',
            'code': 0,
            'result': {
              'id': res.result,
              'name': folderName,
              'localFolder': path.join(localFolderPath, folderName)
            }
          };

          if (logging) {
            self._log('Created folder: ' + folderName);
          }

          if (folderSettings) {
            self.updateFolderSettings(res.result, folderSettings);
          }
        } else {
          resData = res;
        }

        return Promise.resolve(resData);
      });
    } else {
      let self = this;

      return this.getFolders(parentId).then(function (res) {
        let folders = res.result;

        // Return folder data if found
        for (let i=0, l=folders.length; i<l; i++) {
          let folder = folders[i];
          if (folder.name === folderName) {
            return Promise.resolve({
              'status': 'ok',
              'code': 0,
              'result': {
                'id': folder.id,
                'name': folderName,
                'localFolder': path.join(localFolderPath, folderName)
              }
            });
          }
        }

        // If not found, create normally
        return self._post(apipath, {
          'name': folderName
        }).then(function (res) {
          let resData;

          if (res.status === 'ok') {
            resData = {
              'status': 'ok',
              'code': 0,
              'result': {
                'id': res.result,
                'name': folderName,
                'localFolder': path.join(localFolderPath, folderName)
              }
            };

            if (logging) {
              self._log('Created folder: ' + folderName);
            }

            if (folderSettings) {
              self.updateFolderSettings(res.result, folderSettings);
            }
          } else {
            resData = res;
          }

          return Promise.resolve(resData);
        });
      });
    }
  }

  /**
   * Delete folder
   *
   * @private for now
   * @param {string} folderId
   * @return {Promise<Object>}
   */
  deleteFolder(folderId) {
    return this._delete('folders', folderId);
  }

  /**
   * Delete child folders of a given folder
   *
   * @private for now
   * @param {string} folderId
   * @return {Promise<Object>}
   */
  deleteChildFolders(folderId) {
    let self = this;

    return this.getFolders(folderId).then(function (res) {
      let folders = res.result;

      return Promise.resolve(folders).mapSeries(function(folder) {
        return self.deleteFolder(folder.id);
      });
    }).then(function (res) {
      let resArr = self._flattenArray(res);

      // Check that all delete actions are ok
      for (let i=0, l=resArr.length; i<l; i++) {
        if (resArr[i].status !== 'ok') {
          return Promise.resolve({
            'status': 'error',
            'result': false,
            'code': -1
          });
        }
      }

      return Promise.resolve({
        'status': 'ok',
        'result': true,
        'code': 0
      });
    })
  }

  /**
   * @typedef {Object} FolderSettings
   * @property {number} fileCacheMaxAge Cache time in seconds
   * @property {boolean} fileCacheProtected Can cache time be changed
   * @property {boolean} apiFolder API folders can not be modified in Studio GUI
   * @property {boolean} noversioning
   * @property {boolean} public Public folder path, false if not public
   */

  /**
   * @typedef {Object} FolderUpdateSettings
   * @property {number} fileCacheMaxAge Cache time in seconds
   * @property {number} fileCacheProtected Can cache time be changed (0 or 1)
   * @property {number} apiFolder API folders can not be modified in Studio GUI (0 or 1)
   * @property {number} noversioning (0 or 1)
   * @property {number} public Public folder path, false if not public (0 or 1)
   */

  /**
   * Get folder settings
   * @async Returns Promise
   * @private for now
   * @param {string} folderId
   * @returns {ResultObj} [ResultObj.result]{@link FolderSettings}
   */
  getFolderSettings(folderId) {
    return this._get('folderSettings', folderId).then(function (res) {
      /*const items = res.result;


      if (!items) {
        return Promise.resolve(res);
      }

      // updateFolderSettings method converts all settings to strings. Change them back to numbers from strings and booleans if needed
      for (let key in items) {
        if (items.hasOwnProperty(key)) {
          try {
            items[key] = JSON.parse(items[key]);

            // Convert booleans to 1 or 1
            if (items[key] === true || items[key] === false) {
              items[key] = items[key] ? 1 : 0;
            }
          } catch (e) {
            // If this is actually string, don't change anything
          }
        }
      }*/

      return Promise.resolve(res);
    });
  }

  /**
   * Update folder settings
   * @async Returns Promise
   * @private for now
   * @param {string} folderId
   * @param {FolderUpdateSettings} folder settings
   * @returns {ResultObj}
   */
  updateFolderSettings(folderId, settings) {
    console.log('updating folder settings');
    console.log(folderId, settings);
    return this._post('folderSettings/' + folderId, settings);
  }

  /**
   * Get folders
   *
   * @private for now
   * @param {string} [parentId] - Parent folder id
   * @return {Promise<Object>}
   */
  getFolders(parentId) {
    return this._get('folders', parentId);
  }

  /**
   * Not implemented in the API. Maybe someday
   * @private
   */
  getFolderDetails(folderId) {
    return this._get('folderdetails', folderId);
  }

  /**
   * Batch upload/replace files
   *
   * @private for now
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
        case 'replace':
          return self.replaceFile(file.id, file.type, file.size, file.sha1, file.data, file.name, file.localFolder);
      }
    });

    return processAll;
  }

  /**
   * @private
   */
  _uploadChanged(folderId, files, path) {
    let self = this;

    return new Promise(function(resolve) {
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
        foldersData = [];

    for (let i = 0, l = folders.length; i < l; i++) {
      try {
        let folder = folders[i];
        let folderData = {
          'folderId': folder.folderId,
          'localFolder': folder.localFolder,
          'includeSubFolders': folder.includeSubFolders,
          'files': []
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
