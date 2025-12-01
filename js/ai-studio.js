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
    // Send Message
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
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

  async sendMessage() {
    const text = this.chatInput.value.trim();
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Parse SSE response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') break;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'content') {
              fullContent += data.content;
            }
          } catch (e) {
            // Skip parse errors
          }
        }
      }
    }

    // Check if response contains recipe-like content
    const hasRecipeData = this.detectRecipeContent(fullContent);

    return {
      content: fullContent,
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

// 이미지 업로드 비활성화 - 멀티모달 정확도 개선 후 복구 예정
// function uploadImage() {
//   document.getElementById('image-upload').click();
// }

function sendMessage() {
  window.aiStudio.sendMessage();
}

function quickAction(query) {
  document.getElementById('chat-input').value = query;
  window.aiStudio.sendMessage();
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
