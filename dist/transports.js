"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consoleTransport = consoleTransport;
exports.memoryTransport = memoryTransport;
function consoleTransport() {
    return {
        name: "console",
        send(event) {
            const line = `[${event.level.toUpperCase()}] ${event.type}: ${event.message}`;
            if (event.level === "error")
                console.error(line, event.stack ?? "");
            else
                console.warn(line);
        },
    };
}
/** Transport en mémoire, utile pour les tests. */
function memoryTransport() {
    const events = [];
    return { name: "memory", events, send: event => void events.push(event) };
}
//# sourceMappingURL=transports.js.map