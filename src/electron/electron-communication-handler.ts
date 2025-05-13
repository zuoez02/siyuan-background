import { PluginHandler } from "@/types/plugin";
import { ElectronProcessController } from "./electron-process-controller";

export class ElectronCommunicationHandler implements PluginHandler {
    constructor(private processController: ElectronProcessController) {
    }

    async sendToProcess(name: string, ...args: any) {
        const port = this.processController.getPort(name);
        if (!port) {
            throw Error(`Plugin: ${name} doesn't have running process.`);
        }
        (await port).postMessage(...args);
    }

    async listenToProcess(name: string, callback: (...args) => void) {
        const port = this.processController.getPort(name);
        if (!port) {
            throw Error(`Plugin: ${name} doesn't have running process.`);
        }
        
        (await port).onmessage = (event) => callback(event);
        return () => {
            this.processController.disconnect(name);
        };
    }
}