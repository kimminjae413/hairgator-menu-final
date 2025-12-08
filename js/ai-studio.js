// ============================================================
// HAIRGATOR AI Studio - Pro Workstation JavaScript
// Split View Layout + Firebase Integration
// ============================================================

// ⭐ Pull-to-Refresh 비활성화 (웹뷰용) - 스크롤 가능 영역 제외
(function() {
    let lastY = 0;
    let scrollableParent = null;

    document.addEventListener('touchstart', function(e) {
        lastY = e.touches[0].clientY;

        // 터치 시작 시 스크롤 가능한 부모 요소 찾기
        scrollableParent = null;
        let el = e.target;
        while (el && el !== document.body) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                scrollableParent = el;
                break;
            }
            el = el.parentElement;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;
        const isPullingDown = currentY > lastY;

        // 스크롤 가능한 컨테이너 내부인 경우
        if (scrollableParent) {
            // 스크롤이 최상단이고 아래로 당기는 경우에만 막기
            if (scrollableParent.scrollTop <= 0 && isPullingDown) {
                e.preventDefault();
            }
            // 그 외의 경우 (위로 스크롤하거나, 아래에 스크롤 여유가 있을 때)는 허용
            return;
        }

        // 스크롤 가능한 컨테이너 밖에서 페이지 최상단에서 아래로 당길 때만 막기
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop <= 0 && isPullingDown) {
            e.preventDefault();
        }
    }, { passive: false });
})();

class AIStudio {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.currentLanguage = this.getStoredLanguage();
    this.conversationHistory = [];
    this.currentUserId = null;
    this.userPhotoUrl = null; // 사용자 프로필 사진 URL
    this.HISTORY_EXPIRE_DAYS = 7;
    this.MAX_MESSAGES = 200;

    // UI Elements
    this.messagesContainer = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    this.imageUpload = document.getElementById('image-upload');
    this.canvasPanel = document.getElementById('canvas-panel');
    this.canvasContent = document.getElementById('canvas-content');
    this.canvasEmpty = document.getElementById('canvas-empty');
    this.canvasResult = document.getElementById('canvas-result');

    this.init();
  }

  // 사용자 프로필 사진 로드 (Firebase userSettings → localStorage → 불나비)
  async loadUserPhoto() {
    try {
      // 1. Firebase userSettings에서 프로필 사진 가져오기
      if (window.db) {
        const userStr = localStorage.getItem('bullnabi_user');
        if (userStr) {
          const userInfo = JSON.parse(userStr);
          const docId = `${userInfo.name}_${userInfo.phone || '0000'}`;

          try {
            const doc = await window.db.collection('userSettings').doc(docId).get();
            if (doc.exists) {
              const data = doc.data();
              if (data.profileImage) {
                this.userPhotoUrl = data.profileImage;
                console.log('👤 Firebase userSettings 프로필 사진 로드됨');
                return;
              }
            }
          } catch (fbError) {
            console.warn('Firebase 프로필 사진 로드 실패:', fbError);
          }
        }
      }

      // 2. localStorage에서 프로필 사진 가져오기 (캐시)
      const savedProfileImage = localStorage.getItem('hairgator_profile_image');
      if (savedProfileImage) {
        this.userPhotoUrl = savedProfileImage;
        console.log('👤 localStorage 프로필 사진 로드됨');
        return;
      }

      // 3. 불나비 사용자 정보에서 프로필 사진 가져오기
      const userStr = localStorage.getItem('bullnabi_user');
      if (userStr) {
        const userInfo = JSON.parse(userStr);
        this.userPhotoUrl = userInfo.photoUrl || userInfo.profileImage || userInfo.photo || userInfo.profilePhoto || userInfo.image || null;
        if (this.userPhotoUrl) {
          console.log('👤 불나비 프로필 사진 로드됨');
          return;
        }
      }

      console.log('👤 프로필 사진 없음 - 기본 아이콘 사용');
    } catch (e) {
      console.warn('프로필 사진 로드 실패:', e);
    }
  }

  // Firebase Auth 상태 변경 시 프로필 사진 업데이트
  setupAuthListener() {
    if (firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user && user.photoURL) {
          this.userPhotoUrl = user.photoURL;
          console.log('👤 Firebase Auth 프로필 사진 업데이트됨');
        }
      });
    }
  }

  async init() {
    console.log('🚀 HAIRGATOR AI Studio 초기화 중...');

    // Event Listeners
    this.setupEventListeners();

    // Firebase Auth 리스너 설정 (프로필 사진 업데이트용)
    this.setupAuthListener();

    // 사용자 프로필 사진 로드 (Firebase userSettings에서)
    await this.loadUserPhoto();

    // User History
    await this.initUserHistory();

    console.log('✅ AI Studio 초기화 완료');
  }

  setupEventListeners() {
    // Send Message - Enter 키 이벤트
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // 전역 sendMessage 호출 (이미지 체크 포함)
        sendMessage();
      }
    });

    // Canvas Tabs
    document.querySelectorAll('.canvas-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        const tabName = e.target.dataset.tab;
        this.switchCanvasTab(tabName);
      });
    });
  }

  // 캔버스 탭 전환
  switchCanvasTab(tabName) {
    const resultContainer = document.getElementById('canvas-result');
    const historyContainer = document.getElementById('canvas-history');
    const emptyState = document.getElementById('canvas-empty');

    if (tabName === 'result') {
      // 결과 탭
      if (historyContainer) historyContainer.classList.add('hidden');
      // 결과가 있으면 결과 보여주고, 없으면 empty state
      if (resultContainer && resultContainer.innerHTML.trim()) {
        resultContainer.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
      } else {
        if (resultContainer) resultContainer.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
      }
    } else if (tabName === 'history') {
      // 히스토리 탭
      if (resultContainer) resultContainer.classList.add('hidden');
      if (emptyState) emptyState.classList.add('hidden');
      if (historyContainer) historyContainer.classList.remove('hidden');
      this.loadHistoryToCanvas();
    }
  }

  // 히스토리를 캔버스에 로드
  async loadHistoryToCanvas() {
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');

    if (!historyList) return;

    // Firebase에서 분석 히스토리 가져오기
    try {
      const analysisHistory = await this.getAnalysisHistory();

      if (analysisHistory.length === 0) {
        historyList.style.display = 'none';
        if (historyEmpty) historyEmpty.style.display = 'flex';
        return;
      }

      historyList.style.display = 'block';
      if (historyEmpty) historyEmpty.style.display = 'none';

      historyList.innerHTML = analysisHistory.map((item, idx) => `
        <div class="history-item" onclick="window.aiStudio.showHistoryDetail(${idx})">
          <div class="history-item-thumb">
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="분석 이미지">` : '<span>📷</span>'}
          </div>
          <div class="history-item-info">
            <div class="history-item-title">${item.title || '이미지 분석'}</div>
            <div class="history-item-meta">
              <span>${item.length || ''}</span>
              <span>${item.form || ''}</span>
            </div>
            <div class="history-item-date">${this.formatDate(item.timestamp)}</div>
          </div>
          <button class="history-item-delete" onclick="event.stopPropagation(); window.aiStudio.deleteHistoryItem(${idx})" title="삭제">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      `).join('');

    } catch (e) {
      console.error('❌ 히스토리 로드 실패:', e);
      historyList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">히스토리를 불러올 수 없습니다.</p>';
    }
  }

  // 분석 히스토리 가져오기 (canvasData가 있는 메시지만)
  async getAnalysisHistory() {
    const history = [];

    // conversationHistory에서 canvasData가 있는 항목 필터링
    this.conversationHistory.forEach((msg, idx) => {
      if (msg.canvasData && msg.sender === 'bot') {
        history.push({
          index: idx,
          imageUrl: msg.canvasData.imageUrl || null,
          title: msg.canvasData.type === 'analysis' ? '이미지 분석' : '맞춤 레시피',
          length: msg.canvasData.analysis?.lengthName || msg.canvasData.params?.length_category || '',
          form: msg.canvasData.analysis?.form || msg.canvasData.params?.cut_form || '',
          timestamp: msg.timestamp,
          canvasData: msg.canvasData
        });
      }
    });

    return history.reverse(); // 최신순
  }

  // 히스토리 상세 보기
  showHistoryDetail(idx) {
    const history = [];
    this.conversationHistory.forEach((msg, i) => {
      if (msg.canvasData && msg.sender === 'bot') {
        history.push({ ...msg, originalIndex: i });
      }
    });

    const reversedHistory = history.reverse();
    const item = reversedHistory[idx];

    if (item && item.canvasData) {
      // 결과 탭으로 전환하고 해당 결과 표시
      document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.canvas-tab[data-tab="result"]')?.classList.add('active');

      if (item.canvasData.type === 'analysis') {
        this.showCanvas(item.canvasData);
      } else if (item.canvasData.customRecipe) {
        // 맞춤 레시피 결과
        this.showCustomRecipeCanvas(item.canvasData, item.canvasData.uploadedImageUrl || '');
      } else {
        this.showCanvas(item.canvasData);
      }
    }
  }

  // 히스토리 항목 삭제
  async deleteHistoryItem(idx) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    const history = [];
    this.conversationHistory.forEach((msg, i) => {
      if (msg.canvasData && msg.sender === 'bot') {
        history.push({ ...msg, originalIndex: i });
      }
    });

    const reversedHistory = history.reverse();
    const item = reversedHistory[idx];

    if (item && item.id) {
      try {
        // Firebase에서 삭제
        await window.db
          .collection('chatHistory')
          .doc(this.currentUserId)
          .collection('messages')
          .doc(item.id)
          .delete();

        // 로컬에서도 삭제
        this.conversationHistory = this.conversationHistory.filter(m => m.id !== item.id);

        // UI 새로고침
        this.loadHistoryToCanvas();

      } catch (e) {
        console.error('❌ 삭제 실패:', e);
        alert('삭제에 실패했습니다.');
      }
    }
  }

  // 날짜 포맷
  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  // ==================== Language ====================

  getStoredLanguage() {
    try {
      return localStorage.getItem('hairgator_language') || 'ko';
    } catch (e) {
      return 'ko';
    }
  }

  // ==================== User History (Firebase) ====================

  async initUserHistory() {
    try {
      const bullnabiUser = window.getBullnabiUser ? window.getBullnabiUser() : null;
      const firebaseUser = firebase.auth ? firebase.auth().currentUser : null;

      if (bullnabiUser && bullnabiUser.userId) {
        this.currentUserId = bullnabiUser.userId;
      } else if (firebaseUser && firebaseUser.uid) {
        this.currentUserId = firebaseUser.uid;
      } else {
        this.currentUserId = this.getOrCreateAnonymousId();
      }

      console.log(`👤 User ID: ${this.currentUserId}`);

      await this.loadUserHistoryFromFirebase();
      await this.cleanExpiredMessages();

    } catch (e) {
      console.error('❌ History init failed:', e);
      this.currentUserId = 'anon_' + Date.now();
    }
  }

  getOrCreateAnonymousId() {
    try {
      let anonId = localStorage.getItem('hairgator_anonymous_id');
      if (!anonId) {
        anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hairgator_anonymous_id', anonId);
      }
      return anonId;
    } catch (e) {
      return 'anon_' + Date.now();
    }
  }

  async loadUserHistoryFromFirebase() {
    try {
      if (!this.currentUserId || !window.db) {
        return;
      }

      const expireTime = Date.now() - (this.HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .where('timestamp', '>', expireTime)
        .orderBy('timestamp', 'asc')
        .limit(this.MAX_MESSAGES)
        .get();

      this.conversationHistory = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        this.conversationHistory.push({
          id: doc.id,
          sender: data.sender,
          content: data.content,
          timestamp: data.timestamp,
          canvasData: data.canvasData || null
        });
      });

      console.log(`📚 Loaded ${this.conversationHistory.length} messages from Firebase`);

      if (this.conversationHistory.length > 0) {
        this.restoreHistoryToUI();
      }

    } catch (e) {
      console.error('❌ Firebase load failed:', e);
    }
  }

  async saveMessageToFirebase(sender, content, canvasData = null) {
    try {
      if (!this.currentUserId || !window.db) return;

      const message = {
        sender: sender,
        content: content,
        timestamp: Date.now(),
        canvasData: canvasData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .add(message);

    } catch (e) {
      console.error('❌ Firebase save failed:', e);
    }
  }

  async cleanExpiredMessages() {
    try {
      if (!this.currentUserId || !window.db) return;

      const expireTime = Date.now() - (this.HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .where('timestamp', '<', expireTime)
        .get();

      if (snapshot.empty) return;

      const batch = window.db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log(`🗑️ Deleted ${snapshot.size} expired messages`);

    } catch (e) {
      console.error('❌ Cleanup failed:', e);
    }
  }

  restoreHistoryToUI() {
    // Clear current messages except welcome
    const welcomeMsg = this.messagesContainer.querySelector('.message.bot');
    this.messagesContainer.innerHTML = '';
    if (welcomeMsg) {
      this.messagesContainer.appendChild(welcomeMsg);
    }

    let lastDate = null;

    this.conversationHistory.forEach(msg => {
      // Date Divider
      if (msg.timestamp) {
        const msgDate = new Date(msg.timestamp).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        if (msgDate !== lastDate) {
          this.addDateDivider(msgDate);
          lastDate = msgDate;
        }
      }

      // canvasData가 있으면 함께 복원
      this.addMessageToUI(msg.sender, msg.content, false, msg.canvasData || null);
    });

    this.scrollToBottom();
  }

  // ==================== Message Handling ====================

  async sendMessage(directText = null) {
    const text = directText || this.chatInput.value.trim();
    if (!text) return;

    // Clear input
    this.chatInput.value = '';

    // Add user message to UI
    this.addMessageToUI('user', text);

    // Save to history
    this.conversationHistory.push({
      sender: 'user',
      content: text,
      timestamp: Date.now()
    });
    this.saveMessageToFirebase('user', text);

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Call API
      const response = await this.callAPI(text);

      // Remove typing indicator
      this.hideTypingIndicator();

      // Add bot response
      this.addMessageToUI('bot', response.content, true, response.canvasData);

      // Save bot response
      this.conversationHistory.push({
        sender: 'bot',
        content: response.content,
        timestamp: Date.now(),
        canvasData: response.canvasData
      });
      this.saveMessageToFirebase('bot', response.content, response.canvasData);

      // If canvas data exists, show canvas
      if (response.canvasData) {
        this.showCanvas(response.canvasData);
      }

    } catch (error) {
      this.hideTypingIndicator();
      this.addMessageToUI('bot', '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.');
      console.error('❌ API Error:', error);
    }
  }

  async callAPI(query) {
    console.log('📤 API 호출:', query);

    // 최근 대화 히스토리 (최대 30개) - 맥락 유지용
    const recentHistory = this.conversationHistory
      .slice(-30)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.content
      }));

    // ⭐ 현재 활성 레시피 컨텍스트 (30분 이내면 유효)
    let recipeContext = null;
    if (this.currentRecipeContext && (Date.now() - this.currentRecipeContext.timestamp) < 30 * 60 * 1000) {
      recipeContext = this.currentRecipeContext;
      console.log('📋 레시피 컨텍스트 포함:', recipeContext.analysis?.styleCode || recipeContext.analysis?.lengthName);
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_response_stream',
        payload: {
          user_query: query,
          language: this.currentLanguage,
          chat_history: recentHistory,
          recipe_context: recipeContext  // ⭐ 레시피 컨텍스트 추가
        }
      })
    });

    console.log('📥 API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 응답 텍스트 전체 읽기
    const responseText = await response.text();
    console.log('📥 API 원본 응답:', responseText.substring(0, 500));

    // SSE 형식 파싱
    let fullContent = '';
    const lines = responseText.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'content' && data.content) {
            fullContent += data.content;
          } else if (data.content) {
            fullContent += data.content;
          } else if (typeof data === 'string') {
            fullContent += data;
          }
        } catch (e) {
          // JSON이 아닌 경우 그냥 텍스트로 추가
          if (jsonStr && jsonStr !== '[DONE]') {
            fullContent += jsonStr;
          }
        }
      }
    }

    // SSE 파싱 실패시 원본 텍스트 사용
    if (!fullContent && responseText) {
      // JSON 응답인 경우
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.content) {
          fullContent = jsonResponse.content;
        } else if (jsonResponse.data && jsonResponse.data.content) {
          fullContent = jsonResponse.data.content;
        } else if (jsonResponse.message) {
          fullContent = jsonResponse.message;
        }
      } catch (e) {
        fullContent = responseText;
      }
    }

    console.log('📥 파싱된 내용:', fullContent.substring(0, 200));

    // Check if response contains recipe-like content
    const hasRecipeData = this.detectRecipeContent(fullContent);

    return {
      content: fullContent || '응답을 받지 못했습니다. 다시 시도해주세요.',
      canvasData: hasRecipeData ? this.parseRecipeData(fullContent) : null
    };
  }

  detectRecipeContent(content) {
    const keywords = ['Length', 'Layer', 'Graduation', 'Lifting', 'Section', '섹션', '리프팅', '레이어'];
    return keywords.some(k => content.includes(k)) && content.length > 200;
  }

  parseRecipeData(content) {
    // Extract structured data from response
    return {
      type: 'recipe',
      rawContent: content,
      title: this.extractTitle(content),
      specs: this.extractSpecs(content)
    };
  }

  extractTitle(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('**') || line.startsWith('#')) {
        return line.replace(/[*#]/g, '').trim().substring(0, 50);
      }
    }
    return '스타일 분석 결과';
  }

  extractSpecs(content) {
    const specs = {};

    // Length
    const lengthMatch = content.match(/([A-H])\s*Length/i);
    if (lengthMatch) specs.length = lengthMatch[1].toUpperCase() + ' Length';

    // Form
    if (content.includes('Layer') || content.includes('레이어')) specs.form = 'Layer';
    else if (content.includes('Graduation') || content.includes('그래쥬에이션')) specs.form = 'Graduation';
    else if (content.includes('One Length') || content.includes('원렝스')) specs.form = 'One Length';

    // Lifting
    const liftMatch = content.match(/L([0-8])/);
    if (liftMatch) specs.lifting = `L${liftMatch[1]}`;

    // Section
    if (content.includes('DBS')) specs.section = 'DBS (후대각)';
    else if (content.includes('DFS')) specs.section = 'DFS (전대각)';
    else if (content.includes('VS')) specs.section = 'VS (수직)';
    else if (content.includes('HS')) specs.section = 'HS (수평)';

    return specs;
  }

  // ==================== UI Methods ====================

  addMessageToUI(sender, content, animate = true, canvasData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (animate) messageDiv.style.animation = 'messageSlide 0.3s ease';

    // 아바타: 봇은 이모지, 사용자는 프로필 사진 또는 기본 아이콘
    let avatarHtml;
    if (sender === 'bot') {
      avatarHtml = `<div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>`;
    } else {
      // 사용자 프로필 사진이 있으면 이미지로, 없으면 기본 아이콘
      if (this.userPhotoUrl) {
        avatarHtml = `<div class="message-avatar user-photo"><img src="${this.userPhotoUrl}" alt="프로필" onerror="this.parentElement.innerHTML='👤'"></div>`;
      } else {
        avatarHtml = `<div class="message-avatar">👤</div>`;
      }
    }

    let canvasButton = '';
    if (canvasData) {
      canvasButton = `
        <div class="view-canvas-btn" onclick="window.aiStudio.showCanvas(${JSON.stringify(canvasData).replace(/"/g, '&quot;')})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18M3 9h18"/>
          </svg>
          <span>상세 결과 보기 →</span>
        </div>
      `;
    }

    messageDiv.innerHTML = `
      ${avatarHtml}
      <div class="message-content">
        ${this.formatMessage(content)}
        ${canvasButton}
      </div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Basic markdown-like formatting
    let formatted = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    return `<p>${formatted}</p>`;
  }

  addDateDivider(date) {
    const divider = document.createElement('div');
    divider.className = 'chat-date-divider';
    divider.innerHTML = `<span>${date}</span>`;
    this.messagesContainer.appendChild(divider);
  }

  showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'message bot';
    typing.id = 'typing-indicator';
    typing.innerHTML = `
      <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
      <div class="message-content">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(typing);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  // ==================== Canvas Methods ====================

  showCanvas(canvasData) {
    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    // Generate canvas content
    if (canvasData.type === 'recipe') {
      this.canvasResult.innerHTML = this.generateRecipeCard(canvasData);
    } else if (canvasData.type === 'analysis') {
      this.canvasResult.innerHTML = this.generateAnalysisCard(canvasData);
    }

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }
  }

  generateRecipeCard(data) {
    const specs = data.specs || {};

    return `
      <div class="recipe-card">
        <div class="recipe-card-header">
          <div>
            <h2>${data.title || '스타일 레시피'}</h2>
            <div class="recipe-badges">
              ${specs.length ? `<span class="badge length">${specs.length}</span>` : ''}
              ${specs.form ? `<span class="badge form">${specs.form}</span>` : ''}
            </div>
          </div>
          <div class="recipe-card-actions">
            <button class="card-action-btn" onclick="window.aiStudio.saveResult()" title="저장">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </button>
          </div>
        </div>

        ${Object.keys(specs).length > 0 ? `
        <div class="specs-box-full">
          ${specs.length ? `
            <div class="spec-item highlight">
              <label>Length</label>
              <span>${specs.length}</span>
            </div>
          ` : ''}
          ${specs.form ? `
            <div class="spec-item">
              <label>Form</label>
              <span>${specs.form}</span>
            </div>
          ` : ''}
          ${specs.section ? `
            <div class="spec-item">
              <label>Section</label>
              <span>${specs.section}</span>
            </div>
          ` : ''}
          ${specs.lifting ? `
            <div class="spec-item">
              <label>Lifting</label>
              <span>${specs.lifting}</span>
            </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="guide-section">
          <h3>💡 상세 가이드</h3>
          <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.7;">
            ${data.rawContent || ''}
          </div>
        </div>
      </div>
    `;
  }

  generateAnalysisCard(data) {
    return `
      <div class="analysis-card">
        <div class="analysis-header">
          ${data.imageUrl ? `<img src="${data.imageUrl}" class="analysis-image" alt="분석 이미지">` : ''}
          <div class="analysis-summary">
            <h2>이미지 분석 결과</h2>
            <p>2WAY CUT 시스템 기반 분석</p>
          </div>
        </div>
        <div class="analysis-params">
          ${Object.entries(data.params || {}).map(([key, value]) => `
            <div class="param-item">
              <label>${key}</label>
              <span>${value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  hideCanvas() {
    this.canvasPanel.classList.remove('active');
  }

  // ==================== Image Upload ====================

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // Show user message with image preview
    const imageUrl = URL.createObjectURL(file);
    this.addMessageToUI('user', `<img src="${imageUrl}" style="max-width: 200px; border-radius: 8px;" alt="업로드된 이미지">`);

    // Convert to base64
    const base64 = await this.fileToBase64(file);

    // 재분석용 이미지 데이터 저장
    this.pendingImageBase64 = base64;
    this.pendingMimeType = file.type;

    // Show typing
    this.showTypingIndicator();

    try {
      // Call analyze API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_image',
          payload: {
            image_base64: base64,
            mime_type: file.type
          }
        })
      });

      const result = await response.json();
      this.hideTypingIndicator();

      if (result.success && result.data) {
        const analysisText = this.formatAnalysisResult(result.data);
        this.addMessageToUI('bot', analysisText, true, {
          type: 'analysis',
          imageUrl: imageUrl,
          params: result.data.parameters_56 || result.data
        });

        // Show in canvas
        this.showCanvas({
          type: 'analysis',
          imageUrl: imageUrl,
          params: result.data.parameters_56 || result.data
        });
      } else {
        this.addMessageToUI('bot', '이미지 분석에 실패했습니다. 다시 시도해주세요.');
      }

    } catch (error) {
      this.hideTypingIndicator();
      this.addMessageToUI('bot', '이미지 분석 중 오류가 발생했습니다.');
      console.error('❌ Image analysis error:', error);
    }

    // Reset input
    event.target.value = '';
  }

  formatAnalysisResult(data) {
    const params = data.parameters_56 || data;
    let result = '**📊 이미지 분석 완료!**\n\n';

    if (params.length_category) {
      result += `📏 **길이**: ${params.length_category}\n`;
    }
    if (params.cut_form) {
      result += `✂️ **형태**: ${params.cut_form}\n`;
    }
    if (params.volume_zone) {
      result += `📐 **볼륨**: ${params.volume_zone}\n`;
    }

    result += '\n👉 상세 결과를 확인하려면 "상세 결과 보기"를 클릭하세요.';

    return result;
  }

  fileToBase64(file) {
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

  // ==================== Actions ====================

  async clearFirebaseHistory() {
    try {
      if (!this.currentUserId || !window.db) return;

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .get();

      if (snapshot.empty) return;

      const batch = window.db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log('🗑️ Firebase history cleared');

    } catch (e) {
      console.error('❌ Clear Firebase history failed:', e);
    }
  }

  saveResult() {
    alert('저장 기능은 준비 중입니다.');
  }

  shareResult() {
    if (navigator.share) {
      navigator.share({
        title: 'HAIRGATOR AI 분석 결과',
        text: '헤어스타일 분석 결과를 확인해보세요!',
        url: window.location.href
      });
    } else {
      alert('공유 기능을 지원하지 않는 브라우저입니다.');
    }
  }

  // ==================== Firestore 스타일 검색 (임베딩 기반) ====================

  async searchSimilarStyles(query, topK = 3) {
    try {
      console.log(`🔍 유사 스타일 검색: "${query}"`);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_firestore_styles',
          payload: {
            query: query,
            top_k: topK
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log(`✅ 스타일 검색 완료: ${result.data.results.length}개`);
        return result.data;
      } else {
        console.error('❌ 스타일 검색 실패:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ 스타일 검색 오류:', error);
      return null;
    }
  }

  // 스타일 검색 결과를 캔버스에 표시
  showStyleSearchResults(searchData) {
    if (!searchData || !searchData.results || searchData.results.length === 0) {
      return;
    }

    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    const results = searchData.results;

    this.canvasResult.innerHTML = `
      <div class="style-search-results">
        <div class="search-header">
          <h2>🎯 추천 스타일 Top-${results.length}</h2>
          <p class="search-query">"${searchData.query}" 검색 결과</p>
        </div>

        <div class="style-cards">
          ${results.map((style, idx) => `
            <div class="style-card" onclick="window.aiStudio.showStyleDetail('${style.styleId}')">
              <div class="style-rank">${idx + 1}</div>
              <div class="style-info">
                <h3>${style.styleId}</h3>
                <span class="series-badge">${style.seriesName || style.series}</span>
                <div class="similarity-bar">
                  <div class="similarity-fill" style="width: ${(style.similarity * 100).toFixed(0)}%"></div>
                  <span class="similarity-text">${(style.similarity * 100).toFixed(1)}%</span>
                </div>
              </div>
              ${style.resultImage ? `
                <img src="${style.resultImage}" class="style-thumb" alt="${style.styleId}">
              ` : `
                <div class="style-thumb-placeholder">📷</div>
              `}
            </div>
          `).join('')}
        </div>

        <div class="diagrams-preview">
          <h3>📐 도해도 미리보기</h3>
          <div class="diagrams-grid">
            ${results[0].diagrams.slice(0, 6).map(d => `
              <img src="${d.url}" alt="Step ${d.step}" class="diagram-thumb"
                   onclick="window.open('${d.url}', '_blank')">
            `).join('')}
          </div>
          ${results[0].diagramCount > 6 ? `
            <p class="more-diagrams">+${results[0].diagramCount - 6}장 더보기</p>
          ` : ''}
        </div>
      </div>
    `;

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }
  }

  // 스타일 상세 보기
  async showStyleDetail(styleId) {
    console.log(`📋 스타일 상세: ${styleId}`);
    // TODO: 스타일 상세 모달 또는 페이지로 이동
    alert(`스타일 ${styleId} 상세 보기 기능 준비 중`);
  }

  // ==================== 맞춤 레시피 캔버스 표시 ====================

  showCustomRecipeCanvas(data, uploadedImageUrl) {
    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    // 남자/여자 분기 처리
    if (data.gender === 'male') {
      this.showMaleRecipeCanvas(data, uploadedImageUrl);
      return;
    }

    // 여자 스타일 (기존 로직)
    const { analysis, targetSeries, referenceStyles, customRecipe, mainDiagrams, params56 } = data;

    // 현재 분석 데이터 저장 (재분석용)
    this.currentFemaleAnalysis = { data, uploadedImageUrl };

    // 42포뮬러 핵심 파라미터 추출
    const liftingStr = Array.isArray(analysis.liftingRange) ? analysis.liftingRange.join(', ') : (analysis.liftingRange || 'L4');

    // Length 코드 추출 (A~H)
    const currentLengthCode = analysis.lengthName ? analysis.lengthName.charAt(0) : 'E';
    const currentForm = analysis.form || 'Layer';

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas">
        <!-- 헤더: 업로드 이미지 + 분석 결과 (컴팩트) -->
        <div class="recipe-header compact">
          <div class="uploaded-image-section">
            <img src="${uploadedImageUrl}" alt="업로드한 이미지" class="uploaded-image">
            <div class="analysis-badge">${analysis.lengthName}</div>
          </div>
          <div class="analysis-summary">
            <h2>👩 맞춤 레시피</h2>
            <div class="analysis-tags">
              <span class="tag primary">${analysis.form}</span>
              <span class="tag">${liftingStr}</span>
              <span class="tag">${analysis.sectionPrimary || 'Diagonal-Backward'}</span>
            </div>
          </div>
        </div>

        <!-- 📐 레시피 오버레이 이미지 (자동 표시) -->
        <div class="recipe-overlay-section" id="recipeOverlaySection">
          <div class="recipe-overlay-header">
            <h3>📐 AI 레시피 시각화</h3>
          </div>
          <div class="recipe-overlay-container" id="recipeOverlayContainer">
            <img src="${uploadedImageUrl}" alt="분석 이미지" class="overlay-base-image" id="overlayBaseImage">
            <div class="recipe-overlay-labels" id="recipeOverlayLabels">
              <!-- 동적으로 생성될 레시피 수치 라벨들 (순차 애니메이션) -->
            </div>
          </div>
          <div class="overlay-legend">
            <span class="legend-item"><span class="legend-color lifting"></span> Lifting (각도)</span>
            <span class="legend-item"><span class="legend-color length"></span> Length (길이)</span>
            <span class="legend-item"><span class="legend-color section"></span> Section (섹션)</span>
          </div>
        </div>

        <!-- 스타일 수정 섹션 -->
        <div class="style-correction-section female">
          <div class="correction-header">
            <span class="correction-icon">⚠️</span>
            <span>AI 분석이 틀렸나요? 길이/형태를 수정하세요</span>
          </div>

          <div class="correction-controls female">
            <!-- 커스텀 기장 드롭다운 (이미지 포함) -->
            <div class="custom-length-dropdown" style="position: relative; flex: 1;">
              <button type="button" id="length-dropdown-btn" class="style-select"
                      style="width: 100%; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span id="length-dropdown-text">${currentLengthCode ? currentLengthCode + ' Length' : '길이 선택...'}</span>
                <span>▼</span>
              </button>
              <input type="hidden" id="length-correction-select" value="${currentLengthCode || ''}">

              <div id="length-dropdown-content" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; max-height: 400px; overflow-y: auto;">
                <!-- 기장 가이드 이미지 -->
                <div style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; background: #f9f9f9;">
                  <img src="${window.location.origin}/images/length-guide.png" alt="기장 가이드" style="max-width: 100%; height: auto; border-radius: 4px;" onerror="this.parentElement.style.display='none'">
                </div>
                <!-- 옵션들 -->
                <div class="length-option" data-value="H" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FF9500;">H</strong> - 후두부/목덜미 (Short)
                </div>
                <div class="length-option" data-value="G" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FFCC00;">G</strong> - 목 상단 (Bob)
                </div>
                <div class="length-option" data-value="F" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #4CD964;">F</strong> - 목 하단 (Bob)
                </div>
                <div class="length-option" data-value="E" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #5AC8FA;">E</strong> - 어깨선 상단 (Medium)
                </div>
                <div class="length-option" data-value="D" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #007AFF;">D</strong> - 어깨선 하단 (Medium)
                </div>
                <div class="length-option" data-value="C" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #5856D6;">C</strong> - 겨드랑이 (Semi Long)
                </div>
                <div class="length-option" data-value="B" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #AF52DE;">B</strong> - 가슴 중간 (Long)
                </div>
                <div class="length-option" data-value="A" style="padding: 10px 15px; cursor: pointer;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FF2D55;">A</strong> - 가슴 하단/허리 (Long)
                </div>
              </div>
            </div>

            <select id="form-correction-select" class="style-select">
              <option value="" disabled>형태 선택...</option>
              <option value="One Length" ${currentForm.includes('One') ? 'selected' : ''}>One Length (원렝스)</option>
              <option value="Graduation" ${currentForm.includes('Graduation') ? 'selected' : ''}>Graduation (그래쥬에이션)</option>
              <option value="Layer" ${currentForm.includes('Layer') ? 'selected' : ''}>Layer (레이어)</option>
            </select>
            <button class="correction-btn" onclick="window.aiStudio.reanalyzeFemaleWithStyle()">
              🔄 재분석
            </button>
          </div>
        </div>

        <!-- 이미지 주요 분석 -->
        <div class="formula-params-section">
          <h3>📋 이미지 주요 분석</h3>
          <div class="formula-grid">
            <div class="formula-item">
              <span class="formula-label">Length</span>
              <span class="formula-value">${analysis.lengthName}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Cut Form</span>
              <span class="formula-value">${analysis.form}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Lifting</span>
              <span class="formula-value highlight">${liftingStr}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Section</span>
              <span class="formula-value">${analysis.sectionPrimary || 'Diagonal-Backward'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Volume</span>
              <span class="formula-value">${analysis.volumePosition}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Weight</span>
              <span class="formula-value">${analysis.weightDistribution || 'Balanced'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Fringe</span>
              <span class="formula-value">${analysis.hasBangs ? analysis.bangsType : 'No Fringe'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Connection</span>
              <span class="formula-value">${analysis.connectionType || 'Connected'}</span>
            </div>
          </div>
        </div>

        <!-- 도해도 뷰어 (스크린샷 참고 UI) -->
        <div class="diagrams-section large">
          <h3>📐 기술 매칭 도해도 (${mainDiagrams ? mainDiagrams.length : 0}장)</h3>
          ${this.generateDiagramViewer(mainDiagrams || [])}
        </div>

        <!-- 생성된 맞춤 레시피 -->
        <div class="custom-recipe-section">
          <h3>✨ AI 생성 맞춤 레시피</h3>
          <div class="recipe-content">
            ${this.formatRecipeContent(customRecipe)}
          </div>
        </div>
      </div>
    `;

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }

    // ⭐ 기장 드롭다운 이벤트 리스너 등록 (innerHTML 삽입 후)
    this.initLengthDropdown();

    // 도해도 뷰어 초기화
    this.initDiagramViewer(mainDiagrams || []);

    // 📐 레시피 오버레이 라벨 생성 (hair_regions 좌표 사용)
    this.generateRecipeOverlayLabels(analysis, 'female', params56);
  }

  // ⭐ 기장 드롭다운 이벤트 초기화
  initLengthDropdown() {
    // 옵션 클릭 이벤트
    document.querySelectorAll('.length-option').forEach(opt => {
      opt.addEventListener('click', function() {
        const value = this.dataset.value;
        const selectInput = document.getElementById('length-correction-select');
        const textSpan = document.getElementById('length-dropdown-text');
        const content = document.getElementById('length-dropdown-content');

        if (selectInput) selectInput.value = value;
        if (textSpan) textSpan.textContent = value + ' Length';
        if (content) content.style.display = 'none';
      });
    });

    // 버튼 클릭 이벤트 (드롭다운 토글)
    const dropdownBtn = document.getElementById('length-dropdown-btn');
    if (dropdownBtn) {
      dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const content = document.getElementById('length-dropdown-content');
        if (content) {
          content.style.display = content.style.display === 'block' ? 'none' : 'block';
        }
      });
    }

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.custom-length-dropdown')) {
        const content = document.getElementById('length-dropdown-content');
        if (content) content.style.display = 'none';
      }
    });
  }

  // ==================== 남자 맞춤 레시피 캔버스 표시 ====================

  showMaleRecipeCanvas(data, uploadedImageUrl) {
    const { analysis, targetSeries, referenceStyles, recipe, diagrams, params56 } = data;
    const subStyleDisplay = analysis.subStyle || analysis.styleName;

    // 현재 분석 데이터 저장 (재분석용)
    this.currentMaleAnalysis = { data, uploadedImageUrl };

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas male">
        <!-- 헤더: 업로드 이미지 + 분석 결과 -->
        <div class="recipe-header compact">
          <div class="uploaded-image-section">
            <img src="${uploadedImageUrl}" alt="업로드한 이미지" class="uploaded-image">
            <div class="analysis-badge male">${analysis.styleCode}</div>
          </div>
          <div class="analysis-summary">
            <h2>👨 맞춤 레시피</h2>
            <div class="analysis-tags">
              <span class="tag primary">${subStyleDisplay}</span>
              <span class="tag">${analysis.fadeType || 'No Fade'}</span>
              <span class="tag">${analysis.texture || 'Smooth'}</span>
            </div>
          </div>
        </div>

        <!-- 📐 레시피 오버레이 이미지 (자동 표시) -->
        <div class="recipe-overlay-section" id="recipeOverlaySection">
          <div class="recipe-overlay-header">
            <h3>📐 AI 레시피 시각화</h3>
          </div>
          <div class="recipe-overlay-container" id="recipeOverlayContainer">
            <img src="${uploadedImageUrl}" alt="분석 이미지" class="overlay-base-image" id="overlayBaseImage">
            <div class="recipe-overlay-labels" id="recipeOverlayLabels">
              <!-- 동적으로 생성될 레시피 수치 라벨들 (순차 애니메이션) -->
            </div>
          </div>
          <div class="overlay-legend">
            <span class="legend-item"><span class="legend-color lifting"></span> Lifting (각도)</span>
            <span class="legend-item"><span class="legend-color length"></span> Length (길이)</span>
            <span class="legend-item"><span class="legend-color section"></span> Section (섹션)</span>
          </div>
        </div>

        <!-- 스타일 수정 섹션 -->
        <div class="style-correction-section">
          <div class="correction-header">
            <span class="correction-icon">⚠️</span>
            <span>AI 분석이 틀렸나요? 스타일을 수정하세요</span>
          </div>
          <div class="correction-controls">
            <select id="style-correction-select" class="style-select">
              <option value="" disabled>스타일 선택...</option>
              <option value="SF" ${analysis.styleCode === 'SF' ? 'selected' : ''}>SF - 사이드 프린지 (댄디컷)</option>
              <option value="SP" ${analysis.styleCode === 'SP' ? 'selected' : ''}>SP - 사이드 파트 (가르마)</option>
              <option value="FU" ${analysis.styleCode === 'FU' ? 'selected' : ''}>FU - 프린지 업</option>
              <option value="PB" ${analysis.styleCode === 'PB' ? 'selected' : ''}>PB - 푸시드 백 (슬릭백)</option>
              <option value="BZ" ${analysis.styleCode === 'BZ' ? 'selected' : ''}>BZ - 버즈컷</option>
              <option value="CP" ${analysis.styleCode === 'CP' ? 'selected' : ''}>CP - 크롭컷</option>
              <option value="MC" ${analysis.styleCode === 'MC' ? 'selected' : ''}>MC - 모히칸</option>
            </select>
            <button class="correction-btn" onclick="window.aiStudio.reanalyzeWithStyle()">
              🔄 재분석
            </button>
          </div>
        </div>

        <!-- 남자 스타일 분석 -->
        <div class="formula-params-section">
          <h3>📋 스타일 분석</h3>
          <div class="formula-grid">
            <div class="formula-item">
              <span class="formula-label">카테고리</span>
              <span class="formula-value">${analysis.styleName}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">스타일</span>
              <span class="formula-value highlight">${subStyleDisplay}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">코드</span>
              <span class="formula-value">${analysis.styleCode}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">탑 길이</span>
              <span class="formula-value">${analysis.topLength || 'Medium'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">사이드 길이</span>
              <span class="formula-value">${analysis.sideLength || 'Short'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">페이드</span>
              <span class="formula-value">${analysis.fadeType || 'None'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">텍스처</span>
              <span class="formula-value">${analysis.texture || 'Smooth'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">스타일링</span>
              <span class="formula-value">${analysis.stylingDirection || 'Forward'}</span>
            </div>
          </div>
        </div>

        <!-- 도해도 뷰어 -->
        <div class="diagrams-section large">
          <h3>📐 기술 매칭 도해도 (${diagrams ? diagrams.length : 0}장)</h3>
          ${this.generateDiagramViewer(diagrams || [])}
        </div>

        <!-- 생성된 맞춤 레시피 -->
        <div class="custom-recipe-section">
          <h3>✨ AI 생성 맞춤 레시피</h3>
          <div class="recipe-content">
            ${this.formatRecipeContent(recipe)}
          </div>
        </div>
      </div>
    `;

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }

    // 도해도 뷰어 초기화
    this.initDiagramViewer(diagrams || []);

    // 📐 레시피 오버레이 라벨 생성 (hair_regions 좌표 사용)
    this.generateRecipeOverlayLabels(analysis, 'male', params56);
  }

  // ==================== 도해도 뷰어 ====================

  // 도해도 뷰어 HTML 생성
  generateDiagramViewer(diagrams) {
    if (!diagrams || diagrams.length === 0) {
      return '<p style="color: #999; text-align: center;">도해도가 없습니다.</p>';
    }

    const firstDiagram = diagrams[0];
    // 여자/남자 API 응답 형식 모두 지원
    const getUrl = (d) => d.url || d.image_url;
    const getStep = (d) => d.step || d.step_number;
    const ldsInfo = [firstDiagram.lifting, firstDiagram.direction, firstDiagram.section].filter(Boolean).join(' ');

    return `
      <div class="diagram-viewer" id="diagram-viewer">
        <!-- 메인 이미지 영역 -->
        <div class="diagram-viewer-main">
          <span class="diagram-step-indicator" id="diagram-step-indicator">Step 1 / ${diagrams.length}</span>
          <button class="diagram-nav-btn prev" onclick="window.aiStudio.prevDiagram()" id="diagram-prev-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <img src="${getUrl(firstDiagram)}" alt="Step ${getStep(firstDiagram)}" id="diagram-main-image">
          <button class="diagram-nav-btn next" onclick="window.aiStudio.nextDiagram()" id="diagram-next-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- 재생 컨트롤 -->
        <div class="diagram-playback">
          <button onclick="window.aiStudio.prevDiagram()" title="이전">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5"></line>
            </svg>
          </button>
          <button class="play-btn" onclick="window.aiStudio.toggleAutoPlay()" id="diagram-play-btn" title="자동 재생">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <button onclick="window.aiStudio.nextDiagram()" title="다음">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19"></line>
            </svg>
          </button>
        </div>

        <!-- 썸네일 스트립 -->
        <div class="diagram-thumbnails-strip" id="diagram-thumbnails">
          ${diagrams.map((d, idx) => `
            <div class="diagram-thumb-item ${idx === 0 ? 'active' : ''}"
                 onclick="window.aiStudio.selectDiagram(${idx})"
                 data-index="${idx}">
              <img src="${getUrl(d)}" alt="Step ${getStep(d)}">
              <span class="thumb-step">${getStep(d) || idx + 1}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 도해도 뷰어 초기화
  initDiagramViewer(diagrams) {
    this.currentDiagrams = diagrams;
    this.currentDiagramIndex = 0;
    this.autoPlayInterval = null;

    // 초기 버튼 상태 설정
    this.updateNavButtons();
  }

  // 이전 도해도
  prevDiagram() {
    if (this.currentDiagramIndex > 0) {
      this.selectDiagram(this.currentDiagramIndex - 1);
    }
  }

  // 다음 도해도
  nextDiagram() {
    if (this.currentDiagramIndex < this.currentDiagrams.length - 1) {
      this.selectDiagram(this.currentDiagramIndex + 1);
    }
  }

  // 특정 도해도 선택
  selectDiagram(index) {
    if (!this.currentDiagrams || index < 0 || index >= this.currentDiagrams.length) return;

    this.currentDiagramIndex = index;
    const diagram = this.currentDiagrams[index];

    // 메인 이미지 업데이트 (여자/남자 API 형식 모두 지원)
    const mainImage = document.getElementById('diagram-main-image');
    if (mainImage) mainImage.src = diagram.url || diagram.image_url;

    // Step indicator 업데이트
    const stepIndicator = document.getElementById('diagram-step-indicator');
    if (stepIndicator) stepIndicator.textContent = `Step ${index + 1} / ${this.currentDiagrams.length}`;

    // 썸네일 active 상태 업데이트
    document.querySelectorAll('.diagram-thumb-item').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });

    // 선택된 썸네일이 보이도록 스크롤
    const thumbnailsContainer = document.getElementById('diagram-thumbnails');
    const activeThumb = thumbnailsContainer?.querySelector('.diagram-thumb-item.active');
    if (activeThumb && thumbnailsContainer) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // 네비게이션 버튼 상태 업데이트
    this.updateNavButtons();
  }

  // 네비게이션 버튼 상태 업데이트
  updateNavButtons() {
    const prevBtn = document.getElementById('diagram-prev-btn');
    const nextBtn = document.getElementById('diagram-next-btn');

    if (prevBtn) prevBtn.disabled = this.currentDiagramIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentDiagramIndex >= this.currentDiagrams.length - 1;
  }

  // 자동 재생 토글
  toggleAutoPlay() {
    const playBtn = document.getElementById('diagram-play-btn');

    if (this.autoPlayInterval) {
      // 정지
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        `;
      }
    } else {
      // 재생
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
      }
      this.autoPlayInterval = setInterval(() => {
        if (this.currentDiagramIndex < this.currentDiagrams.length - 1) {
          this.nextDiagram();
        } else {
          // 끝에 도달하면 처음으로
          this.selectDiagram(0);
        }
      }, 3000); // 3초마다 전환
    }
  }

  // ==================== 레시피 오버레이 시각화 ====================

  // 레시피 오버레이 라벨 생성
  generateRecipeOverlayLabels(analysis, gender, params56) {
    const labelsContainer = document.getElementById('recipeOverlayLabels');
    if (!labelsContainer) return;

    // 📍 AI가 감지한 헤어 영역 좌표 (Gemini Vision 결과)
    const regions = params56?.hair_regions || {};

    // 기본 좌표 (AI 감지 실패 시 폴백)
    const defaultRegions = {
      top: { x: 50, y: 10 },
      crown: { x: 50, y: 20 },
      side_left: { x: 20, y: 35 },
      side_right: { x: 80, y: 35 },
      back: null,
      fringe: { x: 50, y: 25 },
      nape: { x: 50, y: 70 },
      length_end: { x: 50, y: 85 }
    };

    // AI 좌표와 기본값 병합
    const getCoord = (key) => regions[key] || defaultRegions[key];

    let labels = [];

    if (gender === 'female') {
      // 여자 스타일 - 42 포뮬러 기반 라벨 (실제 헤어 위치에 배치)
      const liftingRange = Array.isArray(analysis.liftingRange) ? analysis.liftingRange : [analysis.liftingRange || 'L4'];

      // Lifting 각도 라벨 (정수리/크라운 영역에 배치)
      const liftingAngles = {
        'L0': '0°', 'L1': '22.5°', 'L2': '45°', 'L3': '67.5°',
        'L4': '90°', 'L5': '112.5°', 'L6': '135°', 'L7': '157.5°', 'L8': '180°'
      };

      const topCoord = getCoord('top');
      const crownCoord = getCoord('crown');

      if (liftingRange.length > 0 && topCoord) {
        const mainLift = liftingRange[0];
        const angle = liftingAngles[mainLift] || '90°';
        labels.push({
          type: 'lifting',
          text: angle,
          subText: mainLift,
          position: { top: topCoord.y, left: topCoord.x }
        });
      }

      // 추가 Lifting (크라운에)
      if (liftingRange.length > 1 && crownCoord) {
        const subLift = liftingRange[1];
        const angle = liftingAngles[subLift] || '90°';
        labels.push({
          type: 'lifting',
          text: angle,
          subText: subLift,
          position: { top: crownCoord.y, left: crownCoord.x }
        });
      }

      // Section 라벨 (오른쪽 사이드에 배치)
      const sideRightCoord = getCoord('side_right');
      if (analysis.sectionPrimary && sideRightCoord) {
        labels.push({
          type: 'section',
          text: analysis.sectionPrimary.replace('Diagonal-', 'D-'),
          subText: 'Section',
          position: { top: sideRightCoord.y, left: sideRightCoord.x }
        });
      }

      // Length 라벨 (머리카락 끝 위치에 배치)
      const lengthEndCoord = getCoord('length_end');
      if (analysis.lengthName && lengthEndCoord) {
        labels.push({
          type: 'length',
          text: analysis.lengthName,
          subText: 'Length',
          position: { top: lengthEndCoord.y, left: lengthEndCoord.x }
        });
      }

      // Volume 라벨 (왼쪽 사이드)
      const sideLeftCoord = getCoord('side_left');
      if (analysis.volumePosition && sideLeftCoord) {
        labels.push({
          type: 'section',
          text: Array.isArray(analysis.volumePosition) ? analysis.volumePosition[0] : analysis.volumePosition,
          subText: 'Volume',
          position: { top: sideLeftCoord.y, left: sideLeftCoord.x }
        });
      }

      // Fringe/앞머리 라벨 (앞머리 위치)
      const fringeCoord = getCoord('fringe');
      if (analysis.bangsType && analysis.bangsType !== 'No Fringe' && fringeCoord) {
        labels.push({
          type: 'length',
          text: analysis.bangsType,
          subText: 'Fringe',
          position: { top: fringeCoord.y, left: fringeCoord.x }
        });
      }

    } else {
      // 남자 스타일 라벨 (실제 헤어 위치에 배치)
      const topCoord = getCoord('top');
      const sideLeftCoord = getCoord('side_left');
      const sideRightCoord = getCoord('side_right');
      const napeCoord = getCoord('nape');

      // Top Length (정수리에)
      if (analysis.topLength && topCoord) {
        labels.push({
          type: 'length',
          text: analysis.topLength,
          subText: 'Top',
          position: { top: topCoord.y, left: topCoord.x }
        });
      }

      // Side Length (왼쪽 사이드에)
      if (analysis.sideLength && sideLeftCoord) {
        labels.push({
          type: 'length',
          text: analysis.sideLength,
          subText: 'Side',
          position: { top: sideLeftCoord.y, left: sideLeftCoord.x }
        });
      }

      // Fade Type (목덜미에)
      if (analysis.fadeType && analysis.fadeType !== 'None' && napeCoord) {
        labels.push({
          type: 'lifting',
          text: analysis.fadeType,
          subText: 'Fade',
          position: { top: napeCoord.y, left: napeCoord.x }
        });
      }

      // Texture (오른쪽 사이드에)
      if (analysis.texture && sideRightCoord) {
        labels.push({
          type: 'section',
          text: analysis.texture,
          subText: 'Texture',
          position: { top: sideRightCoord.y, left: sideRightCoord.x }
        });
      }

      // Style Code (크라운에)
      const crownCoord = getCoord('crown');
      if (analysis.styleCode && crownCoord) {
        labels.push({
          type: 'lifting',
          text: analysis.styleCode,
          subText: analysis.styleName || '',
          position: { top: crownCoord.y + 10, left: crownCoord.x }
        });
      }
    }

    // 저장
    this.overlayLabelsData = labels;

    // 🎬 헤어 메쉬 스캐닝 애니메이션 실행
    this.runHairMeshScanAnimation(regions, labels, labelsContainer);
  }

  // ==================== 헤어 메쉬 스캐닝 애니메이션 ====================
  runHairMeshScanAnimation(regions, labels, labelsContainer) {
    const container = document.getElementById('recipeOverlayContainer');
    if (!container) return;

    // 기존 스캐너 제거
    const existingScanner = container.querySelector('.hair-mesh-scanner');
    if (existingScanner) existingScanner.remove();

    // 스캐너 오버레이 생성
    const scanner = document.createElement('div');
    scanner.className = 'hair-mesh-scanner';
    scanner.innerHTML = `
      <div class="mesh-grid"></div>
      <div class="scan-line"></div>
      <div class="scan-progress">
        <span>Scanning</span>
        <div class="scan-progress-bar">
          <div class="scan-progress-fill"></div>
        </div>
      </div>
    `;
    container.appendChild(scanner);

    // 기본 좌표 (AI 감지 실패 시)
    const defaultRegions = {
      top: { x: 50, y: 10 },
      crown: { x: 50, y: 20 },
      side_left: { x: 20, y: 35 },
      side_right: { x: 80, y: 35 },
      fringe: { x: 50, y: 25 },
      nape: { x: 50, y: 70 },
      length_end: { x: 50, y: 85 }
    };

    // 탐지 포인트 순서 (위에서 아래로)
    const regionOrder = ['top', 'crown', 'fringe', 'side_left', 'side_right', 'nape', 'length_end'];
    const regionLabels = {
      top: 'TOP',
      crown: 'CROWN',
      fringe: 'FRINGE',
      side_left: 'SIDE L',
      side_right: 'SIDE R',
      nape: 'NAPE',
      length_end: 'LENGTH'
    };

    // 포인트들 순차적으로 표시
    let pointDelay = 500; // 스캔 시작 후 0.5초 뒤부터
    const detectionPoints = [];

    regionOrder.forEach((regionKey, idx) => {
      const coord = regions[regionKey] || defaultRegions[regionKey];
      if (!coord) return;

      setTimeout(() => {
        // 탐지 포인트 생성
        const point = document.createElement('div');
        point.className = 'detection-point';
        point.style.left = `${coord.x}%`;
        point.style.top = `${coord.y}%`;
        point.style.animationDelay = '0s';
        scanner.appendChild(point);
        detectionPoints.push(point);

        // 영역 라벨 생성
        const label = document.createElement('div');
        label.className = 'region-label';
        label.style.left = `${coord.x}%`;
        label.style.top = `${coord.y}%`;
        label.textContent = regionLabels[regionKey];
        label.style.animationDelay = '0.2s';
        scanner.appendChild(label);

        // 이전 포인트와 연결선 그리기
        if (detectionPoints.length > 1) {
          const prevPoint = detectionPoints[detectionPoints.length - 2];
          const prevRect = { x: parseFloat(prevPoint.style.left), y: parseFloat(prevPoint.style.top) };
          const currRect = { x: coord.x, y: coord.y };

          // 두 점 사이 거리와 각도 계산
          const dx = currRect.x - prevRect.x;
          const dy = currRect.y - prevRect.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          const line = document.createElement('div');
          line.className = 'connection-line';
          line.style.left = `${prevRect.x}%`;
          line.style.top = `${prevRect.y}%`;
          line.style.width = `${distance}%`;
          line.style.transform = `rotate(${angle}deg)`;
          scanner.appendChild(line);
        }
      }, pointDelay + (idx * 250)); // 각 포인트 0.25초 간격
    });

    // 스캔 완료 후 라벨 표시
    const scanDuration = pointDelay + (regionOrder.length * 250) + 500;

    setTimeout(() => {
      // 스캐너 완료 상태로 전환
      scanner.classList.add('completed');

      // 라벨 HTML 생성 (순차 애니메이션용 delay 추가)
      setTimeout(() => {
        labelsContainer.innerHTML = labels.map((label, idx) => {
          let posStyle = '';
          if (label.position.top !== undefined) posStyle += `top: ${label.position.top}%;`;
          if (label.position.bottom !== undefined) posStyle += `bottom: ${label.position.bottom}%;`;
          if (label.position.left !== undefined) posStyle += `left: ${label.position.left}%;`;
          if (label.position.right !== undefined) posStyle += `right: ${label.position.right}%;`;

          // 순차적 애니메이션 딜레이 (0.3초 간격)
          const delay = idx * 0.3;

          return `
            <div class="overlay-label ${label.type}" style="${posStyle}; animation-delay: ${delay}s;">
              <span class="label-main">${label.text}</span>
              ${label.subText ? `<span class="label-sub">${label.subText}</span>` : ''}
            </div>
          `;
        }).join('');

        // 스캐너 제거
        setTimeout(() => {
          scanner.remove();
        }, 500);
      }, 300);
    }, scanDuration);
  }

  // ==================== 각도별 AI 이미지 생성 ====================

  async generateAngleViews(gender) {
    const gallery = document.getElementById('angleViewsGallery');
    const btn = document.getElementById('generateAnglesBtn');

    if (!gallery || !btn) return;

    // 이미지 데이터 확인
    if (!this.pendingImageBase64) {
      alert('이미지 데이터가 없습니다. 이미지를 다시 업로드해주세요.');
      return;
    }

    // 버튼 로딩 상태
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ AI 이미지 생성 중...';
    btn.disabled = true;

    // 갤러리에 로딩 표시
    gallery.innerHTML = `
      <div class="angle-views-loading">
        <div class="loading-spinner"></div>
        <p>AI가 정면/측면/후면/대각선 이미지를 생성하고 있습니다...</p>
        <p class="loading-sub">약 30초~1분 소요됩니다</p>
      </div>
    `;

    try {
      // 분석 데이터 가져오기
      const analysisData = gender === 'male'
        ? this.currentMaleAnalysis?.data?.analysis
        : this.currentFemaleAnalysis?.data?.analysis;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_angle_views',
          payload: {
            reference_image: this.pendingImageBase64,
            mime_type: this.pendingMimeType || 'image/jpeg',
            gender: gender,
            analysis: analysisData
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data?.images) {
        const images = result.data.images;

        // 갤러리 HTML 생성
        gallery.innerHTML = `
          <div class="angle-views-scroll">
            ${images.map((img, idx) => `
              <div class="angle-view-item ${img.error ? 'error' : ''}">
                ${img.url
                  ? `<img src="${img.url}" alt="${img.angle}" class="angle-view-image" onclick="window.aiStudio.openAngleViewModal('${img.url}', '${img.angle}')">`
                  : `<div class="angle-view-error">
                      <span>⚠️</span>
                      <p>생성 실패</p>
                    </div>`
                }
                <div class="angle-view-label">${img.angle}</div>
              </div>
            `).join('')}
          </div>
          <div class="angle-views-nav">
            <span class="nav-hint">← 스와이프하여 각도별 이미지 확인 →</span>
          </div>
        `;

        // 터치 스크롤 초기화
        this.initAngleViewsScroll();

        console.log(`✅ 각도별 이미지 ${result.data.successCount}/${result.data.totalCount}개 생성 완료`);
        btn.innerHTML = '✅ 생성 완료';
      } else {
        throw new Error(result.error || '이미지 생성 실패');
      }
    } catch (error) {
      console.error('각도별 이미지 생성 오류:', error);
      gallery.innerHTML = `
        <div class="angle-views-error">
          <p>⚠️ 이미지 생성 중 오류가 발생했습니다</p>
          <p class="error-detail">${error.message}</p>
          <button class="retry-btn" onclick="window.aiStudio.generateAngleViews('${gender}')">다시 시도</button>
        </div>
      `;
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // 각도별 이미지 스크롤 초기화
  initAngleViewsScroll() {
    const scrollContainer = document.querySelector('.angle-views-scroll');
    if (!scrollContainer) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    scrollContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      scrollContainer.classList.add('grabbing');
      startX = e.pageX - scrollContainer.offsetLeft;
      scrollLeft = scrollContainer.scrollLeft;
    });

    scrollContainer.addEventListener('mouseleave', () => {
      isDown = false;
      scrollContainer.classList.remove('grabbing');
    });

    scrollContainer.addEventListener('mouseup', () => {
      isDown = false;
      scrollContainer.classList.remove('grabbing');
    });

    scrollContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 2;
      scrollContainer.scrollLeft = scrollLeft - walk;
    });
  }

  // 각도 이미지 모달 열기
  openAngleViewModal(imageUrl, angleLabel) {
    // 간단한 이미지 모달
    const modal = document.createElement('div');
    modal.className = 'angle-view-modal';
    modal.innerHTML = `
      <div class="angle-view-modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="angle-view-modal-content">
        <button class="angle-view-modal-close" onclick="this.closest('.angle-view-modal').remove()">×</button>
        <img src="${imageUrl}" alt="${angleLabel}">
        <div class="angle-view-modal-label">${angleLabel}</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // ==================== 스타일 수정 재분석 ====================

  async reanalyzeWithStyle() {
    const selectEl = document.getElementById('style-correction-select');
    if (!selectEl) return;

    const newStyleCode = selectEl.value;
    if (!newStyleCode) {
      alert('스타일을 선택해주세요.');
      return;
    }

    // 현재 분석 데이터가 없으면 리턴
    if (!this.currentMaleAnalysis || !this.pendingImageBase64) {
      alert('재분석할 이미지 데이터가 없습니다. 이미지를 다시 업로드해주세요.');
      return;
    }

    // 버튼 로딩 상태
    const btn = document.querySelector('.correction-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 재분석 중...';
    btn.disabled = true;

    try {
      // 수정된 스타일 코드로 레시피 재생성 요청
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_male_recipe',
          payload: {
            style_code: newStyleCode,
            image_base64: this.pendingImageBase64,
            mime_type: this.pendingMimeType || 'image/jpeg',
            original_analysis: this.currentMaleAnalysis.data.analysis
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 새 데이터로 캔버스 업데이트
        this.showMaleRecipeCanvas(result.data, this.currentMaleAnalysis.uploadedImageUrl);
        console.log(`✅ ${newStyleCode} 스타일로 재분석 완료!`);
      } else {
        throw new Error(result.error || '재분석 실패');
      }
    } catch (error) {
      console.error('재분석 오류:', error);
      alert('재분석 중 오류가 발생했습니다: ' + error.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // 여자 스타일 재분석 (길이/형태 수정)
  async reanalyzeFemaleWithStyle() {
    const lengthSelect = document.getElementById('length-correction-select');
    const formSelect = document.getElementById('form-correction-select');

    if (!lengthSelect || !formSelect) return;

    const newLengthCode = lengthSelect.value;
    const newForm = formSelect.value;

    if (!newLengthCode || !newForm) {
      alert('길이와 형태를 모두 선택해주세요.');
      return;
    }

    // 현재 분석 데이터가 없으면 리턴
    if (!this.currentFemaleAnalysis || !this.pendingImageBase64) {
      alert('재분석할 이미지 데이터가 없습니다. 이미지를 다시 업로드해주세요.');
      return;
    }

    // 버튼 로딩 상태
    const btn = document.querySelector('.style-correction-section.female .correction-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 재분석 중...';
    btn.disabled = true;

    try {
      // 수정된 길이/형태로 레시피 재생성 요청
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_female_recipe',
          payload: {
            length_code: newLengthCode,
            cut_form: newForm,
            image_base64: this.pendingImageBase64,
            mime_type: this.pendingMimeType || 'image/jpeg',
            original_analysis: this.currentFemaleAnalysis.data.analysis
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // ⭐ 디버그: 서버 응답 확인
        console.log('📦 재분석 서버 응답:', result.data);
        console.log('📦 analysis.length:', result.data.analysis?.length);
        console.log('📦 analysis.lengthName:', result.data.analysis?.lengthName);

        // 새 데이터로 캔버스 업데이트
        this.showCustomRecipeCanvas(result.data, this.currentFemaleAnalysis.uploadedImageUrl);
        console.log(`✅ ${newLengthCode} Length + ${newForm}로 재분석 완료!`);
      } else {
        throw new Error(result.error || '재분석 실패');
      }
    } catch (error) {
      console.error('여자 스타일 재분석 오류:', error);
      alert('재분석 중 오류가 발생했습니다: ' + error.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // 레시피 내용 포맷팅 (세련된 HTML로 변환)
  formatRecipeContent(content) {
    if (!content) return '<p class="recipe-empty">레시피를 불러올 수 없습니다.</p>';

    let formatted = content;

    // 마크다운 헤더 제거 및 변환 (##, ###, ####)
    formatted = formatted
      .replace(/^####\s*(.+)$/gm, '<h5 class="recipe-h5">$1</h5>')
      .replace(/^###\s*(.+)$/gm, '<h4 class="recipe-h4">$1</h4>')
      .replace(/^##\s*(.+)$/gm, '<h3 class="recipe-h3">$1</h3>')
      .replace(/^#\s*(.+)$/gm, '<h2 class="recipe-h2">$1</h2>');

    // 💡 초보자 설명 처리 (전문용어 뒤의 쉬운 설명)
    // 💡로 시작하는 라인을 beginner-tip 클래스로 감싸기
    formatted = formatted.replace(/^💡\s*(.+)$/gm, '<span class="beginner-tip">💡 $1</span>');
    // 인라인 💡 설명 처리 (라인 중간에 있는 경우)
    formatted = formatted.replace(/\s*💡\s*([^<\n]+)/g, '<span class="beginner-tip">💡 $1</span>');

    // 굵은 글씨 **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 기울임 *text*
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 번호 리스트 (1. 2. 3.)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered-item"><span class="num">$1</span>$2</li>');

    // 불릿 리스트 (- item)
    formatted = formatted.replace(/^-\s+(.+)$/gm, '<li class="bullet-item">$1</li>');

    // 연속된 li들을 ul로 감싸기
    formatted = formatted.replace(/(<li class="numbered-item">[\s\S]*?<\/li>)(\n?<li class="numbered-item">)/g, '$1$2');
    formatted = formatted.replace(/(<li class="bullet-item">[\s\S]*?<\/li>)(\n?<li class="bullet-item">)/g, '$1$2');

    // 리스트 그룹화
    let inList = false;
    const lines = formatted.split('\n');
    const result = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('<li')) {
        if (!inList) {
          result.push('<ul class="recipe-list">');
          inList = true;
        }
        result.push(trimmed);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        // beginner-tip은 그대로 유지, 다른 텍스트만 p로 감싸기
        if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<span class="beginner-tip">')) {
          result.push(`<p class="recipe-para">${trimmed}</p>`);
        } else {
          result.push(trimmed);
        }
      }
    }
    if (inList) result.push('</ul>');

    // 빈 p 태그 제거
    formatted = result.join('\n')
      .replace(/<p class="recipe-para"><\/p>/g, '')
      .replace(/<p class="recipe-para">\s*<\/p>/g, '');

    return `<div class="recipe-formatted">${formatted}</div>`;
  }
}

// ==================== Global Functions ====================

function goBack() {
  if (document.referrer && document.referrer.includes(window.location.hostname)) {
    history.back();
  } else {
    window.location.href = 'index.html';
  }
}

// 모바일에서 히스토리 패널 표시
function showHistoryPanel() {
  const canvasPanel = document.getElementById('canvas-panel');
  canvasPanel.classList.add('active');

  // 히스토리 탭 활성화
  document.querySelectorAll('.canvas-tab').forEach(tab => tab.classList.remove('active'));
  const historyTab = document.querySelector('.canvas-tab[data-tab="history"]');
  if (historyTab) historyTab.classList.add('active');

  // 히스토리 로드
  window.aiStudio.switchCanvasTab('history');
}

// 새 채팅 시작 (기존 대화는 유지, 새로운 대화 시작)
function startNewChat() {
  const messages = document.getElementById('chat-messages');
  messages.innerHTML = `
    <div class="message bot">
      <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
      <div class="message-content">
        <p><strong>안녕하세요! HAIRGATOR AI입니다.</strong></p>
        <p>헤어스타일 사진을 업로드하거나 질문해주세요. 2WAY CUT 시스템 기반으로 전문적인 분석과 레시피를 제공해드립니다.</p>
        <div class="message-actions">
          <button class="action-btn" onclick="quickAction('A Length가 뭐야?')">A Length란?</button>
          <button class="action-btn" onclick="quickAction('레이어와 그래쥬에이션 차이')">Layer vs Graduation</button>
          <button class="action-btn" onclick="quickAction('리프팅 각도 설명해줘')">Lifting 설명</button>
        </div>
      </div>
    </div>
  `;

  // 히스토리는 유지하되, 현재 세션 메모리만 초기화
  // Firebase 히스토리는 삭제하지 않음 (히스토리 탭에서 볼 수 있도록)

  // 캔버스 초기화
  const canvasResult = document.getElementById('canvas-result');
  const canvasEmpty = document.getElementById('canvas-empty');
  if (canvasResult) canvasResult.classList.add('hidden');
  if (canvasEmpty) canvasEmpty.classList.remove('hidden');

  // 이미지 프리뷰 초기화
  removePreviewImage();

  console.log('🆕 새 채팅 시작');
}

// 대화 내용 완전 삭제
function clearChat() {
  if (confirm('대화 내용을 모두 삭제하시겠습니까?\n(히스토리도 함께 삭제됩니다)')) {
    window.aiStudio.conversationHistory = [];
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `
      <div class="message bot">
        <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
        <div class="message-content">
          <p><strong>대화가 초기화되었습니다.</strong></p>
          <p>새로운 질문을 입력해주세요.</p>
        </div>
      </div>
    `;

    // Clear Firebase
    if (window.aiStudio.currentUserId && window.db) {
      window.aiStudio.clearFirebaseHistory();
    }

    // 캔버스 초기화
    const canvasResult = document.getElementById('canvas-result');
    const canvasEmpty = document.getElementById('canvas-empty');
    if (canvasResult) canvasResult.classList.add('hidden');
    if (canvasEmpty) canvasEmpty.classList.remove('hidden');
  }
}

// ==================== 이미지 업로드 함수들 ====================

// 대기 중인 이미지 저장
let pendingImageData = null;

// 선택된 성별 저장
let selectedGender = null;

// 성별 선택 함수
function selectGender(gender) {
  selectedGender = gender;

  // 버튼 UI 업데이트
  const femaleBtn = document.getElementById('gender-female');
  const maleBtn = document.getElementById('gender-male');

  femaleBtn.classList.remove('selected');
  maleBtn.classList.remove('selected');

  if (gender === 'female') {
    femaleBtn.classList.add('selected');
  } else if (gender === 'male') {
    maleBtn.classList.add('selected');
  }

  console.log(`🎯 성별 선택: ${gender}`);
}

function triggerImageUpload() {
  document.getElementById('image-upload').click();
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 유효성 검사
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드 가능합니다.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('이미지 크기는 10MB 이하여야 합니다.');
    return;
  }

  // 미리보기 표시
  const imageUrl = URL.createObjectURL(file);
  const previewArea = document.getElementById('image-preview-area');
  const previewImage = document.getElementById('preview-image');

  previewImage.src = imageUrl;
  previewArea.style.display = 'block';

  // 파일 데이터 저장
  pendingImageData = {
    file: file,
    url: imageUrl
  };

  console.log('📷 이미지 선택됨:', file.name);
  console.log('📷 pendingImageData 설정됨:', pendingImageData);

  // 파일 입력 초기화
  event.target.value = '';
}

function removePreviewImage() {
  const previewArea = document.getElementById('image-preview-area');
  const previewImage = document.getElementById('preview-image');

  if (pendingImageData && pendingImageData.url) {
    URL.revokeObjectURL(pendingImageData.url);
  }

  previewImage.src = '';
  previewArea.style.display = 'none';
  pendingImageData = null;

  // 성별 선택 초기화
  selectedGender = null;
  document.getElementById('gender-female').classList.remove('selected');
  document.getElementById('gender-male').classList.remove('selected');

  console.log('🗑️ 이미지 제거됨');
}

async function sendImageWithQuestion() {
  if (!pendingImageData) return false;

  // 성별 선택 검증
  if (!selectedGender) {
    alert('성별을 선택해주세요.');
    return false;
  }

  const textInput = document.getElementById('chat-input');
  const question = textInput.value.trim() || '이 헤어스타일에 맞는 레시피를 만들어주세요';

  // 성별 표시 텍스트
  const genderText = selectedGender === 'male' ? '👨 남자' : '👩 여자';

  // 사용자 메시지 표시 (이미지 + 성별 + 텍스트)
  window.aiStudio.addMessageToUI('user', `
    <img src="${pendingImageData.url}" style="max-width: 200px; border-radius: 8px; margin-bottom: 8px;" alt="업로드된 이미지">
    <p><strong>${genderText}</strong></p>
    <p>${question}</p>
  `);

  // 미리보기 숨기기
  document.getElementById('image-preview-area').style.display = 'none';

  // 입력창 초기화
  textInput.value = '';

  // 타이핑 표시
  window.aiStudio.showTypingIndicator();

  try {
    // Base64 변환
    const base64 = await window.aiStudio.fileToBase64(pendingImageData.file);

    // 재분석용 이미지 데이터 저장
    window.aiStudio.pendingImageBase64 = base64;
    window.aiStudio.pendingMimeType = pendingImageData.file.type;

    console.log(`📤 맞춤 레시피 생성 API 호출... (성별: ${selectedGender})`);

    // API 호출 - 이미지 분석 + 맞춤 레시피 생성 (성별 포함)
    const response = await fetch(window.aiStudio.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_and_match_recipe',
        payload: {
          image_base64: base64,
          mime_type: pendingImageData.file.type,
          gender: selectedGender
        }
      })
    });

    const result = await response.json();
    console.log('📥 API 응답:', result);

    window.aiStudio.hideTypingIndicator();

    if (result.success && result.data) {
      const data = result.data;
      let analysisMsg;

      // 필수 데이터 확인
      if (!data.targetSeries || !data.analysis || !data.referenceStyles) {
        console.error('❌ API 응답 데이터 불완전:', data);
        window.aiStudio.addMessageToUI('bot', '분석 결과가 불완전합니다. 다시 시도해주세요.');
        return;
      }

      // 남자/여자에 따라 분석 결과 메시지 분기
      if (data.gender === 'male') {
        // 남자 스타일 분석 결과
        analysisMsg = `**👨 남자 스타일 분석 완료!**

💇 **스타일**: ${data.analysis.styleName || '분석중'} (${data.analysis.styleCode || '-'})
📏 **탑 길이**: ${data.analysis.topLength || '-'}
📐 **사이드 길이**: ${data.analysis.sideLength || '-'}
✂️ **페이드**: ${data.analysis.fadeType || 'None'}
🎨 **텍스처**: ${data.analysis.texture || '-'}
💆 **스타일링 제품**: ${data.analysis.productType || '-'}

📁 **대상 시리즈**: ${data.targetSeries.code || '-'} - ${data.targetSeries.name || ''} (${data.targetSeries.totalStyles || 0}개 스타일)

🎯 **매칭 스타일**: ${data.referenceStyles[0]?.styleId || '-'}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      } else {
        // 여자 스타일 분석 결과 (기존 로직)
        analysisMsg = `**👩 여자 스타일 분석 완료!**

📏 **기장**: ${data.analysis.lengthName || '-'}
✂️ **형태**: ${data.analysis.form || '-'}
💇 **앞머리**: ${data.analysis.hasBangs ? data.analysis.bangsType : '없음'}
📐 **볼륨**: ${data.analysis.volumePosition || '-'}
🎨 **텍스처**: ${data.analysis.texture || '-'}

📁 **대상 시리즈**: ${data.targetSeries.code || '-'} (${data.targetSeries.totalStyles || 0}개 스타일)

🎯 **매칭 스타일**: ${data.referenceStyles[0]?.styleId || '-'}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      }

      window.aiStudio.addMessageToUI('bot', analysisMsg);

      // ⭐ 레시피 분석 결과를 대화 히스토리에 저장 (후속 질문 컨텍스트용)
      window.aiStudio.conversationHistory.push({
        sender: 'user',
        content: `[이미지 업로드] ${genderText} 헤어스타일 레시피 생성 요청`,
        timestamp: Date.now()
      });

      // ⭐ 분석 결과를 상세하게 히스토리에 저장
      let recipeContext;
      if (data.gender === 'male') {
        recipeContext = `[레시피 분석 결과]
성별: 남자
스타일 코드: ${data.analysis.styleCode || '-'}
스타일명: ${data.analysis.styleName || '-'}
서브스타일: ${data.analysis.subStyle || '-'}
탑 길이: ${data.analysis.topLength || '-'}
사이드 길이: ${data.analysis.sideLength || '-'}
페이드: ${data.analysis.fadeType || 'None'}
텍스처: ${data.analysis.texture || '-'}
스타일링 방향: ${data.analysis.stylingDirection || '-'}
추천 제품: ${data.analysis.productType || '-'}
참고 스타일: ${data.referenceStyles.map(s => s.styleId).join(', ')}
${data.recipe ? `\n생성된 레시피:\n${data.recipe}` : ''}`;
      } else {
        recipeContext = `[레시피 분석 결과]
성별: 여자
기장: ${data.analysis.lengthName || '-'}
형태: ${data.analysis.form || '-'}
앞머리: ${data.analysis.hasBangs ? data.analysis.bangsType : '없음'}
볼륨 위치: ${Array.isArray(data.analysis.volumePosition) ? data.analysis.volumePosition.join(', ') : data.analysis.volumePosition || '-'}
텍스처: ${data.analysis.texture || '-'}
리프팅: ${Array.isArray(data.analysis.liftingRange) ? data.analysis.liftingRange.join(', ') : data.analysis.liftingRange || '-'}
섹션: ${data.analysis.sectionPrimary || '-'}
연결: ${data.analysis.connectionType || '-'}
참고 스타일: ${data.referenceStyles.map(s => s.styleId).join(', ')}
${data.customRecipe ? `\n생성된 레시피:\n${data.customRecipe}` : ''}`;
      }

      window.aiStudio.conversationHistory.push({
        sender: 'bot',
        content: recipeContext,
        timestamp: Date.now(),
        isRecipeContext: true  // 레시피 컨텍스트 표시
      });

      // ⭐ 현재 활성 레시피 컨텍스트 저장 (API 호출 시 사용)
      window.aiStudio.currentRecipeContext = {
        gender: data.gender,
        analysis: data.analysis,
        referenceStyles: data.referenceStyles,
        recipe: data.gender === 'male' ? data.recipe : data.customRecipe,
        timestamp: Date.now()
      };

      // 캔버스에 맞춤 레시피 표시
      window.aiStudio.showCustomRecipeCanvas(data, pendingImageData.url);

    } else {
      window.aiStudio.addMessageToUI('bot', result.error || '레시피 생성에 실패했습니다. 다시 시도해주세요.');
    }

  } catch (error) {
    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', '레시피 생성 중 오류가 발생했습니다.');
    console.error('❌ 레시피 생성 오류:', error);
  }

  // 이미지 데이터 및 성별 선택 초기화
  pendingImageData = null;
  selectedGender = null;

  return true;
}

async function sendMessage() {
  console.log('🔍 sendMessage 호출됨, pendingImageData:', pendingImageData);

  // 이미지가 있으면 이미지와 함께 전송
  if (pendingImageData && pendingImageData.file) {
    console.log('📷 이미지와 함께 전송 시작');
    await sendImageWithQuestion();
    return;
  }

  // 텍스트만 전송
  console.log('📝 텍스트만 전송');
  if (window.aiStudio && typeof window.aiStudio.sendMessage === 'function') {
    window.aiStudio.sendMessage();
  } else {
    console.error('❌ aiStudio가 초기화되지 않았습니다');
  }
}

function quickAction(query) {
  if (window.aiStudio && typeof window.aiStudio.sendMessage === 'function') {
    window.aiStudio.sendMessage(query);
  } else {
    console.error('❌ aiStudio가 초기화되지 않았습니다');
  }
}

// 스타일 검색 데모 함수
async function searchStylesDemo(query) {
  if (!window.aiStudio) {
    console.error('❌ aiStudio가 초기화되지 않았습니다');
    return;
  }

  // 사용자 메시지 표시
  window.aiStudio.addMessageToUI('user', `🔍 유사 스타일 검색: "${query}"`);

  // 타이핑 표시
  window.aiStudio.showTypingIndicator();

  try {
    // 스타일 검색 API 호출
    const searchData = await window.aiStudio.searchSimilarStyles(query, 3);

    window.aiStudio.hideTypingIndicator();

    if (searchData && searchData.results && searchData.results.length > 0) {
      // 결과 메시지 표시
      const resultMsg = `✅ **${searchData.results.length}개의 유사 스타일을 찾았습니다!**\n\n` +
        searchData.results.map((s, i) =>
          `${i + 1}. **${s.styleId}** (${s.seriesName}) - 유사도 ${(s.similarity * 100).toFixed(1)}%`
        ).join('\n') +
        `\n\n👉 오른쪽 캔버스에서 상세 정보를 확인하세요.`;

      window.aiStudio.addMessageToUI('bot', resultMsg);

      // 캔버스에 결과 표시
      window.aiStudio.showStyleSearchResults(searchData);
    } else {
      window.aiStudio.addMessageToUI('bot', '죄송합니다. 유사한 스타일을 찾지 못했습니다. 다른 검색어를 시도해보세요.');
    }
  } catch (error) {
    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', '스타일 검색 중 오류가 발생했습니다.');
    console.error('❌ 스타일 검색 오류:', error);
  }
}

function hideCanvas() {
  window.aiStudio.hideCanvas();
}

function saveResult() {
  window.aiStudio.saveResult();
}

function shareResult() {
  window.aiStudio.shareResult();
}

// ==================== Initialize ====================

document.addEventListener('DOMContentLoaded', () => {
  window.aiStudio = new AIStudio();
  console.log('✅ HAIRGATOR AI Studio Ready');
});
