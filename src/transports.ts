import type { MonitorEvent, Transport } from "./types";

export function consoleTransport(): Transport {
  return {
    name: "console",
    send(event: MonitorEvent) {
      const line = `[${event.level.toUpperCase()}] ${event.type}: ${event.message}`;
      if (event.level === "error") console.error(line, event.stack ?? "");
      else console.warn(line);
    },
  };
}

/** Transport en mémoire, utile pour les tests. */
export function memoryTransport(): Transport & { events: MonitorEvent[] } {
  const events: MonitorEvent[] = [];
  return { name: "memory", events, send: event => void events.push(event) };
}
