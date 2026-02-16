const safeJsonParse = (value, fallback = null) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const normalize = (value) =>
  String(value).trim().toLowerCase();

const arrayToString = (value) =>
  Array.isArray(value)
    ? value.join(" ").trim().toLowerCase()
    : normalize(value);

const validateAnswer = (exercise, answer) => {
  const type = exercise.type.toLowerCase();

  switch (type) {
    case "qcm":
    case "traduction":
      return normalize(answer) === normalize(exercise.correct_answer);

    case "drag_drop":
    case "sentence_builder":
    case "glisser-deposer":
    case "construction": {
      const correct =
        safeJsonParse(exercise.correct_answer, []) ||
        exercise.correct_answer.split(" ");
      return arrayToString(answer) === arrayToString(correct);
    }

    case "association": {
      const userObj = safeJsonParse(answer, {});
      const correctObj = safeJsonParse(exercise.correct_answer, {});
      return JSON.stringify(userObj) === JSON.stringify(correctObj);
    }

    default:
      throw new Error(`Type d'exercice non supporté: ${exercise.type}`);
  }
};
