import express from "express";
import {
    getDashboard
} from "../controllers/userController.js";
import { getCoursTermines } from "../controllers/learningController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Route pour obtenir le tableau de bord de l'utilisateur
router.get("/dashboard", getDashboard);

// GET /api/users/history - Récupérer les cours terminés par l'utilisateur
router.get("/history", getCoursTermines);

export default router;
