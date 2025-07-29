import { ApiResponse } from "../interfaces/response";

export function createResponse<T>(options: {
    success: boolean;
    data?: T;
    error?: { code: string; message: string; details?: unknown };
    metadata?: { etag?: string; timestamp?: string };
}): ApiResponse<T> {
    return {
        success: options.success,
        data: options.data,
        error: options.error,
        //metadata: options.metadata,
    };
}
