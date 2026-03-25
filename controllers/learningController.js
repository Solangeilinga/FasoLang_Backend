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
export const submitExercise = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId, courseId, languageId, answer, is_correct, points } = req.body;

    // Le Hook 'afterCreate' dans le modèle s'occupera du reste (XP + Ranking)
    const result = await UserExercise.create({
      userId,
      exerciseId,
      courseId,
      languageId, // Passé ici pour le classement automatique
      answer: JSON.stringify(answer),
      is_correct,
      point_earned: is_correct ? points : 0
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
// ===============================
// getLessonById - VERSION AVEC AUDIOS ET IMAGES
// ===============================
export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { localLanguageCode = 'moore' } = req.query;
    const userId = req.user?.id;

    const id = parseInt(lessonId);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "ID de leçon invalide" 
      });
    }

    const lesson = await Lesson.findByPk(id);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        error: "Leçon non trouvée" 
      });
    }

    // ✅ Récupérer les contenus multilingues AVEC TOUS LES CHAMPS
    const contents = await LessonContent.findAll({
      where: { lessonId: id },
      include: [{
        model: Language,
        as: 'language',
        attributes: ['id', 'code', 'name']
      }]
    });

    // ✅ Log détaillé pour voir ce qui est récupéré
    console.log('📊 DÉTAIL DES CONTENUS:');
    contents.forEach(c => {
      console.log({
        languageCode: c.language?.code,
        content: c.content?.substring(0, 30),
        audioUrl: c.audioUrl,  // Vérifiez ce champ
        imageUrl: c.imageUrl,
        hasAudio: !!c.audioUrl,
        hasImage: !!c.imageUrl
      });
    });

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

    const frenchContent = contents.find(c => c.language?.code === 'fr');
    const localContent = contents.find(c => c.language?.code === localLanguageCode);

    // ✅ Construction de l'URL complète pour les fichiers audio
    const baseUrl = process.env.APP_URL || 'http://localhost:3000'; // À ajuster selon votre config

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
          // ✅ Construire l'URL complète si audioUrl existe
          audio: frenchContent?.audioUrl 
            ? (frenchContent.audioUrl.startsWith('http') 
                ? frenchContent.audioUrl 
                : `${baseUrl}${frenchContent.audioUrl}`)
            : null,
          imageUrl: frenchContent?.imageUrl || null,
          language: {
            id: frenchContent?.language?.id || 1,
            code: 'fr',
            name: 'Français'
          }
        },
        local: {
          content: localContent?.content || frenchContent?.content || '',
          // ✅ Construire l'URL complète si audioUrl existe
          audio: localContent?.audioUrl 
            ? (localContent.audioUrl.startsWith('http') 
                ? localContent.audioUrl 
                : `${baseUrl}${localContent.audioUrl}`)
            : frenchContent?.audioUrl 
              ? (frenchContent.audioUrl.startsWith('http') 
                  ? frenchContent.audioUrl 
                  : `${baseUrl}${frenchContent.audioUrl}`)
              : null,
          imageUrl: localContent?.imageUrl || null,
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

    console.log('✅ Réponse finale:', {
      frenchAudio: response.data.french.audio,
      frenchImage: response.data.french.imageUrl,
      localAudio: response.data.local.audio,
      localImage: response.data.local.imageUrl
    });

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