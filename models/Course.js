import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Course = sequelize.define("courses", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  languageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "languages",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  level: {
    type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
    allowNull: false,
    defaultValue: "beginner",
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "courses",
  timestamps: true,
});

export default Course;
