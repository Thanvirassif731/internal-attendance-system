import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../utils/mysql';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, username, email, password, role, teamId, designation, rollNumber, status } = req.body;

    // Check duplicate username or email
    const existing = await db.user.findFirst({
      where: {
        OR: [{ username }, { email }, ...(rollNumber ? [{ rollNumber }] : [])],
      },
    });

    if (existing) {
      if (existing.username === username) {
        res.status(400).json({ success: false, message: 'Username is already taken' });
        return;
      }
      if (existing.email === email) {
        res.status(400).json({ success: false, message: 'Email is already registered' });
        return;
      }
      if (rollNumber && existing.rollNumber === rollNumber) {
        res.status(400).json({ success: false, message: 'Roll number is already assigned' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        role: role || 'USER',
        teamId: teamId || null,
        designation: designation || null,
        rollNumber: rollNumber || null,
        status: status || 'ACTIVE',
      },
      include: {
        team: true,
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user',
    });
  }
};

export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, teamId, role, status } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
        { rollNumber: { contains: search } },
      ];
    }

    if (teamId && typeof teamId === 'string' && teamId !== 'all') {
      where.teamId = teamId;
    }

    if (role && typeof role === 'string' && role !== 'all') {
      where.role = role;
    }

    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status;
    }

    const users = await db.user.findMany({
      where,
      include: {
        team: true,
        tasks: {
          select: { id: true, status: true, progress: true },
        },
        attendances: {
          take: 5,
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedUsers = users.map(({ password, ...rest }) => rest);

    res.json({
      success: true,
      count: sanitizedUsers.length,
      users: sanitizedUsers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching users',
    });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        team: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user',
    });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, status, teamId, designation, rollNumber } = req.body;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (email && email !== user.email) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        res.status(400).json({ success: false, message: 'Email already exists' });
        return;
      }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(status && { status }),
        ...(teamId !== undefined && { teamId }),
        ...(designation !== undefined && { designation }),
        ...(rollNumber !== undefined && { rollNumber }),
      },
      include: { team: true },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user',
    });
  }
};

export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await db.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await db.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, email: true, status: true },
    });

    res.json({
      success: true,
      message: `User marked as ${newStatus.toLowerCase()}`,
      user: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error toggling user status',
    });
  }
};

export const resetUserPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error resetting password',
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.userId === id) {
      res.status(400).json({ success: false, message: 'Cannot delete your own admin account' });
      return;
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await db.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting user',
    });
  }
};
