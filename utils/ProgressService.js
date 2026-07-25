// services/ProgressService.js
export class ProgressService {
  // ✅ Mettre à jour la progression d'une leçon (SIMPLE)
  static async updateLessonProgress(userId, courseId, lessonId, data = {}) {
    const { timeSpent = 0, completed = false } = data;

    // 1. Calculer XP pour la leçon
    const xpEarned = XPService.calculateLessonXP(timeSpent);

    // 2. Mettre à jour UserProgress pour la leçon
    const [progress, created] = await UserProgress.findOrCreate({
      where: { userId, courseId, lessonId },
      defaults: {
        userId,
        courseId,
        lessonId,
        lesson_completed: completed,
        lesson_score: xpEarned,
        lesson_xp_earned: xpEarned,
        lesson_time_spent: timeSpent,
        started_at: new Date()
      }
    });

    if (!created) {
      // Si la leçon n'était pas déjà complétée
      if (completed && !progress.lesson_completed) {
        await progress.update({
          lesson_completed: true,
          completed_at: new Date(),
          lesson_xp_earned: xpEarned,
          lesson_score: xpEarned
        });
      } else {
        await progress.update({
          lesson_time_spent: (progress.lesson_time_spent || 0) + timeSpent,
          last_accessed_at: new Date()
        });
      }
    }

    // 3. Gérer le streak
    const streakData = await XPService.updateDailyStreak(userId);
    const streakBonus = completed ? XPService.calculateStreakBonus(streakData.streak, xpEarned) : 0;
    const totalXP = xpEarned + streakBonus;

    // 4. Ajouter XP si leçon complétée
    if (completed) {
      const course = await Course.findByPk(courseId);
      if (course) {
        await XPService.addXPToUser(userId, course.languageId, totalXP);
      }
    }

    // 5. Mettre à jour la progression du cours
    await this.updateCourseProgress(userId, courseId);

    return {
      progress,
      xpEarned: completed ? totalXP : 0,
      streakBonus,
      dailyStreak: streakData.streak
    };
  }

  // ✅ Soumettre un exercice (SIMPLE)
  static async submitExercise(userId, data) {
    const { exerciseId, courseId, answer, is_correct } = data;

    // 1. Vérifier si première tentative
    const previousAttempts = await UserExercise.count({
      where: { userId, exerciseId }
    });
    const isFirstTry = previousAttempts === 0;

    // 2. Calculer XP
    const xpEarned = XPService.calculateExerciseXP(is_correct, isFirstTry);

    // 3. Enregistrer la réponse
    await UserExercise.create({
      userId,
      exerciseId,
      courseId,
      answer: String(answer),
      is_correct,
      answered_at: new Date(),
      point_earned: xpEarned,
      attempt_number: previousAttempts + 1
    });

    // 4. Gérer le streak
    const streakData = await XPService.updateDailyStreak(userId);
    const streakBonus = is_correct ? XPService.calculateStreakBonus(streakData.streak, xpEarned) : 0;
    const totalXP = xpEarned + streakBonus;

    // 5. Ajouter XP si exercice réussi
    if (is_correct) {
      const course = await Course.findByPk(courseId);
      if (course) {
        await XPService.addXPToUser(userId, course.languageId, totalXP);
      }
    }

    // 6. Mettre à jour la progression du cours
    await this.updateCourseProgress(userId, courseId);

    return {
      xpEarned: is_correct ? totalXP : 0,
      streakBonus,
      dailyStreak: streakData.streak,
      is_correct,
      isFirstTry
    };
  }

  // ✅ Mettre à jour la progression du cours (SIMPLE)
  static async updateCourseProgress(userId, courseId) {
    // 1. Compter leçons complétées
    const completedLessons = await UserProgress.count({
      where: {
        userId,
        courseId,
        lessonId: { [Op.ne]: null },
        lesson_completed: true
      }
    });

    // 2. Compter exercices réussis (uniques)
    const completedExercises = await UserExercise.count({
      where: {
        userId,
        courseId,
        is_correct: true
      },
      distinct: true,
      col: 'exerciseId'
    });

    // 3. Calculer progression
    const totalLessons = await Lesson.count({ where: { courseId } });
    const totalExercises = await Exercise.count({ where: { courseId } });

    const lessonProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const exerciseProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

    // 70% leçons, 30% exercices
    const completionRate = Math.round((lessonProgress * 0.7) + (exerciseProgress * 0.3));

    // 4. Mettre à jour UserProgress du cours
    const [progress, created] = await UserProgress.findOrCreate({
      where: { userId, courseId, lessonId: null },
      defaults: {
        userId,
        courseId,
        lessonId: null,
        course_completion_percentage: completionRate,
        started_at: new Date()
      }
    });

    if (!created) {
      // Vérifier si cours vient d'être terminé
      const justCompleted = completionRate === 100 && !progress.completed_at;
      
      await progress.update({
        course_completion_percentage: completionRate,
        completed_at: justCompleted ? new Date() : progress.completed_at,
        last_accessed_at: new Date()
      });

      // Donner bonus pour cours terminé
      if (justCompleted) {
        const course = await Course.findByPk(courseId);
        if (course) {
          const courseXP = XPService.calculateCourseXP(course.level);
          await XPService.addXPToUser(userId, course.languageId, courseXP);
          
          await progress.update({
            course_xp_earned: (progress.course_xp_earned || 0) + courseXP
          });
        }
      }
    }

    return progress;
  }

  // ✅ Récupérer la dernière leçon (SIMPLE)
  static async getCurrentLesson(userId, courseId) {
    // 1. Récupérer toutes les leçons du cours
    const lessons = await Lesson.findAll({
      where: { courseId },
      order: [['position', 'ASC']]
    });

    if (lessons.length === 0) {
      return null;
    }

    // 2. Récupérer les progressions
    const progressRecords = await UserProgress.findAll({
      where: {
        userId,
        courseId,
        lessonId: { [Op.ne]: null }
      }
    });

    // 3. Trouver la première leçon non complétée
    for (const lesson of lessons) {
      const progress = progressRecords.find(p => p.lessonId === lesson.id);
      
      if (!progress || !progress.lesson_completed) {
        return lesson;
      }
    }

    // 4. Si toutes complétées, retourner la dernière
    return lessons[lessons.length - 1];
  }
}