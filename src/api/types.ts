import type { MALItem } from "../models";

export interface MALApiResponse {
    data?: MALItem[];
    paging?: {
        next?: string;
        previous?: string;
    };
    error?: string;
    message?: string;
}

export interface RequestResponse {
    status: number;
    json?: Record<string, unknown>;
    text: string;
}
