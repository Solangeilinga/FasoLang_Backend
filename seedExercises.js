import sequelize from "./config/db.js";
import { Lesson, Exercise, Course } from "./models/index.js";

const seedExercises = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion réussie pour la génération des exercices.");

    const course = await Course.findOne({ where: { title: "Maîtriser le Mooré de A à Z" } });
    if (!course) throw new Error("Cours non trouvé. Lancez d'abord le seed des leçons.");

    // Récupération des leçons pour lier les exercices
    const lessonNumbers = await Lesson.findOne({ where: { title: "Les Nombres et le Comptage" } });
    const lessonFamily = await Lesson.findOne({ where: { title: "Ma Famille et mes Proches" } });
    const lessonBody = await Lesson.findOne({ where: { title: "Le Corps Humain" } });
    const lessonSalutations = await Lesson.findOne({ where: { title: "Salutations et Vie Quotidienne" } });

    const exercises = [
      // --- LEÇON 1 : LES NOMBRES ---
      {
        courseId: course.id,
        lessonId: lessonNumbers.id,
        type: "qcm",
        question: "Comment dit-on '1' en Mooré ?",
        content: { options: ["Ye", "Ibo", "Taabo", "Nu"] },
        correct_answer: "Ye",
        position: 1, xp: 10
      },
      {
        courseId: course.id,
        lessonId: lessonNumbers.id,
        type: "traduction",
        question: "Que signifie 'Piiga' ?",
        content: { hint: "C'est une dizaine" },
        correct_answer: "10",
        position: 2, xp: 15
      },
      {
        courseId: course.id,
        lessonId: lessonNumbers.id,
        type: "association",
        question: "Associez les chiffres à leur nom en Mooré",
        content: { 
          pairs: { "0": "Zaalem", "2": "Ibo", "4": "Naassé", "100": "Pabra" } 
        },
        correct_answer: { "0": "Zaalem", "2": "Ibo", "4": "Naassé", "100": "Pabra" },
        position: 3, xp: 20
      },

      // --- LEÇON 2 : LA FAMILLE ---
      {
        courseId: course.id,
        lessonId: lessonFamily.id,
        type: "qcm",
        question: "Qui est le 'Yaab-raogo' ?",
        content: { options: ["Le père", "Le grand-père", "L'oncle", "Le mari"] },
        correct_answer: "Le grand-père",
        position: 1, xp: 10
      },
      {
        courseId: course.id,
        lessonId: lessonFamily.id,
        type: "traduction",
        question: "Comment dit-on 'Ma maman' ?",
        content: { hint: "Commence par m'" },
        correct_answer: "m'ma",
        position: 2, xp: 15
      },

      // --- LEÇON 3 : LE CORPS HUMAIN ---
      {
        courseId: course.id,
        lessonId: lessonBody.id,
        type: "qcm",
        question: "Que signifie 'Zugu' ?",
        content: { options: ["Le pied", "Le bras", "La tête", "Le coeur"] },
        correct_answer: "La tête",
        position: 1, xp: 10
      },
      {
        courseId: course.id,
        lessonId: lessonBody.id,
        type: "association",
        question: "Reliez les parties du corps",
        content: { 
          pairs: { "Main": "Nugu", "Pied": "Naoore", "Oeil": "Nifu", "Nez": "Yõore" } 
        },
        correct_answer: { "Main": "Nugu", "Pied": "Naoore", "Oeil": "Nifu", "Nez": "Yõore" },
        position: 2, xp: 20
      },

      // --- LEÇON 5 : SALUTATIONS ---
      {
        courseId: course.id,
        lessonId: lessonSalutations.id,
        type: "traduction",
        question: "Comment répond-on à 'Vibéog kibaré ?' (Comment ça va ?)",
        content: { hint: "Signifie 'La santé seulement'" },
        correct_answer: "Laafi bala",
        position: 1, xp: 15
      },
      {
        courseId: course.id,
        lessonId: lessonSalutations.id,
        type: "qcm",
        question: "Que dit-on pour dire 'Merci' ?",
        content: { options: ["Bilfu", "Barka", "Yindare", "Ato"] },
        correct_answer: "Barka",
        position: 2, xp: 10
      }
    ];

    for (const exData of exercises) {
      await Exercise.findOrCreate({
        where: { question: exData.question, lessonId: exData.lessonId },
        defaults: exData
      });
    }

    console.log(`✅ ${exercises.length} exercices ont été générés avec succès !`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur pendant le seed des exercices :", error);
    process.exit(1);
  }
};

seedExercises();