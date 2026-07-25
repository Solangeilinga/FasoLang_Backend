import { Course, Language, Lesson, UserProgress } from "../models/index.js";
import { Op } from "sequelize";

// ===============================
// 📚 GET ALL COURSES (Admin)
// ===============================
export const getAllCourses = async (req, res) => {
  try {
    const { search, languageId, level, isPublished } = req.query;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    if (languageId) whereClause.languageId = languageId;
    if (level) whereClause.level = level;
    if (isPublished !== undefined) whereClause.isPublished = isPublished === 'true';

    const courses = await Course.findAll({
      where: whereClause,
      include: [
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Lesson,
          as: 'lessons',
          attributes: ['id'],
        },
      ],
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
    });

    // Ajouter stats
    const coursesWithStats = courses.map(course => ({
      ...course.toJSON(),
      lessonsCount: course.lessons?.length || 0,
    }));

    res.json({ success: true, data: coursesWithStats });
  } catch (error) {
    console.error('❌ Erreur getAllCourses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📚 GET COURSE BY ID (Admin)
// ===============================
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [
        {
          model: Language,
          as: 'language',
        },
        {
          model: Lesson,
          as: 'lessons',
          order: [['position', 'ASC']],
        },
      ],
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Cours non trouvé' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('❌ Erreur getCourseById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// ➕ CREATE COURSE (Admin)
// ===============================
export const createCourse = async (req, res) => {
  try {
    const { languageId, title, description, level, order, isPublished } = req.body;

    // Validation
    if (!languageId || !title) {
      return res.status(400).json({
        success: false,
        message: 'languageId et title sont requis',
      });
    }

    const course = await Course.create({
      languageId,
      title,
      description,
      level: level || 'beginner',
      order: order || 0,
      isPublished: isPublished || false,
    });

    const courseWithLanguage = await Course.findByPk(course.id, {
      include: [{ model: Language, as: 'language' }],
    });

    res.status(201).json({
      success: true,
      message: 'Cours créé avec succès',
      data: courseWithLanguage,
    });
  } catch (error) {
    console.error('❌ Erreur createCourse:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// ✏️ UPDATE COURSE (Admin)
// ===============================
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { languageId, title, description, level, order, isPublished } = req.body;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Cours non trouvé' });
    }

    // Mise à jour
    if (languageId !== undefined) course.languageId = languageId;
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (level !== undefined) course.level = level;
    if (order !== undefined) course.order = order;
    if (isPublished !== undefined) course.isPublished = isPublished;

    await course.save();

    const updatedCourse = await Course.findByPk(id, {
      include: [{ model: Language, as: 'language' }],
    });

    res.json({
      success: true,
      message: 'Cours mis à jour',
      data: updatedCourse,
    });
  } catch (error) {
    console.error('❌ Erreur updateCourse:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 🗑️ DELETE COURSE (Admin)
// ===============================
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Cours non trouvé' });
    }

    // ✅ Cascade delete (lessons, exercises, progress, etc.)
    await course.destroy();

    res.json({
      success: true,
      message: 'Cours supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur deleteCourse:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 COURSE STATS (Admin)
// ===============================
export const getCourseStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Nombre d'étudiants
    const studentsCount = await UserProgress.count({
      where: { courseId: id },
      distinct: true,
      col: 'userId',
    });

    // Cours complétés
    const { CourseHistory } = await import('../models/index.js');
    const completedCount = await CourseHistory.count({
      where: { courseId: id },
    });

    // Leçons
    const lessonsCount = await Lesson.count({
      where: { courseId: id },
    });

    res.json({
      success: true,
      data: {
        studentsCount,
        completedCount,
        lessonsCount,
      },
    });
  } catch (error) {
    console.error('❌ Erreur getCourseStats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};