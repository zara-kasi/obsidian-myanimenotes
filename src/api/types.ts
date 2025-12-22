export interface MALApiResponse {
    data?: MALNode[];
    paging?: {
        next?: string;
    };
    error?: string;
    message?: string;
}

export interface MALNode {
    node: {
        id: number;
        title: string;
        // Explicitly add these common fields to satisfy TypeScript overlap checks
        main_picture?: {
            medium: string;
            large: string;
        };
        status?: string;
        media_type?: string;
        num_episodes?: number;
        num_volumes?: number;
        start_date?: string;
        mean?: number;

        // The catch-all still exists for everything else
        [key: string]: unknown;
    };
    list_status?: {
        status?: string;
        score?: number;
        num_episodes_watched?: number;
        num_volumes_read?: number;
        updated_at?: string;
        [key: string]: unknown;
    } | null;
}

export interface RequestResponse {
    status: number;
    json?: Record<string, unknown>;
    text: string;
}
