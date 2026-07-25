import express from "express";
import { getLessonById, getExercisesByLesson } from "../controllers/learningController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===============================
   🔹 LESSONS
=============================== */

// Récupérer une leçon par son ID
// GET /api/lessons/:lessonId
router.get("/:lessonId", getLessonById);

// ✅ Récupérer les exercices associés à une leçon spécifique
// GET /api/lessons/:lessonId/exercises
router.get("/:lessonId/exercises", authenticateToken, getExercisesByLesson);

export default router;
