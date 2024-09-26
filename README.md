# Archived Repository

## Repository Archived and Moved

This repository has been **archived** and is no longer actively maintained. The project has been moved to a **private repository**.

However, the related **npm package is still available** and can be accessed and used as before: `npm install studio-helper`

## Classes

<dl>
<dt><a href="#StudioHelper">StudioHelper</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ApiResponse<T>">ApiResponse<T></a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ResultObj">ResultObj</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ProgressOptions">ProgressOptions</a></dt>
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

- [Classes](#classes)
- [Typedefs](#typedefs)
- [StudioHelper](#studiohelper)
  - [new StudioHelper(settings)](#new-studiohelpersettings)
  - [studioHelper.login(username, password, token, \[longSession\]) ⇒ Promise](#studiohelperloginusername-password-token-longsession--promise)
  - [studioHelper.updateSessionSetting(setting, value)](#studiohelperupdatesessionsettingsetting-value)
  - [studioHelper.resetSessionSettings()](#studiohelperresetsessionsettings)
  - [studioHelper.getAllFolders(\[limit\], \[offset\]) ⇒ Promise.\<ApiResponse.\<Array.\<{id: string, name: string, parentId: (null|string), createdAt: number, modifiedAt: number}\>\>\>](#studiohelpergetallfolderslimit-offset--promiseapiresponsearrayid-string-name-string-parentid-nullstring-createdat-number-modifiedat-number)
  - [studioHelper.getMetadataFields() ⇒ Promise.\<ApiResponse.\<Array.\<{id: string, fields: {id: string, type: string, names: Object}, languages: Array.\<string\>}\>\>\>](#studiohelpergetmetadatafields--promiseapiresponsearrayid-string-fields-id-string-type-string-names-object-languages-arraystring)
  - [studioHelper.getConversions() ⇒ Promise.\<ApiResponse.\<Array.\<{id: string, name: string}\>\>\>](#studiohelpergetconversions--promiseapiresponsearrayid-string-name-string)
  - [studioHelper.push(settings) ⇒ Array.\<Object\>](#studiohelperpushsettings--arrayobject)
  - [studioHelper.createDirectoryFolders(folderData) ⇒ Array.\<ResultObj\>](#studiohelpercreatedirectoryfoldersfolderdata--arrayresultobj)
  - [studioHelper.getLocalFolders(path) ⇒ Array.\<string\>](#studiohelpergetlocalfolderspath--arraystring)
  - [studioHelper.getFiles(folderId) ⇒ Promise.\<Array.\<Object\>\>](#studiohelpergetfilesfolderid--promisearrayobject)
  - [studioHelper.deleteFiles(files, options) ⇒ Promise.\<Object\>](#studiohelperdeletefilesfiles-options--promiseobject)
  - [studioHelper.uploadFiles(files, folderId) ⇒ Promise.\<Array.\<Object\>\>](#studiohelperuploadfilesfiles-folderid--promisearrayobject)
  - [studioHelper.replaceFiles(files, \[options\]) ⇒ Promise.\<Array.\<Object\>\>](#studiohelperreplacefilesfiles-options--promisearrayobject)
  - [studioHelper.getFileHeaders(fileId) ⇒ ResultObj](#studiohelpergetfileheadersfileid--resultobj)
  - [studioHelper.setFileHeaders(fileId, headerSettings, \[options\]) ⇒ ResultObj](#studiohelpersetfileheadersfileid-headersettings-options--resultobj)
  - [studioHelper.getUploadInformation(files, folderId) ⇒ Array.\<Object\>](#studiohelpergetuploadinformationfiles-folderid--arrayobject)
  - [studioHelper.getReplaceInformation(files, options)](#studiohelpergetreplaceinformationfiles-options)
  - [studioHelper.getFolders(\[parentId\]) ⇒ Promise.\<Object\>](#studiohelpergetfoldersparentid--promiseobject)
  - [studioHelper.createFolder(settings) ⇒ ResultObj](#studiohelpercreatefoldersettings--resultobj)
  - [studioHelper.deleteFolder(folderId) ⇒ Promise.\<Object\>](#studiohelperdeletefolderfolderid--promiseobject)
  - [studioHelper.deleteChildFolders(folderId) ⇒ Promise.\<Object\>](#studiohelperdeletechildfoldersfolderid--promiseobject)
  - [studioHelper.getFolderSettings(folderId) ⇒ ResultObj](#studiohelpergetfoldersettingsfolderid--resultobj)
  - [studioHelper.updateFolderSettings(folderId, folderSettings, \[options\]) ⇒ ResultObj](#studiohelperupdatefoldersettingsfolderid-foldersettings-options--resultobj)
  - [studioHelper.batchUpload(files) ⇒ Array.\<object\>](#studiohelperbatchuploadfiles--arrayobject)
- [ApiResponse : Object](#apiresponse--object)
- [ResultObj : Object](#resultobj--object)
- [ProgressOptions](#progressoptions)
- [FileHeaderSettings : Object](#fileheadersettings--object)
- [CreateFolderResult : Object](#createfolderresult--object)
- [FolderSettings : Object](#foldersettings--object)
- [FolderUpdateSettings : Object](#folderupdatesettings--object)

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
| [settings.useCacheDir] | <code>boolean</code> | <code>false</code> | Store credentials file in Node modules cache dir |
| [settings.concurrentUploads] | <code>number</code> | <code>1</code> | Max concurrent uploads when using batch methods. Defaul 1, Max 5. |
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

<a name="StudioHelper+updateSessionSetting"></a>

### studioHelper.updateSessionSetting(setting, value)
Update a single setting for this session

See documentation for available settings.

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  
**See**: [ Documentation](https://labs.crasman.fi/fi/help/studio/studioapi/studioapiresource/put-apisettings-setting-value/)  

| Param | Type |
| --- | --- |
| setting | <code>string</code> | 
| value | <code>string</code> | 

<a name="StudioHelper+resetSessionSettings"></a>

### studioHelper.resetSessionSettings()
Reset all API settings to default values

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  
<a name="StudioHelper+getAllFolders"></a>

### studioHelper.getAllFolders([limit], [offset]) ⇒ <code>Promise.&lt;ApiResponse.&lt;Array.&lt;{id: string, name: string, parentId: (null\|string), createdAt: number, modifiedAt: number}&gt;&gt;&gt;</code>
Get all folders in Studio

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [limit] | <code>number</code> | <code>1000</code> | Max number of folders to return. Max 1000, default 1000. |
| [offset] | <code>number</code> | <code>0</code> | Offset |

<a name="StudioHelper+getMetadataFields"></a>

### studioHelper.getMetadataFields() ⇒ <code>Promise.&lt;ApiResponse.&lt;Array.&lt;{id: string, fields: {id: string, type: string, names: Object}, languages: Array.&lt;string&gt;}&gt;&gt;&gt;</code>
Get all metadata fields defined in Stage for this Studio

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  
**Example**  
return value
```js
// {
//   "status": "ok",
//   "result": [
//     {
//       "id": "my_table",
//       "fields": [
//         {
//           "id": "my_field",
//           "type": "st",
//           "names": {
//             "en": "My field"
//           }
//         }
//       ],
//       "languages": [
//         "en"
//       ]
//     }
//   ],
//   "code": 0
// }
```
<a name="StudioHelper+getConversions"></a>

### studioHelper.getConversions() ⇒ <code>Promise.&lt;ApiResponse.&lt;Array.&lt;{id: string, name: string}&gt;&gt;&gt;</code>
**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  
**Example**  
return value
```js
// {
//   "status": "ok",
//   "result": [
//     {
//       "id": "my_conversion",
//       "name": "My conversion",
//     }
//   ],
//   "code": 0
// }
```
<a name="StudioHelper+push"></a>

### studioHelper.push(settings) ⇒ <code>Array.&lt;Object&gt;</code>
Push changes to Studio

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of objects with file upload information. Array has `data` property which contains additional information.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| settings | <code>Object</code> |  |  |
| settings.folders | <code>Array.&lt;Object&gt;</code> |  |  |
| settings.folders[].folderId | <code>string</code> |  | Studio folder id |
| settings.folders[].localFolder | <code>string</code> |  | Local folder path |
| [settings.folders[].createNewFileVersions] | <code>boolean</code> | <code>true</code> | Create new versions of uploaded / updated files. Use false to save disk space if you don't need version history. |
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
    createNewFileVersions: false,
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

### studioHelper.deleteFiles(files, options) ⇒ <code>Promise.&lt;Object&gt;</code>
Delete files

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| files | <code>Array.&lt;string&gt;</code> |  | Array of file ids |
| options | <code>Object</code> |  |  |
| [options.throttle] | <code>number</code> | <code>1</code> | Number of concurrent delete file requests. Max 5 |
| [options.showProgress] | <code>number</code> | <code>false</code> | Number of concurrent delete file requests. Max 5 |
| [options.progressOptions] | [<code>ProgressOptions</code>](#ProgressOptions) |  | Progress bar options |

<a name="StudioHelper+uploadFiles"></a>

### studioHelper.uploadFiles(files, folderId) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Upload files to a specified folder

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  

| Param | Type | Description |
| --- | --- | --- |
| files | <code>Array.&lt;string&gt;</code> | file with path |
| folderId | <code>string</code> | Studio folder id |

<a name="StudioHelper+replaceFiles"></a>

### studioHelper.replaceFiles(files, [options]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Replace files

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| files | <code>Array.&lt;Object&gt;</code> |  |  |
| files[].fileId | <code>string</code> |  | Studio file id |
| files[].localFile | <code>string</code> |  | Local file path |
| [options] | <code>Object</code> |  |  |
| [options.createNewVersion] | <code>boolean</code> | <code>true</code> | Create new version of files |

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

### studioHelper.getReplaceInformation(files, options)
Get required information about files for replacement

**Kind**: instance method of [<code>StudioHelper</code>](#StudioHelper)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| files | <code>Array.&lt;Object&gt;</code> |  |  |
| files[].fileId | <code>string</code> |  | Studio file id |
| files[].localFile | <code>string</code> |  | Local file path |
| options | <code>Object</code> |  |  |
| [options.createNewVersion] | <code>boolean</code> | <code>true</code> | Create new version of files |

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

<a name="ApiResponse<T>"></a>

## ApiResponse<T> : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| status | <code>string</code> | "ok" or "error" |
| code | <code>number</code> | 0 for success |
| result | <code>T</code> | Results |

<a name="ResultObj"></a>

## ResultObj : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| status | <code>string</code> | "ok" or "error" |
| code | <code>number</code> | 0 for success |
| result | <code>string</code> \| <code>Object</code> \| <code>Array</code> \| <code>boolean</code> | Results |

<a name="ProgressOptions"></a>

## ProgressOptions
**Kind**: global typedef  

| Param | Type |
| --- | --- |
| title | <code>string</code> | 
| total | <code>number</code> | 
| options | [<code>ProgressOptions</code>](#ProgressOptions) | 

**Properties**

| Name | Type |
| --- | --- |
| complete | <code>string</code> | 
| incomplete | <code>string</code> | 
| width | <code>number</code> | 
| clear | <code>boolean</code> | 
| total | <code>number</code> | 

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
