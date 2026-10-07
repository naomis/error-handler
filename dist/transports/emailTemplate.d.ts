import type { MonitorEvent } from "../types";
export interface EmailTemplateOptions {
    timeZone?: string;
    /** Lien vers la vue détaillée, ex. `https://app/_monitor/groups/12`. */
    detailUrl?: string;
}
export declare function buildEventEmailHtml(event: MonitorEvent, { timeZone, detailUrl }?: EmailTemplateOptions): string;
