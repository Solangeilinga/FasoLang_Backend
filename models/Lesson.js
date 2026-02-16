// models/Lesson.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Lesson = sequelize.define("lessons", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "lessons",
  timestamps: true,
});

export default Lesson;


