import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import { Op } from "sequelize";
import User from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";
import { generateToken } from "../utils/jwt.js";

dotenv.config();

/* ===============================
   🧩 REGISTER
================================ */
export const register = async (req, res) => {
  try {
    let { firstname, lastname, email, numero, password, role } = req.body;

    if (!firstname || !lastname || !email || !numero || !password) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    email = email.toLowerCase().trim();

    const phoneRegex = /^\+[1-9][0-9]{7,14}$/;
    if (!phoneRegex.test(numero)) {
      return res.status(400).json({
        message: "Numéro invalide (format international requis).",
      });
    }

    const userExists = await User.findOne({
      where: { [Op.or]: [{ email }, { numero }] },
    });

    if (userExists) {
      return res.status(400).json({
        message: "Email ou numéro déjà utilisé.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 6 caractères.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstname,
      lastname,
      email,
      numero,
      password: hashedPassword,
      role: role || "user",
    });

    const token = generateToken(newUser);

    res.status(201).json({
      message: "Inscription réussie ✅",
      user: {
        id: newUser.id,
        firstname,
        lastname,
        email,
        numero,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ===============================
   🔑 LOGIN
================================ */
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe requis." });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Mot de passe incorrect." });

    const token = generateToken(user);

    res.json({
      message: "Connexion réussie ✅",
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ===============================
   👤 PROFIL (ME)
================================ */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "firstname",
        "lastname",
        "email",
        "numero",
        "avatarUrl",
        "role",
        "lastActivity",
        "dailyStreak",
        "createdAt",
      ],
    });

    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    res.json(user);
  } catch (error) {
    console.error("GetProfile error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ===============================
   ✏️ UPDATE PROFILE
================================ */
export const updateProfile = async (req, res) => {
  try {
    const { firstname, lastname, numero } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    user.firstname ??= firstname;
    user.lastname ??= lastname;
    user.numero ??= numero;

    await user.save();

    res.json({
      message: "Profil mis à jour avec succès ✅",
      user,
    });
  } catch (error) {
    console.error("UpdateProfile error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ===============================
   🖼️ UPDATE AVATAR
================================ */
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ message: "Aucune image envoyée." });
    }

    const user = await User.findByPk(req.user.id);
    user.avatarUrl = req.file.path;
    await user.save();

    res.json({
      message: "Avatar mis à jour ✅",
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error("UpdateAvatar error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

import crypto from "crypto";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import User from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

/* ===============================
   🔐 FORGOT PASSWORD (envoi code)
================================ */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis." });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "Compte introuvable." });

    // Générer code 4 chiffres
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    user.reset_code = otpCode;
    user.reset_code_expiry = Date.now() + 10 * 60 * 1000; // 10 min
    user.reset_code_attempts = 0;
    await user.save();

    await sendPasswordResetEmail(email, otpCode);

    res.json({ message: "Code de réinitialisation envoyé ✅" });
  } catch (error) {
    console.error("ForgotPassword error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ===============================
   🔄 RESET PASSWORD WITH CODE
================================ */
export const resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!password || password.length < 6)
      return res.status(400).json({ message: "Mot de passe trop court." });

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(400).json({ message: "Code invalide ou utilisateur introuvable." });

    if (user.reset_code_attempts >= 5)
      return res.status(400).json({ message: "Trop de tentatives." });

    if (user.reset_code !== code || user.reset_code_expiry < Date.now()) {
      user.reset_code_attempts += 1;
      await user.save();
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.reset_code = null;
    user.reset_code_expiry = null;
    user.reset_code_attempts = null;
    await user.save();

    res.json({ message: "Mot de passe réinitialisé ✅" });
  } catch (error) {
    console.error("ResetPasswordWithCode error:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};