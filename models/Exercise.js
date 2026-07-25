import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Exercise = sequelize.define("exercises", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // ✅ AJOUTER courseId
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "courses",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },

  lessonId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "lessons",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },

  type: {
    type: DataTypes.ENUM(
      "qcm",
      "traduction",
      "association",
      "drag_drop",
      "sentence_builder"
    ),
    allowNull: false,
  },

  question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  content: {
    type: DataTypes.JSON,
    allowNull: false,
  },

  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  correct_answer: {
    type: DataTypes.JSON,
    allowNull: false,
  },

  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  xp: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  }
}, {
  tableName: "exercises",
  timestamps: true,
});

export default Exercise;