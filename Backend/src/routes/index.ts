import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import documentRoutes from './document.routes';
import adminRoutes from './admin.routes';
import contactRoutes from './contact.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/documents', documentRoutes);
router.use('/admin', adminRoutes);
router.use('/contact', contactRoutes);

export default router;
