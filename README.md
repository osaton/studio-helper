## Classes

<dl>
<dt><a href="#StudioHelper">StudioHelper</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ResultObj">ResultObj</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#CreateFolderResult">CreateFolderResult</a> : <code>Object</code></dt>
<dd></dd>
</dl>

<a name="StudioHelper"></a>

## StudioHelper
**Kind**: global class

* [StudioHelper](#StudioHelper)
    * [new StudioHelper(settings)](#new_StudioHelper_new)
    * [.createDirectoryFolders(folderData)](#StudioHelper+createDirectoryFolders) ⇒ <code>[Array.&lt;ResultObj&gt;](#ResultObj)</code>
    * [.getLocalFolders(path)](#StudioHelper+getLocalFolders) ⇒ <code>Array.&lt;string&gt;</code>
    * [.push(settings)](#StudioHelper+push) ⇒ <code>Array.&lt;Object&gt;</code>
    * [.createFolder(settings)](#StudioHelper+createFolder) ⇒ <code>[ResultObj](#ResultObj)</code>

<a name="new_StudioHelper_new"></a>

### new StudioHelper(settings)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| settings | <code>Object</code> |  |  |
| settings.studio | <code>string</code> |  | Studio host ('xyz.studio.crasman.fi') |
| [settings.proxy] | <code>string</code> |  | Proxy |
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
<a name="StudioHelper+createDirectoryFolders"></a>

### studioHelper.createDirectoryFolders(folderData) ⇒ <code>[Array.&lt;ResultObj&gt;](#ResultObj)</code>
Create folders found in local directory if not already created

**Kind**: instance method of <code>[StudioHelper](#StudioHelper)</code>
**Returns**: <code>[Array.&lt;ResultObj&gt;](#ResultObj)</code> - [ResultObj.result](#CreateFolderResult)
**Async**: Returns Promise

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

**Kind**: instance method of <code>[StudioHelper](#StudioHelper)</code>
**Returns**: <code>Array.&lt;string&gt;</code> - folders

| Param | Type |
| --- | --- |
| path | <code>string</code> |

<a name="StudioHelper+push"></a>

### studioHelper.push(settings) ⇒ <code>Array.&lt;Object&gt;</code>
Push changes to Studio

**Kind**: instance method of <code>[StudioHelper](#StudioHelper)</code>
**Returns**: <code>Array.&lt;Object&gt;</code> - Array of objects with file upload information
**Async**: Returns Promise

| Param | Type | Description |
| --- | --- | --- |
| settings | <code>Object</code> |  |
| settings.folders | <code>Array.&lt;Object&gt;</code> |  |
| settings.folders[].folderId | <code>string</code> | Studio folder id |
| settings.folders[].localFolder | <code>string</code> | Local folder path |
| settings.folders[].includeSubFolders | <code>string</code> | Local folder path |

**Example**
```js
studio.push({
  folders: [{
    folderId: '568a7a2aadd4532b0f4f4f5b',
    localFolder: 'dist/js'
  }, {
    folderId: '568a7a27add453aa1a4f4f58',
    localFolder: 'dist/css'
  }]
}).then(function (res) {
  console.log(res.length + 'files uploaded');
})
```
<a name="StudioHelper+createFolder"></a>

### studioHelper.createFolder(settings) ⇒ <code>[ResultObj](#ResultObj)</code>
Create folder

**Kind**: instance method of <code>[StudioHelper](#StudioHelper)</code>
**Returns**: <code>[ResultObj](#ResultObj)</code> - [ResultObj.result](#CreateFolderResult)
**Async**: Returns a promise

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| settings | <code>Object</code> |  |  |
| settings.name | <code>string</code> |  | Name of the new folder |
| [settings.parentId] | <code>string</code> |  | Studio folder in which we want to create the new folder |
| [settings.addIfExists] | <code>boolean</code> | <code>true</code> | Return the already created folder id if false |
| [settings.localFolder] | <code>string</code> |  | local folder path |
| [settings.logCreated] | <code>boolean</code> | <code>false</code> | log created folders |

<a name="ResultObj"></a>

## ResultObj : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| status | <code>string</code> | "ok" or "error" |
| code | <code>number</code> | 0 for success |
| result | <code>string</code> &#124; <code>Object</code> &#124; <code>Array</code> &#124; <code>boolean</code> | Results |

<a name="CreateFolderResult"></a>

## CreateFolderResult : <code>Object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Created folder id |
| name | <code>string</code> | Local folder name, might be different in Studio |
| localFolder | <code>string</code> | Local folder path |
