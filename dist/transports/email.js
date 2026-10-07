"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTransport = emailTransport;
const emailTemplate_1 = require("./emailTemplate");
function emailTransport(options) {
    const { levels = ["error"], cooldownMs = 3600000, maxTracked = 1000 } = options;
    const lastSent = new Map();
    return {
        name: "email",
        async send(event) {
            if (!levels.includes(event.level))
                return;
            const key = `${event.app}|${event.environment ?? ""}|${event.fingerprint}`;
            const now = Date.now();
            const previous = lastSent.get(key);
            if (previous !== undefined && now - previous < cooldownMs)
                return;
            lastSent.delete(key);
            lastSent.set(key, now);
            if (lastSent.size > maxTracked)
                lastSent.delete(lastSent.keys().next().value);
            const prefix = options.subjectPrefix ?? `[${event.level === "error" ? "Erreur" : "Warning"} - ${event.app}]`;
            try {
                await options.sendMail({
                    to: options.to,
                    subject: `${prefix} ${event.message}`.slice(0, 200),
                    html: (0, emailTemplate_1.buildEventEmailHtml)(event, options.template),
                });
            }
            catch (error) {
                lastSent.delete(key); // permettre un nouvel essai
                throw error;
            }
        },
    };
}
//# sourceMappingURL=email.js.map