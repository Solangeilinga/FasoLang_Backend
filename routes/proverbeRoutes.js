// routes/ProverbeRoutes.js
import express from "express";
import { getProverbes, getProverbeById,getThemes } from "../controllers/proverbeController.js";

const router = express.Router();

// 📚 Routes pour les proverbes

router.get("/:proverbeId", getProverbeById);

router.get("/", getProverbes);
router.get("/:proverbeId", getProverbeById);
router.get("/themes", getThemes);


export default router;