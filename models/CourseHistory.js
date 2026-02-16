import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const CourseHistory = sequelize.define("course_history", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "users", key: "id" },
    onDelete: "CASCADE",
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "courses", key: "id" },
    onDelete: "CASCADE",
  },
  completed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  final_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  // ✅ AJOUT DU CHAMP time_spent
  time_spent: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: "Temps total passé sur le cours (secondes)"
  }
}, {
  tableName: "course_history",
  timestamps: true,
  indexes: [
    // ✅ Index pour éviter les doublons
    {
      unique: true,
      fields: ['userId', 'courseId']
    }
  ]
});

export default CourseHistory;