import sequelize from "./config/db.js";
import { Language, Course, Lesson, LessonContent } from "./models/index.js";

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    // Utilisation de alter: true pour mettre à jour la structure sans supprimer les données
    await sequelize.sync({ alter: true });
    console.log("✅ Connexion à PostgreSQL réussie.");

    // 1. Initialisation des Langues
    const [frLang] = await Language.findOrCreate({
      where: { code: "fr" },
      defaults: { name: "Français", isActive: true, order: 0 }
    });

    const [mooreLang] = await Language.findOrCreate({
      where: { code: "mos" },
      defaults: { name: "Mooré", isActive: true, order: 1 }
    });

    // 2. Création du Cours Global
    const [course] = await Course.findOrCreate({
      where: { title: "Maîtriser le Mooré de A à Z" },
      defaults: {
        languageId: mooreLang.id,
        description: "Un parcours complet couvrant les nombres, la famille, le corps humain et les expressions courantes.",
        level: "beginner",
        isPublished: true,
        order: 1
      }
    });

    // 3. Organisation des données en Leçons thématiques
    const lessonsData = [
      {
        title: "Les Nombres et le Comptage",
        position: 1,
        items: [
          { f: "0", m: "Zaalem" }, { f: "1", m: "Ye / Yemelé" }, { f: "2", m: "Ibo / Yiibu" },
          { f: "3", m: "Taabo" }, { f: "4", m: "Naassé" }, { f: "5", m: "Nu" },
          { f: "10", m: "Piiga" }, { f: "20", m: "Kissi / Pisi" }, { f: "100", m: "Pabra" }
        ]
      },
      {
        title: "Ma Famille et mes Proches",
        position: 2,
        items: [
          { f: "Maman", m: "m'ma" }, { f: "Papa / Père", m: "m'baba / m'ba" },
          { f: "Grand-père", m: "yaab-raogo" }, { f: "Grand-mère", m: "yaab-poaka" },
          { f: "Mari", m: "m'sida" }, { f: "Femme", m: "m'paga" },
          { f: "Enfant", m: "biga" }, { f: "Bébé", m: "bi-pèlga" }
        ]
      },
      {
        title: "Le Corps Humain",
        position: 3,
        items: [
          { f: "Le corps", m: "Yinga" }, { f: "Tête", m: "zugu / zutu" },
          { f: "Bouche", m: "noore / noyã" }, { f: "Cœur", m: "sũuri / sũi yã" },
          { f: "Main", m: "nugu / nusi" }, { f: "Pied", m: "naoore / nao" },
          { f: "Œil", m: "nifu / nini" }, { f: "Nez", m: "yõore / yõyã" }
        ]
      },
      {
        title: "Le Temps et les Jours",
        position: 4,
        items: [
          { f: "Lundi", m: "tènè" }, { f: "Mardi", m: "tallata" }, { f: "Mercredi", m: "arabata" },
          { f: "Jeudi", m: "lamoussa" }, { f: "Vendredi", m: "ajouma" }, { f: "Samedi", m: "sibiri" },
          { f: "Dimanche", m: "ato" }
        ]
      },
      {
        title: "Salutations et Vie Quotidienne",
        position: 5,
        items: [
          { f: "Salut à vous (matin)", m: "Ney Yibéogo" }, { f: "Merci", m: "barka" },
          { f: "Comment ça va ?", m: "Vibéog kibaré ?" }, { f: "Il n'y a pas de problème", m: "Yél kayé" },
          { f: "Au revoir", m: "Yindare / Nindare" }, { f: "À bientôt", m: "Bilfu" }
        ]
      },
      {
        title: "Dictionnaire des Actions (A-Z)",
        position: 6,
        items: [
          { f: "Accepter", m: "n rege / n saké" }, { f: "Acheter", m: "n da" },
          { f: "Aider", m: "Songe" }, { f: "Aimer", m: "Nongë" },
          { f: "Aller", m: "Kênge" }, { f: "Apporter", m: "Tall n wa" }
        ]
      }
    ];

    // 4. Boucle d'insertion massive
    // ... (début du script inchangé)

for (const lessonData of lessonsData) {
  const [lesson] = await Lesson.findOrCreate({
    where: { title: lessonData.title, courseId: course.id },
    defaults: { position: lessonData.position, isPublished: true }
  });

  console.log(`📖 Préparation de la leçon : ${lessonData.title}`);

  // On prépare le texte global pour la leçon
  const fullFrenchContent = lessonData.items.map(item => item.f).join("\n");
  const fullMooreContent = lessonData.items.map(item => item.m).join("\n");

  // On utilise upsert (update or insert) pour éviter la violation de contrainte unique
  await LessonContent.upsert({
    lessonId: lesson.id,
    languageId: frLang.id,
    content: fullFrenchContent
  });

  await LessonContent.upsert({
    lessonId: lesson.id,
    languageId: mooreLang.id,
    content: fullMooreContent
  });
}

// ... (reste du script)

    console.log("✅ Base de données peuplée avec succès !");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur pendant le seed :", error);
    process.exit(1);
  }
};

seedDatabase();