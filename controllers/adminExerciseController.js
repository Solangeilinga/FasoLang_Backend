import { Exercise, Lesson, Course, Language } from "../models/index.js";
import { Op } from "sequelize";

// ===============================
// 📝 GET ALL EXERCISES (Admin)
// ===============================
export const getAllExercises = async (req, res) => {
  try {
    const { search, type, lessonId, courseId } = req.query;

    const whereClause = {};

    if (search) {
      whereClause.question = { [Op.like]: `%${search}%` };
    }

    if (type) whereClause.type = type;
    if (lessonId) whereClause.lessonId = lessonId;
    if (courseId) whereClause.courseId = courseId;

    const exercises = await Exercise.findAll({
      where: whereClause,
      include: [
        {
          model: Lesson,
          as: 'lesson',
        },
        {
          model: Course,
          as: 'course',
          include: [{ model: Language, as: 'language' }],
        },
      ],
      order: [['courseId', 'ASC'], ['lessonId', 'ASC'], ['position', 'ASC']],
    });

    res.json({ success: true, data: exercises });
  } catch (error) {
    console.error('❌ Erreur getAllExercises:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📝 GET EXERCISE BY ID (Admin)
// ===============================
export const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByPk(id, {
      include: [
        { model: Lesson, as: 'lesson' },
        {
          model: Course,
          as: 'course',
          include: [{ model: Language, as: 'language' }],
        },
      ],
    });

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercice non trouvé' });
    }

    res.json({ success: true, data: exercise });
  } catch (error) {
    console.error('❌ Erreur getExerciseById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// ➕ CREATE EXERCISE (Admin)
// ===============================
export const createExercise = async (req, res) => {
  try {
    const {
      courseId,
      lessonId,
      type,
      question,
      content,
      correct_answer,
      imageUrl,
      position,
      xp,
    } = req.body;

    // Validation
    if (!courseId || !lessonId || !type || !question || !content || !correct_answer) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis : courseId, lessonId, type, question, content, correct_answer',
      });
    }

    // Types valides
    const validTypes = ['qcm', 'traduction', 'association', 'drag_drop', 'sentence_builder'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type invalide. Types valides : ${validTypes.join(', ')}`,
      });
    }

    // Position automatique si non fournie
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPosition = await Exercise.max('position', {
        where: { lessonId },
      });
      finalPosition = (maxPosition || 0) + 1;
    }

    const exercise = await Exercise.create({
      courseId,
      lessonId,
      type,
      question,
      content,
      correct_answer,
      imageUrl,
      position: finalPosition,
      xp: xp || 10,
    });

    const exerciseWithRelations = await Exercise.findByPk(exercise.id, {
      include: [
        { model: Lesson, as: 'lesson' },
        { model: Course, as: 'course' },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Exercice créé avec succès',
      data: exerciseWithRelations,
    });
  } catch (error) {
    console.error('❌ Erreur createExercise:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// ✏️ UPDATE EXERCISE (Admin)
// ===============================
export const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      question,
      content,
      correct_answer,
      imageUrl,
      position,
      xp,
    } = req.body;

    const exercise = await Exercise.findByPk(id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercice non trouvé' });
    }

    // Types valides
    if (type) {
      const validTypes = ['qcm', 'traduction', 'association', 'drag_drop', 'sentence_builder'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type invalide. Types valides : ${validTypes.join(', ')}`,
        });
      }
      exercise.type = type;
    }

    if (question !== undefined) exercise.question = question;
    if (content !== undefined) exercise.content = content;
    if (correct_answer !== undefined) exercise.correct_answer = correct_answer;
    if (imageUrl !== undefined) exercise.imageUrl = imageUrl;
    if (position !== undefined) exercise.position = position;
    if (xp !== undefined) exercise.xp = xp;

    await exercise.save();

    const updatedExercise = await Exercise.findByPk(id, {
      include: [
        { model: Lesson, as: 'lesson' },
        { model: Course, as: 'course' },
      ],
    });

    res.json({
      success: true,
      message: 'Exercice mis à jour',
      data: updatedExercise,
    });
  } catch (error) {
    console.error('❌ Erreur updateExercise:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 🗑️ DELETE EXERCISE (Admin)
// ===============================
export const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findByPk(id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercice non trouvé' });
    }

    await exercise.destroy();

    res.json({
      success: true,
      message: 'Exercice supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur deleteExercise:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 EXERCISE STATS BY TYPE (Admin)
// ===============================
export const getExerciseStatsByType = async (req, res) => {
  try {
    const types = ['qcm', 'traduction', 'association', 'drag_drop', 'sentence_builder'];
    
    const stats = await Promise.all(
      types.map(async (type) => {
        const count = await Exercise.count({ where: { type } });
        return { type, count };
      })
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Erreur getExerciseStatsByType:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};