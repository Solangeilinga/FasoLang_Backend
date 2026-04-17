// utils/xpService.js
import { User, UserRanking } from '../models/index.js';

export class XPService {
  // ✅ RÈGLES XP SIMPLIFIÉES (sans limites)
  static XP_RULES = {
    // XP de base
    LESSON_COMPLETED: 10,           // +10 XP par leçon complétée
    EXERCISE_CORRECT: 15,           // +15 XP par exercice réussi
    EXERCISE_FIRST_TRY_BONUS: 5,    // +5 XP bonus pour première tentative réussie
    COURSE_COMPLETED: 50,           // +50 XP pour cours terminé
    
    // Bonus de streak (sans limite)
    STREAK_BONUS_MULTIPLIER: 0.1,   // +10% d'XP après 7 jours de streak
    
    // Niveaux utilisateur (progression exponentielle douce)
    BASE_XP_PER_LEVEL: 100,
    LEVEL_MULTIPLIER: 1.5
  };

  // ✅ Calculer XP pour une leçon
  static calculateLessonXP(timeSpent = 0, completionPercentage = 100) {
    const baseXP = this.XP_RULES.LESSON_COMPLETED;
    
    // Bonus pour rapidité (si moins de 5 minutes)
    const timeBonus = timeSpent < 300 ? 5 : 0;
    
    // Bonus pour perfection (100%)
    const perfectionBonus = completionPercentage === 100 ? 5 : 0;
    
    return baseXP + timeBonus + perfectionBonus;
  }

  // ✅ Calculer XP pour un exercice
  static calculateExerciseXP(isCorrect, isFirstTry = false, difficulty = 'normal') {
    if (!isCorrect) return 0;
    
    let xp = this.XP_RULES.EXERCISE_CORRECT;
    
    // Bonus difficulté
    const difficultyMultipliers = {
      easy: 1,
      normal: 1.2,
      hard: 1.5
    };
    
    xp *= difficultyMultipliers[difficulty] || 1;
    
    // Bonus première tentative
    if (isFirstTry) {
      xp += this.XP_RULES.EXERCISE_FIRST_TRY_BONUS;
    }
    
    return Math.round(xp);
  }

  // ✅ Calculer XP pour un cours terminé
  static calculateCourseXP(courseLevel = 'débutant', totalTime = 0) {
    const baseXP = this.XP_RULES.COURSE_COMPLETED;
    
    // Multiplicateur par niveau
    const levelMultipliers = {
      'débutant': 1,
      'intermédiaire': 1.5,
      'avancé': 2
    };
    
    let xp = baseXP * (levelMultipliers[courseLevel] || 1);
    
    // Bonus pour temps investi (1 XP par 10 minutes)
    const timeBonus = Math.floor(totalTime / 600); // 10 minutes = 600 secondes
    xp += timeBonus;
    
    return Math.round(xp);
  }

  // ✅ Calculer bonus de streak (CORRIGÉ)
  static calculateStreakBonus(streakDays, baseXP = 0) {
    if (streakDays < 3 || baseXP <= 0) return 0;
    
    // Après 3 jours: +5% par jour supplémentaire (sans limite)
    const extraDays = streakDays - 3;
    const bonusMultiplier = 1 + (extraDays * 0.05); // +5% par jour
    
    const bonusXP = Math.round(baseXP * bonusMultiplier) - baseXP;
    return Math.max(0, bonusXP);
  }

  // ✅ Mettre à jour le streak utilisateur (CORRIGÉ)
  static async updateDailyStreak(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) return { streak: 0, bonus: 0 };

      const now = new Date();
      const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
      
      let streak = user.dailyStreak || 0;

      if (!lastActivity) {
        // Premier jour
        streak = 1;
      } else {
        const diffDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Déjà actif aujourd'hui - streak inchangé
          streak = streak;
        } else if (diffDays === 1) {
          // Jour consécutif
          streak += 1;
        } else {
          // Rupture de streak (plus d'un jour d'écart)
          streak = 1;
        }
      }

      // Mettre à jour l'utilisateur
      await user.update({
        dailyStreak: streak,
        lastActivity: now
      });

      return { 
        streak, 
        bonus: 0 // Le bonus est calculé séparément avec calculateStreakBonus
      };

    } catch (error) {
      console.error("❌ Erreur updateDailyStreak:", error);
      return { streak: 0, bonus: 0 };
    }
  }

  // ✅ Ajouter XP à l'utilisateur (sans limite)
  static async addXPToUser(userId, languageId, xpAmount) {
    try {
      if (xpAmount <= 0) return 0;

      // Mettre à jour le classement
      const [ranking, created] = await UserRanking.findOrCreate({
        where: { userId, languageId },
        defaults: {
          userId,
          languageId,
          total_score: xpAmount,
          rank_position: 999
        }
      });

      if (!created) {
        ranking.total_score += xpAmount;
        await ranking.save();
      }

      // Mettre à jour le classement global
      await this.updateRankings(languageId);

      return ranking.total_score;

    } catch (error) {
      console.error("❌ Erreur addXPToUser:", error);
      return 0;
    }
  }

  // ✅ Calculer le niveau utilisateur
  static calculateLevel(totalXP) {
    if (totalXP <= 0) return 1;
    
    let level = 1;
    let xpNeeded = this.XP_RULES.BASE_XP_PER_LEVEL;
    let accumulatedXP = 0;
    
    while (totalXP >= xpNeeded) {
      totalXP -= xpNeeded;
      level++;
      accumulatedXP += xpNeeded;
      xpNeeded = Math.round(xpNeeded * this.XP_RULES.LEVEL_MULTIPLIER);
    }
    
    return level;
  }

  // ✅ XP nécessaire pour le prochain niveau
  static xpToNextLevel(totalXP) {
    let level = 1;
    let xpNeeded = this.XP_RULES.BASE_XP_PER_LEVEL;
    
    while (totalXP >= xpNeeded) {
      totalXP -= xpNeeded;
      level++;
      xpNeeded = Math.round(xpNeeded * this.XP_RULES.LEVEL_MULTIPLIER);
    }
    
    return xpNeeded;
  }

  // ✅ Pourcentage de progression vers le prochain niveau
  static levelProgressPercentage(totalXP) {
    const currentLevel = this.calculateLevel(totalXP);
    const xpForCurrentLevel = this.xpForLevel(currentLevel);
    const xpForNextLevel = this.xpForLevel(currentLevel + 1);
    
    const xpInCurrentLevel = totalXP - xpForCurrentLevel;
    const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
    
    return Math.round((xpInCurrentLevel / xpNeededForNext) * 100);
  }

  // ✅ XP nécessaire pour un niveau spécifique
  static xpForLevel(targetLevel) {
    let xpNeeded = 0;
    let xpForLevel = this.XP_RULES.BASE_XP_PER_LEVEL;
    
    for (let level = 1; level < targetLevel; level++) {
      xpNeeded += xpForLevel;
      xpForLevel = Math.round(xpForLevel * this.XP_RULES.LEVEL_MULTIPLIER);
    }
    
    return xpNeeded;
  }

  // ✅ Mettre à jour les classements — sans N+1 queries
  static async updateRankings(languageId) {
    try {
      const rankings = await UserRanking.findAll({
        where: { languageId },
        order: [['total_score', 'DESC']]
      });

      // ✅ Mise à jour en parallèle avec Promise.all au lieu de boucle séquentielle
      await Promise.all(
        rankings.map((ranking, index) =>
          ranking.update({ rank_position: index + 1 }, { silent: true })
        )
      );

      return rankings;

    } catch (error) {
      console.error("❌ Erreur updateRankings:", error);
      return [];
    }
  }

  // ✅ Fonction utilitaire : Formater l'XP
  static formatXP(xp) {
    if (xp >= 1000000) {
      return (xp / 1000000).toFixed(1) + 'M';
    } else if (xp >= 1000) {
      return (xp / 1000).toFixed(1) + 'K';
    }
    return xp.toString();
  }

  // ✅ Vérifier si l'utilisateur a gagné un nouveau niveau
  static async checkLevelUp(userId, languageId, previousXP, newXP) {
    const previousLevel = this.calculateLevel(previousXP);
    const newLevel = this.calculateLevel(newXP);
    
    if (newLevel > previousLevel) {
      // Niveau augmenté !
      return {
        leveledUp: true,
        previousLevel,
        newLevel,
        levelsGained: newLevel - previousLevel
      };
    }
    
    return { leveledUp: false };
  }
}