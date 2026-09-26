import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { createContactInquirySchema } from '../validators/contact.validator';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';
import { UserRoles } from '../constants/roles.constant';

const router = Router();

router.post(
  '/',
  validateRequest(createContactInquirySchema),
  contactController.createInquiry.bind(contactController)
);

router.get(
  '/',
  authenticate,
  authorize(UserRoles.ADMIN),
  contactController.listInquiries.bind(contactController)
);

export default router;
