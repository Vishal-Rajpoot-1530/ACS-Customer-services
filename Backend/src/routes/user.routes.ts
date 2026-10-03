import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { explorerStateSchema } from '../validators/explorer.validator';

const router = Router();

router.use(authenticate);

router.get('/share-directory', userController.getShareDirectory.bind(userController));
router.get('/explorer', userController.getExplorer.bind(userController));
router.put('/explorer', validateRequest(explorerStateSchema), userController.saveExplorer.bind(userController));

router.patch('/profile', userController.updateProfile.bind(userController));

export default router;
