import { Response } from 'express';
import { db } from '../utils/mysql';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Submit leave request (User)
export const submitLeaveRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId!;
    const { leaveDate, reason, description } = req.body;

    // Check if user already submitted a request for that date
    const existing = await db.leaveRequest.findFirst({
      where: {
        userId,
        leaveDate,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: `You already have an active or approved leave request for ${leaveDate}`,
      });
      return;
    }

    const leave = await db.leaveRequest.create({
      data: {
        userId,
        leaveDate,
        reason,
        description: description || null,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting leave request',
    });
  }
};

// User gets their own leave requests
export const getMyLeaveRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId!;

    const leaves = await db.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      leaves,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user leave requests',
    });
  }
};

// Admin gets all leave requests
export const getAdminLeaveRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const leaves = await db.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            team: { select: { id: true, name: true } },
          },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
    const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
    const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;

    res.json({
      success: true,
      summary: {
        total: leaves.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      leaves,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching leave requests',
    });
  }
};

// Admin approves leave request
export const approveLeaveRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId!;

    const leave = await db.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    const updated = await db.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Automatically record or update attendance for that date as ON_LEAVE
    await db.attendance.upsert({
      where: {
        userId_date: {
          userId: leave.userId,
          date: leave.leaveDate,
        },
      },
      update: {
        status: 'ON_LEAVE',
        notes: `Approved leave: ${leave.reason}`,
      },
      create: {
        userId: leave.userId,
        date: leave.leaveDate,
        status: 'ON_LEAVE',
        notes: `Approved leave: ${leave.reason}`,
      },
    });

    res.json({
      success: true,
      message: 'Leave request approved successfully',
      leave: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error approving leave request',
    });
  }
};

// Admin rejects leave request
export const rejectLeaveRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId!;

    const leave = await db.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    const updated = await db.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      message: 'Leave request rejected',
      leave: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error rejecting leave request',
    });
  }
};
