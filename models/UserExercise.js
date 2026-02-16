import { DataTypes } from "sequelize";
import sequelize from "../config/db.js"; // adapte le chemin si besoin

const UserExercise = sequelize.define("user_exercices", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "users", key: "id" },
    onDelete: "CASCADE",
  },
  lessonId: {  // <-- AJOUTER CE CHAMP
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "lessons", key: "id" },
    onDelete: "CASCADE",
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "courses", key: "id" },
    onDelete: "CASCADE",
  },
  exerciseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "exercises", key: "id" },
    onDelete: "CASCADE",
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Réponse donnée par l’utilisateur",
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "Indique si la réponse est correcte",
  },
  point_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: "Points gagnés pour cette réponse",
  },
  answered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: "Date et heure de la réponse",
  },
  attempt_number: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: "Numéro de tentative pour cet exercice",
  },
},{
  tableName: "user_exercices",
  timestamps: true,
}
);

export default UserExercise;
