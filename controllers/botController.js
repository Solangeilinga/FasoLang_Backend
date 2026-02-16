import { Configuration, OpenAIApi } from "openai";
import Lesson from "../models/Lesson.js";
import ProverbeContent from "../models/ProverbeContent.js";
import Language from "../models/Language.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const askBot = async (req, res) => {
  try {
    const { message, languageCode } = req.body;

    // Récupérer le contexte pédagogique
    const lessons = await Lesson.findAll({ attributes: ["title", "content"] });
    const proverbes = await ProverbeContent.findAll({
      where: { languageId: await Language.getIdByCode(languageCode) },
      attributes: ["content", "meaning"],
    });

    // Construire le contexte
    let context = "Tu es un assistant pédagogique pour aider les utilisateurs.\n\n";
    context += "Leçons:\n";
    lessons.forEach(l => context += `- ${l.title}: ${l.content}\n`);
    context += "\nProverbes:\n";
    proverbes.forEach(p => context += `- ${p.content} (Signification: ${p.meaning})\n`);

    // Appel à OpenAI
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: context },
        { role: "user", content: message },
      ],
      max_tokens: 300,
    });

    res.json({ reply: response.data.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};