import { PluginLogger } from "@/types/plugin";

export class ElectronProcessLogger implements PluginLogger {
    pass = false;

    debug(message: string) {
        this.pass && console.debug(message);
    }

    info(message: string) {
        this.pass && console.info(message);
    }

    warn(message: string) {
        this.pass && console.warn(message);
    }

    error(message: string) {
        this.pass && console.error(message);
    }

    start() {
        this.pass = true;
    }

    stop() {
        this.pass = false;
    }
}