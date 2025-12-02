// ============================================================
// HAIRGATOR AI Studio - Pro Workstation JavaScript
// Split View Layout + Firebase Integration
// ============================================================

class AIStudio {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.currentLanguage = this.getStoredLanguage();
    this.conversationHistory = [];
    this.currentUserId = null;
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

  async init() {
    console.log('🚀 HAIRGATOR AI Studio 초기화 중...');

    // Event Listeners
    this.setupEventListeners();

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
      });
    });
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

      this.addMessageToUI(msg.sender, msg.content, false);
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

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_response_stream',
        payload: {
          user_query: query,
          language: this.currentLanguage
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

    const avatar = sender === 'bot' ? '🤖' : '👤';

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
      <div class="message-avatar">${avatar}</div>
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
      <div class="message-avatar">🤖</div>
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

    const { analysis, targetSeries, referenceStyles, customRecipe, mainDiagrams } = data;

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas">
        <!-- 헤더: 업로드 이미지 + 분석 결과 (컴팩트) -->
        <div class="recipe-header compact">
          <div class="uploaded-image-section">
            <img src="${uploadedImageUrl}" alt="업로드한 이미지" class="uploaded-image">
            <div class="analysis-badge">${analysis.lengthName}</div>
          </div>
          <div class="analysis-summary">
            <h2>🎯 맞춤 레시피</h2>
            <div class="analysis-tags">
              <span class="tag">${analysis.form}</span>
              <span class="tag">${analysis.hasBangs ? analysis.bangsType : '앞머리 없음'}</span>
              <span class="tag">${analysis.volumePosition} 볼륨</span>
            </div>
          </div>
        </div>

        <!-- 도해도 - 크게 표시 -->
        <div class="diagrams-section large">
          <h3>📐 도해도 (${mainDiagrams.length}장)</h3>
          <div class="diagrams-grid-large">
            ${mainDiagrams.map((d, idx) => `
              <div class="diagram-item-large" onclick="window.open('${d.url}', '_blank')">
                <img src="${d.url}" alt="Step ${d.step}" title="Step ${d.step}">
                <span class="step-label">Step ${d.step}</span>
              </div>
            `).join('')}
          </div>
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
  }

  // 레시피 내용 포맷팅
  formatRecipeContent(content) {
    if (!content) return '<p>레시피를 불러올 수 없습니다.</p>';

    // 마크다운 기본 변환
    let formatted = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n- /g, '</p><li>')
      .replace(/\n(\d+)\. /g, '</p><li class="numbered">')
      .replace(/\n/g, '<br>');

    // 리스트 래핑
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/<li>/g, '</ul><ul><li>').replace('</ul><ul>', '<ul>');
      formatted += '</ul>';
    }

    return `<p>${formatted}</p>`;
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

function clearChat() {
  if (confirm('대화 내용을 모두 삭제하시겠습니까?')) {
    window.aiStudio.conversationHistory = [];
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `
      <div class="message bot">
        <div class="message-avatar">🤖</div>
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
  }
}

// ==================== 이미지 업로드 함수들 ====================

// 대기 중인 이미지 저장
let pendingImageData = null;

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

  console.log('🗑️ 이미지 제거됨');
}

async function sendImageWithQuestion() {
  if (!pendingImageData) return false;

  const textInput = document.getElementById('chat-input');
  const question = textInput.value.trim() || '이 헤어스타일에 맞는 레시피를 만들어주세요';

  // 사용자 메시지 표시 (이미지 + 텍스트)
  window.aiStudio.addMessageToUI('user', `
    <img src="${pendingImageData.url}" style="max-width: 200px; border-radius: 8px; margin-bottom: 8px;" alt="업로드된 이미지">
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

    console.log('📤 맞춤 레시피 생성 API 호출...');

    // API 호출 - 이미지 분석 + 맞춤 레시피 생성
    const response = await fetch(window.aiStudio.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_and_match_recipe',
        payload: {
          image_base64: base64,
          mime_type: pendingImageData.file.type
        }
      })
    });

    const result = await response.json();
    console.log('📥 API 응답:', result);

    window.aiStudio.hideTypingIndicator();

    if (result.success && result.data) {
      const data = result.data;

      // 분석 결과 메시지 표시
      const analysisMsg = `**📊 스타일 분석 완료!**

📏 **기장**: ${data.analysis.lengthName}
✂️ **형태**: ${data.analysis.form}
💇 **앞머리**: ${data.analysis.hasBangs ? data.analysis.bangsType : '없음'}
📐 **볼륨**: ${data.analysis.volumePosition}
🎨 **텍스처**: ${data.analysis.texture}

📁 **대상 시리즈**: ${data.targetSeries.code} (${data.targetSeries.totalStyles}개 스타일)

🎯 **참고 스타일 Top-3**:
${data.referenceStyles.map((s, i) => `  ${i+1}. ${s.styleId} - ${s.featureReasons.join(', ')}`).join('\n')}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;

      window.aiStudio.addMessageToUI('bot', analysisMsg);

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

  // 이미지 데이터 초기화
  pendingImageData = null;

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
