import express from "express";
import {
    getLanguages,
    getCoursesByLanguage,
    getClassementByLanguage,
  getCoursParLangueEtNiveau
} from "../controllers/learningController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/* ===============================
   🔹 LANGUES
=============================== */

// Liste de toutes les langues disponibles
// GET /api/langages
router.get("/", getLanguages);

// Récupérer les cours pour une langue spécifique
// GET /api/langages/:languageId/courses
router.get("/:languageId/courses", getCoursesByLanguage);

router.get('/:languageId/courses-by-level', getCoursParLangueEtNiveau);

// Récupérer le classement par langage
router.get('/:languageId/ranking',getClassementByLanguage);


export default router;
