import { PluginProcess } from "@/types/plugin";

export class ElectronPluginProcess implements PluginProcess {
    private win: any;

    private id: number;

    private running: boolean;

    private readonly name: string;

    constructor(param: string | any, private readonly onRemove: () => void) {
      if (typeof param === 'string') {
        this.name = param;
        this.running = false;
      } else {
        this.name = param.title;
        this.running = true;
        this.id = param.id;
        this.win = param;
        this.win.on('closed', () => {
          if (this.running) {
            this.onRemove();
            this.win = null;
          }
        });
      }
    }

    run(show: boolean = false) {
        const htmlContent = (`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${this.name}</title>
          <meta charset="UTF-8">
        </head>
        <body>
          <script>
          class Bridge {
            port
            onconnect;
            onmessage;
            ondisconnect;
            on(event, callback) {
              switch (event) {
                case 'connect': this.onconnect = callback; break;
                case 'message': this.onmessage = callback; break;
                case 'disconnect': this.ondisconnect = callback; break;
                default: throw Error("no such event listener: " + event);
              }
            }
            setPort(port) {
              this.port = port;
            }
            send(data) {
              if (!this.port) {
                throw Error("no port exist");
              }
              this.port.postMessage("00" + data);
            }
            sendData(data) {
              if (!this.port) {
                throw Error("no port exist");
              }
              this.port.postMessage(data);
            }
            sendLog(data) {
              if (!this.port) {
                throw Error("no port exist");
              }
              this.port.postMessage("01" + data);
            }

          }
          const bridge = new Bridge();
          const logger = {
            info(...args) {
              bridge.sendLog(Array.isArray(args) ? args.join(',') : String(args));
            }
          }
          const packages = {
            bridge,
            logger,
          };
          const obj = {
            require: null,
          };
          const _require = require;
          (function(b) {
            let require = (name) => {
              switch(name) {
                case 'siyuan-background': return packages;
                default: return _require(name);
              }
            }
            obj.require = require;
            const { ipcRenderer } = require('electron');
            let port;
            ipcRenderer.on('connect', async (event, args) => {
              port = event.ports[0];
              b.setPort(port);
              b.onconnect && b.onconnect();

              port.onmessage = (e) => {
                b.onmessage && b.onmessage(e.data);
              }

              fetch('${window.location.protocol}//${window.location.host}/api/file/getFile', {
                method: 'POST',
                body: JSON.stringify({ path: '/data/plugins/${this.name}/process.js' }),
              }).then((data) => data.text())
              .then((script) => {
                (function(require) {
                  eval(script)

                  const { bridge } = require('siyuan-background');
                  bridge.onconnect();
                })(obj.require);
              })
            });
            ipcRenderer.on('disconnect', async (event, args) => {
              port = undefined;
              b.ondisconnect && b.ondisconnect();
            });
          })(bridge);

               
          </script>
        </body>
      </html>
    `);

        const url = 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent);
        const remote = window.require('@electron/remote');
        this.win = new remote.BrowserWindow({
            skipTaskbar: true,
            show: show,
            title: this.name,
            webPreferences: {
                devTools: true,
                nodeIntegration: true,
                webSecurity: true,
                contextIsolation: false,
            }
        });
        this.win.loadURL(url);
        this.running = true;
        this.id = this.win.id;
        this.win.on('closed', () => {
          this.running = false;
          this.onRemove();
          this.win = null;
        });
    }

    destroy() {
      if (this.win && this.running) {
        this.win.destroy();
        this.win = null;
        this.running = false;
      }
    }

    getId() {
      return this.id;
    }

    setId(id: number) {
      this.id = id;
    }

    setParentWindow(win: any) {
        this.win.setParentWindow(win);
    }

    getWindow() {
      return this.win;
    }

    getRunning() {
      return this.running;
    }
}
