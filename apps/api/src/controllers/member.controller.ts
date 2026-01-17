import type { Request, Response, NextFunction } from 'express';
import { createMember, getMembersByTreeId, getMemberById, updateMember, deleteMember } from '../services/member.service';
import type { CreateMemberInput, UpdateMemberInput, MemberIdParam } from '@familytree/validations/member.schema';

interface TreeIdParams {
  treeId: string;
}

export async function handleCreateMember(
  req: Request<unknown, unknown, CreateMemberInput>,
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

    const member = await createMember(req.user.userId, req.body);

    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetMembers(
  req: Request<TreeIdParams>,
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

    const members = await getMembersByTreeId(req.params.treeId, req.user.userId);

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetMember(
  req: Request<MemberIdParam>,
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

    const member = await getMemberById(req.params.id, req.user.userId);

    if (!member) {
      res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'Family member not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateMember(
  req: Request<MemberIdParam, unknown, UpdateMemberInput>,
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

    const member = await updateMember(req.params.id, req.user.userId, req.body);

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteMember(
  req: Request<MemberIdParam>,
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

    await deleteMember(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: { message: 'Family member deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
}
