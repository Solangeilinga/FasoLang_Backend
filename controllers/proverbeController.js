import { Proverbe, ProverbeContent, Language } from "../models/index.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

// ===============================
// 📚 Liste des proverbes (facultatif filter: languageId, theme)
// ===============================
export const getProverbes = async (req, res) => {
  try {
    const { languageId, theme } = req.query;

    const whereProverbe = {};
    if (theme) whereProverbe.theme = theme;

    // ✅ Construction du filtre pour exclure le français
    const whereContent = {};
    if (languageId) {
      // Si languageId spécifié, utiliser celui-là
      whereContent.languageId = Number(languageId);
    } else {
      // Sinon, exclure le français par défaut
      whereContent.languageId = { [Op.ne]: 1 };
    }

    const proverbes = await Proverbe.findAll({
      where: whereProverbe,
      include: [
        {
          model: ProverbeContent,
          as: "contents",
          where: whereContent, // ✅ Applique le filtre
          required: true, // ✅ Important: ne retourner que les proverbes qui ont du contenu
          include: [
            { model: Language, as: "language", attributes: ["id", "name"] },
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    if (!proverbes || proverbes.length === 0) {
      return res.status(404).json({ 
        message: "Aucun proverbe trouvé",
        hint: "Vérifiez que des proverbes existent dans les langues locales"
      });
    }

    // ✅ Format pour RN : on prend le premier content
    const formatted = proverbes.map((p) => {
      let contentObj = p.contents && p.contents[0] ? p.contents[0] : {};
      return {
        id: p.id,
        image: p.image,
        theme: p.theme,
        content: contentObj.content || "",
        audioUrl: contentObj.audioUrl || null,
        meaning: contentObj.meaning || "",
        languageId: contentObj.languageId || null,
        languageName: contentObj.language?.name || "",
        contents: p.contents.map((c) => ({
          languageId: c.languageId,
          language: c.language?.name,
          content: c.content,
          audioUrl: c.audioUrl,
          meaning: c.meaning,
        })),
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("❌ Erreur getProverbes:", error);
    res.status(500).json({ 
      error: "Erreur interne du serveur",
      details: error.message 
    });
  }
};

// ===============================
// 📚 Détail d'un proverbe (option languageId)
// ===============================
export const getProverbeById = async (req, res) => {
  try {
    const { proverbeId } = req.params;
    const { languageId } = req.query;

    if (!proverbeId) {
      return res.status(400).json({ error: "proverbeId manquant" });
    }

    // ✅ Construction du filtre pour exclure le français
    const whereContent = {};
    if (languageId) {
      whereContent.languageId = Number(languageId);
    } else {
      // Exclure le français par défaut
      whereContent.languageId = { [Op.ne]: 1 };
    }

    const proverbe = await Proverbe.findByPk(proverbeId, {
      include: [
        {
          model: ProverbeContent,
          as: "contents",
          where: whereContent, // ✅ Applique le filtre
          required: true, // ✅ Important
          include: [
            { model: Language, as: "language", attributes: ["id", "name"] },
          ],
        },
      ],
    });

    if (!proverbe) {
      return res.status(404).json({ 
        message: "Proverbe introuvable",
        hint: "Ce proverbe n'existe pas ou n'a pas de contenu dans les langues locales"
      });
    }

    // ✅ Vérifier qu'on a bien du contenu
    if (!proverbe.contents || proverbe.contents.length === 0) {
      return res.status(404).json({ 
        message: "Aucun contenu disponible pour ce proverbe dans les langues locales"
      });
    }

    // ✅ Choisir le contenu à afficher
    let contentObj = proverbe.contents[0];
    
    res.json({
      id: proverbe.id,
      image: proverbe.image,
      theme: proverbe.theme,
      content: contentObj.content || "",
      audioUrl: contentObj.audioUrl || null,
      meaning: contentObj.meaning || "",
      languageId: contentObj.languageId || null,
      languageName: contentObj.language?.name || "",
      contents: proverbe.contents.map((c) => ({
        languageId: c.languageId,
        language: c.language?.name,
        content: c.content,
        audioUrl: c.audioUrl,
        meaning: c.meaning,
      })),
    });
  } catch (error) {
    console.error("❌ Erreur getProverbeById:", error);
    res.status(500).json({ 
      error: "Erreur interne du serveur",
      details: error.message 
    });
  }
};

// ===============================
// 📚 Thèmes disponibles (avec proverbes non-français)
// ===============================
export const getThemes = async (req, res) => {
  try {
    // ✅ Récupérer uniquement les thèmes qui ont des proverbes en langues locales
    const themes = await Proverbe.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("Proverbe.theme")), "theme"],
      ],
      include: [
        {
          model: ProverbeContent,
          as: "contents",
          where: { languageId: { [Op.ne]: 1 } }, // ✅ Exclure français
          attributes: [], // Pas besoin des attributs, juste pour le filtre
          required: true, // ✅ Important
        },
      ],
      raw: true,
    });

    const themeList = themes
      .map(t => t.theme)
      .filter(t => t && t.trim() !== ""); // Filtrer les thèmes vides

    res.status(200).json(themeList);
  } catch (error) {
    console.error("❌ Erreur getThemes:", error);
    res.status(500).json({ 
      error: "Erreur récupération thèmes",
      details: error.message 
    });
  }
};

// ===============================
// 📚 BONUS: Proverbe aléatoire (sans français)
// ===============================
export const getRandomProverbe = async (req, res) => {
  try {
    const { languageId } = req.query;

    // ✅ Filtre pour exclure le français
    const whereContent = languageId 
      ? { languageId: Number(languageId) }
      : { languageId: { [Op.ne]: 1 } };

    const proverbes = await Proverbe.findAll({
      include: [
        {
          model: ProverbeContent,
          as: "contents",
          where: whereContent,
          required: true,
          include: [
            { model: Language, as: "language", attributes: ["id", "name"] },
          ],
        },
      ],
    });

    if (!proverbes || proverbes.length === 0) {
      return res.status(404).json({ 
        message: "Aucun proverbe disponible"
      });
    }

    // ✅ Sélectionner un proverbe aléatoire
    const randomIndex = Math.floor(Math.random() * proverbes.length);
    const randomProverbe = proverbes[randomIndex];
    const contentObj = randomProverbe.contents[0];

    res.json({
      id: randomProverbe.id,
      image: randomProverbe.image,
      theme: randomProverbe.theme,
      content: contentObj.content || "",
      audioUrl: contentObj.audioUrl || null,
      meaning: contentObj.meaning || "",
      languageId: contentObj.languageId || null,
      languageName: contentObj.language?.name || "",
    });
  } catch (error) {
    console.error("❌ Erreur getRandomProverbe:", error);
    res.status(500).json({ 
      error: "Erreur interne du serveur",
      details: error.message 
    });
  }
};