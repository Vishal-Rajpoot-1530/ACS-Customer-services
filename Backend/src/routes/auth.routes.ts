import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '../validators/auth.validator';
import { authenticate } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.get('/admin-status', authController.getAdminStatus.bind(authController));

router.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  authController.register.bind(authController)
);

router.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  authLimiter,
  validateRequest(refreshTokenSchema),
  authController.refreshTokens.bind(authController)
);

router.post('/logout', authController.logout.bind(authController));

router.get('/me', authenticate, authController.getMe.bind(authController));

router.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword.bind(authController)
);

export default router;
