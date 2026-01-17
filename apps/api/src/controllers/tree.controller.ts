import type { Request, Response, NextFunction } from 'express';
import { createTree, getTreesByUserId, getTreeById, updateTree, deleteTree } from '../services/tree.service';
import type { CreateTreeInput, UpdateTreeInput, TreeIdParam } from '@familytree/validations/tree.schema';

export async function handleCreateTree(
  req: Request<unknown, unknown, CreateTreeInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const tree = await createTree(req.user.userId, req.body);

    res.status(201).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetTrees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const trees = await getTreesByUserId(req.user.userId);

    res.json({
      success: true,
      data: trees,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetTree(
  req: Request<TreeIdParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const tree = await getTreeById(req.params.id, req.user.userId);

    if (!tree) {
      res.status(404).json({
        success: false,
        error: { code: 'TREE_NOT_FOUND', message: 'Family tree not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateTree(
  req: Request<TreeIdParam, unknown, UpdateTreeInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const tree = await updateTree(req.params.id, req.user.userId, req.body);

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteTree(
  req: Request<TreeIdParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    await deleteTree(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: { message: 'Family tree deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
}
