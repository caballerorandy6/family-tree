import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'params' | 'query';

function formatZodError(error: ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: formatZodError(result.error),
        },
      });
      return;
    }

    req[target] = result.data;
    next();
  };
}

export function validateMultiple(schemas: { schema: ZodSchema; target: ValidationTarget }[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const { schema, target } of schemas) {
      const result = schema.safeParse(req[target]);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: formatZodError(result.error),
          },
        });
        return;
      }

      req[target] = result.data;
    }

    next();
  };
}
