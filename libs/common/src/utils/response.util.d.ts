import { Response } from 'express';
/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    message?: string;
    data?: T;
    error?: any;
}
/**
 * Send a success response
 */
export declare const sendSuccess: <T>(res: Response, data?: T, message?: string, statusCode?: number) => Response;
/**
 * Send an error response
 */
export declare const sendError: (res: Response, message?: string, statusCode?: number, error?: any) => Response;
//# sourceMappingURL=response.util.d.ts.map