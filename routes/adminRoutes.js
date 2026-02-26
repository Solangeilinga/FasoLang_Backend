import express from 'express';
import { adminMiddleware, authenticateToken } from '../middleware/authMiddleware.js';

// Import controllers
import * as adminUserCtrl from '../controllers/adminUserController.js';
import * as adminCourseCtrl from '../controllers/adminCourseController.js';
import * as adminLessonCtrl from '../controllers/adminLessonController.js';
import * as adminExerciseCtrl from '../controllers/adminExerciseController.js';
import * as adminStatsCtrl from '../controllers/adminStatsController.js';

const router = express.Router();

// ✅ Appliquer les middlewares à TOUTES les routes admin
router.use(authenticateToken);  // Doit être connecté
router.use(adminMiddleware); // Doit être admin

// ============= USERS =============
router.get('/users', adminUserCtrl.getAllUsers);
router.get('/users/:id', adminUserCtrl.getUserById);
router.put('/users/:id', adminUserCtrl.updateUser);
router.delete('/users/:id', adminUserCtrl.deleteUser);
router.get('/users/:id/stats', adminUserCtrl.getUserStats);

// ============= COURSES =============
router.get('/courses', adminCourseCtrl.getAllCourses);
router.get('/courses/:id', adminCourseCtrl.getCourseById);
router.post('/courses', adminCourseCtrl.createCourse);
router.put('/courses/:id', adminCourseCtrl.updateCourse);
router.delete('/courses/:id', adminCourseCtrl.deleteCourse);
router.get('/courses/:id/stats', adminCourseCtrl.getCourseStats);

// ============= LESSONS =============
router.get('/lessons', adminLessonCtrl.getAllLessons);
router.get('/lessons/:id', adminLessonCtrl.getLessonById);
router.post('/lessons', adminLessonCtrl.createLesson);
router.put('/lessons/:id', adminLessonCtrl.updateLesson);
router.delete('/lessons/:id', adminLessonCtrl.deleteLesson);

// Lesson Contents
router.get('/lessons/:lessonId/contents', adminLessonCtrl.getLessonContents);
router.post('/lesson-contents', adminLessonCtrl.createLessonContent);
router.put('/lesson-contents/:id', adminLessonCtrl.updateLessonContent);
router.delete('/lesson-contents/:id', adminLessonCtrl.deleteLessonContent);

// ============= EXERCISES =============
router.get('/exercises', adminExerciseCtrl.getAllExercises);
router.get('/exercises/:id', adminExerciseCtrl.getExerciseById);
router.post('/exercises', adminExerciseCtrl.createExercise);
router.put('/exercises/:id', adminExerciseCtrl.updateExercise);
router.delete('/exercises/:id', adminExerciseCtrl.deleteExercise);
router.get('/exercises/stats/by-type', adminExerciseCtrl.getExerciseStatsByType);

// ============= STATS =============
router.get('/stats/dashboard', adminStatsCtrl.getDashboardStats);
router.get('/stats/users/growth', adminStatsCtrl.getUserGrowthStats);
router.get('/stats/languages', adminStatsCtrl.getLanguageStats);
router.get('/stats/courses/completion', adminStatsCtrl.getCourseCompletionStats);
router.get('/stats/activity/recent', adminStatsCtrl.getRecentActivity);
router.get('/stats/learners/top', adminStatsCtrl.getTopLearners);

export default router;