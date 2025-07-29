interface ApiResponse<T = any> {
    success: boolean;
    error?: {
        code: number; // HTTP status code
        message: string;
    };
    data?: T | null;
}

export function createResponse<T>(
    success: boolean,
    statusCode: number,
    options?: {
        data?: T | null;
        errorMessage?: string;
    },
): { status: number; jsonBody: ApiResponse<T> } {
    const response: ApiResponse<T> = {
        success,
        data: options?.data ?? null,
    };

    if (!success) {
        response.error = {
            code: statusCode,
            message: options?.errorMessage || getDefaultMessage(statusCode),
        };
    }

    return {
        status: statusCode,
        jsonBody: response,
    };
}

function getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
        400: "Bad request",
        401: "Unauthorized",
        404: "Player not found",
        409: "Conflict - resource already exists",
        500: "Internal server error",
    };
    return messages[statusCode] || "Operation failed";
}
