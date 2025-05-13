import { Plugin } from "siyuan";

declare module 'siyuan-background' {

    class PluginHandler {
        send(...args: any[]): void;
        listen(callback: (...args: any[]) => any): void;
    }

    export class ProcessManager {
        constructor(plugin: {})

        unload(): void;

        toggleLogger(): void;

        reload(): Promise<void>

        init(type: "electron", show?: boolean): Promise<PluginHandler>

        initElectron(): Promise<void>
    }

    // only 
    export const logger: {
        info(...args: any): void;
    }

    class Bridge {
        on(event: 'connect' | 'disconnect' | 'message', callback: (...args: any) => any): void

        send(data: string): void;

        sendData(data: string): void;
        
        sendLog(data: string): void;
    }

    export const bridge: Bridge;
}