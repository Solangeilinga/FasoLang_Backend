export const checkAnswer = (exercise, userAnswer) => {
  switch (exercise.type) {

    case "association":
    case "drag_drop":
      return JSON.stringify(userAnswer) ===
             JSON.stringify(exercise.correct_answer);

    case "sentence_builder":
      return userAnswer.trim().toLowerCase() ===
             exercise.correct_answer.trim().toLowerCase();

    default:
      return false;
  }
};
