import { Router, type RequestHandler, type IRouter } from 'express';
import { handleCreateTree, handleGetTrees, handleGetTree, handleUpdateTree, handleDeleteTree } from '../controllers/tree.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { createTreeSchema, updateTreeSchema, treeIdParamSchema } from '@familytree/validations/tree.schema';

const router: IRouter = Router();

router.use(authenticate);

router.post('/', validate(createTreeSchema), handleCreateTree as unknown as RequestHandler);
router.get('/', handleGetTrees as unknown as RequestHandler);
router.get('/:id', validate(treeIdParamSchema, 'params'), handleGetTree as unknown as RequestHandler);
router.put('/:id', validate(treeIdParamSchema, 'params'), validate(updateTreeSchema), handleUpdateTree as unknown as RequestHandler);
router.delete('/:id', validate(treeIdParamSchema, 'params'), handleDeleteTree as unknown as RequestHandler);

export default router;
