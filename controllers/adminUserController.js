import { User, UserProgress, UserRanking, CourseHistory } from "../models/index.js";
import { Op } from "sequelize";

// ===============================
// 📊 GET ALL USERS (Admin)
// ===============================
export const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;

    const whereClause = {};

    // Filtre recherche
    if (search) {
      whereClause[Op.or] = [
        { firstname: { [Op.like]: `%${search}%` } },
        { lastname: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filtre rôle
    if (role && role !== 'all') {
      whereClause.role = role;
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password', 'reset_code', 'reset_code_expiry'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('❌ Erreur getAllUsers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 GET USER BY ID (Admin)
// ===============================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'reset_code', 'reset_code_expiry'] },
      include: [
        {
          model: UserProgress,
          as: 'progressions',
          limit: 10,
          order: [['last_accessed_at', 'DESC']],
        },
        {
          model: UserRanking,
          as: 'rankings',
        },
        {
          model: CourseHistory,
          as: 'courseHistory',
          limit: 10,
          order: [['completed_at', 'DESC']],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Erreur getUserById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// ✏️ UPDATE USER (Admin)
// ===============================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, email, numero, role, avatarUrl, dailyStreak } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Mise à jour
    if (firstname !== undefined) user.firstname = firstname;
    if (lastname !== undefined) user.lastname = lastname;
    if (email !== undefined) user.email = email;
    if (numero !== undefined) user.numero = numero;
    if (role !== undefined) user.role = role;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (dailyStreak !== undefined) user.dailyStreak = dailyStreak;

    await user.save();

    res.json({
      success: true,
      message: 'Utilisateur mis à jour',
      data: {
        ...user.toJSON(),
        password: undefined,
        reset_code: undefined,
        reset_code_expiry: undefined,
      },
    });
  } catch (error) {
    console.error('❌ Erreur updateUser:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 🗑️ DELETE USER (Admin)
// ===============================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // ✅ Cascade delete géré par Sequelize (onDelete: CASCADE)
    await user.destroy();

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur deleteUser:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 USER STATS (Admin)
// ===============================
export const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Total XP
    const progressions = await UserProgress.findAll({
      where: { userId: id },
      attributes: ['course_xp_earned', 'lesson_xp_earned'],
    });

    const totalXP = progressions.reduce(
      (sum, p) => sum + (p.course_xp_earned || 0) + (p.lesson_xp_earned || 0),
      0
    );

    // Cours complétés
    const completedCourses = await CourseHistory.count({
      where: { userId: id },
    });

    // Exercices répondus
    const { UserExercise } = await import('../models/index.js');
    const totalExercises = await UserExercise.count({
      where: { userId: id },
    });

    const correctExercises = await UserExercise.count({
      where: { userId: id, is_correct: true },
    });

    res.json({
      success: true,
      data: {
        totalXP,
        completedCourses,
        totalExercises,
        correctExercises,
        accuracy: totalExercises > 0 ? Math.round((correctExercises / totalExercises) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('❌ Erreur getUserStats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};