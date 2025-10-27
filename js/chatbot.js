// js/chatbot.js - HAIRGATOR v2.0
// 89용어 통합 + 새 레시피 포맷(###1~###7) + 스트리밍 지원
// ✅ TypeError 버그 수정 완료
// ✅ Cut Form O/G/L 3개만 (Combination 제거)
// ✅ Volume 엄격한 기준 (Low: 0~44°, Medium: 45~89°, High: 90°~)
// ✅ Touch Event passive listener 추가
// ✅ undefined 버그 수정 (505번째, 524번째 줄 fallback 추가)
// ✅ 모바일 언어 변경 버그 수정 완료 ← 🆕 추가!

class HairGatorChatbot {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.supabaseUrl = 'https://bhsbwbeisqzgipvzpvym.supabase.co';
    this.isOpen = false;
    this.conversationHistory = [];
    
    // ✅ localStorage에서 저장된 언어 불러오기
    this.currentLanguage = localStorage.getItem('hairgator_chatbot_lang') || 'ko';
    console.log(`🌍 챗봇 초기 언어: ${this.currentLanguage}`);
    
    this.terms89Map = this.init89TermsMap(); // 89용어 매핑
    this.init();
  }

  // 89용어 매핑 테이블 (하이라이팅용)
  init89TermsMap() {
    return {
      '01': { ko: '1 Section & 2 Section', en: '1 Section & 2 Section' },
      '02': { ko: '1Way & 2Way Cut', en: '1Way Cut & 2Way Cut' },
      '03': { ko: '2 Section', en: '2 Section' },
      '04': { ko: '210 Degree Panel Control', en: '210 Degree Panel Control' },
      '05': { ko: 'A Zone & V Zone', en: 'A Zone & V Zone' },
      '06': { ko: 'Angle', en: 'Angle' },
      '07': { ko: 'Asymmetry', en: 'Asymmetry' },
      '08': { ko: 'Bais Cut', en: 'Bais Cut' },
      '09': { ko: 'Balance', en: 'Balance' },
      '10': { ko: 'Base', en: 'Base' },
      '11': { ko: 'Base Control', en: 'Base Control' },
      '12': { ko: 'Base Line', en: 'Base Line' },
      '13': { ko: 'Base Position', en: 'Base Position' },
      '14': { ko: 'Bevel', en: 'Bevel' },
      '15': { ko: 'Bevel Off', en: 'Bevel Off' },
      '16': { ko: 'Block Cut', en: 'Block Cut' },
      '17': { ko: 'Blocking', en: 'Blocking' },
      '18': { ko: 'Blow Dry', en: 'Blow Dry' },
      '19': { ko: 'Blunt Cut', en: 'Blunt Cut' },
      '20': { ko: 'Brick Cut', en: 'Brick Cut' },
      '21': { ko: 'C Curveture', en: 'C Curveture' },
      '22': { ko: 'Channel Cut', en: 'Channel Cut' },
      '23': { ko: 'Clipper Cut', en: 'Clipper Cut' },
      '24': { ko: 'Clipper Over Comb', en: 'Clipper Over Comb' },
      '25': { ko: 'Convex Line & Concave Line', en: 'Convex Line & Concave Line' },
      '26': { ko: 'Corner Off', en: 'Corner Off' },
      '27': { ko: 'Cowlick Parting', en: 'Cowlick Parting' },
      '28': { ko: 'Curved Shape', en: 'Curved Shape' },
      '29': { ko: 'Cut Form', en: 'Cut Form' },
      '30': { ko: 'Degree', en: 'Degree' },
      '31': { ko: 'Design Line', en: 'Design Line' },
      '32': { ko: 'Diffuser', en: 'Diffuser' },
      '33': { ko: 'Direction', en: 'Direction' },
      '34': { ko: 'Disconnection', en: 'Disconnection' },
      '35': { ko: 'Distribution', en: 'Distribution' },
      '36': { ko: 'Elevation', en: 'Elevation' },
      '37': { ko: 'Face Line', en: 'Face Line' },
      '38': { ko: 'Face Shape', en: 'Face Shape' },
      '39': { ko: "Finger's Angle", en: "Finger's Angle" },
      '40': { ko: 'Form', en: 'Form' },
      '41': { ko: 'Freehands Cut', en: 'Freehands Cut' },
      '42': { ko: 'Fringe', en: 'Fringe' },
      '43': { ko: 'Geometric Shape', en: 'Geometric Shape' },
      '44': { ko: 'Graduation', en: 'Graduation' },
      '45': { ko: 'Graduation & Layer', en: 'Graduation & Layer' },
      '46': { ko: 'Hairstyle Classification', en: 'Hairstyle Classification' },
      '47': { ko: 'Head Point', en: 'Head Point' },
      '48': { ko: 'Head Position', en: 'Head Position' },
      '49': { ko: 'Hemline', en: 'Hemline' },
      '50': { ko: 'Image Cycle On & On', en: 'Image Cycle On & On' },
      '51': { ko: 'Inner Length', en: 'Inner Length' },
      '52': { ko: 'Layer', en: 'Layer' },
      '53': { ko: 'Layer & Weight', en: 'Layer & Weight' },
      '54': { ko: 'Lifting', en: 'Lifting' },
      '55': { ko: 'Natural Inversion', en: 'Natural Inversion' },
      '56': { ko: 'Natural Parting', en: 'Natural Parting' },
      '57': { ko: 'Occipital Bone', en: 'Occipital Bone' },
      '58': { ko: 'One Finger Projection', en: 'One Finger Projection' },
      '59': { ko: 'One Length', en: 'One Length' },
      '60': { ko: 'Outline Long Form', en: 'Outline Long Form' },
      '61': { ko: 'Outline Medium Form', en: 'Outline Medium Form' },
      '62': { ko: 'Over Direction', en: 'Over Direction' },
      '63': { ko: 'Panel', en: 'Panel' },
      '64': { ko: 'Perimeter Line', en: 'Perimeter Line' },
      '65': { ko: 'Personalizing', en: 'Personalizing' },
      '66': { ko: 'Proportion', en: 'Proportion' },
      '67': { ko: 'Recession Area', en: 'Recession Area' },
      '68': { ko: 'Recession Type', en: 'Recession Type' },
      '69': { ko: 'Scissor Over Comb', en: 'Scissor Over Comb' },
      '70': { ko: 'Section', en: 'Section' },
      '71': { ko: 'Section Application', en: 'Section Application' },
      '72': { ko: 'Section Control', en: 'Section Control' },
      '73': { ko: 'Section Off', en: 'Section Off' },
      '74': { ko: 'Separation', en: 'Separation' },
      '75': { ko: 'Silhouette', en: 'Silhouette' },
      '76': { ko: 'Skull Structure', en: 'Skull Structure' },
      '77': { ko: 'Style Form', en: 'Style Form' },
      '78': { ko: 'Subsequent Section', en: 'Subsequent Section' },
      '79': { ko: 'Symmetry', en: 'Symmetry' },
      '80': { ko: 'Temple Area', en: 'Temple Area' },
      '81': { ko: 'Texturizing', en: 'Texturizing' },
      '82': { ko: 'Texturizing Zone', en: 'Texturizing Zone' },
      '83': { ko: 'Trimming', en: 'Trimming' },
      '84': { ko: 'Under Cut', en: 'Under Cut' },
      '85': { ko: 'Visual Balance', en: 'Visual Balance' },
      '86': { ko: 'Volume', en: 'Volume' },
      '87': { ko: 'Volume Location by Section', en: 'Volume Location by Section' },
      '88': { ko: 'Weight Sit Area', en: 'Weight Sit Area' },
      '89': { ko: 'Zone', en: 'Zone' }
    };
  }

  init() {
    this.createChatbotUI();
    this.attachEventListeners();
    this.initKeyboardHandler();
  }

  // 다국어 텍스트
  getTexts() {
    const texts = {
      ko: {
        title: '✂️ AI 커트 레시피',
        welcome: '헤어스타일 이미지를 업로드하거나 질문해주세요',
        analyzing: '📊 이미지 분석 중...',
        generating: '✂️ 커트 레시피 생성 중...',
        placeholder: '헤어스타일 검색...',
        indexTitle: '📑 색인',
        errorSize: '⚠️ 이미지 크기는 5MB 이하여야 합니다.',
        errorType: '⚠️ 이미지 파일만 업로드 가능합니다.'
      },
      en: {
        title: '✂️ AI Cut Recipe',
        welcome: 'Upload a hairstyle image or ask a question',
        analyzing: '📊 Analyzing image...',
        generating: '✂️ Generating cut recipe...',
        placeholder: 'Search hairstyle...',
        indexTitle: '📑 Index',
        errorSize: '⚠️ Image size must be under 5MB.',
        errorType: '⚠️ Only image files are allowed.'
      },
      ja: {
        title: '✂️ AIカットレシピ',
        welcome: 'ヘアスタイル画像をアップロードするか質問してください',
        analyzing: '📊 画像分析中...',
        generating: '✂️ カットレシピ生成中...',
        placeholder: 'ヘアスタイル検索...',
        indexTitle: '📑 索引',
        errorSize: '⚠️ 画像サイズは5MB以下である必要があります。',
        errorType: '⚠️ 画像ファイルのみアップロード可能です。'
      },
      zh: {
        title: '✂️ AI剪发配方',
        welcome: '上传发型图片或提问',
        analyzing: '📊 正在分析图片...',
        generating: '✂️ 正在生成剪发配方...',
        placeholder: '搜索发型...',
        indexTitle: '📑 索引',
        errorSize: '⚠️ 图片大小必须小于5MB。',
        errorType: '⚠️ 仅允许上传图片文件。'
      },
      vi: {
        title: '✂️ Công Thức Cắt Tóc AI',
        welcome: 'Tải lên hình ảnh kiểu tóc hoặc đặt câu hỏi',
        analyzing: '📊 Đang phân tích hình ảnh...',
        generating: '✂️ Đang tạo công thức cắt...',
        placeholder: 'Tìm kiếm kiểu tóc...',
        indexTitle: '📑 Mục lục',
        errorSize: '⚠️ Kích thước hình ảnh phải dưới 5MB.',
        errorType: '⚠️ Chỉ cho phép tải lên tệp hình ảnh.'
      }
    };
    return texts[this.currentLanguage] || texts.ko;
  }

  createChatbotUI() {
    const texts = this.getTexts();
    const chatbotHTML = `
      <button id="chatbot-toggle" class="chatbot-toggle" aria-label="AI 헤어 상담">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div id="chatbot-container" class="chatbot-container">
        <div class="chatbot-header">
          <span class="chatbot-title" id="chatbot-title">${texts.title}</span>
          <div class="header-actions">
            <!-- 언어 선택 버튼 -->
            <div class="language-selector">
              <button id="language-btn" class="language-btn" title="Language">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
              </button>
              <div id="language-dropdown" class="language-dropdown hidden">
                <button class="lang-option" data-lang="ko">🇰🇷 한국어</button>
                <button class="lang-option" data-lang="en">🇺🇸 English</button>
                <button class="lang-option" data-lang="ja">🇯🇵 日本語</button>
                <button class="lang-option" data-lang="zh">🇨🇳 中文</button>
                <button class="lang-option" data-lang="vi">🇻🇳 Tiếng Việt</button>
              </div>
            </div>
            <button id="chatbot-close" class="chatbot-close" aria-label="닫기">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div id="chatbot-messages" class="chatbot-messages">
          <div class="welcome-message">
            <div class="welcome-icon">✂️</div>
            <div class="welcome-text" id="welcome-text">${texts.welcome}</div>
          </div>
        </div>

        <div class="chatbot-input-area">
          <div class="input-buttons">
            <button id="upload-btn" class="input-action-btn" title="이미지 업로드">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>
            <button id="index-btn" class="input-action-btn" title="색인">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </button>
          </div>
          <input type="file" id="image-input" accept="image/*" style="display:none">
          <input type="text" id="chatbot-input" class="chatbot-input" placeholder="${texts.placeholder}">
          <button id="send-btn" class="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <!-- 색인 모달 -->
      <div id="index-modal" class="index-modal">
        <div class="index-modal-content">
          <div class="index-modal-header">
            <h2 id="index-modal-title">${texts.indexTitle}</h2>
            <button id="close-index-modal" class="modal-close-btn">×</button>
          </div>
          <div id="index-modal-body" class="index-modal-body">
            <!-- 동적으로 생성됨 -->
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  attachEventListeners() {
    // 챗봇 토글
    document.getElementById('chatbot-toggle').addEventListener('click', () => {
      this.toggleChatbot();
    });

    document.getElementById('chatbot-close').addEventListener('click', () => {
      this.toggleChatbot();
    });

    // 이미지 업로드
    document.getElementById('upload-btn').addEventListener('click', () => {
      document.getElementById('image-input').click();
    });

    document.getElementById('image-input').addEventListener('change', (e) => {
      this.handleImageUpload(e);
    });

    // 전송 버튼
    document.getElementById('send-btn').addEventListener('click', () => {
      this.handleTextMessage();
    });

    // Enter 키
    document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleTextMessage();
      }
    });

    // ✅ 언어 선택 - 모바일 최적화
    document.getElementById('language-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById('language-dropdown');
      dropdown.classList.toggle('hidden');
    });

    // ✅ 언어 옵션 클릭 - touchend도 추가
    document.querySelectorAll('.lang-option').forEach(btn => {
      // click 이벤트
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = e.currentTarget.getAttribute('data-lang');
        console.log(`🌍 언어 선택 클릭: ${lang}`);
        this.changeLanguage(lang);
        document.getElementById('language-dropdown').classList.add('hidden');
      });
      
      // touchend 이벤트 추가 (모바일 최적화)
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = e.currentTarget.getAttribute('data-lang');
        console.log(`🌍 언어 선택 터치: ${lang}`);
        this.changeLanguage(lang);
        document.getElementById('language-dropdown').classList.add('hidden');
      }, { passive: false });
    });

    // 색인 버튼
    document.getElementById('index-btn').addEventListener('click', () => {
      this.showIndexModal();
    });

    document.getElementById('close-index-modal').addEventListener('click', () => {
      this.closeIndexModal();
    });

    // 모달 외부 클릭 시 닫기
    document.getElementById('index-modal').addEventListener('click', (e) => {
      if (e.target.id === 'index-modal') {
        this.closeIndexModal();
      }
    });

    // 언어 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', () => {
      document.getElementById('language-dropdown').classList.add('hidden');
    });
  }

  // ✅ 수정: Touch Event에 passive listener 추가
  initKeyboardHandler() {
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotContainer = document.getElementById('chatbot-container');
    const messagesDiv = document.getElementById('chatbot-messages');

    if (!chatbotInput || !chatbotContainer) return;

    let originalViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    // 키보드 열릴 때 처리
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const currentHeight = window.visualViewport.height;
        const keyboardHeight = originalViewportHeight - currentHeight;

        if (keyboardHeight > 100) {
          // 키보드 열림
          chatbotContainer.style.height = `${currentHeight}px`;
          if (messagesDiv) {
            setTimeout(() => {
              messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 100);
          }
        } else {
          // 키보드 닫힘
          chatbotContainer.style.height = '';
        }

        originalViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      }, { passive: true });
    }
  }

  toggleChatbot() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');
    
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      container.classList.add('active');
      toggle.classList.add('hidden');
    } else {
      container.classList.remove('active');
      toggle.classList.remove('hidden');
    }
  }

  // ✅ 모바일 언어 변경 버그 수정 - 완전한 UI 업데이트
  changeLanguage(lang) {
    console.log(`🌍 언어 변경 시작: ${this.currentLanguage} → ${lang}`);
    
    // 1. 언어 설정 변경
    this.currentLanguage = lang;
    
    // 2. localStorage에 저장 (새로고침 후에도 유지)
    localStorage.setItem('hairgator_chatbot_lang', lang);
    
    // 3. 새로운 언어의 텍스트 가져오기
    const texts = this.getTexts();
    
    // 4. UI 요소들 업데이트
    const titleEl = document.getElementById('chatbot-title');
    if (titleEl) titleEl.textContent = texts.title;
    
    const inputEl = document.getElementById('chatbot-input');
    if (inputEl) inputEl.placeholder = texts.placeholder;
    
    const indexTitleEl = document.getElementById('index-modal-title');
    if (indexTitleEl) indexTitleEl.textContent = texts.indexTitle;
    
    // 5. 환영 메시지 업데이트
    const welcomeTextEl = document.getElementById('welcome-text');
    if (welcomeTextEl) welcomeTextEl.textContent = texts.welcome;
    
    // 6. 대화 히스토리 초기화 (기존 메시지를 환영 메시지로 교체)
    const messagesDiv = document.getElementById('chatbot-messages');
    if (messagesDiv) {
      messagesDiv.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-icon">✂️</div>
          <div class="welcome-text" id="welcome-text">${texts.welcome}</div>
        </div>
      `;
    }
    
    // 7. 대화 히스토리 초기화
    this.conversationHistory = [];
    
    // 8. 사용자 피드백 (모바일에서 변경 확인용)
    console.log(`✅ 언어 변경 완료: ${lang}`);
    
    // 9. 시각적 피드백 추가
    this.showLanguageChangeFeedback(lang);
  }

  // ✅ 언어 변경 시각적 피드백 함수 (새로 추가)
  showLanguageChangeFeedback(lang) {
    const langNames = {
      'ko': '한국어',
      'en': 'English',
      'ja': '日本語',
      'zh': '中文',
      'vi': 'Tiếng Việt'
    };
    
    const messagesDiv = document.getElementById('chatbot-messages');
    if (!messagesDiv) return;
    
    const feedbackMsg = document.createElement('div');
    feedbackMsg.className = 'system-message';
    feedbackMsg.style.cssText = `
      text-align: center;
      padding: 8px 12px;
      margin: 10px auto;
      background: rgba(33, 150, 243, 0.1);
      border-radius: 8px;
      font-size: 12px;
      color: #2196F3;
      animation: fadeInOut 2s ease-in-out;
    `;
    feedbackMsg.textContent = `🌍 ${langNames[lang] || lang}`;
    
    messagesDiv.appendChild(feedbackMsg);
    
    // 2초 후 자동 제거
    setTimeout(() => {
      if (feedbackMsg.parentNode) {
        feedbackMsg.style.opacity = '0';
        feedbackMsg.style.transition = 'opacity 0.3s';
        setTimeout(() => feedbackMsg.remove(), 300);
      }
    }, 2000);
  }

  showIndexModal() {
    const modal = document.getElementById('index-modal');
    const body = document.getElementById('index-modal-body');

    // 언어별 접미사 매핑 (정확한 파일명 기준)
    const getFileSuffix = (id, lang) => {
      const idNum = parseInt(id);
      if (lang === 'ko') return '';
      if (lang === 'en') return ' – 1';
      
      // ✅ 수정: ja, zh, vi는 번호에 따라 다름
      if (idNum <= 2) {
        // 01-02: ja=3, zh=2, vi=4
        if (lang === 'ja') return ' – 3';
        if (lang === 'zh') return ' – 2';
        if (lang === 'vi') return ' – 4';
      } else {
        // 03-89: ja=2, zh=3, vi=5
        if (lang === 'ja') return ' – 2';
        if (lang === 'zh') return ' – 3';
        if (lang === 'vi') return ' – 5';
      }
      return '';
    };

    const baseURL = 'https://raw.githubusercontent.com/kimminjae413/hairgator-menu-final/main/indexes/';
    const langFolder = this.currentLanguage;

    const galleryHTML = `
      <div class="term-gallery-single-column">
        ${Object.entries(this.terms89Map)
          .sort(([idA], [idB]) => parseInt(idA) - parseInt(idB))
          .map(([id, term]) => {
            const termName = term.en;
            const suffix = getFileSuffix(id, this.currentLanguage);
            const fileName = `${id}.${termName}${suffix}.html`;
            const fileURL = `${baseURL}${langFolder}/${encodeURIComponent(fileName)}`;

            return `
              <div class="term-card">
                <div class="term-number">${id}</div>
                <a href="${fileURL}" target="_blank" class="term-link">
                  ${termName}
                </a>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    body.innerHTML = galleryHTML;
    modal.classList.add('active');
  }

  closeIndexModal() {
    const modal = document.getElementById('index-modal');
    modal.classList.remove('active');
  }

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const texts = this.getTexts();

    if (file.size > 5 * 1024 * 1024) {
      alert(texts.errorSize);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert(texts.errorType);
      return;
    }

    try {
      this.addMessage('user', `🖼️ ${file.name}`);
      this.addMessage('bot', texts.analyzing);

      const base64Image = await this.fileToBase64(file);

      const analysisResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_image',
          payload: {
            image: base64Image,
            language: this.currentLanguage
          }
        })
      });

      if (!analysisResponse.ok) {
        throw new Error(`HTTP ${analysisResponse.status}`);
      }

      const analysisResult = await analysisResponse.json();

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('이미지 분석 실패');
      }

      this.replaceLastBotMessage(texts.generating);

      const recipeResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe_stream',
          payload: {
            params56: analysisResult.data,
            language: this.currentLanguage  // 다국어 지원
          }
        })
      });

      if (!recipeResponse.ok) {
        throw new Error(`HTTP ${recipeResponse.status}`);
      }

      const recipeResult = await recipeResponse.json();

      if (recipeResult.success && recipeResult.data.recipe) {
        // 레시피를 HTML로 렌더링 (89용어 하이라이트 포함)
        const rendered = this.parseMarkdownWithHighlight(recipeResult.data.recipe);
        this.replaceLastBotMessage(rendered);
      } else {
        this.replaceLastBotMessage('❌ 레시피 생성 실패');
      }

    } catch (error) {
      console.error('이미지 처리 오류:', error);
      this.replaceLastBotMessage(`❌ 오류 발생: ${error.message}`);
    }

    // 파일 입력 초기화
    event.target.value = '';
  }

  // 89용어 하이라이팅 함수 (✅ TypeError 방지)
  highlight89Terms(text) {
    if (!text || typeof text !== 'string') return text;

    let result = text;

    // 정규식으로 안전하게 매칭 (대소문자 무시, 단어 경계 고려)
    Object.entries(this.terms89Map).forEach(([id, term]) => {
      const koTerm = term.ko;
      const enTerm = term.en;

      // 한글/영문 모두 매칭 (정확한 단어만)
      const regex = new RegExp(`\\b(${koTerm}|${enTerm})\\b`, 'gi');
      result = result.replace(regex, (match) => {
        return `<span class="term-highlight" data-term-id="${id}" title="89용어 #${id}">${match}</span>`;
      });
    });

    return result;
  }

  // 마크다운 파싱 + 89용어 하이라이트
  parseMarkdownWithHighlight(markdown) {
    if (!markdown) return '';

    // 1. 코드 블록 임시 저장
    const codeBlocks = [];
    let html = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${this.escapeHtml(code.trim())}</code></pre>`);
      return placeholder;
    });

    // 2. STEP 헤더 파싱 (###1 ~ ###7)
    html = html.replace(/^###(\d)\.\s*(.+)$/gm, (match, num, title) => {
      return `<h3 class="recipe-step">STEP ${num}. ${title}</h3>`;
    });

    // 3. 일반 헤더 파싱
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 4. 89용어 하이라이팅 적용
    html = this.highlight89Terms(html);

    // 5. 인라인 스타일
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // 6. 리스트 파싱 개선 (중첩 리스트 지원)
    const lines = html.split('\n');
    const result = [];
    let inList = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // 리스트 항목
      if (trimmed.match(/^[-*•]\s+/)) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        const content = trimmed.replace(/^[-*•]\s+/, '');
        result.push(`<li>${content}</li>`);
      } 
      // 빈 줄
      else if (trimmed === '') {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        // 빈 줄은 무시
      }
      // 일반 텍스트
      else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(`<p class="recipe-text">${trimmed}</p>`);
      }
    });

    // 리스트가 열려있으면 닫기
    if (inList) {
      result.push('</ul>');
    }

    html = result.join('\n');

    // 5. 코드 블록 복원
    codeBlocks.forEach((block, index) => {
      html = html.replace(`___CODE_BLOCK_${index}___`, block);
    });

    // 6. → 화살표를 예쁘게
    html = html.replace(/→/g, '<span class="arrow">→</span>');

    return html;
  }

  // HTML 이스케이프
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // 파라미터 포맷팅
  formatParameters(analysisData) {
    const lines = [];
    const params56 = analysisData.parameters_56 || analysisData;

    lines.push('<div class="analysis-result">');
    lines.push('<h3>📊 분석 완료</h3>');

    lines.push('<div class="params-section">');
    lines.push('<ul>');
    
    if (params56.womens_cut_length) {
      lines.push(`<li>📏 길이: <strong>${params56.womens_cut_length}</strong></li>`);
    }
    if (params56.womens_cut_category) {
      lines.push(`<li>✂️ 스타일: <strong>${params56.womens_cut_category}</strong></li>`);
    }
    if (params56.fringe_type && params56.fringe_type !== 'No Fringe') {
      lines.push(`<li>💇 앞머리: ${params56.fringe_type}</li>`);
    }
    if (params56.hair_texture) {
      lines.push(`<li>🧵 모질: ${params56.hair_texture}</li>`);
    }
    if (params56.face_shape_match) {
      lines.push(`<li>👤 얼굴형: ${params56.face_shape_match}</li>`);
    }

    lines.push(`</ul>`);
    lines.push('</div>');
    lines.push('</div>');

    return lines.join('');
  }

  async handleTextMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    // 일반 대화 감지
    const casualKeywords = ['안녕', '반가', '고마', '감사', '도움', '뭐', '어떻게', 'hello', 'hi', 'thanks', 'thank you', 'help'];
    const isCasualChat = casualKeywords.some(keyword => message.toLowerCase().includes(keyword)) && message.length < 20;

    if (isCasualChat) {
      this.addMessage('bot', '답변 생성 중...');
      
      try {
        const gptResponse = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_response',
            payload: {
              user_query: message,
              search_results: []
            }
          })
        });

        const gptResult = await gptResponse.json();

        if (gptResult.success) {
          this.replaceLastBotMessage(gptResult.data);
        } else {
          this.replaceLastBotMessage('답변 생성에 실패했습니다.');
        }
      } catch (error) {
        console.error('대화 오류:', error);
        this.replaceLastBotMessage('오류가 발생했습니다. 다시 시도해주세요.');
      }
      return;
    }

    // 스타일 검색 모드
    this.addMessage('bot', '검색 중...');

    try {
      const searchResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_styles',
          payload: { query: message }
        })
      });

      const searchResult = await searchResponse.json();

      if (!searchResult.success || searchResult.data.length === 0) {
        this.replaceLastBotMessage('관련된 스타일을 찾지 못했습니다.');
        return;
      }

      const styles = searchResult.data;

      const gptResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_response',
          payload: {
            user_query: message,
            search_results: styles
          }
        })
      });

      const gptResult = await gptResponse.json();

      if (gptResult.success) {
        this.replaceLastBotMessage(gptResult.data);
        this.displayStyleCards(styles);
      }

    } catch (error) {
      console.error('검색 오류:', error);
      this.replaceLastBotMessage('검색 중 오류가 발생했습니다.');
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  displayStyleCards(styles) {
    const cardsHTML = styles.map(style => `
      <div class="style-card" onclick="window.location.href='#${style.code}'">
        <img src="${style.image_url}" alt="${style.name}" loading="lazy">
        <div class="style-card-info">
          <h4>${style.name}</h4>
          <span class="style-code">${style.code}</span>
        </div>
      </div>
    `).join('');

    this.addRawHTML(`<div class="style-cards-container">${cardsHTML}</div>`);
  }

  addMessage(sender, content) {
    const messagesDiv = document.getElementById('chatbot-messages');
    const messageHTML = `
      <div class="${sender}-message">
        <div class="message-content">${content}</div>
      </div>
    `;
    messagesDiv.insertAdjacentHTML('beforeend', messageHTML);
    this.scrollToBottom();
  }

  addRawHTML(html) {
    const messagesDiv = document.getElementById('chatbot-messages');
    messagesDiv.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  }

  replaceLastBotMessage(newContent) {
    const messages = document.querySelectorAll('.bot-message');
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      lastMessage.querySelector('.message-content').innerHTML = newContent;
    }
    this.scrollToBottom();
  }

  scrollToBottom() {
    const messagesDiv = document.getElementById('chatbot-messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.hairgatorChatbot = new HairGatorChatbot();
  console.log('🦎 HAIRGATOR v2.0 챗봇 로드 완료 (모바일 언어 변경 버그 수정 완료)');
});
