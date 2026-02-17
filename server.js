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

// Import des modèles pour initialiser les associations
import {
  User,
  Language,
  Course,
  Lesson,
  Exercise,
  Proverbe,
  UserExercise,
  UserProgress,
  UserRanking,
  CourseHistory,
} from "./models/index.js";

dotenv.config();

const app = express();
// Vérifier la configuration Cloudinary au démarrage
verifyCloudinaryConfig();

// --- Middlewares globaux ---
app.use(cors({
    origin: true,      // accepte toutes les origines
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
app.use("/api/auth", authRoutes);        // Authentification & gestion des sessions
app.use("/api/users", userRoutes);       // Gestion du profil et préférences
app.use("/api/exercises", exerciseRoutes); // Exercices et évaluations    
app.use("/api/languages", languageRoutes);
app.use("/api/rankings", rankingsRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/progress", progressRoutes);

// --- Lancement du serveur ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", async () => {
    console.log(`✅ Serveur en ligne sur le port ${PORT}`);
    try {
        // Tester la connexion
        await sequelize.authenticate();
        console.log("✅ Connexion à la base de données établie");

        // Synchroniser avec désactivation temporaire des contraintes FK
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // // Force: true pour recréer les tables (à utiliser seulement en développement)
        // // ⚠️ ATTENTION: Ceci supprime toutes les données à chaque redémarrage
        //await sequelize.sync({ force: true });
        
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log("✅ Base de données synchronisée");
        
    } catch (error) {
        console.error("❌ Erreur de connexion à la base de données :", error);
    }
});