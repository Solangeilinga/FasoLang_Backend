import express from "express";
import {
    getLessonsByCourse,
    
   //  getCurrentLesson
} from "../controllers/learningController.js";

import {
    getUserProgress,
    getProgress,
    updateLessonProgress,
    getExerciseProgress,
    updateCourseProgress,
   //  getUserCoursesProgress
} from "../controllers/progressController.js";
import { getExercisesByLesson } from "../controllers/learningController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Toutes les routes nécessitent une authentification
router.use(authenticateToken);


// Lister toutes les leçons d’un cours
// GET /api/courses/:courseId/lessons
router.get("/:courseId/lessons", getLessonsByCourse);

// Mettre à jour la progression globale d’un cours
// PUT /api/courses/:courseId
router.put("/:courseId", updateCourseProgress);

// Dans votre fichier de routes (ex: routes/exercises.js)
router.get('/:courseId/lessons/:lessonId/exercises',authenticateToken, getExercisesByLesson);


/* ===============================
   🔹 EXERCICES
=============================== */

// Obtenir la progression des exercices pour un cours
// GET /api/courses/:courseId/exercises/progress
router.get("/:courseId/exercises/progress", getExerciseProgress);

export default router;
