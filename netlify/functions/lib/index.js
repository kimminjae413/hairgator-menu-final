// lib/index.js
// HAIRGATOR Chatbot API 모듈 통합 export

// ==================== 스키마 ====================
const {
  FEMALE_PARAMS_SCHEMA,
  MALE_PARAMS_SCHEMA,
  MALE_STYLE_CATEGORIES,
  FEMALE_LENGTH_CATEGORIES
} = require('./schemas');

// ==================== 유틸리티 ====================
const {
  detectLanguage,
  isSimpleGreeting,
  getGreetingResponse,
  isSecurityQuery,
  getSecurityResponse,
  sanitizeRecipeForPublic,
  normalizeQuery,
  getTerms,
  cosineSimilarity,
  calculateVolumeFromLifting,
  buildSearchQuery,
  getLengthPrefix,
  getMaleStyleCode,
  LENGTH_TO_SERIES,
  MALE_STYLE_TO_CODE
} = require('./utils');

// ==================== Vision 분석 ====================
const {
  analyzeImage,
  analyzeWomanImage,
  analyzeManImage,
  analyzeImageWithQuestion,
  getFemaleVisionPrompt,
  getMaleVisionPrompt
} = require('./vision-analyzer');

// ==================== 임베딩 & 검색 ====================
const {
  generateEmbedding,
  getFirestoreStyles,
  getMenStyles,
  getWomenStyles,
  searchStylesByEmbedding,
  searchFirestoreStyles,
  searchStylesByCode,
  selectBestDiagrams,
  FIREBASE_PROJECT_ID
} = require('./embedding');

// ==================== 여자 레시피 ====================
const {
  generateFemaleRecipe,
  analyzeAndGenerateFemaleRecipe,
  buildFemaleRecipePrompt
} = require('./female-recipe');

// ==================== 남자 레시피 ====================
const {
  generateMaleRecipe,
  analyzeAndGenerateMaleRecipe,
  buildMaleRecipePrompt,
  searchMaleStyleByCode,
  MALE_TERMS
} = require('./male-recipe');

// ==================== 통합 내보내기 ====================
module.exports = {
  // 스키마
  FEMALE_PARAMS_SCHEMA,
  MALE_PARAMS_SCHEMA,
  MALE_STYLE_CATEGORIES,
  FEMALE_LENGTH_CATEGORIES,

  // 유틸리티
  detectLanguage,
  isSimpleGreeting,
  getGreetingResponse,
  isSecurityQuery,
  getSecurityResponse,
  sanitizeRecipeForPublic,
  normalizeQuery,
  getTerms,
  cosineSimilarity,
  calculateVolumeFromLifting,
  buildSearchQuery,
  getLengthPrefix,
  getMaleStyleCode,
  LENGTH_TO_SERIES,
  MALE_STYLE_TO_CODE,

  // Vision 분석
  analyzeImage,
  analyzeWomanImage,
  analyzeManImage,
  analyzeImageWithQuestion,
  getFemaleVisionPrompt,
  getMaleVisionPrompt,

  // 임베딩 & 검색
  generateEmbedding,
  getFirestoreStyles,
  getMenStyles,
  getWomenStyles,
  searchStylesByEmbedding,
  searchFirestoreStyles,
  searchStylesByCode,
  selectBestDiagrams,
  FIREBASE_PROJECT_ID,

  // 여자 레시피
  generateFemaleRecipe,
  analyzeAndGenerateFemaleRecipe,
  buildFemaleRecipePrompt,

  // 남자 레시피
  generateMaleRecipe,
  analyzeAndGenerateMaleRecipe,
  buildMaleRecipePrompt,
  searchMaleStyleByCode,
  MALE_TERMS
};
