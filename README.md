# Siyuan background

A siyuan plugin background process manage framework.

## Support platform

Desktop (linux/windows/macos)

## Functions

- Read `process.js` and run it in background.
- Keep alive when plugin reload or Siyuan frontend reload
- Communication with plugin in foreground.
- Logger to Console in foreground.

## Usage (example)

Install the library with your favorite node package manager(npm/pnpm/yarn/...) in your plugin workspace.

```bash
npm install -D siyuan-background
```

Check the example plugin here: [siyuan-plugin-background-test](https://github.com/zuoez02/siyuan-plugin-background-test)

Import this lib in your SiYuan plugin and call the ProcessManager to init your process.js.

Make sure you have an `process.js` in your plugin folder which is in Siyuan workspace/data/plugins/plugin-folder.

```typescript
import { Plugin } from 'siyuan';
import { ProcessManager } from "siyuan-background";

export default class PluginSample extends Plugin {
  pm: any;
  async onload() {
    const pm = new ProcessManager(this);
    this.pm = pm;
    pm.init("electron", false).then((handler) => {
      // handler is the tool to connect with background process.
      handler.send("hello world"); // Using 'send' to send message to background process. MUST BE A STRING!!!
      handler.listen(console.log); // Get message sent from background process
      // **IMPORTANT** : Data exchange is inter-process communication, so you must manually serialize and deserialize the data.
      // For example: JSON.stringify and JSON.parse
      // Currently, only string-based data transmission is supported; serialized forms like Uint8Array are not supported.
    });
  }

  async onunload() {
    // you must call the unload method to stop background process, or it will not stop until close SiYuan.
    this.pm.unload();
  }
}
```

Here is an example of `process.js`
```typescript
const { bridge, logger } = require("siyuan-background");
const fs = require('fs');

let number;
let server;
const httpport = 3001;

// write file to local system
const tmp = require('os').tmpdir();
const path = require('path');
const http = require("http");
const logFile = path.join(tmp, 'process.log');
const writeLog = (message) => {
    fs.appendFile(logFile, `[${new Date().toLocaleString()}] ${message}\n`, (err) => {
        err && console.error(err);
    });
}

// listen to connect event, it will be called when plugin run process.js first time or restore the connection to the exist process.
bridge.on("connect", () => {
  console.log('connected')
  logger.info("connected");
  writeLog("connected")
  bridge.send("hello, I am connected");

  // example: Create a http server when connected.
  if (!server) {
    server = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain;charset=utf-8");
        const log = `你好世界
PID:${process.pid} PPID: ${process.ppid}
number: ${number}
LogFile: ${logFile}
        `
        res.end(log);
        logger.info(log)
      });
    server.listen(httpport, () => {
        logger.info(`服务器运行在 http://:${httpport}/`);
    });
    }
});

// Listen to message from frontend plugin.
bridge.on("message", (data) => {
  logger.info("message:", data);
  writeLog(`message: ${data}`);
  number = data;
  if (data === "hello") {
    // send to frontend plugin.
    bridge.send("hello, too");
  } else {
    bridge.send("Recieved: " + data);
  }
});

// listen to the disconnect event, it will be called the SiYuan refresh the page.
bridge.on("disconnect", () => {
  logger.info("disconnect");
});
```

## Plugin template using vite

If you are using the plugin template by siyuan which contain vite, you can try to add code to generate `process.js`.

You need to add a `process.ts` in `src/` folder.

```js
// vite.config.js

// add process.ts entry
    lib: {
            entry: [resolve(__dirname, "src/index.ts"), resolve(__dirname, 'src/process.ts')],
            fileName: "index",
            formats: ["cjs"],
    },
```

## Changelog

- v0.1.0: First version, migrate from siyuan-plugin-backend.
