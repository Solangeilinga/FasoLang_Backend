// routes/ProverbeRoutes.js
import express from "express";
import { getProverbes, getProverbeById,getThemes } from "../controllers/proverbeController.js";

const router = express.Router();

// 📚 Routes pour les proverbes

router.get("/", getProverbes);
router.get("/themes", getThemes);
router.get("/:proverbeId", getProverbeById);



export default router;