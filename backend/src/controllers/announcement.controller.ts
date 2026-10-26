import { Response } from 'express';
import { db } from '../utils/mysql';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Both Admin and Users can fetch all announcements
export const getAllAnnouncements = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const announcements = await db.announcement.findMany({
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      announcements,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching announcements',
    });
  }
};

// Get single announcement
export const getAnnouncementById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const announcement = await db.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    res.json({
      success: true,
      announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching announcement',
    });
  }
};

// Admin only: Create announcement
export const createAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, content, priority, expiryDate, attachment } = req.body;
    const authorId = req.user?.userId!;

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'IMPORTANT',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        attachment: attachment || null,
        authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating announcement',
    });
  }
};

// Admin only: Update announcement
export const updateAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, priority, expiryDate } = req.body;

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    const updated = await db.announcement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(priority && { priority }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating announcement',
    });
  }
};

// Admin only: Repost announcement
export const repostAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authorId = req.user?.userId!;

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Announcement to repost not found' });
      return;
    }

    // Create a new announcement record with original content, updated date, and reposted marker
    const reposted = await db.announcement.create({
      data: {
        title: existing.title,
        content: existing.content,
        priority: existing.priority,
        expiryDate: existing.expiryDate,
        attachment: existing.attachment,
        authorId,
        isReposted: true,
        originalId: existing.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Announcement reposted successfully',
      announcement: reposted,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error reposting announcement',
    });
  }
};

// Admin only: Delete announcement
export const deleteAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    await db.announcement.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting announcement',
    });
  }
};
