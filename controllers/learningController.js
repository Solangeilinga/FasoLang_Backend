import {
  Language, Course, Lesson, Exercise, LessonContent,
  UserProgress, User, UserExercise, UserRanking 
} from "../models/index.js";
import { XPService } from '../utils/xpService.js';
import { validateExerciseAnswer } from '../utils/exerciseEvaluation.js';
import { Op } from 'sequelize';

// ===============================
// 📝 submitExercise
export const submitExercise = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId, courseId, languageId, answer, points } = req.body;
    const parsedCourseId = Number(courseId);
    const parsedLanguageId = Number(languageId);

    if (!exerciseId || !parsedCourseId || !parsedLanguageId) {
      return res.status(400).json({ success: false, error: 'exerciseId, courseId et languageId requis' });
    }

    const exercise = await Exercise.findByPk(exerciseId);
    if (!exercise) {
      return res.status(404).json({ success: false, error: 'Exercice introuvable' });
    }

    const evaluation = validateExerciseAnswer(exercise, answer);
    const isCorrect = Boolean(evaluation.is_correct);
    const earnedPoints = isCorrect ? Number(points || 0) : 0;

    const result = await UserExercise.create({
      userId,
      exerciseId,
      courseId: parsedCourseId,
      languageId: parsedLanguageId,
      answer: JSON.stringify(answer),
      is_correct: isCorrect,
      point_earned: earnedPoints
    });

    const responseData = {
      ...result.toJSON(),
      is_correct: isCorrect,
      point_earned: earnedPoints,
      answer: typeof answer === 'string' ? answer : JSON.stringify(answer)
    };

    res.json({ success: true, data: responseData });
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