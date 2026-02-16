// models/LessonContent.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const LessonContent = sequelize.define("lesson_contents", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
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
  languageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "langages",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  audioUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true, // 👈 pas obligatoire
  },
}, {
  tableName: "lesson_contents",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ["lessonId", "languageId"],
    },
  ],
});

export default LessonContent;
