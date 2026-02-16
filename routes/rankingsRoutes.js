import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);


export default router;
