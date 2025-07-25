/**
 * HTTP Status Codes
 */
export declare enum HttpStatus {
    OK = 200,
    CREATED = 201,
    ACCEPTED = 202,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503
}
/**
 * User Roles
 */
export declare enum UserRole {
    STUDENT = "student",
    INSTRUCTOR = "instructor",
    ADMIN = "admin"
}
/**
 * Service Names
 */
export declare enum ServiceName {
    API_GATEWAY = "api-gateway",
    USER_SERVICE = "user-service",
    COURSE_SERVICE = "course-service",
    ASSESSMENT_SERVICE = "assessment-service",
    FILE_SERVICE = "file-service",
    ANALYTICS_SERVICE = "analytics-service",
    PAYMENT_SERVICE = "payment-service",
    NOTIFICATION_SERVICE = "notification-service",
    LIVE_SESSION_SERVICE = "live-session-service"
}
//# sourceMappingURL=http.constants.d.ts.map