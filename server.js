import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { verifyCloudinaryConfig } from "./config/cloudinary.js";
import sequelize from "./config/db.js";
import cookieParser from "cookie-parser";

// Import des routes
import uploadRoutes from "./routes/upload.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import exerciseRoutes from './routes/exerciseRoutes.js';
import rankingsRoutes from './routes/rankingsRoutes.js';
import coursesRoutes from "./routes/coursesRoutes.js";
import proverbeRoutes from "./routes/proverbeRoutes.js";
import languageRoutes from "./routes/languageRoutes.js";
import lessonsRoutes from "./routes/lessonRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import botRoutes from './routes/bot.js';

// Import des modèles pour initialiser les associations
import {
  User,
  Language,
  Course,
  Lesson,
  LessonContent,
  Exercise,
  Proverbe,
  ProverbeContent,
  UserExercise,
  UserProgress,
  UserRanking,
  CourseHistory,
} from "./models/index.js";

dotenv.config();

// ✅ Vérification des variables d'environnement critiques
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Variables d'environnement manquantes : ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();

verifyCloudinaryConfig();

// ✅ CORS sécurisé : whitelist via variable d'environnement
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true; // true = toutes origines (dev uniquement)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// --- Test de route racine ---
app.get("/", (req, res) => {
  res.send("🌍 API Langues du Faso — Backend opérationnel !");
});

app.use("/api/upload", uploadRoutes);

// --- Routes principales ---
app.use("/api/courses", coursesRoutes);
app.use("/api/proverbes", proverbeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/rankings", rankingsRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/progress", progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bot', botRoutes);

// ✅ Middleware de gestion d'erreurs globales (doit être en dernier)
app.use((err, req, res, next) => {
  console.error("❌ Erreur non gérée :", err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? "Erreur serveur interne"
      : err.message
  });
});

// --- Lancement du serveur ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Serveur en ligne sur le port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion à la base de données établie");
    await sequelize.sync({ force: false });
    console.log("✅ Base de données synchronisée avec succès");
  } catch (error) {
    console.error("❌ Erreur de connexion ou de synchronisation :", error);
  }
});