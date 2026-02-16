// ===============================
// 📦 Imports des modèles
// ===============================
import User from "./User.js";
import Language from "./Language.js";
import Course from "./Course.js";
import Lesson from "./Lesson.js";
import LessonContent from "./LessonContent.js";
import Exercise from "./Exercise.js";
import Proverbe from "./Proverbe.js";
import ProverbeContent from "./ProverbeContent.js";
import UserExercise from "./UserExercise.js";
import UserProgress from "./UserProgress.js";
import UserRanking from "./UserRanking.js";
import CourseHistory from "./CourseHistory.js";

// ===============================
// 🔹 Language ↔ Course
// ===============================
Language.hasMany(Course, {
  foreignKey: "languageId",
  as: "courses",
});
Course.belongsTo(Language, {
  foreignKey: "languageId",
  as: "language",
});

// ===============================
// 🔹 Course ↔ Lesson
// ===============================
Course.hasMany(Lesson, {
  foreignKey: "courseId",
  as: "lessons",
});
Lesson.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// ===============================
// 🔹 Lesson ↔ LessonContent ↔ Language
// ===============================
Lesson.hasMany(LessonContent, {
  foreignKey: "lessonId",
  as: "contents",
});
LessonContent.belongsTo(Lesson, {
  foreignKey: "lessonId",
  as: "lesson",
});

Language.hasMany(LessonContent, {
  foreignKey: "languageId",
  as: "lessonContents",
});
LessonContent.belongsTo(Language, {
  foreignKey: "languageId",
  as: "language",
});

// ===============================
// 🔹 Course ↔ Exercise
// ===============================
Course.hasMany(Exercise, {
  foreignKey: "courseId",
  as: "courseExercises",  // ✅ Changé de "exercises" à "courseExercises"
});
Exercise.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// ===============================
// 🔹 Lesson ↔ Exercise
// ===============================
Lesson.hasMany(Exercise, {
  foreignKey: "lessonId",
  as: "exercises",  // ✅ Alias unique pour Lesson
});
Exercise.belongsTo(Lesson, {
  foreignKey: "lessonId",
  as: "lesson",
});

// ===============================
// 🔹 User ↔ UserProgress ↔ Course ↔ Lesson
// ===============================
User.hasMany(UserProgress, {
  foreignKey: "userId",
  as: "progressions",
});
UserProgress.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Course.hasMany(UserProgress, {
  foreignKey: "courseId",
  as: "userProgress",
});
UserProgress.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

Lesson.hasMany(UserProgress, {
  foreignKey: "lessonId",
  as: "UserProgress",
});
UserProgress.belongsTo(Lesson, {
  foreignKey: "lessonId",
  as: "lesson",
});

// ===============================
// 🔹 User ↔ Exercise ↔ Course
// ===============================
User.hasMany(UserExercise, {
  foreignKey: "userId",
  as: "exerciseAnswers",
});
UserExercise.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Exercise.hasMany(UserExercise, {
  foreignKey: "exerciseId",
  as: "userAnswers",
});
UserExercise.belongsTo(Exercise, {
  foreignKey: "exerciseId",
  as: "exercise",
});

Course.hasMany(UserExercise, {
  foreignKey: "courseId",
  as: "userCourseExercises",
});
UserExercise.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// ===============================
// 🔹 User ↔ Ranking ↔ Language
// ===============================
User.hasMany(UserRanking, {
  foreignKey: "userId",
  as: "rankings",
});
UserRanking.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Language.hasMany(UserRanking, {
  foreignKey: "languageId",
  as: "languageRankings",
});
UserRanking.belongsTo(Language, {
  foreignKey: "languageId",
  as: "language",
});

// ===============================
// 🔹 User ↔ CourseHistory ↔ Course
// ===============================
User.hasMany(CourseHistory, {
  foreignKey: "userId",
  as: "courseHistory",
});
CourseHistory.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Course.hasMany(CourseHistory, {
  foreignKey: "courseId",
  as: "history",
});
CourseHistory.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// ===============================
// 🔹 Proverbe ↔ ProverbeContent ↔ Language
// ===============================
Proverbe.hasMany(ProverbeContent, {
  foreignKey: "proverbeId",
  as: "contents",
});
ProverbeContent.belongsTo(Proverbe, {
  foreignKey: "proverbeId",
  as: "proverbe",
});

Language.hasMany(ProverbeContent, {
  foreignKey: "languageId",
  as: "proverbeContents",
});
ProverbeContent.belongsTo(Language, {
  foreignKey: "languageId",
  as: "language",
});

// ===============================
// 📤 Exports
// ===============================
export {
  User,
  Language,
  Course,
  Lesson,
  LessonContent,
  Exercise,
  Proverbe,
  ProverbeContent,
  UserExercise,
  UserProgress,
  UserRanking,
  CourseHistory,
};