// models/UserProgress.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserProgress = sequelize.define("user_progress", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "users", key: "id" },
    onDelete: "CASCADE",
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "courses", key: "id" },
    onDelete: "CASCADE",
  },
  lessonId: {
    type: DataTypes.INTEGER,
    allowNull: true, // ✅ NULL pour la progression du cours
    references: { model: "lessons", key: "id" },
    onDelete: "CASCADE",
  },
  // === PROGRESSION GLOBALE (quand lessonId est NULL) ===
  course_completion_percentage: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: "Progression globale dans le cours"
  },
  course_xp_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  course_time_spent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: "Temps total passé sur le cours (secondes)"
  },

  // === PROGRESSION LEÇON (quand lessonId est renseigné) ===
  lesson_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lesson_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lesson_time_spent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lesson_xp_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // === MÉTADONNÉES ===
  last_accessed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: "user_progress",
  timestamps: true,
  indexes: [
    // Pour retrouver rapidement la progression d'un user dans un cours
    {
      unique: true,
      fields: ['userId', 'courseId', 'lessonId']
    }
  ]
});

export default UserProgress;