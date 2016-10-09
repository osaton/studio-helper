<a name="StudioHelper"></a>

## StudioHelper
**Kind**: global class  

* [StudioHelper](#StudioHelper)
    * [new StudioHelper(settings)](#new_StudioHelper_new)
    * [.push(settings)](#StudioHelper+push) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>

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
<a name="StudioHelper+push"></a>

### studioHelper.push(settings) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Push changes to Studio

**Kind**: instance method of <code>[StudioHelper](#StudioHelper)</code>  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - Array of objects with file upload information  

| Param | Type | Description |
| --- | --- | --- |
| settings | <code>Object</code> |  |
| settings.folders | <code>Array.&lt;Object&gt;</code> |  |
| settings.folders[].folderId | <code>string</code> | Studio folder id |
| settings.folders[].localFolder | <code>string</code> | Local folder path |

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
