import express from 'express';
import {
    submitExercise,
    // getExerciseById
} from '../controllers/learningController.js';
import {
    getExerciseProgress
} from '../controllers/progressController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔒 Toutes les routes nécessitent une authentification
router.use(authenticateToken);


// Soumettre une réponse à un exercice
// POST /api/exercises/submit
router.post("/submit", submitExercise);

// Récupérer la progression des exercices pour un cours spécifique
// GET /api/exercises/progress/:courseId
router.get("/progress/:courseId", getExerciseProgress);



export default router;
