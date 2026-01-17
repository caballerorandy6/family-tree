import { Router, type RequestHandler, type IRouter } from 'express';
import { handleRegister, handleLogin, handleRefresh, handleLogout, handleGoogleAuth, handleGetMe } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { loginSchema, registerSchema, googleAuthSchema, refreshTokenSchema } from '@familytree/validations/auth.schema';

const router: IRouter = Router();

router.post('/register', validate(registerSchema), handleRegister as unknown as RequestHandler);
router.post('/login', validate(loginSchema), handleLogin as unknown as RequestHandler);
router.post('/refresh', validate(refreshTokenSchema), handleRefresh as unknown as RequestHandler);
router.post('/logout', authenticate, handleLogout as unknown as RequestHandler);
router.post('/google', validate(googleAuthSchema), handleGoogleAuth as unknown as RequestHandler);
router.get('/me', authenticate, handleGetMe as unknown as RequestHandler);

export default router;
