/**
 * HTTP Status Codes
 */
export var HttpStatus;
(function (HttpStatus) {
    HttpStatus[HttpStatus["OK"] = 200] = "OK";
    HttpStatus[HttpStatus["CREATED"] = 201] = "CREATED";
    HttpStatus[HttpStatus["ACCEPTED"] = 202] = "ACCEPTED";
    HttpStatus[HttpStatus["NO_CONTENT"] = 204] = "NO_CONTENT";
    HttpStatus[HttpStatus["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatus[HttpStatus["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatus[HttpStatus["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatus[HttpStatus["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatus[HttpStatus["CONFLICT"] = 409] = "CONFLICT";
    HttpStatus[HttpStatus["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
    HttpStatus[HttpStatus["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HttpStatus[HttpStatus["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
})(HttpStatus || (HttpStatus = {}));
/**
 * User Roles
 */
export var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "student";
    UserRole["INSTRUCTOR"] = "instructor";
    UserRole["ADMIN"] = "admin";
})(UserRole || (UserRole = {}));
/**
 * Service Names
 */
export var ServiceName;
(function (ServiceName) {
    ServiceName["API_GATEWAY"] = "api-gateway";
    ServiceName["USER_SERVICE"] = "user-service";
    ServiceName["COURSE_SERVICE"] = "course-service";
    ServiceName["ASSESSMENT_SERVICE"] = "assessment-service";
    ServiceName["FILE_SERVICE"] = "file-service";
    ServiceName["ANALYTICS_SERVICE"] = "analytics-service";
    ServiceName["PAYMENT_SERVICE"] = "payment-service";
    ServiceName["NOTIFICATION_SERVICE"] = "notification-service";
    ServiceName["LIVE_SESSION_SERVICE"] = "live-session-service";
})(ServiceName || (ServiceName = {}));
//# sourceMappingURL=http.constants.js.map