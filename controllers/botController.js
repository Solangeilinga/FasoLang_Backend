import OpenAI from "openai";
import Lesson from "../models/Lesson.js";
import ProverbeContent from "../models/ProverbeContent.js";
import Language from "../models/Language.js";

// ✅ SDK OpenAI v4 (ancienne API Configuration/OpenAIApi supprimée en v4)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const askBot = async (req, res) => {
  try {
    const { message, languageCode } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message requis." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "Service bot non configuré." });
    }

    // ✅ Correction : récupérer la langue par son code via Sequelize (pas de méthode statique)
    let languageId = null;
    if (languageCode) {
      const language = await Language.findOne({ where: { code: languageCode } });
      languageId = language?.id || null;
    }

    // Récupérer le contexte pédagogique
    const lessons = await Lesson.findAll({
      attributes: ["title"],
      where: { isPublished: true },
      limit: 20, // ✅ Limiter pour éviter un contexte trop grand
    });

    const proverbes = languageId
      ? await ProverbeContent.findAll({
          where: { languageId },
          attributes: ["content", "meaning"],
          limit: 10,
        })
      : [];

    // Construire le contexte système
    let systemPrompt = "Tu es FasoBot, un assistant pédagogique pour l'application FasoLang, qui aide les utilisateurs à apprendre les langues du Burkina Faso (Mooré, Dioula, Fulfuldé). Réponds en français, de façon concise et encourageante.\n\n";

    if (lessons.length > 0) {
      systemPrompt += "Leçons disponibles :\n";
      lessons.forEach(l => (systemPrompt += `- ${l.title}\n`));
    }

    if (proverbes.length > 0) {
      systemPrompt += "\nProverbes :\n";
      proverbes.forEach(p => (systemPrompt += `- ${p.content} (Signification: ${p.meaning})\n`));
    }

    // ✅ Appel avec la SDK OpenAI v4
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // gpt-3.5-turbo moins coûteux que gpt-4
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 300,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: "Réponse vide du modèle." });
    }

    res.json({ reply });

  } catch (err) {
    console.error("❌ Erreur botController:", err?.message || err);
    res.status(500).json({ error: "Erreur serveur du bot." });
  }
};