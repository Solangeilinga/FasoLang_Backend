// ============================================
// 📁 controllers/userController.js
// VERSION CORRIGÉE + OPTIMISÉE
// ============================================

import { Op } from "sequelize";
import User from "../models/User.js";
import UserProgress from "../models/UserProgress.js";
import UserRanking from "../models/UserRanking.js";
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Language from "../models/Language.js";
import CourseHistory from "../models/CourseHistory.js";
import { XPService } from "../utils/xpService.js";

// ✅ Colonnes sûres de Language (sans imageUrl qui peut ne pas encore exister en DB)
// Une fois le sync alter:true exécuté, imageUrl sera disponible
const LANGUAGE_ATTRS_SAFE = ["id", "name"];
const LANGUAGE_ATTRS_FULL = ["id", "name", "imageUrl"];

// Helper : tente avec imageUrl, retombe sur colonnes de base si la colonne manque
async function safeFindAllWithLanguage(queryFn) {
  try {
    return await queryFn(LANGUAGE_ATTRS_FULL);
  } catch (err) {
    // Colonne imageUrl manquante en base → requête sans imageUrl
    if (err?.parent?.code === "42703" && err?.parent?.message?.includes("imageUrl")) {
      return await queryFn(LANGUAGE_ATTRS_SAFE);
    }
    throw err;
  }
}

/* =====================================================
   📊 GET /api/users/dashboard
===================================================== */
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ courseProgress avec fallback sur imageUrl manquante
    const courseProgress = await safeFindAllWithLanguage((langAttrs) =>
      UserProgress.findAll({
        where: { userId, lessonId: null },
        include: [
          {
            model: Course,
            as: "course",
            attributes: ["id", "title", "level"],
            include: [
              { model: Language, as: "language", attributes: langAttrs }
            ]
          }
        ]
      })
    );

    // ✅ userRankings avec fallback
    const userRankings = await safeFindAllWithLanguage((langAttrs) =>
      UserRanking.findAll({
        where: { userId },
        include: [
          { model: Language, as: "language", attributes: langAttrs }
        ]
      })
    );

    const [user, lessonProgress, completedHistory] = await Promise.all([
      User.findByPk(userId, {
        attributes: [
          "id", "firstname", "lastname", "email",
          "avatarUrl", "dailyStreak", "lastActivity"
        ]
      }),

      UserProgress.findAll({
        where: { userId, lessonId: { [Op.ne]: null } },
        include: [
          { model: Course, as: "course", attributes: ["id", "title"] },
          { model: Lesson, as: "lesson", attributes: ["id", "title", "position"] }
        ]
      }),

      CourseHistory.findAll({
        where: { userId },
        include: [
          {
            model: Course,
            as: "course",
            attributes: ["id", "title", "level"],
            include: [
              { model: Language, as: "language", attributes: LANGUAGE_ATTRS_SAFE }
            ]
          }
        ],
        order: [["completed_at", "DESC"]],
        limit: 5
      })
    ]);

    // ✅ Calcul du XP total
    const totalXP = userRankings.reduce(
      (sum, r) => sum + (r.total_score || 0),
      0
    );

    // ✅ Compter les cours terminés (dédupliqués)
    const uniqueCompletedIds = new Set([
      ...completedHistory.map(h => h.courseId),
      ...courseProgress.filter(p => p.completed_at).map(p => p.courseId)
    ]);

    // ✅ Statistiques
    const stats = {
      totalCoursTermines: uniqueCompletedIds.size,
      totalCoursEnCours: courseProgress.length,
      coursEnCours: courseProgress.filter(
        p => !p.completed_at && p.course_completion_percentage > 0 && p.course_completion_percentage < 100
      ).length,
      leçonsComplétées: lessonProgress.filter(p => p.lesson_completed).length,
      totalXP,
      currentLevel: XPService.calculateLevel(totalXP),
      xpToNextLevel: XPService.xpToNextLevel(totalXP),
      levelProgress: XPService.levelProgressPercentage(totalXP),
      dailyStreak: user.dailyStreak || 0,
      
      // ✅ CORRECTION: Ajout d'ID unique et languageId
      xpByLanguage: userRankings.map(r => ({
        id: r.id,                                    // ✅ ID unique
        languageId: r.languageId,                   // ✅ ID de la langue
        language: r.language?.name || "Inconnu",
        languageImage: r.language?.imageUrl || null, // ✅ Image de la langue
        xp: r.total_score || 0,
        position: r.rank_position || 0,
        level: XPService.calculateLevel(r.total_score || 0)
      }))
    };

    res.json({
      success: true,
      data: {
        user,
        stats,
        progression: {
          // ✅ CORRECTION: Ajout du flag is_ongoing
          courses: courseProgress.map(p => ({
            id: p.id,                                           // ✅ ID de UserProgress
            courseId: p.courseId,
            completion_percentage: p.course_completion_percentage || 0,
            xp_earned: p.course_xp_earned || 0,
            completed: !!p.completed_at,
            completed_at: p.completed_at,
            
            // ✅ FLAG EXPLICITE pour cours en cours
            is_ongoing: !p.completed_at && 
                       (p.course_completion_percentage > 0 && 
                        p.course_completion_percentage < 100),
            
            // ✅ FLAG pour cours non commencé
            is_not_started: p.course_completion_percentage === 0 || 
                           p.course_completion_percentage === null,
            
            course: p.course
          })),
          
          lessons: lessonProgress.map(p => ({
            id: p.id,                                // ✅ ID de UserProgress
            lessonId: p.lessonId,
            courseId: p.courseId,
            completed: p.lesson_completed || false,
            xp_earned: p.lesson_xp_earned || 0,
            lesson: p.lesson
          }))
        },
        
        // ✅ Historique avec ID explicite
        coursTermines: completedHistory.map(h => ({
          id: h.id,                                  // ✅ ID de CourseHistory
          courseId: h.courseId,
          completed_at: h.completed_at,
          final_score: h.final_score || 0,
          course: h.course
        })),
        
        userRankings: userRankings.map(r => ({
          id: r.id,                                  // ✅ ID de UserRanking
          languageId: r.languageId,
          total_score: r.total_score || 0,
          rank_position: r.rank_position || 0,
          language: r.language
        }))
      }
    });
  } catch (error) {
    console.error("❌ getDashboard:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la récupération du dashboard" 
    });
  }
};



/**
 * ✅ Ajouter automatiquement un cours à l'historique quand il est terminé
 */
export const addCourseToHistory = async (userId, courseId, finalXP) => {
  try {
    // Vérifier si déjà dans l'historique
    const existing = await CourseHistory.findOne({
      where: { userId, courseId }
    });

    if (existing) {
      console.log(`ℹ️ Cours ${courseId} déjà dans l'historique`);
      return existing;
    }

    // Créer l'entrée
    const historyEntry = await CourseHistory.create({
      userId,
      courseId,
      completed_at: new Date(),
      final_score: finalXP || 0
    });

    console.log(`✅ Cours ${courseId} ajouté à l'historique de user ${userId}`);
    return historyEntry;

  } catch (error) {
    console.error("❌ Erreur addCourseToHistory:", error);
    throw error;
  }
};