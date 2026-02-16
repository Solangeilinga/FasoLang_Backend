import { Proverbe, ProverbeContent, Language } from "../models/index.js";

// ===============================
// 📚 Liste des proverbes (facultatif filter: languageId, theme)
// ===============================
export const getProverbes = async (req, res) => {
  try {
    const { languageId, theme } = req.query;

    const whereProverbe = {};
    if (theme) whereProverbe.theme = theme;

    const proverbes = await Proverbe.findAll({
      where: whereProverbe,
      include: [
        {
          model: ProverbeContent,
          as: "contents",
          include: [
            { model: Language, as: "language", attributes: ["id", "name"] },
          ],
          where: languageId ? { languageId: Number(languageId) } : undefined,
          required: false, // si languageId absent → retourne tous
        },
      ],
      order: [["id", "ASC"]],
    });

    if (!proverbes || proverbes.length === 0) {
      return res.status(404).json({ message: "Aucun proverbe trouvé" });
    }

    // Format pour RN : on prend le premier content si languageId absent
    const formatted = proverbes.map((p) => {
      let contentObj = p.contents && p.contents[0] ? p.contents[0] : {};
      return {
        id: p.id,
        image: p.image,
        theme: p.theme,
        content: contentObj.content || "",
        audioUrl: contentObj.audioUrl || null,
        meaning: contentObj.meaning || "",
        contents: p.contents.map((c) => ({
          language: c.language?.name,
          content: c.content,
          audioUrl: c.audioUrl,
          meaning: c.meaning,
        })),
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Erreur getProverbes:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

// ===============================
// 📚 Détail d’un proverbe (option languageId)
// ===============================
export const getProverbeById = async (req, res) => {
  try {
    const { proverbeId } = req.params;
    const { languageId } = req.query;

    if (!proverbeId) {
      return res.status(400).json({ error: "proverbeId manquant" });
    }

    const proverbe = await Proverbe.findByPk(proverbeId, {
      include: [
        {
          model: ProverbeContent,
          as: "contents",
          include: [
            { model: Language, as: "language", attributes: ["id", "name"] },
          ],
          where: languageId ? { languageId: Number(languageId) } : undefined,
          required: false,
        },
      ],
    });

    if (!proverbe) {
      return res.status(404).json({ message: "Proverbe introuvable" });
    }

    // choisir le contenu à afficher
    let contentObj = proverbe.contents && proverbe.contents[0] ? proverbe.contents[0] : {};
    res.json({
      id: proverbe.id,
      image: proverbe.image,
      theme: proverbe.theme,
      content: contentObj.content || "",
      audioUrl: contentObj.audioUrl || null,
      meaning: contentObj.meaning || "",
      contents: proverbe.contents.map((c) => ({
        language: c.language?.name,
        content: c.content,
        audioUrl: c.audioUrl,
        meaning: c.meaning,
      })),
    });
  } catch (error) {
    console.error("Erreur getProverbeById:", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};


export const getThemes = async (req, res) => {
  try {
    const themes = await Proverbe.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("theme")), "theme"],
      ],
    });

    res.status(200).json(themes.map(t => t.theme));
  } catch (error) {
    res.status(500).json({ error: "Erreur récupération thèmes" });
  }
};
