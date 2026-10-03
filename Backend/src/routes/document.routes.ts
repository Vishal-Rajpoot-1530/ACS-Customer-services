import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadDocuments } from '../middlewares/upload.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  documentIdParamSchema,
  listDocumentsQuerySchema,
  revokeDocumentShareSchema,
  shareDocumentSchema,
} from '../validators/document.validator';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// Upload document for the authenticated account
router.post(
  '/',
  uploadLimiter,
  authenticate,
  uploadDocuments,
  documentController.upload.bind(documentController)
);

// List user documents
router.get(
  '/',
  authenticate,
  validateRequest(listDocumentsQuerySchema),
  documentController.list.bind(documentController)
);

router.get('/shared', authenticate, documentController.listShared.bind(documentController));
router.get('/shared-by-me', authenticate, documentController.listSharedByMe.bind(documentController));

router.post(
  '/:id/shares/all',
  authenticate,
  validateRequest(documentIdParamSchema),
  documentController.shareWithAll.bind(documentController)
);

router.post(
  '/:id/shares',
  authenticate,
  validateRequest(shareDocumentSchema),
  documentController.share.bind(documentController)
);

router.delete(
  '/:id/shares/:recipientId',
  authenticate,
  validateRequest(revokeDocumentShareSchema),
  documentController.revokeShare.bind(documentController)
);

// Get single document metadata
router.get(
  '/:id',
  authenticate,
  validateRequest(documentIdParamSchema),
  documentController.getById.bind(documentController)
);

// Get temporary presigned download/view URL
router.get(
  '/:id/download',
  authenticate,
  validateRequest(documentIdParamSchema),
  documentController.getDownloadUrl.bind(documentController)
);

// Delete document
router.delete(
  '/:id',
  authenticate,
  validateRequest(documentIdParamSchema),
  documentController.delete.bind(documentController)
);

export default router;
