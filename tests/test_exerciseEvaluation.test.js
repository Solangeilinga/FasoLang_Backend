import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExerciseAnswer } from '../utils/exerciseEvaluation.js';

test('valide une réponse QCM/traduction correctement', () => {
  const exercise = {
    type: 'qcm',
    correct_answer: 'bonjour'
  };

  assert.equal(validateExerciseAnswer(exercise, 'Bonjour').is_correct, true);
  assert.equal(validateExerciseAnswer(exercise, 'salut').is_correct, false);
});

test('valide une réponse drag/drop en normalisant les tableaux', () => {
  const exercise = {
    type: 'drag_drop',
    correct_answer: ['bonjour', 'monde']
  };

  assert.equal(validateExerciseAnswer(exercise, ['Bonjour', 'Monde']).is_correct, true);
  assert.equal(validateExerciseAnswer(exercise, ['salut']).is_correct, false);
});
