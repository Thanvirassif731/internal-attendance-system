import bcrypt from 'bcryptjs';
import { db } from './utils/mysql';
import { getTodayDateString } from './controllers/attendance.controller';

async function seedData() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await db.attendance.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.announcement.deleteMany();
  await db.task.deleteMany();
  await db.user.deleteMany();
  await db.team.deleteMany();

  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedUserPassword = await bcrypt.hash('user123', 10);

  // 1. Create Teams
  console.log('Creating teams...');
  const platformTeam = await db.team.create({
    data: {
      name: 'Platform Team',
      description: 'AWS infrastructure migration and cloud operations',
    },
  });

  const devTeam = await db.team.create({
    data: {
      name: 'Development Team',
      description: 'Core web portal, APIs, and client-side interfaces',
    },
  });

  const qaTeam = await db.team.create({
    data: {
      name: 'QA Team',
      description: 'Release regression testing and quality assurance automation',
    },
  });

  const devopsTeam = await db.team.create({
    data: {
      name: 'DevOps & SRE',
      description: 'Infrastructure automation, CI/CD, and system reliability',
    },
  });

  const mobileTeam = await db.team.create({
    data: {
      name: 'Mobile Engineering',
      description: 'Cross-platform mobile apps for iOS and Android',
    },
  });

  // 2. Create Users
  console.log('Creating users...');
  const adminUser = await db.user.create({
    data: {
      name: 'Admin User',
      username: 'admin',
      email: 'admin@company.com',
      password: hashedAdminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'System Administrator',
      rollNumber: 'ADM-001',
      avatar: 'AU',
      lastLogin: new Date(),
    },
  });

  // Platform Team members
  const ashfaq = await db.user.create({
    data: {
      name: 'Mohamed Ashfaq',
      username: 'ashfaq',
      email: 'ashfaq.new@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'Team Lead',
      rollNumber: 'PLT-001',
      avatar: 'MA',
      teamId: platformTeam.id,
      lastLogin: new Date(),
    },
  });

  const srikanth = await db.user.create({
    data: {
      name: 'Srikanth R',
      username: 'srikanth',
      email: 'srikanth@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'Developer',
      rollNumber: 'PLT-002',
      avatar: 'SR',
      teamId: platformTeam.id,
    },
  });

  const karthik = await db.user.create({
    data: {
      name: 'Karthik R',
      username: 'karthik',
      email: 'karthik@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'DevOps',
      rollNumber: 'PLT-003',
      avatar: 'KR',
      teamId: platformTeam.id,
    },
  });

  const meena = await db.user.create({
    data: {
      name: 'Meena P',
      username: 'meena',
      email: 'meena@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'Developer',
      rollNumber: 'PLT-004',
      avatar: 'MP',
      teamId: platformTeam.id,
    },
  });

  // Development Team members
  const naveen = await db.user.create({
    data: {
      name: 'Naveen M',
      username: 'naveen',
      email: 'naveen@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'Team Lead',
      rollNumber: 'DEV-001',
      avatar: 'NM',
      teamId: devTeam.id,
    },
  });

  const priya = await db.user.create({
    data: {
      name: 'Priya S',
      username: 'priya',
      email: 'priya@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'Frontend Engineer',
      rollNumber: 'DEV-002',
      avatar: 'PS',
      teamId: devTeam.id,
    },
  });

  // QA Team members
  const anjali = await db.user.create({
    data: {
      name: 'Anjali R',
      username: 'anjali',
      email: 'anjali@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'QA Lead',
      rollNumber: 'QA-001',
      avatar: 'AR',
      teamId: qaTeam.id,
    },
  });

  const sanjay = await db.user.create({
    data: {
      name: 'Sanjay P',
      username: 'sanjay',
      email: 'sanjay@company.com',
      password: hashedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      designation: 'QA Engineer',
      rollNumber: 'QA-002',
      avatar: 'SP',
      teamId: qaTeam.id,
    },
  });

  // Update Team Leads
  await db.team.update({
    where: { id: platformTeam.id },
    data: { leadId: ashfaq.id },
  });

  await db.team.update({
    where: { id: devTeam.id },
    data: { leadId: naveen.id },
  });

  await db.team.update({
    where: { id: qaTeam.id },
    data: { leadId: anjali.id },
  });

  // 3. Create Tasks
  console.log('Creating tasks...');
  await db.task.create({
    data: {
      title: 'AWS infrastructure migration',
      description: 'Move production workloads to the new cloud environment and validate the deployment checklist.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      progress: 78,
      dueDate: new Date(Date.now() + 86400000 * 2), // 2 days ahead
      userId: ashfaq.id,
      createdById: adminUser.id,
      teamId: platformTeam.id,
    },
  });

  await db.task.create({
    data: {
      title: 'Attendance portal UI',
      description: 'Build modern responsive layouts matching high-fidelity wireframes.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      progress: 64,
      dueDate: new Date(Date.now() + 86400000),
      userId: naveen.id,
      createdById: adminUser.id,
      teamId: devTeam.id,
    },
  });

  await db.task.create({
    data: {
      title: 'Release regression testing',
      description: 'Complete end-to-end regression validation for Sprint release.',
      priority: 'HIGH',
      status: 'REVIEW',
      progress: 86,
      dueDate: new Date(Date.now() - 86400000),
      userId: anjali.id,
      createdById: adminUser.id,
      teamId: qaTeam.id,
    },
  });

  await db.task.create({
    data: {
      title: 'Attendance report',
      description: 'Generate monthly attendance metrics and team summary exports.',
      priority: 'MEDIUM',
      status: 'PENDING',
      progress: 20,
      dueDate: new Date(Date.now() - 86400000),
      userId: sanjay.id,
      createdById: adminUser.id,
      teamId: qaTeam.id,
    },
  });

  await db.task.create({
    data: {
      title: 'Sprint documentation',
      description: 'Document architecture components and API endpoints.',
      priority: 'LOW',
      status: 'COMPLETED',
      progress: 100,
      completedAt: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 3),
      userId: srikanth.id,
      createdById: adminUser.id,
      teamId: devTeam.id,
    },
  });

  await db.task.create({
    data: {
      title: 'CI/CD pipeline setup',
      description: 'Configure automated Github Actions builds and Docker images push.',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      progress: 100,
      completedAt: new Date(),
      dueDate: new Date(Date.now() - 86400000 * 5),
      userId: karthik.id,
      createdById: ashfaq.id,
      teamId: platformTeam.id,
    },
  });

  await db.task.create({
    data: {
      title: 'Server cost report',
      description: 'Audit cloud resource utilization and optimize reserved instances.',
      priority: 'LOW',
      status: 'COMPLETED',
      progress: 100,
      completedAt: new Date(),
      userId: ashfaq.id,
      createdById: adminUser.id,
      teamId: platformTeam.id,
    },
  });

  await db.task.create({
    data: {
      title: 'Monitoring documentation',
      description: 'Write runbooks for on-call engineers and Prometheus alerts.',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      progress: 100,
      completedAt: new Date(),
      userId: ashfaq.id,
      createdById: adminUser.id,
      teamId: platformTeam.id,
    },
  });

  // 4. Create Announcements
  console.log('Creating announcements...');
  await db.announcement.create({
    data: {
      title: 'Monthly attendance review',
      content: 'Please verify your attendance before Friday 5 PM to ensure monthly salary processing is uninterrupted.',
      priority: 'IMPORTANT',
      authorId: adminUser.id,
      createdAt: new Date(Date.now() - 86400000 * 3),
    },
  });

  await db.announcement.create({
    data: {
      title: 'Sprint planning meeting',
      content: 'Sprint planning starts tomorrow at 10:00 AM on Zoom. Please make sure all backlog tickets are prioritized.',
      priority: 'MEETING',
      authorId: adminUser.id,
      createdAt: new Date(Date.now() - 86400000 * 4),
    },
  });

  await db.announcement.create({
    data: {
      title: 'Office maintenance',
      content: 'The second floor network will be unavailable after 7 PM for infrastructure switch upgrade.',
      priority: 'NOTICE',
      authorId: adminUser.id,
      createdAt: new Date(Date.now() - 86400000 * 6),
    },
  });

  // 5. Create Attendance Records
  console.log('Creating attendance records...');
  const today = getTodayDateString();

  await db.attendance.createMany({
    data: [
      {
        userId: ashfaq.id,
        date: today,
        checkInTime: '09:01 AM',
        checkOutTime: '06:01 PM',
        status: 'PRESENT',
      },
      {
        userId: srikanth.id,
        date: today,
        checkInTime: '09:02 AM',
        checkOutTime: '06:02 PM',
        status: 'PRESENT',
      },
      {
        userId: karthik.id,
        date: today,
        checkInTime: '09:24 AM',
        checkOutTime: '06:03 PM',
        status: 'LATE',
      },
      {
        userId: meena.id,
        date: today,
        checkInTime: '09:04 AM',
        checkOutTime: null,
        status: 'ABSENT',
      },
      {
        userId: naveen.id,
        date: today,
        checkInTime: '09:05 AM',
        checkOutTime: '06:05 PM',
        status: 'PRESENT',
      },
      {
        userId: anjali.id,
        date: today,
        checkInTime: '08:58 AM',
        checkOutTime: '06:00 PM',
        status: 'PRESENT',
      },
      {
        userId: sanjay.id,
        date: today,
        checkInTime: '09:12 AM',
        checkOutTime: '06:10 PM',
        status: 'PRESENT',
      },
    ],
  });

  // Create some past attendance history for Ashfaq
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const ashfaqHistory = [
    { date: daysAgo(1), checkInTime: '08:55 AM', checkOutTime: '06:00 PM', status: 'PRESENT' },
    { date: daysAgo(2), checkInTime: '09:02 AM', checkOutTime: '06:15 PM', status: 'PRESENT' },
    { date: daysAgo(3), checkInTime: '09:18 AM', checkOutTime: '06:30 PM', status: 'LATE' },
    { date: daysAgo(4), checkInTime: '08:50 AM', checkOutTime: '06:05 PM', status: 'PRESENT' },
    { date: daysAgo(5), checkInTime: '09:00 AM', checkOutTime: '06:00 PM', status: 'PRESENT' },
  ];

  for (const item of ashfaqHistory) {
    await db.attendance.create({
      data: {
        userId: ashfaq.id,
        date: item.date,
        checkInTime: item.checkInTime,
        checkOutTime: item.checkOutTime,
        status: item.status,
      },
    });
  }

  // 6. Create Leave Requests
  console.log('Creating leave requests...');
  await db.leaveRequest.create({
    data: {
      userId: meena.id,
      leaveDate: daysAgo(1),
      reason: 'Medical checkup appointment',
      description: 'Routine health checkup scheduled with family physician.',
      status: 'APPROVED',
      reviewedById: adminUser.id,
      reviewedAt: new Date(),
    },
  });

  await db.leaveRequest.create({
    data: {
      userId: priya.id,
      leaveDate: daysAgo(-3),
      reason: 'Family function in hometown',
      description: 'Attending cousin sister wedding.',
      status: 'PENDING',
    },
  });

  await db.leaveRequest.create({
    data: {
      userId: sanjay.id,
      leaveDate: daysAgo(8),
      reason: 'Personal errand',
      description: 'Personal paperwork at city municipality.',
      status: 'REJECTED',
      reviewedById: adminUser.id,
      reviewedAt: new Date(),
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin:       username="admin"   email="admin@company.com"   password="admin123"');
  console.log('  Team member: username="ashfaq"  email="ashfaq.new@company.com" password="user123"');
}

db.$transaction(() => seedData())
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
