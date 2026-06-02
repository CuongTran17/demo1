import assert from 'node:assert/strict';
import { COURSE_CATEGORIES, SEARCH_CATEGORIES } from './courseCategories.js';

const expectedKeys = ['python', 'finance', 'data', 'blockchain', 'accounting', 'marketing'];

assert.deepEqual(
  COURSE_CATEGORIES.map((category) => category.key),
  expectedKeys,
  'course creation categories must match storefront category keys'
);

assert.deepEqual(
  SEARCH_CATEGORIES.map((category) => category.key),
  ['', ...expectedKeys],
  'search categories should include all storefront categories plus the all option'
);

console.log('courseCategories tests passed');
