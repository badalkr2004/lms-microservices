import { Request } from 'express';
import { TokenPayload } from '../utils/jwt.utils';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}
