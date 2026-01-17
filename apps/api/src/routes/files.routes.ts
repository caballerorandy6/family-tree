import { Router, type RequestHandler, type IRouter } from 'express';
import { handleUploadFile, handleGetFiles, handleGetFileDownloadUrl, handleDeleteFile, handleUploadProfilePhoto } from '../controllers/file.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { upload, handleMulterError } from '../middleware/upload.middleware';
import { fileIdParamSchema, fileMemberIdParamSchema } from '@familytree/validations/file.schema';

const router: IRouter = Router();

router.use(authenticate);

router.post('/', upload.single('file'), handleMulterError, handleUploadFile as unknown as RequestHandler);
router.post('/profile-photo', upload.single('file'), handleMulterError, handleUploadProfilePhoto as unknown as RequestHandler);
router.get('/member/:memberId', validate(fileMemberIdParamSchema, 'params'), handleGetFiles as unknown as RequestHandler);
router.get('/:id/download', validate(fileIdParamSchema, 'params'), handleGetFileDownloadUrl as unknown as RequestHandler);
router.delete('/:id', validate(fileIdParamSchema, 'params'), handleDeleteFile as unknown as RequestHandler);

export default router;
