const safeJsonParse = (value, fallback = null) => {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const normalizeArrayToString = (arr) => {
  if (!arr) return '';
  return Array.isArray(arr) ? arr.join(' ').trim().toLowerCase() : normalizeString(arr);
};

export const validateExerciseAnswer = (exercise, answer) => {
  if (!exercise || !exercise.type) {
    return { is_correct: false };
  }

  const type = exercise.type.toLowerCase();

  let correctAnswer = exercise.correct_answer;
  if (typeof correctAnswer === 'string') {
    correctAnswer = safeJsonParse(correctAnswer, correctAnswer);
  }

  if (correctAnswer === null || correctAnswer === undefined) {
    correctAnswer = exercise.correct_answer_value;
    if (typeof correctAnswer === 'string') {
      correctAnswer = safeJsonParse(correctAnswer, correctAnswer);
    }
  }

  switch (type) {
    case 'qcm':
    case 'traduction': {
      const user = normalizeString(answer);
      let correct = '';
      if (correctAnswer) {
        if (typeof correctAnswer === 'object') {
          correct = normalizeString(correctAnswer.answer || correctAnswer.value || JSON.stringify(correctAnswer));
        } else {
          correct = normalizeString(correctAnswer);
        }
      }
      return { is_correct: user === correct };
    }

    case 'drag_drop':
    case 'sentence_builder': {
      const correctArr = correctAnswer
        ? (Array.isArray(correctAnswer)
          ? correctAnswer
          : (correctAnswer?.answer || correctAnswer?.value || []))
        : [];
      const userStr = normalizeArrayToString(answer);
      const correctStr = normalizeArrayToString(correctArr);
      return { is_correct: userStr === correctStr };
    }

    case 'association': {
      const correctObj = correctAnswer
        ? (typeof correctAnswer === 'object'
          ? (correctAnswer.answer || correctAnswer.value || correctAnswer)
          : safeJsonParse(correctAnswer, {}))
        : {};
      const userObj = typeof answer === 'object' ? answer : safeJsonParse(answer, {});
      const correctKeys = Object.keys(correctObj).sort();
      const userKeys = Object.keys(userObj).sort();
      const sameKeys = JSON.stringify(correctKeys) === JSON.stringify(userKeys);
      const allMatch = sameKeys && correctKeys.every((key) => correctObj[key] === userObj[key]);
      return { is_correct: allMatch };
    }

    default:
      return { is_correct: false };
  }
};
