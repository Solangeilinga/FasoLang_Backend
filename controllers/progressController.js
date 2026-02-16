// backend/controllers/progressController.js
import { XPService } from '../utils/xpService.js';
import UserProgress from '../models/UserProgress.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import UserRanking from '../models/UserRanking.js';
import Exercise from '../models/Exercise.js';
import UserExercise from '../models/UserExercise.js';
import CourseHistory from '../models/CourseHistory.js';
import { Op } from 'sequelize';

const assertId = (id, name) => {
  if (!id) {
    throw new Error(`${name} manquant`);
  }
};

/* ===========================
   ✅ FONCTION HELPER : Ajouter à l'historique
=========================== */
const addCourseToHistory = async (userId, courseId, finalXP) => {
  try {
    // Vérifier si déjà dans l'historique
    const existing = await CourseHistory.findOne({
      where: { userId, courseId }
    });

    if (existing) {
      console.log(`ℹ️ Cours ${courseId} déjà dans l'historique de user ${userId}`);
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
    // Ne pas bloquer le flux principal en cas d'erreur
    return null;
  }
};

/* ===========================
   ✅ VALIDATION EXERCICES LEÇON - CORRIGÉE
=========================== */
const validateLessonExercises = async (userId, lessonId) => {
  assertId(lessonId, "lessonId");

  console.log('🔍 Validation exercices pour:', { userId, lessonId });

  // Récupérer tous les exercices de la leçon
  const exercises = await Exercise.findAll({ 
    where: { lessonId } 
  });

  console.log(`📊 Total exercices trouvés: ${exercises.length}`);

  if (!exercises.length) {
    return { 
      valid: true, 
      totalExercises: 0, 
      completedExercises: 0, 
      remainingExercises: 0,
      message: "Aucun exercice pour cette leçon",
      score: 0, 
      xp: 0 
    };
  }

  // Récupérer les exercices réussis par l'utilisateur
  const completedExercises = await UserExercise.findAll({
    where: {
      userId,
      lessonId,
      is_correct: true
    },
    attributes: ['exerciseId'],
    group: ['exerciseId']
  });

  const completedExerciseIds = new Set(
    completedExercises.map(ue => ue.exerciseId)
  );

  const totalExercises = exercises.length;
  const completedCount = completedExerciseIds.size;
  const remainingCount = totalExercises - completedCount;

  console.log(`✅ Exercices réussis: ${completedCount}/${totalExercises}`);

  // Calculer l'XP total
  let totalXP = 0;
  for (const ex of exercises) {
    totalXP += ex.xp || 10;
  }

  const valid = completedCount === totalExercises;

  return {
    valid,
    totalExercises,
    completedExercises: completedCount,
    remainingExercises: remainingCount,
    message: valid 
      ? `Tous les exercices sont réussis (${completedCount}/${totalExercises})`
      : `Il reste ${remainingCount} exercice(s) à réussir`,
    completed: valid,
    score: valid ? 100 : Math.round((completedCount / totalExercises) * 100),
    xp: totalXP
  };
};

/* ===========================
   CALCUL PROGRESSION COURS
=========================== */
export const calculateCourseCompletion = async (userId, courseId) => {
  assertId(courseId, "courseId");

  const lessons = await Lesson.findAll({
    where: { courseId, isPublished: true },
  });

  if (!lessons.length) return { percentage: 0, xp: 0 };

  const lessonIds = lessons.map(l => l.id);

  const progresses = await UserProgress.findAll({
    where: {
      userId,
      lessonId: lessonIds,
      lesson_completed: true,
    },
  });

  const completedLessons = progresses.length;
  const percentage = Math.round((completedLessons / lessons.length) * 100);

  const xp = progresses.reduce(
    (sum, p) => sum + (p.lesson_xp_earned || 0),
    0
  );

  console.log(`📊 Cours ${courseId}: ${completedLessons}/${lessons.length} leçons (${percentage}%)`);

  return { percentage, xp };
};

/* ===========================
   MAJ PROGRESSION COURS - ✅ AVEC AJOUT AUTOMATIQUE À L'HISTORIQUE
=========================== */
export const updateCourseProgressAfterActivity = async (userId, courseId) => {
  assertId(courseId, "courseId");

  const { percentage, xp } = await calculateCourseCompletion(userId, courseId);

  const [courseProgress] = await UserProgress.findOrCreate({
    where: { userId, courseId, lessonId: null },
    defaults: {
      course_completion_percentage: percentage,
      course_xp_earned: xp,
      started_at: new Date(),
    },
  });

  const wasCompleted = courseProgress.completed_at !== null;
  const isNowCompleted = percentage === 100;

  await courseProgress.update({
    course_completion_percentage: percentage,
    course_xp_earned: xp,
    completed_at: isNowCompleted && !wasCompleted ? new Date() : courseProgress.completed_at,
    last_accessed_at: new Date(),
  });

  // ✅ SI LE COURS VIENT D'ÊTRE TERMINÉ (passage de incomplet à 100%)
  if (isNowCompleted && !wasCompleted) {
    console.log(`🎉 Cours ${courseId} vient d'être terminé ! Ajout à l'historique...`);
    await addCourseToHistory(userId, courseId, xp);
  }

  console.log(`✅ Progression cours mise à jour: ${percentage}%`);

  return courseProgress;
};

/* ===========================
   🆕 MARQUER UNE LEÇON COMME TERMINÉE - CORRIGÉ
=========================== */
export const markLessonAsCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.params;
    const { courseId } = req.body;

    console.log('📝 Tentative marquage leçon:', { userId, lessonId, courseId });

    if (!lessonId || !courseId) {
      return res.status(400).json({ 
        success: false, 
        message: "lessonId et courseId requis" 
      });
    }

    // 1. Vérifier que la leçon existe
    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Leçon introuvable" 
      });
    }

    // 2. Valider les exercices
    const validation = await validateLessonExercises(userId, lessonId);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        data: {
          totalExercises: validation.totalExercises,
          completedExercises: validation.completedExercises,
          remainingExercises: validation.remainingExercises
        }
      });
    }

    console.log('✅ Validation exercices OK:', validation.message);

    // 3. Marquer la leçon comme terminée
    const [progress, created] = await UserProgress.findOrCreate({
      where: { userId, courseId, lessonId },
      defaults: {
        lesson_completed: true,
        lesson_score: validation.score,
        lesson_xp_earned: validation.xp,
        completed_at: new Date(),
        started_at: new Date(),
        last_accessed_at: new Date()
      }
    });

    let xpEarned = validation.xp;
    let streakBonus = 0;

    if (!created && !progress.lesson_completed) {
      const baseXP = validation.xp;
      const streakDays = 0;
      
      if (XPService.calculateStreakBonus) {
        streakBonus = XPService.calculateStreakBonus(streakDays, baseXP);
      }
      
      xpEarned = baseXP + streakBonus;

      await progress.update({
        lesson_completed: true,
        lesson_score: validation.score,
        lesson_xp_earned: xpEarned,
        completed_at: new Date(),
        last_accessed_at: new Date()
      });
    }

    console.log('✅ Leçon marquée comme terminée');

    // 4. ✅ Mettre à jour la progression du cours (avec ajout auto à l'historique si 100%)
    await updateCourseProgressAfterActivity(userId, courseId);

    // 5. Mettre à jour le streak
    const streakData = await XPService.updateDailyStreak(userId);

    res.json({
      success: true,
      data: {
        xpEarned,
        streakBonus,
        totalXP: xpEarned + streakBonus,
        lessonCompleted: true,
        dailyStreak: streakData.streak
      },
      message: "Leçon terminée avec succès !"
    });

  } catch (error) {
    console.error("❌ Erreur markLessonAsCompleted:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Erreur lors du marquage de la leçon"
    });
  }
};

/* ===========================
   🆕 VÉRIFIER SI UNE LEÇON PEUT ÊTRE TERMINÉE
=========================== */
export const checkLessonReadiness = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;

    console.log('🔍 Vérification readiness leçon:', { userId, lessonId });

    const validation = await validateLessonExercises(userId, lessonId);

    res.json({
      success: true,
      data: {
        canComplete: validation.valid,
        totalExercises: validation.totalExercises,
        completedExercises: validation.completedExercises,
        remainingExercises: validation.remainingExercises,
        message: validation.message
      }
    });

  } catch (error) {
    console.error("❌ Erreur checkLessonReadiness:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la vérification"
    });
  }
};

/* ===========================
   🆕 VÉRIFIER SI UN COURS PEUT ÊTRE TERMINÉ
=========================== */
export const checkCourseReadiness = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    console.log('🔍 Vérification readiness cours:', { userId, courseId });

    const lessons = await Lesson.findAll({
      where: { 
        courseId, 
        isPublished: true 
      }
    });

    if (!lessons.length) {
      return res.json({
        success: true,
        data: {
          canComplete: false,
          totalLessons: 0,
          completedLessons: 0,
          remainingLessons: 0,
          message: "Aucune leçon publiée dans ce cours"
        }
      });
    }

    const completedLessons = await UserProgress.count({
      where: {
        userId,
        courseId,
        lesson_completed: true,
        lessonId: { [Op.ne]: null }
      }
    });

    const totalLessons = lessons.length;
    const remainingLessons = totalLessons - completedLessons;
    const canComplete = completedLessons === totalLessons;

    console.log(`📊 Cours ${courseId}: ${completedLessons}/${totalLessons} leçons`);

    res.json({
      success: true,
      data: {
        canComplete,
        totalLessons,
        completedLessons,
        remainingLessons,
        message: canComplete 
          ? "Toutes les leçons sont terminées"
          : `Il reste ${remainingLessons} leçon(s) à terminer`
      }
    });

  } catch (error) {
    console.error("❌ Erreur checkCourseReadiness:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la vérification"
    });
  }
};

/* ===========================
   🆕 MARQUER UN COURS COMME TERMINÉ - ✅ AVEC AJOUT À L'HISTORIQUE
=========================== */
export const markCourseAsCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    console.log('🏆 Tentative marquage cours:', { userId, courseId });

    if (!courseId) {
      return res.status(400).json({ 
        success: false, 
        message: "courseId requis" 
      });
    }

    // 1. Vérifier que toutes les leçons sont terminées
    const lessons = await Lesson.findAll({
      where: { 
        courseId, 
        isPublished: true 
      }
    });

    const completedLessons = await UserProgress.count({
      where: {
        userId,
        courseId,
        lesson_completed: true,
        lessonId: { [Op.ne]: null }
      }
    });

    if (completedLessons < lessons.length) {
      return res.status(400).json({
        success: false,
        message: `Toutes les leçons doivent être terminées (${completedLessons}/${lessons.length})`
      });
    }

    console.log('✅ Toutes les leçons sont terminées');

    // 2. ✅ Mettre à jour la progression (avec ajout auto à l'historique)
    const courseProgress = await updateCourseProgressAfterActivity(userId, courseId);

    // Vérifier si le cours était déjà marqué comme terminé
    if (courseProgress.completed_at) {
      console.log('⚠️ Cours déjà marqué comme terminé');
      return res.json({
        success: true,
        data: {
          totalXP: courseProgress.course_xp_earned,
          bonusXP: 0,
          streakBonus: 0,
          courseCompleted: true,
          completedAt: courseProgress.completed_at,
          alreadyCompleted: true
        },
        message: "Cours déjà terminé"
      });
    }

    // 3. Calculer les bonus
    const bonusXP = Math.round(courseProgress.course_xp_earned * 0.2);
    const streakData = await XPService.updateDailyStreak(userId);
    const streakBonus = XPService.calculateStreakBonus ? 
      XPService.calculateStreakBonus(streakData.streak || 0, bonusXP) : 
      0;

    const totalXP = courseProgress.course_xp_earned + bonusXP + streakBonus;

    // 4. Mettre à jour le ranking
    await UserRanking.increment(
      { total_xp: totalXP },
      { where: { userId } }
    );

    console.log('✅ Cours marqué comme terminé');

    res.json({
      success: true,
      data: {
        totalXP,
        bonusXP,
        streakBonus,
        courseCompleted: true,
        completedAt: new Date(),
        alreadyCompleted: false
      },
      message: "🎉 Cours terminé avec succès !"
    });

  } catch (error) {
    console.error("❌ Erreur markCourseAsCompleted:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Erreur lors du marquage du cours"
    });
  }
};

/* ===========================
   ANCIENNES FONCTIONS (conservées pour compatibilité)
=========================== */

export const completeLesson = async (req, res) => {
  const userId = req.user.id;
  const { lessonId } = req.params;

  try {
    assertId(lessonId, "lessonId");

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Leçon introuvable" });
    }

    const validation = await validateLessonExercises(userId, lessonId);

    if (!validation.valid) {
      return res.status(400).json({ 
        message: validation.message 
      });
    }

    const [progress] = await UserProgress.findOrCreate({
      where: { userId, courseId: lesson.courseId, lessonId },
    });

    await progress.update({
      lesson_completed: true,
      lesson_score: validation.score,
      lesson_xp_earned: validation.xp,
      completed_at: new Date(),
      last_accessed_at: new Date(),
    });

    // ✅ MAJ avec ajout auto à l'historique
    await updateCourseProgressAfterActivity(userId, lesson.courseId);

    return res.json({
      message: "Leçon complétée avec succès",
      lessonXP: validation.xp,
    });
  } catch (error) {
    console.error("❌ completeLesson:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const completeCourse = async (req, res) => {
  const userId = req.user.id;
  const { courseId } = req.params;

  try {
    assertId(courseId, "courseId");

    // ✅ MAJ avec ajout auto à l'historique
    const courseProgress = await updateCourseProgressAfterActivity(userId, courseId);

    if (courseProgress.course_completion_percentage < 100) {
      return res.status(400).json({
        message: "Toutes les leçons ne sont pas encore complétées",
      });
    }

    await UserRanking.increment(
      { total_xp: courseProgress.course_xp_earned },
      { where: { userId } }
    );

    return res.json({
      message: "Cours terminé 🎉",
      totalXP: courseProgress.course_xp_earned,
    });
  } catch (error) {
    console.error("❌ completeCourse:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

/* ===========================
   updateLessonProgress - ✅ AVEC AJOUT AUTO À L'HISTORIQUE
=========================== */
export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;
    const { completed = false, timeSpent = 0 } = req.body;

    console.log('📥 updateLessonProgress:', { 
      userId, 
      courseId, 
      lessonId, 
      completed, 
      timeSpent 
    });

    if (!courseId || !lessonId) {
      return res.status(400).json({ 
        success: false, 
        error: "courseId et lessonId requis" 
      });
    }

    const lesson = await Lesson.findOne({ 
      where: { 
        id: lessonId, 
        courseId,
        isPublished: true 
      } 
    });
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        error: "Leçon non trouvée ou non publiée" 
      });
    }

    if (completed) {
      const validation = await validateLessonExercises(userId, lessonId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.message,
          data: {
            totalExercises: validation.totalExercises,
            completedExercises: validation.completedExercises,
            remainingExercises: validation.remainingExercises
          }
        });
      }

      console.log('✅ Validation exercices OK:', validation.message);
    }

    const [progress, created] = await UserProgress.findOrCreate({
      where: { userId, courseId, lessonId },
      defaults: { 
        userId, 
        courseId, 
        lessonId, 
        lesson_completed: completed, 
        lesson_time_spent: timeSpent, 
        started_at: new Date(),
        last_accessed_at: new Date(),
        lesson_score: 0, 
        lesson_xp_earned: 0 
      }
    });

    console.log(`📝 Leçon ${created ? 'créée' : 'trouvée'}`);

    let xpEarned = 0, streakBonus = 0;

    if (completed && !progress.lesson_completed) {
      console.log('🎯 Leçon vient d\'être complétée');

      const lessonXP = XPService.calculateLessonXP ? 
        XPService.calculateLessonXP(timeSpent, 100) : 
        XPService.XP_RULES.LESSON_COMPLETED;
      
      const streakData = await XPService.updateDailyStreak(userId);
      streakBonus = XPService.calculateStreakBonus ? 
        XPService.calculateStreakBonus(streakData.streak || 0, lessonXP) : 
        0;
      
      xpEarned = lessonXP;

      console.log(`💰 XP leçon: ${xpEarned}, Streak bonus: ${streakBonus}`);

      await progress.update({ 
        lesson_completed: true, 
        completed_at: new Date(), 
        lesson_xp_earned: xpEarned + streakBonus, 
        lesson_time_spent: (progress.lesson_time_spent || 0) + timeSpent, 
        lesson_score: xpEarned + streakBonus,
        last_accessed_at: new Date()
      });

      console.log('✅ Leçon marquée comme complétée');
    } else {
      await progress.update({ 
        lesson_time_spent: (progress.lesson_time_spent || 0) + timeSpent, 
        last_accessed_at: new Date() 
      });
    }

    // ✅ MAJ avec ajout auto à l'historique si 100%
    const courseProgress = await updateCourseProgressAfterActivity(userId, courseId);

    const courseJustCompleted = 
      courseProgress.course_completion_percentage === 100 && 
      courseProgress.completed_at;

    res.json({
      success: true,
      data: {
        xpEarned,
        streakBonus,
        totalXP: xpEarned + streakBonus,
        dailyStreak: (await XPService.updateDailyStreak(userId)).streak,
        completed,
        lessonProgress: {
          completed: progress.lesson_completed,
          timeSpent: progress.lesson_time_spent,
          xp: progress.lesson_xp_earned
        },
        courseProgress: { 
          completionRate: courseProgress.course_completion_percentage, 
          totalXP: courseProgress.course_xp_earned,
          isCompleted: courseProgress.completed_at !== null,
          justCompleted: courseJustCompleted
        },
        message: completed 
          ? courseJustCompleted
            ? `🎉 Leçon et COURS complétés ! +${xpEarned + streakBonus} XP`
            : `🎉 Leçon complétée ! +${xpEarned + streakBonus} XP`
          : "Progression sauvegardée"
      }
    });

  } catch (error) {
    console.error("❌ Erreur updateLessonProgress:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la mise à jour de la progression" 
    });
  }
};

/* ===========================
   AUTRES FONCTIONS (inchangées)
=========================== */
export const updateCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    const courseProgress = await updateCourseProgressAfterActivity(userId, courseId);

    res.json({ 
      success: true, 
      data: { 
        courseId, 
        completionRate: courseProgress.course_completion_percentage, 
        totalXP: courseProgress.course_xp_earned, 
        completed: courseProgress.completed_at !== null 
      } 
    });

  } catch (error) {
    console.error("❌ Erreur updateCourseProgress:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const progressRaw = await UserProgress.findAll({
      where: { userId },
      include: [
        { 
          model: Course, 
          as: "course", 
          attributes: ["id", "title", "level", "languageId"] 
        },
        { 
          model: Lesson, 
          as: "lesson", 
          attributes: ["id", "title", "position"], 
          required: false 
        }
      ],
      order: [['courseId', 'ASC'], ['lessonId', 'ASC']]
    });

    const courseProgress = progressRaw.filter(p => p.lessonId === null);
    const lessonProgress = progressRaw.filter(p => p.lessonId !== null);

    const progressByCourse = {};
    
    courseProgress.forEach(item => {
      progressByCourse[item.courseId] = { 
        courseId: item.courseId, 
        course: item.course, 
        completed: item.completed_at !== null, 
        completion_percentage: item.course_completion_percentage, 
        totalXP: item.course_xp_earned, 
        time_spent: item.course_time_spent, 
        lessonsCompleted: 0, 
        totalLessons: 0 
      };
    });

    lessonProgress.forEach(item => {
      if (!progressByCourse[item.courseId]) {
        progressByCourse[item.courseId] = { 
          courseId: item.courseId, 
          course: item.course, 
          completed: false, 
          completion_percentage: 0, 
          totalXP: 0, 
          time_spent: 0, 
          lessonsCompleted: 0, 
          totalLessons: 0 
        };
      }
      progressByCourse[item.courseId].totalLessons++;
      if (item.lesson_completed) {
        progressByCourse[item.courseId].lessonsCompleted++;
      }
    });

    const progressFinal = Object.values(progressByCourse);
    const userRankings = await UserRanking.findAll({ 
      where: { userId }, 
      attributes: ["languageId", "total_score", "rank_position"] 
    });

    res.json({ 
      success: true, 
      data: { 
        progress: progressFinal, 
        userRankings, 
        detailed: { 
          courses: courseProgress, 
          lessons: lessonProgress 
        } 
      } 
    });

  } catch (error) {
    console.error("❌ Erreur getUserProgress:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

export const getProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    const progress = await UserProgress.findOne({ 
      where: { 
        userId, 
        courseId, 
        lessonId: lessonId || null 
      } 
    });

    res.json({ 
      success: true, 
      data: progress || { 
        message: "Aucune progression trouvée", 
        course_completion_percentage: 0, 
        lesson_completed: false 
      } 
    });

  } catch (error) {
    console.error("❌ Erreur getProgress:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

export const getCurrentLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const allLessons = await Lesson.findAll({ 
      where: { 
        courseId,
        isPublished: true 
      }, 
      order: [['position', 'ASC']], 
      attributes: ["id", "title", "position", "courseId"],
      include: [{
        model: UserProgress,
        as: 'UserProgress',
        where: { userId },
        required: false
      }]
    });
    
    if (!allLessons.length) {
      return res.status(404).json({ 
        success: false, 
        error: "Aucune leçon publiée trouvée pour ce cours" 
      });
    }

    let currentLesson = null, resumeReason = "";
    
    for (let lesson of allLessons) {
      const progress = lesson.UserProgress?.[0];
      if (!progress) { 
        currentLesson = lesson; 
        resumeReason = "première leçon non commencée"; 
        break; 
      }
      if (!progress.lesson_completed) { 
        currentLesson = lesson; 
        resumeReason = "leçon en cours non terminée"; 
        break; 
      }
    }
    
    if (!currentLesson) { 
      currentLesson = allLessons[allLessons.length - 1]; 
      resumeReason = "toutes les leçons complétées - dernière leçon"; 
    }

    const completedLessons = allLessons.filter(l => 
      l.UserProgress?.[0]?.lesson_completed
    ).length;
    
    const totalLessons = allLessons.length;
    const progressPercentage = totalLessons 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    res.json({ 
      success: true, 
      data: { 
        currentLesson, 
        completedLessons, 
        totalLessons, 
        progressPercentage, 
        resumeReason, 
        stats: { 
          lessons: { 
            completed: completedLessons, 
            total: totalLessons 
          }, 
          progress: progressPercentage 
        } 
      } 
    });

  } catch (error) {
    console.error("❌ Erreur getCurrentLesson:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur lors de la recherche de la leçon actuelle" 
    });
  }
};

export const getExerciseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    if (!courseId) {
      return res.status(400).json({ 
        success: false, 
        error: "courseId requis" 
      });
    }

    const userExercises = await UserExercise.findAll({ 
      where: { userId, courseId }, 
      attributes: ['exerciseId', 'is_correct', 'point_earned', 'attempt_number'], 
      order: [['answered_at', 'DESC']] 
    });

    const latestAttempts = {};
    userExercises.forEach(ue => { 
      if (!latestAttempts[ue.exerciseId]) {
        latestAttempts[ue.exerciseId] = ue; 
      }
    });

    res.json({ 
      success: true, 
      data: Object.values(latestAttempts) 
    });

  } catch (error) {
    console.error('❌ Erreur getExerciseProgress:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};