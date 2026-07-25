import {
  User,
  Course,
  Lesson,
  Exercise,
  Language,
  UserProgress,
  CourseHistory,
  UserExercise,
  UserRanking,
} from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

// ===============================
// 📊 DASHBOARD STATS (Admin)
// ===============================
export const getDashboardStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.count();

    // Total courses
    const totalCourses = await Course.count();

    // Total lessons
    const totalLessons = await Lesson.count();

    // Total exercises
    const totalExercises = await Exercise.count();

    // New users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const newUsersThisWeek = await User.count({
      where: {
        createdAt: { [Op.gte]: oneWeekAgo },
      },
    });

    // Active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await User.count({
      where: {
        lastActivity: { [Op.gte]: thirtyDaysAgo },
      },
    });

    // Completed courses
    const completedCourses = await CourseHistory.count();

    // Total XP
    const xpResult = await UserProgress.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('course_xp_earned')), 'totalCourseXP'],
        [sequelize.fn('SUM', sequelize.col('lesson_xp_earned')), 'totalLessonXP'],
      ],
      raw: true,
    });

    const totalXP = (xpResult[0].totalCourseXP || 0) + (xpResult[0].totalLessonXP || 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCourses,
        totalLessons,
        totalExercises,
        totalXP: Math.round(totalXP),
        newUsersThisWeek,
        activeUsers,
        completedCourses,
      },
    });
  } catch (error) {
    console.error('❌ Erreur getDashboardStats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📈 USER GROWTH STATS (Admin)
// ===============================
export const getUserGrowthStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let days = 30;
    if (period === '7d') days = 7;
    if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await User.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
      },
      attributes: ['createdAt'],
      order: [['createdAt', 'ASC']],
    });

    // Group by day
    const groupedByDay = users.reduce((acc, user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(groupedByDay).map(([date, count]) => ({
      date,
      count,
    }));

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('❌ Erreur getUserGrowthStats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 LANGUAGE STATS (Admin)
// ===============================
export const getLanguageStats = async (req, res) => {
  try {
    const languages = await Language.findAll({
      attributes: ['id', 'name', 'code'],
    });

    const stats = await Promise.all(
      languages.map(async (lang) => {
        // Courses count
        const coursesCount = await Course.count({
          where: { languageId: lang.id },
        });

        // Students count (distinct users in UserProgress)
        const studentsCount = await UserProgress.count({
          distinct: true,
          col: 'userId',
          include: [
            {
              model: Course,
              as: 'course',
              where: { languageId: lang.id },
              attributes: [],
            },
          ],
        });

        // Total XP for this language
        const xpResult = await UserRanking.findOne({
          where: { languageId: lang.id },
          attributes: [[sequelize.fn('SUM', sequelize.col('total_score')), 'totalXP']],
          raw: true,
        });

        return {
          id: lang.id,
          name: lang.name,
          code: lang.code,
          coursesCount,
          studentsCount,
          totalXP: xpResult?.totalXP || 0,
        };
      })
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Erreur getLanguageStats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 COURSE COMPLETION STATS (Admin)
// ===============================
export const getCourseCompletionStats = async (req, res) => {
  try {
    const courses = await Course.findAll({
      attributes: ['id', 'title'],
      include: [{ model: Language, as: 'language', attributes: ['name'] }],
    });

    const stats = await Promise.all(
      courses.map(async (course) => {
        // Students count
        const enrolledCount = await UserProgress.count({
          where: { courseId: course.id },
          distinct: true,
          col: 'userId',
        });

        // Completed count
        const completedCount = await CourseHistory.count({
          where: { courseId: course.id },
        });

        const completionRate =
          enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

        return {
          id: course.id,
          title: course.title,
          language: course.language?.name,
          enrolledCount,
          completedCount,
          completionRate,
        };
      })
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Erreur getCourseCompletionStats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 RECENT ACTIVITY (Admin)
// ===============================
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Recent course completions
    const recentCompletions = await CourseHistory.findAll({
      limit: parseInt(limit),
      order: [['completed_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email'],
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title'],
          include: [{ model: Language, as: 'language', attributes: ['name'] }],
        },
      ],
    });

    const activities = recentCompletions.map((completion) => ({
      type: 'course_completed',
      userId: completion.user?.id,
      userName: `${completion.user?.firstname} ${completion.user?.lastname}`,
      courseId: completion.course?.id,
      courseName: completion.course?.title,
      language: completion.course?.language?.name,
      score: completion.final_score,
      timestamp: completion.completed_at,
    }));

    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('❌ Erreur getRecentActivity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 TOP LEARNERS (Admin)
// ===============================
export const getTopLearners = async (req, res) => {
  try {
    const { limit = 10, languageId } = req.query;

    const whereClause = {};
    if (languageId) whereClause.languageId = languageId;

    const topLearners = await UserRanking.findAll({
      where: whereClause,
      limit: parseInt(limit),
      order: [['total_score', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email', 'avatarUrl', 'dailyStreak'],
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.json({ success: true, data: topLearners });
  } catch (error) {
    console.error('❌ Erreur getTopLearners:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};