export interface ProcessController {
    restore();
    getProcesses(): string[];
    getProcess(name: string): PluginProcess
    has(name: string): boolean;
    load(name: string, script: string);
    unload(name: string);
    reload(name: string, script: string);
    unloadAll();
    setShowWindow(show: boolean)
}

export interface PluginProcess {
    run(show?: boolean);
    destroy();
    getId();
    setId(id: number);
}

export interface PluginLogger {
    info(val: string): void;
    warn(val: string): void;
    error(val: string): void;
    debug(val: string): void;
    start(): void;
    stop(): void;
}

export interface PluginHandler {
    sendToProcess(name: string, ...args: any): Promise<void>;
    listenToProcess(name: string, callback: (...args) => void): Promise<() => void>;
}

export interface Process {
    name: string;
    running: boolean;
}

export interface BackendProcessPlugin {
    name: string;
    running: boolean;
    enabled: boolean;
    handler?: {
        send(...args: any): any;
        listen(cb: (...args: any) => void): void;
    };
    logger?: PluginLogger;
}