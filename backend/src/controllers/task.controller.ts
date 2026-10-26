import { Response } from 'express';
import { db } from '../utils/mysql';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Regular user: Get only their own tasks
export const getUserTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { status, priority, search } = req.query;

    const where: any = { userId };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, rollNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user tasks',
    });
  }
};

// Admin: Monitor all tasks across users and teams
export const getAdminTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, userId, teamId, search } = req.query;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (userId && userId !== 'all') {
      where.userId = userId;
    }

    if (teamId && teamId !== 'all') {
      where.teamId = teamId;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, rollNumber: true, designation: true } },
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary statistics
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const pending = tasks.filter((t) => t.status === 'PENDING').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const review = tasks.filter((t) => t.status === 'REVIEW').length;

    res.json({
      success: true,
      summary: {
        total,
        inProgress,
        pending,
        completed,
        review,
      },
      tasks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error monitoring tasks',
    });
  }
};

// Get single task by ID (Enforces ownership for regular users)
export const getTaskById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'ADMIN';

    const task = await db.task.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, designation: true } },
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Role-based authorization check: normal users can ONLY access their own tasks
    if (!isAdmin && task.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to view this task.',
      });
      return;
    }

    res.json({
      success: true,
      task,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching task',
    });
  }
};

// Create task
export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, priority, status, progress, dueDate, userId, teamId } = req.body;
    const currentUserId = req.user?.userId!;
    const isAdmin = req.user?.role === 'ADMIN';

    // Normal users can only create tasks assigned to themselves
    const targetUserId = isAdmin && userId ? userId : currentUserId;

    // Check if target user exists and get their team if teamId not passed
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { teamId: true },
    });

    const assignedTeamId = teamId !== undefined ? teamId : targetUser?.teamId;

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        progress: progress || 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: targetUserId,
        createdById: currentUserId,
        teamId: assignedTeamId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating task',
    });
  }
};

// Update task
export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId!;
    const isAdmin = req.user?.role === 'ADMIN';

    const existingTask = await db.task.findUnique({ where: { id } });

    if (!existingTask) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Role-based resource ownership validation: normal users can only edit their own tasks
    if (!isAdmin && existingTask.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You can only edit your own tasks.',
      });
      return;
    }

    const { title, description, priority, status, progress, dueDate, teamId, userId: newUserId } = req.body;

    const completedAt =
      status === 'COMPLETED' && existingTask.status !== 'COMPLETED'
        ? new Date()
        : status && status !== 'COMPLETED'
        ? null
        : existingTask.completedAt;

    const updatedTask = await db.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isAdmin && newUserId && { userId: newUserId }),
        ...(teamId !== undefined && { teamId }),
        completedAt,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating task',
    });
  }
};

// Quick status and progress update (e.g. mark completed)
export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, progress } = req.body;
    const userId = req.user?.userId!;
    const isAdmin = req.user?.role === 'ADMIN';

    const existing = await db.task.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (!isAdmin && existing.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You can only update your own tasks.',
      });
      return;
    }

    const newProgress = progress !== undefined ? progress : status === 'COMPLETED' ? 100 : existing.progress;
    const completedAt = status === 'COMPLETED' ? new Date() : null;

    const updated = await db.task.update({
      where: { id },
      data: {
        ...(status && { status }),
        progress: newProgress,
        completedAt,
      },
    });

    res.json({
      success: true,
      message: 'Task status updated',
      task: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating status',
    });
  }
};

// Delete task
export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId!;
    const isAdmin = req.user?.role === 'ADMIN';

    const existing = await db.task.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (!isAdmin && existing.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete your own tasks.',
      });
      return;
    }

    await db.task.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting task',
    });
  }
};
