import { Lesson, LessonContent, Course, Language, Exercise } from "../models/index.js";
import { Op } from "sequelize";

// ===============================
// 📖 GET ALL LESSONS (Admin)
// ===============================
export const getAllLessons = async (req, res) => {
  try {
    const { search, courseId } = req.query;

    const whereClause = {};

    if (search) {
      whereClause.title = { [Op.like]: `%${search}%` };
    }

    if (courseId) whereClause.courseId = courseId;

    const lessons = await Lesson.findAll({
      where: whereClause,
      include: [
        {
          model: Course,
          as: 'course',
          include: [{ model: Language, as: 'language' }],
        },
        {
          model: LessonContent,
          as: 'contents',
        },
        {
          model: Exercise,
          as: 'exercises',
          attributes: ['id'],
        },
      ],
      order: [['courseId', 'ASC'], ['position', 'ASC']],
    });

    const lessonsWithStats = lessons.map(lesson => ({
      ...lesson.toJSON(),
      exercisesCount: lesson.exercises?.length || 0,
    }));

    res.json({ success: true, data: lessonsWithStats });
  } catch (error) {
    console.error('❌ Erreur getAllLessons:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📖 GET LESSON BY ID (Admin)
// ===============================
export const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          include: [{ model: Language, as: 'language' }],
        },
        {
          model: LessonContent,
          as: 'contents',
          include: [{ model: Language, as: 'language' }],
        },
        {
          model: Exercise,
          as: 'exercises',
          order: [['position', 'ASC']],
        },
      ],
    });

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Leçon non trouvée' });
    }

    res.json({ success: true, data: lesson });
  } catch (error) {
    console.error('❌ Erreur getLessonById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// ➕ CREATE LESSON (Admin)
// ===============================
export const createLesson = async (req, res) => {
  try {
    const { courseId, title, position, isPublished } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({
        success: false,
        message: 'courseId et title sont requis',
      });
    }

    // Si position non fournie, mettre à la fin
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPosition = await Lesson.max('position', {
        where: { courseId },
      });
      finalPosition = (maxPosition || 0) + 1;
    }

    const lesson = await Lesson.create({
      courseId,
      title,
      position: finalPosition,
      isPublished: isPublished || false,
    });

    const lessonWithRelations = await Lesson.findByPk(lesson.id, {
      include: [{ model: Course, as: 'course' }],
    });

    res.status(201).json({
      success: true,
      message: 'Leçon créée avec succès',
      data: lessonWithRelations,
    });
  } catch (error) {
    console.error('❌ Erreur createLesson:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// ✏️ UPDATE LESSON (Admin)
// ===============================
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position, isPublished } = req.body;

    const lesson = await Lesson.findByPk(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Leçon non trouvée' });
    }

    if (title !== undefined) lesson.title = title;
    if (position !== undefined) lesson.position = position;
    if (isPublished !== undefined) lesson.isPublished = isPublished;

    await lesson.save();

    const updatedLesson = await Lesson.findByPk(id, {
      include: [{ model: Course, as: 'course' }],
    });

    res.json({
      success: true,
      message: 'Leçon mise à jour',
      data: updatedLesson,
    });
  } catch (error) {
    console.error('❌ Erreur updateLesson:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 🗑️ DELETE LESSON (Admin)
// ===============================
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findByPk(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Leçon non trouvée' });
    }

    await lesson.destroy();

    res.json({
      success: true,
      message: 'Leçon supprimée avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur deleteLesson:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📄 LESSON CONTENTS
// ===============================

// GET contents pour une lesson
export const getLessonContents = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const contents = await LessonContent.findAll({
      where: { lessonId },
      include: [{ model: Language, as: 'language' }],
    });

    res.json({ success: true, data: contents });
  } catch (error) {
    console.error('❌ Erreur getLessonContents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// CREATE lesson content
export const createLessonContent = async (req, res) => {
  try {
    const { lessonId, languageId, content, audioUrl, imageUrl } = req.body;

    if (!lessonId || !languageId || !content) {
      return res.status(400).json({
        success: false,
        message: 'lessonId, languageId et content sont requis',
      });
    }

    // Vérifier si existe déjà
    const existing = await LessonContent.findOne({
      where: { lessonId, languageId },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Un contenu existe déjà pour cette leçon et cette langue',
      });
    }

    const lessonContent = await LessonContent.create({
      lessonId,
      languageId,
      content,
      audioUrl,
      imageUrl,
    });

    const contentWithRelations = await LessonContent.findByPk(lessonContent.id, {
      include: [{ model: Language, as: 'language' }],
    });

    res.status(201).json({
      success: true,
      message: 'Contenu créé avec succès',
      data: contentWithRelations,
    });
  } catch (error) {
    console.error('❌ Erreur createLessonContent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE lesson content
export const updateLessonContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, audioUrl, imageUrl } = req.body;

    const lessonContent = await LessonContent.findByPk(id);
    if (!lessonContent) {
      return res.status(404).json({ success: false, message: 'Contenu non trouvé' });
    }

    if (content !== undefined) lessonContent.content = content;
    if (audioUrl !== undefined) lessonContent.audioUrl = audioUrl;
    if (imageUrl !== undefined) lessonContent.imageUrl = imageUrl;

    await lessonContent.save();

    res.json({
      success: true,
      message: 'Contenu mis à jour',
      data: lessonContent,
    });
  } catch (error) {
    console.error('❌ Erreur updateLessonContent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE lesson content
export const deleteLessonContent = async (req, res) => {
  try {
    const { id } = req.params;

    const lessonContent = await LessonContent.findByPk(id);
    if (!lessonContent) {
      return res.status(404).json({ success: false, message: 'Contenu non trouvé' });
    }

    await lessonContent.destroy();

    res.json({
      success: true,
      message: 'Contenu supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur deleteLessonContent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};