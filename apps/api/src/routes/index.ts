import { Router, type IRouter } from 'express';
import authRoutes from './auth.routes';
import treesRoutes from './trees.routes';
import membersRoutes from './members.routes';
import filesRoutes from './files.routes';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/trees', treesRoutes);
router.use('/members', membersRoutes);
router.use('/files', filesRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
