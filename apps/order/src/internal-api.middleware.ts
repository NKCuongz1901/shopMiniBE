// products/internal-api.middleware.ts
import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class InternalApiMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const internalKey = req.headers['x-internal-api-key'];
    const validKey = process.env.INTERNAL_API_KEY || 'my-secret-key';
    console.log('Internal API Key:', internalKey);
    console.log('Valid Key:', validKey);
    if (internalKey !== validKey) {
      throw new ForbiddenException('Access denied');
    }
    next();
  }
}
