import type { MonitorEvent, Transport } from "./types";
export declare function consoleTransport(): Transport;
/** Transport en mémoire, utile pour les tests. */
export declare function memoryTransport(): Transport & {
    events: MonitorEvent[];
};
