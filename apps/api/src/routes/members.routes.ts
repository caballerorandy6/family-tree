import { Router, type RequestHandler, type IRouter } from 'express';
import { handleCreateMember, handleGetMembers, handleGetMember, handleUpdateMember, handleDeleteMember } from '../controllers/member.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { createMemberSchema, updateMemberSchema, memberIdParamSchema, memberTreeIdParamSchema } from '@familytree/validations/member.schema';

const router: IRouter = Router();

router.use(authenticate);

router.post('/', validate(createMemberSchema), handleCreateMember as unknown as RequestHandler);
router.get('/tree/:treeId', validate(memberTreeIdParamSchema, 'params'), handleGetMembers as unknown as RequestHandler);
router.get('/:id', validate(memberIdParamSchema, 'params'), handleGetMember as unknown as RequestHandler);
router.put('/:id', validate(memberIdParamSchema, 'params'), validate(updateMemberSchema), handleUpdateMember as unknown as RequestHandler);
router.delete('/:id', validate(memberIdParamSchema, 'params'), handleDeleteMember as unknown as RequestHandler);

export default router;
