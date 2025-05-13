import { debug } from "@/utils/console";
import { PluginProcess, ProcessController } from "../../types/plugin";
import { ElectronPluginProcess } from './electron-plugin-process';
import { ProcessManager } from "../manager";

export class ElectronProcessController implements ProcessController {
    processes: Map<string, ElectronPluginProcess>;
    currentWindow: any;
    ports: Map<string, any>
    cacheCallbacks: Map<string, any> = new Map();
    manager: ProcessManager;

    constructor(manager: ProcessManager) {
        this.processes = new Map(); 2
        this.ports = new Map();
        this.restore();
        this.initCommunication();
        this.manager = manager;
    }

    has(name: string) {
        return this.processes.has(name);
    }

    getProcesses(): string[] {
        return [...this.processes.keys()];
    }

    getProcess(name: string): PluginProcess {
        return this.processes.get(name);
    }

    getPort(name: string) {
        return this.ports.get(name);
    }

    load(pluginName: string, script: string) {
        const process = new ElectronPluginProcess(pluginName, () => this.unload(pluginName));
        process.run(script);
        process.setParentWindow(this.currentWindow);
        this.processes.set(pluginName, process);
        this.connect(pluginName);
        debug(process);
    }

    reload(plugin: string, script: string) {
        this.unload(plugin);
        this.load(plugin, script);
    }

    unload(plugin: string) {
        const p = this.processes.get(plugin);
        if (p) {
            p.destroy();
            this.processes.delete(plugin);
            this.disconnect(plugin);
        }
        this.manager.setRunning(plugin, false);
    }

    restore() {
        const remote = require('@electron/remote');
        this.currentWindow = remote.getCurrentWindow();
        const children: any[] = this.currentWindow.getChildWindows();
        debug("electron process controller restored:", children);
        children.forEach((b) => {
            const title = b.title;
            this.processes.set(title, new ElectronPluginProcess(b, () => this.unload(title)));
        })
    }

    unloadAll() {
        this.getProcesses().forEach((name) => {
            this.unload(name);
        })
    }

    initCommunication() {
        this.getProcesses().forEach((name) => {
            this.connect(name);
        });
    }

    connect(name: string) {
        const { MessageChannelMain } = require('@electron/remote');
        const { port1, port2 } = new MessageChannelMain();
        let re: (value: unknown) => void;
        const promise = new Promise((resolve) => {
            re = resolve;
        })
        this.ports.set(name, promise);
        port1.name = name;
        const { ipcRenderer } = require('electron');
        ipcRenderer.once('connect:' + name, (event) => {
            const p = event.ports[0];
            this.ports.set(name, p);
            const processWindow = this.processes.get(name).getWindow();
            processWindow.webContents.postMessage("connect", null, [port2]);
            if (this.cacheCallbacks.get(name)) {
                p.onmessage = this.cacheCallbacks.get(name);
                this.cacheCallbacks.delete(name);
            }
            re(p);
        });
        require('@electron/remote').getCurrentWindow().webContents.postMessage("connect:" + name, null, [port1]);
    }

    disconnect(name: string) {
        const port = this.ports.get(name);
        if (port) {
            port.postMessage('disconnect');
        }
        this.ports.delete(name);
        const onmessage = port.onmessage;
        this.cacheCallbacks.set(name, onmessage);
    }
}