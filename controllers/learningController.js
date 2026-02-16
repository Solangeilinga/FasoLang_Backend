import {
  Language, Course, Lesson, Exercise, LessonContent,
  UserProgress, User, UserExercise, UserRanking 
} from "../models/index.js";
import { XPService } from '../utils/xpService.js';
import { Op } from 'sequelize';

// ===============================
// UTILITAIRES
// ===============================
const safeJsonParse = (value, fallback = null) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const normalizeArrayToString = (arr) => {
  if (!arr) return '';
  return Array.isArray(arr) ? arr.join(" ").trim().toLowerCase() : normalizeString(arr);
};

const validateAnswer = (exercise, answer) => {
  // Vérifier que l'exercice a un type
  if (!exercise || !exercise.type) {
    console.error('❌ Exercice invalide:', exercise);
    return { is_correct: false };
  }

  const type = exercise.type.toLowerCase();

  // 🔧 Parse correct_answer s'il est stocké comme string TEXT en BDD
  let correctAnswer = exercise.correct_answer;
  if (typeof correctAnswer === 'string') {
    correctAnswer = safeJsonParse(correctAnswer, correctAnswer);
  }

  // Si correctAnswer est toujours undefined/null, utiliser correct_answer_value
  if (correctAnswer === null || correctAnswer === undefined) {
    correctAnswer = exercise.correct_answer_value;
    if (typeof correctAnswer === 'string') {
      correctAnswer = safeJsonParse(correctAnswer, correctAnswer);
    }
  }

  switch (type) {
    case "qcm":
    case "traduction": {
      const user = normalizeString(answer);
      
      // ✅ Extraction sécurisée de la valeur
      let correct = '';
      if (correctAnswer) {
        if (typeof correctAnswer === 'object') {
          correct = normalizeString(correctAnswer.answer || correctAnswer.value || JSON.stringify(correctAnswer));
        } else {
          correct = normalizeString(correctAnswer);
        }
      }

      // 🐛 DEBUG TEMPORAIRE
      console.log('🔍 TRADUCTION DEBUG:', {
        type: exercise.type,
        user_answer_raw: answer,
        user_answer_normalized: user,
        correct_answer_raw: exercise.correct_answer,
        correct_answer_normalized: correct,
        match: user === correct,
        user_length: user.length,
        correct_length: correct.length
      });
      
      return { is_correct: user === correct };
    }

    case "drag_drop":
    case "sentence_builder": {
      // ✅ Gestion array avec fallback
      const correctArr = correctAnswer 
        ? (Array.isArray(correctAnswer) 
          ? correctAnswer 
          : (correctAnswer?.answer || correctAnswer?.value || []))
        : [];
      
      const userStr = normalizeArrayToString(answer);
      const correctStr = normalizeArrayToString(correctArr);
      
      return { is_correct: userStr === correctStr };
    }

    case "association": {
      const correctObj = correctAnswer
        ? (typeof correctAnswer === 'object' 
          ? (correctAnswer.answer || correctAnswer.value || correctAnswer)
          : safeJsonParse(correctAnswer, {}))
        : {};
      
      const userObj = typeof answer === 'object' ? answer : safeJsonParse(answer, {});
      
      // 🔧 FIX : Comparer clé par clé au lieu de stringify
      const correctKeys = Object.keys(correctObj).sort();
      const userKeys = Object.keys(userObj).sort();
      
      // Vérifier que les clés sont identiques
      const sameKeys = JSON.stringify(correctKeys) === JSON.stringify(userKeys);
      
      // Vérifier que toutes les valeurs correspondent
      const allMatch = sameKeys && correctKeys.every(
        key => correctObj[key] === userObj[key]
      );
      
      // 🐛 DEBUG
      console.log('🔍 ASSOCIATION DEBUG:', {
        correctObj,
        userObj,
        correctKeys,
        userKeys,
        sameKeys,
        allMatch,
        // Détail des comparaisons
        comparisons: correctKeys.map(key => ({
          key,
          correct: correctObj[key],
          user: userObj[key],
          match: correctObj[key] === userObj[key]
        }))
      });
      
      return { is_correct: allMatch };
    }

    default:
      console.error(`❌ Type d'exercice non supporté: ${exercise.type}`);
      return { is_correct: false };
  }
};

// ===============================
// 📝 submitExercise
// ===============================// ===============================
// 📝 submitExercise - VERSION AMÉLIORÉE UX
// ===============================
export const submitExercise = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId, courseId, answer, lessonId } = req.body;

    if (!exerciseId || !courseId || answer === undefined) {
      return res.status(400).json({
        success: false,
        error: "exerciseId, courseId et answer sont requis",
      });
    }

    const exercise = await Exercise.findByPk(exerciseId);
    if (!exercise) {
      return res.status(404).json({ 
        success: false, 
        error: "Exercice non trouvé" 
      });
    }

    console.log('📊 EXERCISE DATA:', {
      id: exercise.id,
      type: exercise.type,
      correct_answer_type: typeof exercise.correct_answer,
      correct_answer_value: exercise.correct_answer,
      user_answer_type: typeof answer,
      user_answer_value: answer
    });

    if (!exercise.type || !exercise.correct_answer) {
      console.error('❌ Exercice incomplet:', exercise);
      return res.status(400).json({ 
        success: false,
        error: 'Exercice mal configuré dans la base de données'
      });
    }

    let finalLessonId = lessonId || exercise.lessonId;
    
    if (!finalLessonId) {
      console.warn(`⚠️ Exercice ${exerciseId} n'a pas de lessonId, tentative de déduction...`);
      if (exerciseId >= 19 && exerciseId <= 23) {
        finalLessonId = 25;
      } else {
        finalLessonId = 1;
      }
      console.log(`✅ LessonId déduit: ${finalLessonId} pour l'exercice ${exerciseId}`);
    }

    let is_correct = false;
    try {
      const result = validateAnswer(exercise, answer);
      is_correct = result.is_correct;
    } catch (err) {
      console.error('❌ Validation error:', err);
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }

    const previousAttempts = await UserExercise.count({ 
      where: { userId, exerciseId } 
    });
    const isFirstTry = previousAttempts === 0;

    const xpEarned = is_correct ? XPService.calculateExerciseXP(true, isFirstTry) : 0;

    await UserExercise.create({
      userId,
      exerciseId,
      courseId,
      lessonId: finalLessonId,
      answer: JSON.stringify(answer),
      is_correct,
      point_earned: xpEarned,
      attempt_number: previousAttempts + 1,
      answered_at: new Date(),
    });

    let streak = 0;
    let streakBonus = 0;
    if (is_correct) {
      try {
        const streakData = await XPService.updateDailyStreak(userId);
        streak = streakData?.streak || 0;
        streakBonus = XPService.calculateStreakBonus(streak, xpEarned);
      } catch (e) {
        console.warn("⚠️ Streak ignoré:", e.message);
      }
    }

    const totalXP = xpEarned + streakBonus;
    if (is_correct) {
      const course = await Course.findByPk(courseId);
      if (course) {
        await XPService.addXPToUser(userId, course.languageId, totalXP);
      }
    }

    // ✅ NOUVEAU : Calculer la progression de la leçon
    const lessonProgress = await calculateLessonProgressInfo(userId, finalLessonId);

    return res.json({
      success: true,
      data: {
        is_correct,
        xpEarned: is_correct ? totalXP : 0,
        streak,
        isFirstTry,
        lessonId: finalLessonId,
        
        // ✅ Informations de progression
        lessonProgress: {
          totalExercises: lessonProgress.totalExercises,
          completedExercises: lessonProgress.completedExercises,
          remainingExercises: lessonProgress.remainingExercises,
          canComplete: lessonProgress.canComplete,
          completionPercentage: lessonProgress.completionPercentage
        },
        
        message: is_correct ? `Bravo 🎉 +${totalXP} XP` : "Réessaie 💪",
      },
    });
  } catch (error) {
    console.error("❌ submitExercise:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===============================
// 🆕 FONCTION HELPER : Calculer la progression d'une leçon
// ===============================
const calculateLessonProgressInfo = async (userId, lessonId) => {
  try {
    // Récupérer tous les exercices de la leçon
    const exercises = await Exercise.findAll({ 
      where: { lessonId } 
    });

    if (!exercises.length) {
      return {
        totalExercises: 0,
        completedExercises: 0,
        remainingExercises: 0,
        canComplete: true,
        completionPercentage: 100
      };
    }

    // Récupérer les exercices réussis
    const completedExercises = await UserExercise.findAll({
      where: {
        userId,
        lessonId,
        is_correct: true
      },
      attributes: ['exerciseId'],
      group: ['exerciseId']
    });

    const completedCount = completedExercises.length;
    const totalCount = exercises.length;
    const remainingCount = totalCount - completedCount;
    const canComplete = completedCount === totalCount;
    const completionPercentage = Math.round((completedCount / totalCount) * 100);

    return {
      totalExercises: totalCount,
      completedExercises: completedCount,
      remainingExercises: remainingCount,
      canComplete,
      completionPercentage
    };

  } catch (error) {
    console.error('❌ Erreur calculateLessonProgressInfo:', error);
    return {
      totalExercises: 0,
      completedExercises: 0,
      remainingExercises: 0,
      canComplete: false,
      completionPercentage: 0
    };
  }
};

// ===============================
// getLanguages
// ===============================
export const getLanguages = async (req, res) => {
  try {
    const languages = await Language.findAll({
      where: { isActive: true },
      order: [['order', 'ASC'], ['name', 'ASC']]
    });
    res.json({ success: true, data: languages });
  } catch (error) {
    console.error("❌ Erreur getLanguages:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// ===============================
// getCoursesByLanguage
// ===============================
export const getCoursesByLanguage = async (req, res) => {
  try {
    const { languageId } = req.params;
    const userId = req.user.id;

    if (!languageId || isNaN(Number(languageId))) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid or missing languageId parameter" 
      });
    }

    const courses = await Course.findAll({
      where: { languageId: Number(languageId) },
      include: [{
        model: Language,
        as: 'language',
        attributes: ['id', 'code', 'name', 'imageUrl']
      }],
      order: [["id", "ASC"]],
    });

    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        const progress = await UserProgress.findOne({
          where: { 
            userId, 
            courseId: course.id, 
            lessonId: null 
          },
        });
        
        return {
          ...course.toJSON(),
          isCompleted: progress ? progress.completed_at !== null : false,
          completion_percentage: progress ? progress.course_completion_percentage : 0,
          xp_earned: progress ? progress.course_xp_earned : 0,
        };
      })
    );

    console.log('✅ Cours avec langue:', coursesWithProgress.map(c => ({
      id: c.id,
      title: c.title,
      languageCode: c.language?.code
    })));

    return res.json({ success: true, data: coursesWithProgress });
  } catch (error) {
    console.error("❌ Erreur getCoursesByLanguage:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// ===============================
// getLessonsByCourse
// ===============================
export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    if (!courseId || isNaN(Number(courseId))) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid or missing courseId parameter" 
      });
    }

    const lessons = await Lesson.findAll({
      where: { 
        courseId: Number(courseId), 
        isPublished: true 
      },
      attributes: ['id', 'title', 'position', 'courseId'],
      order: [["position", "ASC"]],
    });

    if (!lessons || lessons.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Aucune leçon trouvée pour ce cours" 
      });
    }

    const lessonsWithProgress = await Promise.all(
      lessons.map(async (lesson) => {
        const progress = await UserProgress.findOne({ 
          where: { 
            userId, 
            courseId: Number(courseId), 
            lessonId: lesson.id 
          } 
        });

        return {
          id: lesson.id,
          title: lesson.title,
          position: lesson.position,
          progress: progress ? {
            completed: progress.lesson_completed || false,
            score: progress.lesson_score || 0,
            xp_earned: progress.lesson_xp_earned || 0,
            time_spent: progress.lesson_time_spent || 0,
          } : null,
        };
      })
    );

    res.status(200).json({ success: true, data: lessonsWithProgress });
  } catch (error) {
    console.error("❌ Erreur getLessonsByCourse:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur interne du serveur" 
    });
  }
};

// ===============================
// getLessonById
// ===============================
export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { localLanguageCode = 'moore' } = req.query;
    const userId = req.user?.id;

    console.log('🔍 getLessonById appelé:', {
      lessonId,
      localLanguageCode,
      userId
    });

    const id = parseInt(lessonId);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "ID de leçon invalide" 
      });
    }

    // ✅ Récupérer la leçon
    const lesson = await Lesson.findByPk(id);

    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        error: "Leçon non trouvée" 
      });
    }

    console.log('✅ Leçon trouvée:', {
      id: lesson.id,
      title: lesson.title,
      courseId: lesson.courseId
    });

    // ✅ Récupérer les contenus multilingues
    const contents = await LessonContent.findAll({
      where: { lessonId: id },
      include: [{
        model: Language,
        as: 'language',
        attributes: ['id', 'code', 'name']
      }]
    });

    console.log('📚 Contenus trouvés:', contents.length);
    contents.forEach(c => {
      console.log(`  - ${c.language?.code}: "${c.content?.substring(0, 50)}..."`);
    });

    // ✅ Récupérer la progression
    let progress = null;
    if (userId) {
      progress = await UserProgress.findOne({ 
        where: { 
          userId, 
          courseId: lesson.courseId, 
          lessonId: lesson.id 
        } 
      });
    }

    // ✅ Trouver les contenus français et local
    const frenchContent = contents.find(c => c.language?.code === 'fr');
    const localContent = contents.find(c => c.language?.code === localLanguageCode);

    console.log('🎯 Contenu français:', frenchContent ? '✅' : '❌');
    console.log('🎯 Contenu local (' + localLanguageCode + '):', localContent ? '✅' : '❌');

    if (localContent) {
      console.log('✅ Contenu local trouvé:', {
        languageCode: localContent.language?.code,
        languageName: localContent.language?.name,
        contentPreview: localContent.content?.substring(0, 50)
      });
    } else {
      console.warn('⚠️ Aucun contenu trouvé pour:', localLanguageCode);
      console.log('📋 Langues disponibles:', contents.map(c => c.language?.code));
    }

    const response = {
      success: true,
      data: {
        id: lesson.id,
        title: lesson.title,
        position: lesson.position,
        courseId: lesson.courseId,
        progress: progress ? {
          completed: progress.lesson_completed || false,
          score: progress.lesson_score || 0,
          xp_earned: progress.lesson_xp_earned || 0,
          time_spent: progress.lesson_time_spent || 0
        } : null,
        french: {
          content: frenchContent?.content || '',
          audio: frenchContent?.audioUrl || null,
          language: {
            id: frenchContent?.language?.id || 1,
            code: 'fr',
            name: 'Français'
          }
        },
        local: {
          content: localContent?.content || frenchContent?.content || '',
          audio: localContent?.audioUrl || frenchContent?.audioUrl || null,
          language: {
            id: localContent?.language?.id || 2,
            code: localLanguageCode,
            name: localLanguageCode === 'moore' ? 'Mooré' : 
                  localLanguageCode === 'peulh' ? 'Peulh' : 
                  localLanguageCode === 'dioula' ? 'Dioula' : 
                  localLanguageCode
          }
        }
      }
    };

    console.log('✅ Réponse envoyée');
    res.status(200).json(response);
  } catch (error) {
    console.error("💥 Erreur getLessonById:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur interne du serveur",
      details: error.message 
    });
  }
};
// ===============================
// getExercisesByLesson
// ===============================
export const getExercisesByLesson = async (req, res) => {
  try {
    // ✅ CORRECTION : Récupérer courseId et lessonId depuis req.params
    const { courseId, lessonId } = req.params;
    
    console.log('🔍 getExercisesByLesson appelé:', {
      courseId,
      lessonId,
      fullParams: req.params,
      fullQuery: req.query
    });
    
    if (!courseId || !lessonId) {
      return res.status(400).json({ 
        success: false, 
        error: "courseId et lessonId requis" 
      });
    }

    // ✅ Vérifier que la leçon appartient bien au cours
    const lesson = await Lesson.findOne({
      where: { 
        id: lessonId, 
        courseId: courseId 
      }
    });

    if (!lesson) {
      console.error('❌ Leçon non trouvée ou ne correspond pas au cours:', {
        lessonId,
        courseId
      });
      return res.status(404).json({ 
        success: false, 
        error: "Leçon non trouvée dans ce cours" 
      });
    }

    console.log('✅ Leçon validée:', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseId: lesson.courseId
    });

    // ✅ Récupérer les exercices avec double filtrage
    const exercises = await Exercise.findAll({ 
      where: { 
        lessonId,
        courseId  // ✅ Sécurité supplémentaire
      },
      order: [['position', 'ASC']],
      include: [{
        model: Lesson,
        as: 'lesson',
        attributes: ['id', 'title', 'courseId'],
        include: [{
          model: Course,
          as: 'course',
          attributes: ['id', 'title']
        }]
      }]
    });
    
    console.log('📚 Exercices trouvés:', exercises.length);
    
    if (!exercises || exercises.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Aucun exercice trouvé pour cette leçon" 
      });
    }

    console.log('✅ Exercices envoyés');
    res.json({ success: true, data: exercises });
  } catch (error) {
    console.error("❌ Erreur getExercisesByLesson:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// ===============================
// getCoursTermines
// ===============================
export const getCoursTermines = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const coursTermines = await UserProgress.findAll({
      where: { 
        userId, 
        lessonId: null, 
        completed_at: { [Op.ne]: null } 
      },
      include: [{ 
        model: Course, 
        as: "course", 
        include: [{ 
          model: Language, 
          as: "language" 
        }] 
      }],
      order: [["completed_at", "DESC"]]
    });

    const data = coursTermines.map(progress => ({
      id: progress.id,
      courseId: progress.courseId,
      completed_at: progress.completed_at,
      final_score: progress.course_xp_earned || 0,
      course: progress.course ? {
        id: progress.course.id,
        title: progress.course.title,
        level: progress.course.level,
        language: progress.course.language ? {
          id: progress.course.language.id,
          name: progress.course.language.name,
          imageUrl: progress.course.language.imageUrl
        } : null
      } : null
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ Erreur getCoursTermines:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// ===============================
// getClassementByLanguage
// ===============================
export const getClassementByLanguage = async (req, res) => {
  try {
    const { languageId } = req.params;
    
    if (!languageId) {
      return res.status(400).json({ 
        success: false, 
        error: "languageId requis" 
      });
    }

    const classement = await UserRanking.findAll({
      where: { languageId },
      include: [
        { 
          model: User, 
          as: "user",
          attributes: ['id', 'firstname', 'lastname', 'avatarUrl']
        },
        { 
          model: Language, 
          as: "language",
          attributes: ['id', 'name', 'code', 'imageUrl']
        }
      ],
      order: [["total_score", "DESC"]],
      limit: 10
    });

    res.json({ 
      success: true, 
      data: { 
        classement, 
        totalParticipants: classement.length 
      } 
    });
  } catch (error) {
    console.error("❌ Erreur getClassementByLanguage:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

// ===============================
// getCoursParLangueEtNiveau
// ===============================
export const getCoursParLangueEtNiveau = async (req, res) => {
  try {
    const { languageId } = req.params;
    const userId = req.user?.id;
    
    if (!languageId) {
      return res.status(400).json({ 
        success: false, 
        error: "languageId requis" 
      });
    }

    const langue = await Language.findByPk(languageId);
    if (!langue) {
      return res.status(404).json({ 
        success: false, 
        error: "Langue non trouvée" 
      });
    }

    const cours = await Course.findAll({
      where: { languageId: languageId },
      include: [
        { 
          model: Language, 
          as: "language" 
        },
        { 
          model: Lesson, 
          as: "lessons",
          where: { isPublished: true },
          required: false,
          order: [["position", "ASC"]]
        }
      ],
      order: [["level", "ASC"], ["title", "ASC"]]
    });

    const progressionUtilisateur = userId 
      ? (await UserProgress.findAll({ 
          where: { 
            userId, 
            courseId: cours.map(c => c.id), 
            lessonId: null 
          } 
        })).reduce((acc, prog) => { 
          acc[prog.courseId] = prog; 
          return acc; 
        }, {}) 
      : {};

    const coursParNiveau = { 
      débutant: [], 
      intermédiaire: [], 
      avancé: [] 
    };
    
    cours.forEach(c => { 
      if (coursParNiveau[c.level]) {
        coursParNiveau[c.level].push(c); 
      }
    });

    const resultat = {
      langue: { 
        id: langue.id, 
        name: langue.name, 
        code: langue.code,
        imageUrl: langue.imageUrl, 
        description: langue.description 
      },
      coursParNiveau: Object.keys(coursParNiveau).map(niveau => ({
        niveau,
        cours: coursParNiveau[niveau].map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          level: c.level,
          totalLecons: c.lessons?.length || 0,
          language: c.language,
          progression: progressionUtilisateur[c.id] ? {
            pourcentage: progressionUtilisateur[c.id].course_completion_percentage || 0,
            score: progressionUtilisateur[c.id].course_xp_earned || 0,
            completed: progressionUtilisateur[c.id].completed_at !== null
          } : null
        }))
      }))
    };

    res.json({ success: true, data: resultat });
  } catch (error) {
    console.error("❌ Erreur getCoursParLangueEtNiveau:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur lors de la récupération des cours" 
    });
  }
};