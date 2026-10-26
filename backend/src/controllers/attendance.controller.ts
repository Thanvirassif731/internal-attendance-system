import { Response } from 'express';
import { db } from '../utils/mysql';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Helper to get formatted date "YYYY-MM-DD"
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get formatted time "HH:MM AM/PM"
export const getCurrentTimeString = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// User check-in
export const checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId!;
    const today = getTodayDateString();
    const timeStr = getCurrentTimeString();

    // Check if attendance already exists for today
    const existing = await db.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existing && existing.checkInTime) {
      res.status(400).json({
        success: false,
        message: `You have already checked in today at ${existing.checkInTime}`,
      });
      return;
    }

    // Determine if late (e.g. check-in after 09:15 AM)
    const now = new Date();
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
    const status = isLate ? 'LATE' : 'PRESENT';

    let attendanceRecord;
    if (existing) {
      attendanceRecord = await db.attendance.update({
        where: { id: existing.id },
        data: {
          checkInTime: timeStr,
          status,
          notes: req.body.notes || existing.notes,
        },
      });
    } else {
      attendanceRecord = await db.attendance.create({
        data: {
          userId,
          date: today,
          checkInTime: timeStr,
          status,
          notes: req.body.notes || null,
        },
      });
    }

    res.json({
      success: true,
      message: `Checked in successfully at ${timeStr} (${status})`,
      attendance: attendanceRecord,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking in',
    });
  }
};

// User check-out
export const checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId!;
    const today = getTodayDateString();
    const timeStr = getCurrentTimeString();

    const existing = await db.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!existing || !existing.checkInTime) {
      res.status(400).json({
        success: false,
        message: 'You have not checked in today yet.',
      });
      return;
    }

    if (existing.checkOutTime) {
      res.status(400).json({
        success: false,
        message: `You have already checked out today at ${existing.checkOutTime}`,
      });
      return;
    }

    const updated = await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime: timeStr,
        notes: req.body.notes || existing.notes,
      },
    });

    res.json({
      success: true,
      message: `Checked out successfully at ${timeStr}`,
      attendance: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking out',
    });
  }
};

// User gets today's attendance
export const getMyTodayAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId!;
    const today = getTodayDateString();

    const attendance = await db.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    res.json({
      success: true,
      attendance: attendance || null,
      today,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching today attendance',
    });
  }
};

// User gets their attendance history
export const getMyAttendanceHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId!;
    const { month, year } = req.query;

    let whereClause: any = { userId };

    if (month && year) {
      const formattedMonth = String(month).padStart(2, '0');
      whereClause.date = {
        startsWith: `${year}-${formattedMonth}`,
      };
    }

    const attendances = await db.attendance.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    const total = attendances.length;
    const present = attendances.filter((a) => a.status === 'PRESENT').length;
    const late = attendances.filter((a) => a.status === 'LATE').length;
    const absent = attendances.filter((a) => a.status === 'ABSENT').length;
    const onLeave = attendances.filter((a) => a.status === 'ON_LEAVE').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    res.json({
      success: true,
      stats: {
        total,
        present,
        late,
        absent,
        onLeave,
        rate,
      },
      attendances,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching attendance history',
    });
  }
};

// Admin: Monitor attendance across all users
export const getAdminAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date, month, teamId, status, search } = req.query;

    const targetDate = date ? String(date) : getTodayDateString();

    const where: any = {};

    if (date) {
      where.date = String(date);
    } else if (month) {
      where.date = { startsWith: String(month) };
    } else {
      where.date = targetDate;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (teamId && teamId !== 'all') {
      where.user = { teamId: String(teamId) };
    }

    if (search && typeof search === 'string') {
      where.user = {
        ...(where.user || {}),
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { rollNumber: { contains: search } },
        ],
      };
    }

    const attendances = await db.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            designation: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute stats for today
    const allUsersCount = await db.user.count({ where: { status: 'ACTIVE' } });
    const todayRecords = await db.attendance.findMany({
      where: { date: targetDate },
    });

    const presentCount = todayRecords.filter((r) => r.status === 'PRESENT').length;
    const lateCount = todayRecords.filter((r) => r.status === 'LATE').length;
    const onLeaveCount = todayRecords.filter((r) => r.status === 'ON_LEAVE').length;
    const recordedCount = todayRecords.length;
    const absentCount = Math.max(0, allUsersCount - (presentCount + lateCount + onLeaveCount));

    const presentPercentage = allUsersCount > 0 ? ((presentCount / allUsersCount) * 100).toFixed(1) : '0';
    const latePercentage = allUsersCount > 0 ? ((lateCount / allUsersCount) * 100).toFixed(1) : '0';
    const absentPercentage = allUsersCount > 0 ? ((absentCount / allUsersCount) * 100).toFixed(1) : '0';

    res.json({
      success: true,
      date: targetDate,
      stats: {
        totalMembers: allUsersCount,
        present: presentCount,
        presentPercentage: `${presentPercentage}%`,
        late: lateCount,
        latePercentage: `${latePercentage}%`,
        absent: absentCount,
        absentPercentage: `${absentPercentage}%`,
        workingDays: 22,
      },
      attendances,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching admin attendance',
    });
  }
};
