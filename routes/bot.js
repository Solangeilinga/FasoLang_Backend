import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { askBot } from "../controllers/botController.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// POST /api/bot - envoyer un message au bot
router.post("/", askBot);

export default router;