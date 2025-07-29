export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    metadata?: {
        etag?: string;
        timestamp?: string;
    };
}
