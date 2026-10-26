import { Response } from 'express';
import { db } from '../utils/mysql';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getAllTeams = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teams = await db.team.findMany({
      include: {
        lead: {
          select: { id: true, name: true, email: true, designation: true },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            rollNumber: true,
            status: true,
            attendances: {
              take: 1,
              orderBy: { date: 'desc' },
              select: { date: true, status: true, checkInTime: true, checkOutTime: true },
            },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Compute progress for each team
    const enrichedTeams = teams.map((team) => {
      const totalTasks = team.tasks.length;
      const avgProgress =
        totalTasks > 0
          ? Math.round(
              team.tasks.reduce((sum: number, task: any) => sum + task.progress, 0) / totalTasks
            )
          : 0;

      const currentTask = team.tasks.find((t: any) => t.status !== 'COMPLETED') || team.tasks[0] || null;

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        lead: team.lead,
        memberCount: team.members.length,
        members: team.members,
        avgProgress,
        currentTask,
        tasksCount: totalTasks,
      };
    });

    res.json({
      success: true,
      teams: enrichedTeams,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching teams',
    });
  }
};

export const getTeamById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await db.team.findUnique({
      where: { id },
      include: {
        lead: {
          select: { id: true, name: true, email: true, designation: true, rollNumber: true },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            rollNumber: true,
            status: true,
            attendances: {
              take: 1,
              orderBy: { date: 'desc' },
              select: { date: true, status: true, checkInTime: true, checkOutTime: true },
            },
            tasks: {
              take: 1,
              orderBy: { updatedAt: 'desc' },
              select: { id: true, title: true, status: true, progress: true },
            },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    const totalTasks = team.tasks.length;
    const avgProgress =
      totalTasks > 0
        ? Math.round(
            team.tasks.reduce((sum: number, task: any) => sum + task.progress, 0) / totalTasks
          )
        : 0;

    const currentTask =
      team.tasks.find((t: any) => t.status !== 'COMPLETED') || team.tasks[0] || null;

    res.json({
      success: true,
      team: {
        ...team,
        avgProgress,
        currentTask,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching team details',
    });
  }
};

export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, leadId } = req.body;

    const existing = await db.team.findUnique({ where: { name } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Team name already exists' });
      return;
    }

    const newTeam = await db.team.create({
      data: {
        name,
        description: description || null,
        leadId: leadId || null,
      },
      include: {
        lead: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team: newTeam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating team',
    });
  }
};

export const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, leadId } = req.body;

    const team = await db.team.findUnique({ where: { id } });
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    const updated = await db.team.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(leadId !== undefined && { leadId }),
      },
      include: {
        lead: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      message: 'Team updated successfully',
      team: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating team',
    });
  }
};

export const deleteTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await db.team.findUnique({ where: { id } });
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    await db.team.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting team',
    });
  }
};
