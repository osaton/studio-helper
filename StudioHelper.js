'use strict';

const request = require('request'),
      mime = require('mime-types'),
      Promise = require('bluebird'),
      secretHelper = require('./lib/secret-helper'),
      fs = require('fs'),
      path = require('path'),
      os = require('os'),
      ignore = require('ignore'),
      throat = require('throat')(Promise),
      ProgressBar = require('progress'),
      findCacheDir = require('find-cache-dir'),
      debugApiErrors = require('debug')('studio-helper:api-error');

//Promise.longStackTraces();

const API_URL = '/studioapi/v2/',
      CHUNK_SIZE = 4000000,
      MAX_CONCURRENT_UPLOADS = 5,
      MAX_CONCURRENT_CHUNK_CONNECTIONS = 1,
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
   * @param {boolean} [settings.strictSSL=true] - Change to false if you're using self-signed certificate
   * @param {boolean} [settings.loginPromptEnabled=true] - Show login prompt if authentication fails
   * @param {string}  [settings.credentialsFile=.studio-credentials] - File in which credentials are saved
   * @param {boolean} [settings.useCacheDir=false] - Store credentials file in Node modules cache dir
   * @param {number}  [settings.concurrentUploads=1] - Max concurrent uploads when using batch methods. Defaul 1, Max 5.
   * @param {string}  [settings.ignoreFile=.studio-ignore] - Utilised by [push]{@link StudioHelper#push} method. Uses gitignore {@link https://git-scm.com/docs/gitignore|spec}
   */
  constructor(settings) {
    if (!settings) {
      throw Error('StudioHelper#constructor: no settings object');
    }
    if (!settings.studio) {
      throw Error('StudioHelper#constructor: settings.studio must be set');
    }

    this._createCredentialsSecret(CREDENTIALS_SECRET_BASE);
    this.apiUrl = 'https://' + settings.studio + API_URL;
    this.authToken = '';

    this.inquirer = require('inquirer');
    this.prompt = this.inquirer.createPromptModule();

    this.loginPromptLimiterTimeout = 3000;
    this.loginPromptShownTime = null;

    this.ignore = null;

    this.strictSSL = true;

    if (settings.proxy) {
      this.setProxy(settings.proxy);
    }

    if (settings.credentialsFile) {
      this.credentialsFile = settings.credentialsFile;
    } else {
      this.credentialsFile = CREDENTIALS_FILE;
    }

    if (typeof settings.loginPromptEnabled === 'boolean') {
      this.loginPromptEnabled = settings.loginPromptEnabled;
    } else {
      this.loginPromptEnabled = true;
    }


    // When used programmatically the credentials file is not needed
    if (this.loginPromptEnabled === false) {
      this.credentialsFile = null;
    }

    if (settings.useCacheDir && this.credentialsFile) {
      const thunk = findCacheDir({ 'name': 'studio-helper', 'thunk': true })
      this.credentialsFile = thunk(this.credentialsFile);
      this.credentialsDir = thunk();
    }

    this.credentials = this._getCredentials();

    if (this.credentials && this.credentials.authToken) {
      this.setAuthToken(this.credentials.authToken);
    }

    if (settings.strictSSL === false) {
      this.strictSSL = false;
    }

    if (settings.promptSchema) {
      this.promptSchema = settings.promptSchema;
    } else {
      this.promptSchema = [{
        'message': 'Username',
        'type': 'input',
        'name': 'name',
        'default': this.credentials && this.credentials.username || ''
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



    this.concurrentUploads = settings.concurrentUploads || 1;

    if (this.concurrentUploads > MAX_CONCURRENT_UPLOADS) {
      this.concurrentUploads = MAX_CONCURRENT_UPLOADS;
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
    const secretStr = secretBase +
      secretHelper.getFirstMAC() +
      secretHelper.getCPUModel() +
      secretHelper.getCurrentPath();

    this._credentialsSecret = secretStr;

    return this._credentialsSecret;
  }

  /**
   * @private
   */
  _getCredentialsSecret() {
    return this._credentialsSecret;
  }

  /**
   * @private
   */
  _getCredentials() {
    let data = null;
    let dataString = null;

    if (!this.credentialsFile) {
      return null;
    }

    try {
      dataString = fs.readFileSync(this.credentialsFile, 'utf8');
    } catch (e) {
    }

    if (dataString) {
      data = this._getDecryptedData(dataString);
    }

    return data;
  }

  /**
   * Match correct header settings
   * @private
   * @param {Object} options
   * @param {string} options.localFolder
   * @param {string} options.fileName
   * @param {Object} options.allHeaders - Object with file paths regex as keys
   */
  _getPossibleFileHeaders(options) {
    if (!options.allHeaders) {
      return null;
    }

    let filePath = path.join(options.localFolder, options.fileName);

    // Use same separator for every file system
    filePath = filePath.split(path.sep).join('/');


    // Use this for correct order of enumerable keys
    let filePatterns = Object.getOwnPropertyNames(options.allHeaders);

    // Check if this files path matches any of the regex patterns in options.allHeaders
    for (let i=0, l=filePatterns.length; i<l; i++) {
      let pattern = filePatterns[i];
      let regEx = new RegExp(pattern);

      if (regEx.test(filePath)) {
        return options.allHeaders[pattern];
      }
    }

    return null;
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
          'strictSSL': this.strictSSL,
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

    return new Promise(function(resolve, reject) {
      return request.post(options, function(error, response, body) {
        if (body && passAPIResponseHandling) {
          resolve(JSON.parse(body));
        }

        return self._handleAPIResponse(error, body, self._post, action, postData, customOptions).then(function(res) {
          resolve(res);
        }).catch(function(res) {
          debugApiErrors('_post', options, res);
          reject(res);
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
          'strictSSL': this.strictSSL,
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

    return new Promise(function(resolve, reject) {
      request.put(options, function(error, response, body) {
        //let data = JSON.parse(body);

        return self._handleAPIResponse(error, body, self._put, action, data).then(function(res) {
          resolve(res);
        }).catch(function(res) {
          debugApiErrors('_put', options, res);
          reject(res);
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
          'strictSSL': this.strictSSL,
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

    return new Promise(function(resolve,reject) {
      request.get(options, function(error, response, body) {
        allArguments.unshift(error, body, self._get);
        return self._handleAPIResponse.apply(self, allArguments).then(function(res) {
          resolve(res);
        }).catch(function(res) {
          debugApiErrors('_get', options, res);
          reject(res);
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
          'strictSSL': this.strictSSL,
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

    return new Promise(function(resolve, reject) {
      request.delete(options, function(error, response, body) {
        allArguments.unshift(error, body, self._get);
        return self._handleAPIResponse.apply(self, allArguments).then(function(res) {
          resolve(res);
        }).catch(function(res) {
          debugApiErrors('_delete', options, res);
          reject(res);
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

  /**
   * @typedef ProgressOptions
   * @property {string} complete
   * @property {string} incomplete
   * @property {number} width
   * @property {boolean} clear
   * @property {number} total
   *
   * @param {string} title
   * @param {number} total
   * @param {ProgressOptions} options
   */
  _showProgressBar(title, total, options = {}) {
    let columns = process.stdout.columns || 100

    const defaults = {
      'complete': '=',
      'incomplete': ' ',
      'width': 20,
      'clear': true,
      'total': total
    }

    const settings = Object.assign(defaults, options);

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

    return new ProgressBar(`[Studio] ${title}`, settings);
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
    let chunkThroat = throat(MAX_CONCURRENT_CHUNK_CONNECTIONS);
    let bar;

    if (chunks.length) {
      bar = this._showProgressBar('Uploading ' + fileName + ' [:bar] :percent', fileData.length);
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
    let chunkThroat = throat(MAX_CONCURRENT_CHUNK_CONNECTIONS);
    let bar;

    if (chunks.length) {
      bar = this._showProgressBar('Uploading ' + fileName + ' [:bar] :percent', fileData.length);
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
  _getEncryptedString(data) {
    const encryptedString = secretHelper.encryptSync(
      this._getCredentialsSecret(),
      JSON.stringify(data)
    );

    return encryptedString;
  }

  /**
   * @private
   */
  _getDecryptedData(dataString) {
    let data = null;

    try {
      const decryptedString = secretHelper.decryptSync(
        this._getCredentialsSecret(),
        dataString
      );

      data = JSON.parse(decryptedString);
    } catch (e) {}

    return data;
  }

  /**
   * @private
   */
  _updateCredentials(data) {
    const dataString = this._getEncryptedString(data);

    try {
      if (this.credentialsDir) {
        fs.mkdirSync(this.credentialsDir, { 'recursive': true });
      }

      fs.writeFileSync(this.credentialsFile, dataString);
      return true;
    } catch (err) {
      this._log(err);
      return false;
    }
  }

  _createDirFolders(folderData) {
    let self = this;
    let localFolders = self.getLocalFolders(folderData.localFolder);
    let folderJobs = [];

    let getFolderSettings = function (localFolder, folderName, allSettings) {
      if (!allSettings) {
        return null;
      }

      let folderPath = path.join(localFolder, folderName);

      // Use same separator for every file system
      folderPath = folderPath.split(path.sep).join('/');

      // Use this for correct order of enumerable keys
      let keys = Object.getOwnPropertyNames(allSettings);

      for (let i=0, l=keys.length; i<l; i++) {
        let key = keys[i];

        if (allSettings.hasOwnProperty(key)) {
          let regEx = new RegExp(key);

          // Return first matching result
          if (regEx.test(folderPath)) {
            return allSettings[key];
          }
        }
      }

      return null;
    }

    for (let i=0, l=localFolders.length; i<l; i++) {
      folderJobs.push(this.createFolder({
        'parentId': folderData.folderId,
        'name': localFolders[i],
        'baseLocalFolder': folderData.baseLocalFolder || folderData.localFolder,
        'localFolder': folderData.localFolder,
        'logCreated': folderData.logCreated,
        'folderSettings': getFolderSettings(folderData.localFolder, localFolders[i], folderData.createdFolderSettings),
        'addIfExists': false
      }).then(function (res) {
        // If we have settings for this newly created folder, update them now
        let folderSettings = getFolderSettings(folderData.localFolder, localFolders[i], folderData.createdFolderSettings);

        if (folderSettings && res.result.created) {
          return self.updateFolderSettings(res.result.id, folderSettings, { 'log': folderData.logCreated, 'folderName': localFolders[i] }).then(function () {
            // Return the original createFolder res, not update result
            return res;
          });
        }

        return Promise.resolve(res);
      }));
    }

    return Promise.all(folderJobs).then(function (parentRes) {
      if (folderData.includeSubFolders && parentRes.length) {
        let folderJobs = [];

        for (let i=0, l=parentRes.length; i<l; i++) {
          let folder = parentRes[i].result;
          folderJobs.push(self._createDirFolders({
            'folderId': folder.id,
            'baseLocalFolder': folder.baseLocalFolder,
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
   * Login
   *
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
      }, { 'timeout': 40000 }, true).then(function(res) {
        resolve(res);
      }, function(err) {
        resolve(err);
      });

      //resolve(username);
    });
  }

  /**
   * Update a single setting for this session
   *
   * See documentation for available settings.
   *
   * @see {@link https://labs.crasman.fi/fi/help/studio/studioapi/studioapiresource/put-apisettings-setting-value/ | Documentation}
   *
   * @param  {string} setting
   * @param  {string} value
   */
  async updateSessionSetting(setting, value) {
    return this._put(`apisettings/${setting}/${value}`);
  }

  /**
   * Reset all API settings to default values
   *
   */
  resetSessionSettings() {
    return this._put('apisettings/reset');
  }


  /**
   * Get all folders in Studio
   *
   * @param {number} [limit=1000] - Max number of folders to return. Max 1000, default 1000.
   * @param {number} [offset=0] - Offset
   */
  getAllFolders(limit = 1000, offset = 0) {
    return this._get('allfolders', limit, offset);
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
   *     createNewFileVersions: false,
   *     createdFolderSettings: {
   *       'dist/master': { // Regex match
   *         cacheMaxAge: 64800
   *       },
   *       'dist/dev': {  // Regex match
   *         cacheMaxAge: 2
   *       }
   *     },
   *     createdFileHeaders: {
   *       'dist/master/service-worker.js': { // Regex match
   *         'Service-Worker-Allowed': '/'
   *       }
   *     }
   *   }]
   * }).then(function (res) {
   *   console.log(res.length + 'files uploaded');
   * })
   * @async
   * @param {Object} settings
   * @param {Array<Object>} settings.folders
   * @param {string} settings.folders[].folderId - Studio folder id
   * @param {string} settings.folders[].localFolder - Local folder path
   * @param {boolean} [settings.folders[].createNewFileVersions=true] - Create new versions of uploaded / updated files. Use false to save disk space if you don't need version history.
   * @param {boolean} [settings.folders[].includeSubFolders=false] - Create and upload sub folders
   * @param {Object} [settings.folders[].createdFolderSettings=null] - Object with paths (RegEx pattern) as keys and FolderUpdateSettings object as value. See example.
   * @param {Object} [settings.folders[].createdFileHeaders=null] - Object with file paths (RegEx pattern) as keys and FileHeaderSettings objcet as value. See example.
   * @return {Array<Object>} Array of objects with file upload information. Array has `data` property which contains additional information.
   */
  push(settings) {
    let self = this;
    let createFolderJobs = [];
    const folderLocalPaths = [];

    for (let i=settings.folders.length-1; i>=0; i--) {
      let folderData = settings.folders[i];

      folderLocalPaths.push(folderData.localFolder);

      if (folderData.includeSubFolders) {
        folderData.logCreated = true;
        createFolderJobs.push(this.createDirectoryFolders(folderData));
      }
    }

    return Promise.all(createFolderJobs).then(function (res) {
      let createdFolders = self._flattenArray(res);
      let pushFolders = [];

      createdFolders.forEach(function (folderRes) {
        const pushFolderData = {
          'folderId': folderRes.result.id,
          'localFolder': folderRes.result.localFolder
        };


        const folderSettingsIndex = folderLocalPaths.indexOf(folderRes.result.baseLocalFolder);

        if (folderSettingsIndex !== -1) {
          const folderSettings = settings.folders[folderSettingsIndex];

          // If folder had createdFileHeaders options, attach them to the upload options
          if (folderSettings.createdFileHeaders) {
            pushFolderData.createdFileHeaders = folderSettings.createdFileHeaders;
          }

          pushFolderData.createNewFileVersions = folderSettings.createNewFileVersions;
        }

        pushFolders.push(pushFolderData);
      });

      // Concat the normally inserted folders to this array
      pushFolders = pushFolders.concat(settings.folders);

      return self.uploadFilesInFolders(pushFolders);
    });
  }

  /**
   * Create folders found in local directory if not already created
   *
   * @async
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
   * Get files of a folder
   *
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
   * @param {Array<string>} files - Array of file ids
   * @param {Object} options
   * @param {number} [options.throttle=1] - Number of concurrent delete file requests. Max 5
   * @param {number} [options.showProgress=false] - Number of concurrent delete file requests. Max 5
   * @param {ProgressOptions} [options.progressOptions] - Progress bar options
   * @return {Promise<Object>}
   **/
  deleteFiles(files, options = {}) {
    const defaults = {
      'throttle': 1,
      'showProgress': false,
      'progressOptions': null
    };

    const settings = Object.assign(defaults, options);

    // Max 5 concurrent delete operations
    if (settings.throttle > 5) {
      settings.throttle = 5;
    }

    let bar;
    if (settings.showProgress) {
      bar = this._showProgressBar(`Deleting ${files.length} file(s) [:bar] :percent`, files.length, settings.progressOptions);
    }

    const chunkThroat = throat(settings.throttle);

    return Promise.resolve(files).map(file => {
      return chunkThroat(() => {
        return this._delete('file', file).then(res => {
          if (bar) {
            bar.tick(1);
          }

          return res;
        })
      });
    }).then(function (res) {
      const resArr = res;

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

      return {
        'status': 'ok',
        'result': true,
        'code': 0
      };
    });
  }

  /**
   * Upload files to a specified folder
   *
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
   *
   * @param {Array<Object>} files
   * @param {string} files[].fileId - Studio file id
   * @param {string} files[].localFile - Local file path
   * @param {Object} [options]
   * @param {boolean} [options.createNewVersion=true] - Create new version of files
   * @return {Promise<Array<Object>>}
   */
  replaceFiles(files, options = {}) {
    let replaceFiles = this.getReplaceInformation(files, options);
    return this.batchUpload(replaceFiles);
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
  uploadFile(folderId, fileName, fileType, fileSize, sha1, fileData, localFolder, options = {}) {
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
              const filePath = path.join(localFolder, fileName);
              self._log('Uploaded: ' + filePath);

              // Update file headers, if we have something defined
              if (options.headers) {
                return self.setFileHeaders(res.result.createdFileId, options.headers, { 'log': true, 'filePath': filePath }).then(() => {
                  return resolve(res);
                });
              }
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

  replaceFile(fileId, fileType, fileSize, sha1, fileData, fileName, localFolder, options = {}) {
    let self = this;

    const defaults = {
      'createNewVersion': true,
    };

    const settings = Object.assign(defaults, options);
    const fileSettings = {
      'filetype': fileType,
      'filesize': fileSize,
      'sha1': sha1,
      'createNewVersion': settings.createNewVersion ? 1 : 0
    }

    return new Promise(function(resolve, reject) {
      // Start upload
      return self._post('replace/' + fileId, fileSettings).then(function(res) {
        if (res.result && res.result.uploadToken) {
          let uploadToken = res.result.uploadToken;
          return self._replaceFileChunks(fileId, uploadToken, fileData, fileName).then(function() {
            return self._finishFileReplace(fileId, uploadToken).then(function(res) {
              const filePath = path.join(localFolder, fileName);

              self._log('Updated: ' + filePath);

              // Update file headers, if we have something defined
              if (options.headers) {
                return self.setFileHeaders(res.result.createdFileId, options.headers, { 'log': true, 'filePath': filePath }).then(() => {
                  return resolve(res);
                });
              }

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
   * Get file headers
   *
   * @param {string} fileId
   * @return {ResultObj}
   */
  getFileHeaders(fileId) {
    return this._get('fileheaders', fileId).then(function(res) {
      if (res.status === 'error') {
        return Promise.reject(res);
      }

      return {
        'status': 'ok',
        'code': 0,
        'result': {
          'fileId': fileId,
          'headers': Array.isArray(res.result) ? null : res.result // Convert empty array to null, otherwise use headers object
        }
      };
    });
  }

  /**
   * @typedef {Object} FileHeaderSettings - Key / value pairs of wanted header names and their values
   */

  /**
   * Update file headers
   *
   * @async
   * @param {string} fileId
   * @param {FileHeaderSettings} headerSettings key / value pairs
   * @param {Object} [options]
   * @param {boolean} [options.log=false] log results
   * @param {string} [options.fileName=''] used for logging
   * @return {ResultObj}
   */
  setFileHeaders(fileId, headerSettings, options) {
    const self = this;
    const opt = {
      'log': false,
      'filePath': ''
    }
    //const jobs = [];

    if (options) {
      for (let key in options) {
        if (options.hasOwnProperty(key)) {
          opt[key] = options[key]
        }
      }
    }

    const keys = Object.keys(headerSettings);

    // Has to be series or header data might be lost
    const res = Promise.resolve(keys).mapSeries(headerKey => {
      const headerValue = headerSettings[headerKey];

      return this._put('fileheader/' + fileId + '/' + headerKey, headerValue).then(res => {
        return {
          'status': res.status,
          'key': headerKey,
          'value': headerValue
        };
      });
    });

    return res.then(results => {
      const headersRes = {
        'status': 'ok',
        'code': 0,
        'result': {
          'fileId': fileId,
          'headers': null
        }
      };

      results.forEach(res => {
        if (res.status === 'ok') {
          if (!headersRes.result.headers) {
            headersRes.result.headers = {}
          }

          headersRes.result.headers[res.key] = res.value
        } else {
          return Promise.reject(res);
        }
      });

      if (opt.log) {
        self._log('Updated file headers: ' + opt.filePath + ' => ' + JSON.stringify(headersRes.result.headers));
      }

      return headersRes;
    });
  }

  /**
   * Get required information about files for upload
   *
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
   * @param {Array<Object>} files
   * @param {string} files[].fileId - Studio file id
   * @param {string} files[].localFile - Local file path
   * @param {Object} options
   * @param {boolean} [options.createNewVersion=true] - Create new version of files
   */
  getReplaceInformation(files, options = {}) {
    let replaceReadyFiles = [];

    const defaults = {
      'createNewVersion': true
    };

    const settings = Object.assign(defaults, options);

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
        'createNewVersion': settings.createNewVersion ? 1 : 0
      });
    }

    return replaceReadyFiles;
  }

  /**
   * @private
   *
   * @param {Object[]} studioFiles
   * @param {string[]} localFiles
   * @param {string} dirPath
   * @param {string} studioFolderId
   * @param {Object} options
   * @param {boolean} [options.createNewVersion=true]
   * @param {Object} [options.createdFileHeaders]
   */
  getChangedFiles(studioFiles, localFiles, dirPath, studioFolderId, options = {}) {
    let self = this;

    const defaults = {
      'createNewVersion': true,
      'createdFileHeaders': null
    };

    const settings = Object.assign(defaults, options);
    const fileArray = [];
    // `data` property for storing additional information about changed files
    fileArray.data = {
      // Files only found in Studio
      'remoteOnlyFiles': []
    }
    return new Promise(function(resolve) {
      for (let i = 0, l = studioFiles.length; i < l; i++) {
        const studioFile = studioFiles[i];
        const localFileIndex = localFiles.indexOf(studioFile.name);
        const studioFileSha1 = studioFile.details && studioFile.details.sha1 || null;
        const fileName = localFiles[localFileIndex];

        // File found in local and studio folder
        if (localFileIndex !== -1) {
              const fileStats = fs.statSync(path.join(dirPath, fileName));
              const changedTime = Math.round(new Date(fileStats.mtime).getTime() / 1000);

          // If local file is newer
          if (changedTime > +studioFile.createdAt) {
            let fileInfo = self.getLocalFileInfo(path.join(dirPath, fileName));

            // and if it has different sha1, add it to upload array
            if (studioFileSha1 !== fileInfo.sha1) {
              fileArray.push({
                'action': 'replace',
                'folderId': studioFolderId,
                'id': studioFile.id,
                'type': fileInfo.type,
                'size': fileInfo.size,
                'localFolder': dirPath,
                'name': fileName,
                'sha1': fileInfo.sha1,
                'data': fileInfo.data,
                'createNewVersion': settings.createNewVersion ? 1 : 0
              });
            }
          }

          // Remove it from localFiles array. We only want new files to remain there
          localFiles.splice(localFileIndex, 1);
        } else {
          fileArray.data.remoteOnlyFiles.push({
            'localFolder': dirPath,
            'folderId': studioFolderId,
            'name': studioFile.name,
            'id': studioFile.id,
            'size': studioFile.size
          });
        }
      }

      // Add new files that are not yet uploaded
      for (let i = 0, l = localFiles.length; i < l; i++) {
        let fileName = localFiles[i],
            fileInfo = self.getLocalFileInfo(path.join(dirPath, fileName));

        const fileHeaders = self._getPossibleFileHeaders({
          'fileName': fileName,
          'localFolder': dirPath,
          'allHeaders': settings.createdFileHeaders
        });

        // Add file to be replaced
        fileArray.push({
          'action': 'upload',
          'name': fileName,
          'folderId': studioFolderId,
          'localFolder': dirPath,
          'type': fileInfo.type,
          'size': fileInfo.size,
          'sha1': fileInfo.sha1,
          'data': fileInfo.data,
          'headers': fileHeaders
        });
      }

      return resolve(fileArray);
    });
  }

  /**
   * Get folders
   *
   * @param {string} [parentId] - Parent folder id
   * @return {Promise<Object>}
   */
  getFolders(parentId) {
    return this._get('folders', parentId);
  }

  /**
   * @typedef {Object} CreateFolderResult
   * @property {string} id Created folder id
   * @property {string} name Local folder name, might be different in Studio
   * @property {string} localFolder Local folder path
   */

  /**
   * Create folder
   * @async
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
    let baseLocalFolder = settings.baseLocalFolder || null;
    let addIfExists = settings.addIfExists === false ? false : true;
    let logging = settings.logCreated === true ? true : false;
    let apipath = 'folders/' + parentId;

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
              'localFolder': path.join(localFolderPath, folderName),
              'created': true
            }
          };

          if (logging) {
            self._log('Created folder: ' + folderName);
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
                'baseLocalFolder': baseLocalFolder,
                'localFolder': path.join(localFolderPath, folderName),
                'created': false
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
                'baseLocalFolder': baseLocalFolder,
                'localFolder': path.join(localFolderPath, folderName),
                'created': true
              }
            };

            if (logging) {
              self._log('Created folder: ' + folderName);
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
   * @param {string} folderId
   * @return {Promise<Object>}
   */
  deleteFolder(folderId) {
    return this._delete('folders', folderId);
  }

  /**
   * Delete child folders of a given folder
   *
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
   * @property {boolean} public Public folder
   */

  /**
   * @typedef {Object} FolderUpdateSettings
   * @property {number} fileCacheMaxAge Cache time in seconds
   * @property {number} fileCacheProtected Can cache time be changed (0 or 1)
   * @property {number} apiFolder API folders can not be modified in Studio GUI (0 or 1)
   * @property {number} noversioning (0 or 1)
   * @property {number} public Public folder
   */

  /**
   * Get folder settings
   *
   * @async
   * @param {string} folderId
   * @returns {ResultObj} [ResultObj.result]{@link FolderSettings}
   */
  getFolderSettings(folderId) {
    return this._get('folderSettings', folderId).then(function (res) {
      return res;
    });
  }

  /**
   * Update folder settings
   * @async
   *
   * @param {string} folderId
   * @param {FolderUpdateSettings} folderSettings settings
   * @param {Object} [options]
   * @param {boolean} [options.log=false] log results
   * @param {string} [options.folderName=''] used for logging
   * @returns {ResultObj}
   */
  updateFolderSettings(folderId, folderSettings, options) {
    let self = this;
    let opt = {
      'log': false,
      'folderName': ''
    }

    if (options) {
      for (let key in options) {
        if (options.hasOwnProperty(key)) {
          opt[key] = options[key]
        }
      }
    }

    return this._post('folderSettings/' + folderId, folderSettings).then(function (res) {
      if (opt.log) {
        self._log('Updated folder: ' + opt.folderName + ' => ' + JSON.stringify(folderSettings));
      }

      return res;
    });
  }

  /**
   * Batch upload/replace files
   *
   * @param  {Array<object>} files
   * @return {Array<object>} result
   */

  batchUpload(files) {
    const throttle = throat(this.concurrentUploads);

    return Promise.resolve(files).map(file => {
      return throttle(() => {
        const options = {
          'headers': file.headers
        };

        switch (file.action) {
          case 'upload':
            return this.uploadFile(file.folderId, file.name, file.type, file.size, file.sha1, file.data, file.localFolder, options);
          case 'replace':
            options.createNewVersion = file.createNewVersion;
            return this.replaceFile(file.id, file.type, file.size, file.sha1, file.data, file.name, file.localFolder, options);
        }
      });
    });
  }

  /**
   * @private
   */
  _uploadChanged(folderId, files, path, options) {
    let self = this;

    return new Promise(function(resolve) {
      return self.getFiles(folderId).then(function(studioFiles) {
        return self.getChangedFiles(studioFiles, files, path, folderId, options).then(function(changedFiles) {
          return self.batchUpload(changedFiles).then(function(res) {
            res.data = changedFiles.data;
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

  /**
   * @private
   */
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
          'createdFileHeaders': folder.createdFileHeaders,
          'createNewFileVersions': folder.createNewFileVersions,
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
          let itemStat = fs.lstatSync(path.join(folder.localFolder, localFiles[j]));

          if (itemStat.isFile()) {
            folderData.files.push(localFiles[j]);
          }
        }

        foldersData.push(folderData);
      } catch (e) {

      }
    }

    const remoteOnlyFiles = [];
    return Promise.resolve(foldersData).mapSeries(function(folderData) {
      return self._uploadChanged(folderData.folderId, folderData.files, folderData.localFolder, {
        'createdFileHeaders': folderData.createdFileHeaders,
        'createNewVersion': folderData.createNewFileVersions
      }).then(res => {
        if (res.data && res.data.remoteOnlyFiles.length) {
          remoteOnlyFiles.push(...res.data.remoteOnlyFiles);
        }

        return res;
      });
    }).then((res) => {
      const flatRes = [].concat(...res);

      flatRes.data = {
        remoteOnlyFiles
      }

      return flatRes;
    });
  }
}

module.exports = StudioHelper;
