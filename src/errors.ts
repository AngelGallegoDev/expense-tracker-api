export type ApiErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR"

export function apiError(code: ApiErrorCode, message: string) {
    return { error: { code, message } }
}

export const Errors = {
    validation: (message = "Validation error") => apiError("VALIDATION_ERROR", message),
    notFound: (message = "Route not found") => apiError("NOT_FOUND", message),
    internal: (message = "Internal server error") => apiError("INTERNAL_ERROR", message),
} as const;