// backend/routes/progressRoutes.js
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
    getUserProgress,
    getProgress,
    updateCourseProgress,
    updateLessonProgress,
    getCurrentLesson,
    completeCourse,
    completeLesson, // ✅ Import manquant
    checkLessonReadiness,
    checkCourseReadiness, // ✅ Import manquant
    markLessonAsCompleted, // ✅ Import manquant
    markCourseAsCompleted, // ✅ Import manquant
    getExerciseProgress // ✅ Import manquant (optionnel)
} from '../controllers/progressController.js';

const router = express.Router();

// ===============================
// Toutes les routes nécessitent une authentification
// ===============================
router.use(authenticateToken);

// ===============================
// 🔍 VÉRIFICATIONS (Check Readiness)
// ===============================

// Vérifier si une leçon peut être terminée
router.get('/lessons/:lessonId/check-readiness', checkLessonReadiness);

// Vérifier si un cours peut être terminé
router.get('/courses/:courseId/check-readiness', checkCourseReadiness);

// ===============================
// ✅ MARQUAGE COMPLETION
// ===============================

// Marquer une leçon comme terminée
router.post('/lessons/:lessonId/complete', markLessonAsCompleted);

// Marquer un cours comme terminé
router.post('/courses/:courseId/complete', markCourseAsCompleted);

// ===============================
// 📊 PROGRESSION UTILISATEUR
// ===============================

// Obtenir toute la progression de l'utilisateur
router.get("/user", getUserProgress);

// Récupérer la leçon actuelle dans un cours
router.get('/courses/:courseId/current-lesson', getCurrentLesson);

// Récupérer la progression des exercices d'un cours (optionnel)
router.get('/courses/:courseId/exercises', getExerciseProgress);

// Récupérer la progression d'un cours spécifique et leçon (si fournie)
router.get('/:courseId/:lessonId', getProgress);

// ===============================
// ✏️ MISE À JOUR PROGRESSION
// ===============================

// Mettre à jour la progression d'une leçon spécifique
router.put('/courses/:courseId/lessons/:lessonId', updateLessonProgress);

// Mettre à jour la progression d'un cours après une activité
router.put('/courses/:courseId', updateCourseProgress);

// ===============================
// 🔙 ANCIENNES ROUTES (Compatibilité)
// ===============================

// Ancienne route pour compléter un cours (gardée pour compatibilité)
// router.post('/courses/:courseId/old-complete', completeCourse);

// Ancienne route pour compléter une leçon (gardée pour compatibilité)
// router.post('/lessons/:lessonId/old-complete', completeLesson);

export default router;