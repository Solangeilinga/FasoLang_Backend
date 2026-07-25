import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";
import UserRanking from "./UserRanking.js";

const UserExercise = sequelize.define("user_exercices", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
  exerciseId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "exercises", key: "id" } },
  courseId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "courses", key: "id" } },
  lessonId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "lessons", key: "id" } },
  languageId: { // Crucial pour le hook de classement
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "languages", key: "id" }
  },
  answer: { type: DataTypes.TEXT, allowNull: true },
  point_earned: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_correct: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: "user_exercices",
  timestamps: true,
  hooks: {
    afterCreate: async (userExercise) => {
      if (userExercise.is_correct && userExercise.point_earned > 0) {
        await User.increment('totalXp', {
          by: userExercise.point_earned,
          where: { id: userExercise.userId }
        });

        const [ranking] = await UserRanking.findOrCreate({
          where: { userId: userExercise.userId, languageId: userExercise.languageId }
        });
        await ranking.increment('total_score', { by: userExercise.point_earned });
      }
    }
  }
});

export default UserExercise;