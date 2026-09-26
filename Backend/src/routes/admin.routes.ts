import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { UserRoles } from '../constants/roles.constant';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  documentIdParamSchema,
  listDocumentsQuerySchema,
  updateDocumentSchema,
  updateStatusSchema,
} from '../validators/document.validator';

const router = Router();

// Guard all admin routes with authentication and ADMIN role check
router.use(authenticate, authorize(UserRoles.ADMIN));

router.get('/users', adminController.getUsers.bind(adminController));

router.delete('/users/:id', adminController.deleteUser.bind(adminController));

router.get(
  '/documents',
  validateRequest(listDocumentsQuerySchema),
  adminController.getQueue.bind(adminController)
);

router.put(
  '/documents/:id',
  validateRequest(updateDocumentSchema),
  adminController.updateDocument.bind(adminController)
);

router.patch(
  '/documents/:id/status',
  validateRequest(updateStatusSchema),
  adminController.updateStatus.bind(adminController)
);

router.delete(
  '/documents/:id',
  validateRequest(documentIdParamSchema),
  adminController.deleteDocument.bind(adminController)
);

router.get('/stats', adminController.getStats.bind(adminController));

export default router;
