import { BackendProcessPlugin, PluginLogger, ProcessController } from "@/types/plugin";
import { ElectronProcessController } from "./electron/electron-process-controller";
import { ElectronCommunicationHandler } from "./electron/electron-communication-handler";
import { debug } from "@/utils/console";
import { ElectronProcessLogger } from "./electron/electron-process-logger";
import exp from 'wait-finish';
import { Plugin } from 'siyuan';

const { finish } = exp;

const HANDLER_PREFIX = 'backend-handler_';

export class ProcessManager {
    processController: ProcessController;

    backendPlugins: BackendProcessPlugin[] = [];

    currentLogger: PluginLogger = null;

    constructor(private plugin: Plugin) {

    }

    unload(name: string) {
        this.processController.unload(name);
        this.backendPlugins.find(p => p.name === name).running = false;
    }

    unloadAll() {
        this.processController.unloadAll();
        this.backendPlugins.forEach((p) => p.running = false);
    }

    toggleLogger(name: string) {
        if (this.currentLogger) {
            console.log("[BackendPlugin Logger] Exist Logger closed");
            this.currentLogger.stop();
            this.currentLogger = null;
        }
        const logger = this.backendPlugins.find(p => p.name === name).logger;
        debug("logger", logger);
        if (!logger) {
            debug("empty logger");
            this.currentLogger = null;
            return;
        }
        console.log('[BackendPlugin logger] Switch to logger for:' + name);
        this.currentLogger = logger;
        logger.start();
    }

    setRunning(name: string, running: boolean) {
        this.backendPlugins.find(p => p.name === name).running = running;
    }

    async reload(name: string) {
        this.processController.unload(name);
        this.backendPlugins.find(p => p.name === name).running = false;
        const script = await this.getPluginScript(name);
        if (!script) {
            return;
        }
        this.processController.load(name, script);
        this.backendPlugins.find(p => p.name === name).running = true;
    }

    getBackendPlugins() {
        return this.backendPlugins;
    }

    getProcesses() {
        return this.processController.getProcesses().map((v) => {
            return {
                name: v,
                running: true,
            }
        })
    }

    async init(type: 'electron' | 'node') {
        if (type === 'electron') {
            await this.initElectron();
        }
    }

    async initElectron() {
        const _this = this;
        try {
            require('@electron/remote');
            this.processController = new ElectronProcessController(this);
            debug('load electron controller');
        } catch (e) {
            console.error('load electron failed', e);
            return;
        }

        if (this.processController) {
            const runningProcesses = this.processController.getProcesses();
            for (const p of runningProcesses) {
                this.backendPlugins.push({ name: p, running: true, enabled: false })
            }
            for (const plugin of this.plugin.app.plugins) {
                if (this.processController.has(plugin.name)) {
                    this.backendPlugins.find((v) => v.name === plugin.name).enabled = true;
                    debug("[initElectron] already exist: ", plugin.name);
                    continue;
                }
                const script = await this.getPluginScript(plugin.name);
                if (script) {
                    this.backendPlugins.push({ name: plugin.name, running: true, enabled: true })
                    debug("[initElectron] load:", plugin.name);
                    this.processController.load(plugin.name, script);
                }
            }
        }
        // initLogger
        for (const plugin of this.backendPlugins) {
            plugin.logger = new ElectronProcessLogger();
            const handler = new ElectronCommunicationHandler(this.processController as ElectronProcessController);
            const pluginHandler = {
                callback: null,
                send(...args) {
                    handler.sendToProcess(plugin.name, ...args);
                },
                listen(callback) {
                    this.callback = callback;
                }
            }
            plugin.handler = pluginHandler;
            finish(HANDLER_PREFIX + plugin.name, pluginHandler);
            handler.listenToProcess(plugin.name, (event) => {
                const data = event.data;
                const type = data.slice(0, 2);
                const ps = _this.plugin.app.plugins;
                const p = ps.find((p) => p.name === plugin.name);
                if (!p) {
                    return;
                }
                if (type === '00') {
                    // data
                    (p.eventBus as any).emit('backend-plugin', data.slice(2));
                    pluginHandler.callback && pluginHandler.callback(data.slice(2));
                } else if (type == '01' || type === '02' || type === '03' || type === '04') {
                    // info, warn, error, debug
                    if (!plugin.logger) {
                        plugin.logger = new ElectronProcessLogger();
                    }
                    let action: string;
                    switch (type) {
                        case '01': action = 'info'; break;
                        case '02': action = 'warn'; break;
                        case '03': action = 'error'; break;
                        case '04': action = 'debug'; break;
                    }
                    plugin.logger[action](`[BackendPlugin Logger][${plugin.name}] ` + data.slice(2));
                    (p.eventBus as any).emit('backend-plugin-log', data.slice(2));
                }
            });
        }
    }

    async getPluginScript(name: string): Promise<string | null> {
        return fetch('/api/file/getFile', {
            method: 'POST',
            body: JSON.stringify({ path: `/data/plugins/${name}/process.js` })
        }).then((res) => {
            if (res.status === 200) {
                return res.text();
            }
            return null
        });
    }
}