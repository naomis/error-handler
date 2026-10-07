/** Retire les parties variables (ids, nombres, valeurs entre quotes) pour regrouper les erreurs identiques. */
export declare function normalizeMessage(message: string): string;
/** Première frame appartenant au code applicatif (hors node_modules et node:internal), sans ligne/colonne. */
export declare function topAppFrame(stack?: string): string;
export declare function computeFingerprint(type: string, error: Error): string;
