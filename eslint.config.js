import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

// 브라우저 전역 변수 (HTML에서 script로 로드되는 것들)
const browserGlobals = {
  // Firebase
  firebase: 'readonly',
  db: 'readonly',
  storage: 'readonly',

  // i18n
  t: 'readonly',
  HAIRGATOR_I18N: 'readonly',
  updateAllTexts: 'readonly',

  // 앱 전역 함수/객체
  DeviceDetection: 'readonly',
  FirebaseBridge: 'readonly',
  BullnabiBridge: 'readonly',
  currentDesigner: 'writable',

  // 메뉴/UI 함수 (menu.js, main.js, index.html에서 정의)
  openStyleModal: 'readonly',
  closeStyleModal: 'readonly',
  closeHairTryResult: 'readonly',
  showPage: 'readonly',
  showToast: 'readonly',
  auth: 'readonly',
  openPricingModal: 'readonly',
  showUpgradeModal: 'readonly',
  setLanguage: 'readonly',
  loadLanguage: 'readonly',
  clearInquiryImage: 'readonly',
  applyProfileImage: 'readonly',
  applyPlanBasedDisabledState: 'readonly',
  applyCustomBrand: 'readonly',
  updateUserInfo: 'readonly',
  translateDescription: 'readonly',
  switchInputMode: 'readonly',
  startAnalysis: 'readonly',
  setupSidebar: 'readonly',
  selectPlanAndPay: 'readonly',
  openPaymentModal: 'readonly',
  loadBrandFromFirebase: 'readonly',
  lastHairRecommendations: 'writable',
  closeNewInquiryModal: 'readonly',
  calculate42FormulaScore: 'readonly',
  Camera: 'readonly',
  uidDoc: 'writable',

  // 포트원 결제
  PortOne: 'readonly',

  // 퍼스널 컬러 데이터
  HAIR_COLOR_614_DATA: 'readonly',

  // MediaPipe (추가)
  FaceMesh: 'readonly',

  // MediaPipe
  FaceLandmarker: 'readonly',
  FilesetResolver: 'readonly',
  DrawingUtils: 'readonly',

  // Chart.js
  Chart: 'readonly',

  // html2canvas
  html2canvas: 'readonly',

  // Universal module pattern (typeof check로 보호됨)
  module: 'readonly',
}

export default defineConfig([
  // 무시할 폴더
  globalIgnores(['dist', 'node_modules', '.netlify']),

  // 브라우저 JS 파일 (js/, style-match/, personal-color/ 등)
  {
    files: ['**/*.js'],
    ignores: ['netlify/**/*.js', 'scripts/**/*.js', 'update-version.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...browserGlobals,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['warn', {  // error → warn (HTML onclick에서 호출되는 함수들)
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',  // 불필요한 이스케이프 경고만
      'no-case-declarations': 'warn',  // switch case 선언 경고만
      'no-misleading-character-class': 'warn',  // 정규식 경고만
    },
  },

  // Node.js 파일 (Netlify Functions, scripts)
  {
    files: ['netlify/**/*.js', 'scripts/**/*.js', 'update-version.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,  // process, require, module, exports, __dirname 등
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'commonjs',
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
    },
  },
])
