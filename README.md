## Classes

<dl>
<dt><a href="#StudioHelper">StudioHelper</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ResultObj">ResultObj</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#FileHeaderSettings">FileHeaderSettings</a> : <code>Object</code></dt>
<dd><p>Key / value pairs of wanted header names and their values</p>
</dd>
<dt><a href="#CreateFolderResult">CreateFolderResult</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#FolderSettings">FolderSettings</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#FolderUpdateSettings">FolderUpdateSettings</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="StudioHelper"></a>

## StudioHelper
**Kind**: global class

* [StudioHelper](#StudioHelper)
    * [new StudioHelper(settings)](#new_StudioHelper_new)
    * [.login(username, password, token, [longSession])](#StudioHelper+login) ⇒ <code>Promise</code>
    * [.push(settings)](#StudioHelper+push) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.createDirectoryFolders(folderData)](#StudioHelper+createDirectoryFolders) ⇒ [<code>Array.&lt;ResultObj&gt;</code>](#ResultObj)
    * [.getLocalFolders(path)](#StudioHelper+getLocalFolders) ⇒ <code>Array.&lt;string&gt;</code>
    * [.getFiles(folderId)](#StudioHelper+getFiles) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.deleteFiles(files)](#StudioHelper+deleteFiles) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.uploadFiles(files, folderId)](#StudioHelper+uploadFiles) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.replaceFiles(files)](#StudioHelper+replaceFiles) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.getFileHeaders(fileId)](#StudioHelper+getFileHeaders) ⇒ [<code>ResultObj</code>](#ResultObj)
    * [.setFileHeaders(fileId, headerSettings, [options])](#StudioHelper+setFileHeaders) ⇒ [<code>ResultObj</code>](#ResultObj)
    * [.getUploadInformation(files, folderId)](#StudioHelper+getUploadInformation) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.getReplaceInformation(files)](#StudioHelper+getReplaceInformation)
    * [.getFolders([parentId])](#StudioHelper+getFolders) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.createFolder(settings)](#StudioHelper+createFolder) ⇒ [<code>ResultObj</code>](#ResultObj)
    * [.deleteFolder(folderId)](#StudioHelper+deleteFolder) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.deleteChildFolders(folderId)](#StudioHelper+deleteChildFolders) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getFolderSettings(folderId)](#StudioHelper+getFolderSettings) ⇒ [<code>ResultObj</code>](#ResultObj)
    * [.updateFolderSettings(folderId, folderSettings, [options])](#StudioHelper+updateFolderSettings) ⇒ [<code>ResultObj</code>](#ResultObj)
    * [.batchUpload(files)](#StudioHelper+batchUpload) ⇒ <code>Array.&lt;object&gt;</code>

<a name="new_StudioHelper_new"></a>

### new StudioHelper(settings)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| settings | <code>Object</code> |  |  |
| settings.studio | <code>string</code> |  | Studio host ('xyz.studio.crasman.fi') |
| [settings.proxy] | <code>string</code> |  | Proxy |
| [settings.strictSSL] | <code>boolean</code> | <code>true</code> | Change to false if you're using self-signed certificate |
| [settings.loginPromptEnabled] | <code>boolean</code> | <code>true</code> | Show login prompt if authentication fails |
| [settings.credentialsFile] | <code>string</code> | <code>&quot;.studio-credentials&quot;</code> | File in which credentials are saved |
| [settings.ignoreFile] | <code>string</code> | <code>&quot;.studio-ignore&quot;</code> | Utilised by [push](#StudioHelper+push) method. Uses gitignore [spec](https://git-scm.com/docs/gitignore) |

**Example**
```js
var StudioHelper = require('studio-helper'),
    studio = new StudioHelper({
      studio: 'xyz.studio.crasman.fi',
      proxy: 'http://xyz.intra:8080/'
    });
```
<a name="StudioHelper+login"></a>

### studioHelper.login(username, password, token, [longSession]) ⇒ <code>Promise</code>
Login

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Default |
| --- | --- | --- |
| username | <code>string</code> |  |
| password | <code>string</code> |  |
| token | <code>string</code> |  |
| [longSession] | <code>int</code> | <code>1</code> |

<a name="StudioHelper+push"></a>

### studioHelper.push(settings) ⇒ <code>Array.&lt;Object&gt;</code>
Push changes to Studio

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of objects with file upload information

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| settings | <code>Object</code> |  |  |
| settings.folders | <code>Array.&lt;Object&gt;</code> |  |  |
| settings.folders[].folderId | <code>string</code> |  | Studio folder id |
| settings.folders[].localFolder | <code>string</code> |  | Local folder path |
| [settings.folders[].includeSubFolders] | <code>boolean</code> | <code>false</code> | Create and upload sub folders |
| [settings.folders[].createdFolderSettings] | <code>Object</code> | <code></code> | Object with paths (RegEx pattern) as keys and FolderUpdateSettings object as value. See example. |
| [settings.folders[].createdFileHeaders] | <code>Object</code> | <code></code> | Object with file paths (RegEx pattern) as keys and FileHeaderSettings objcet as value. See example. |

**Example**
```js
studio.push({
  folders: [{
    folderId: '568a7a2aadd4532b0f4f4f5b',
    localFolder: 'dist/js'
  }, {
    folderId: '568a7a27add453aa1a4f4f58',
    localFolder: 'dist/css'
  }, {
    folderId: '568a7a27add453aa1a4f4f58',
    localFolder: 'dist/',
    includeSubFolders: true,
    createdFolderSettings: {
      'dist/master': { // Regex match
        cacheMaxAge: 64800
      },
      'dist/dev': {  // Regex match
        cacheMaxAge: 2
      }
    },
    createdFileHeaders: {
      'dist/master/service-worker.js': { // Regex match
        'Service-Worker-Allowed': '/'
      }
    }
  }]
}).then(function (res) {
  console.log(res.length + 'files uploaded');
})
```
<a name="StudioHelper+createDirectoryFolders"></a>

### studioHelper.createDirectoryFolders(folderData) ⇒ [<code>Array.&lt;ResultObj&gt;</code>](#ResultObj)
Create folders found in local directory if not already created

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)
**Returns**: [<code>Array.&lt;ResultObj&gt;</code>](#ResultObj) - [ResultObj.result](#CreateFolderResult)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| folderData | <code>Object</code> |  |  |
| folderData.folderId | <code>string</code> |  | Studio folder id |
| folderData.localFolder | <code>string</code> |  | Local folder path |
| [folderData.includeSubFolders] | <code>boolean</code> | <code>false</code> | Create sub folders |
| [folderData.cache] | <code>boolean</code> | <code>true</code> | Cache results |
| [folderData.logCreated] | <code>boolean</code> | <code>false</code> | Log successfully created folders |

<a name="StudioHelper+getLocalFolders"></a>

### studioHelper.getLocalFolders(path) ⇒ <code>Array.&lt;string&gt;</code>
Get local directory folders

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)
**Returns**: <code>Array.&lt;string&gt;</code> - folders

| Param | Type |
| --- | --- |
| path | <code>string</code> |

<a name="StudioHelper+getFiles"></a>

### studioHelper.getFiles(folderId) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Get files of a folder

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Description |
| --- | --- | --- |
| folderId | <code>string</code> | Studio folder id |

<a name="StudioHelper+deleteFiles"></a>

### studioHelper.deleteFiles(files) ⇒ <code>Promise.&lt;Object&gt;</code>
Delete files

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Description |
| --- | --- | --- |
| files | <code>Array.&lt;string&gt;</code> | Array of file ids |

<a name="StudioHelper+uploadFiles"></a>

### studioHelper.uploadFiles(files, folderId) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Upload files to a specified folder

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Description |
| --- | --- | --- |
| files | <code>Array.&lt;string&gt;</code> | file with path |
| folderId | <code>string</code> | Studio folder id |

<a name="StudioHelper+replaceFiles"></a>

### studioHelper.replaceFiles(files) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Replace files

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Description |
| --- | --- | --- |
| files | <code>Array.&lt;Object&gt;</code> |  |
| files[].fileId | <code>string</code> | Studio file id |
| files[].localFile | <code>string</code> | Local file path |

<a name="StudioHelper+getFileHeaders"></a>

### studioHelper.getFileHeaders(fileId) ⇒ [<code>ResultObj</code>](#ResultObj)
Get file headers

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type |
| --- | --- |
| fileId | <code>string</code> |

<a name="StudioHelper+setFileHeaders"></a>

### studioHelper.setFileHeaders(fileId, headerSettings, [options]) ⇒ [<code>ResultObj</code>](#ResultObj)
Update file headers

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| fileId | <code>string</code> |  |  |
| headerSettings | [<code>FileHeaderSettings</code>](#FileHeaderSettings) |  | key / value pairs |
| [options] | <code>Object</code> |  |  |
| [options.log] | <code>boolean</code> | <code>false</code> | log results |
| [options.fileName] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | used for logging |

<a name="StudioHelper+getUploadInformation"></a>

### studioHelper.getUploadInformation(files, folderId) ⇒ <code>Array.&lt;Object&gt;</code>
Get required information about files for upload

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of file information objects

| Param | Type | Description |
| --- | --- | --- |
| files | <code>Array.&lt;string&gt;</code> | files with paths |
| folderId | <code>string</code> | Studio folder id |

<a name="StudioHelper+getReplaceInformation"></a>

### studioHelper.getReplaceInformation(files)
Get required information about files for replacement

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Description |
| --- | --- | --- |
| files | <code>Array.&lt;Object&gt;</code> |  |
| files[].fileId | <code>string</code> | Studio file id |
| files[].localFile | <code>string</code> | Local file path |

<a name="StudioHelper+getFolders"></a>

### studioHelper.getFolders([parentId]) ⇒ <code>Promise.&lt;Object&gt;</code>
Get folders

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Description |
| --- | --- | --- |
| [parentId] | <code>string</code> | Parent folder id |

<a name="StudioHelper+createFolder"></a>

### studioHelper.createFolder(settings) ⇒ [<code>ResultObj</code>](#ResultObj)
Create folder

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)
**Returns**: [<code>ResultObj</code>](#ResultObj) - [ResultObj.result](#CreateFolderResult)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| settings | <code>Object</code> |  |  |
| settings.name | <code>string</code> |  | Name of the new folder |
| [settings.parentId] | <code>string</code> |  | Studio folder in which we want to create the new folder |
| [settings.addIfExists] | <code>boolean</code> | <code>true</code> | Return the already created folder id if false |
| [settings.localFolder] | <code>string</code> |  | local folder path |
| [settings.logCreated] | <code>boolean</code> | <code>false</code> | log created folders |
| [settings.folderSettings] | [<code>FolderUpdateSettings</code>](#FolderUpdateSettings) |  | folder settings to apply after creation |

<a name="StudioHelper+deleteFolder"></a>

### studioHelper.deleteFolder(folderId) ⇒ <code>Promise.&lt;Object&gt;</code>
Delete folder

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type |
| --- | --- |
| folderId | <code>string</code> |

<a name="StudioHelper+deleteChildFolders"></a>

### studioHelper.deleteChildFolders(folderId) ⇒ <code>Promise.&lt;Object&gt;</code>
Delete child folders of a given folder

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type |
| --- | --- |
| folderId | <code>string</code> |

<a name="StudioHelper+getFolderSettings"></a>

### studioHelper.getFolderSettings(folderId) ⇒ [<code>ResultObj</code>](#ResultObj)
Get folder settings

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)
**Returns**: [<code>ResultObj</code>](#ResultObj) - [ResultObj.result](#FolderSettings)

| Param | Type |
| --- | --- |
| folderId | <code>string</code> |

<a name="StudioHelper+updateFolderSettings"></a>

### studioHelper.updateFolderSettings(folderId, folderSettings, [options]) ⇒ [<code>ResultObj</code>](#ResultObj)
Update folder settings

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| folderId | <code>string</code> |  |  |
| folderSettings | [<code>FolderUpdateSettings</code>](#FolderUpdateSettings) |  | settings |
| [options] | <code>Object</code> |  |  |
| [options.log] | <code>boolean</code> | <code>false</code> | log results |
| [options.folderName] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | used for logging |

<a name="StudioHelper+batchUpload"></a>

### studioHelper.batchUpload(files) ⇒ <code>Array.&lt;object&gt;</code>
Batch upload/replace files

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)
**Returns**: <code>Array.&lt;object&gt;</code> - result

| Param | Type |
| --- | --- |
| files | <code>Array.&lt;object&gt;</code> |

<a name="ResultObj"></a>

## ResultObj : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| status | <code>string</code> | "ok" or "error" |
| code | <code>number</code> | 0 for success |
| result | <code>string</code> \| <code>Object</code> \| <code>Array</code> \| <code>boolean</code> | Results |

<a name="FileHeaderSettings"></a>

## FileHeaderSettings : <code>Object</code>
Key / value pairs of wanted header names and their values

**Kind**: global typedef
<a name="CreateFolderResult"></a>

## CreateFolderResult : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Created folder id |
| name | <code>string</code> | Local folder name, might be different in Studio |
| localFolder | <code>string</code> | Local folder path |

<a name="FolderSettings"></a>

## FolderSettings : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| fileCacheMaxAge | <code>number</code> | Cache time in seconds |
| fileCacheProtected | <code>boolean</code> | Can cache time be changed |
| apiFolder | <code>boolean</code> | API folders can not be modified in Studio GUI |
| noversioning | <code>boolean</code> |  |
| public | <code>boolean</code> | Public folder |

<a name="FolderUpdateSettings"></a>

## FolderUpdateSettings : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| fileCacheMaxAge | <code>number</code> | Cache time in seconds |
| fileCacheProtected | <code>number</code> | Can cache time be changed (0 or 1) |
| apiFolder | <code>number</code> | API folders can not be modified in Studio GUI (0 or 1) |
| noversioning | <code>number</code> | (0 or 1) |
| public | <code>number</code> | Public folder |
