import express from "express";
import {
    register,
    login,
    // logout,
    // me,
    forgotPassword,
  verifyResetCode,
  resetPassword,
    getProfile,
    updateProfile,
    updateAvatar
} from "../controllers/authController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadCloudinary.js";

const router = express.Router();

/* ===============================
   🔹 AUTHENTIFICATION
=============================== */

// Inscription d'un nouvel utilisateur
router.post("/register", register);

// Connexion
router.post("/login", login);

// // Déconnexion (nécessite token)
// router.post("/logout", authenticateToken, logout);

// // Vérifier le token pour l'utilisateur connecté
// router.get("/me", authenticateToken, me);

/* ===============================
   🔹 MOT DE PASSE
=============================== */


router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);


/* ===============================
   🔹 PROFIL UTILISATEUR
=============================== */

// Récupérer le profil complet (nécessite token)
router.get("/profile", authenticateToken, getProfile);

// Mettre à jour les informations du profil (firstname, lastname, email, etc.)
router.put("/profile", authenticateToken, updateProfile);

// Mettre à jour uniquement l'avatar via Cloudinary
router.put("/profile/avatar", authenticateToken, upload.single("avatar"), updateAvatar);

export default router;
