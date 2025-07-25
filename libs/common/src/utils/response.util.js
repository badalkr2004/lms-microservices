/**
 * Send a success response
 */
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        status: 'success',
        message,
        data,
    });
};
/**
 * Send an error response
 */
export const sendError = (res, message = 'An error occurred', statusCode = 500, error) => {
    return res.status(statusCode).json({
        status: 'error',
        message,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
};
//# sourceMappingURL=response.util.js.map