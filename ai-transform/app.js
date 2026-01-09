/**
 * HAIRGATOR AI Transform
 * Face Swap & Video Generation
 *
 * 얼굴변환 흐름:
 * - sourceImage (01 원본): 헤어스타일을 유지할 사진 → vModel source
 * - targetFace (02 참조): 바꿔 넣을 얼굴 사진 → vModel target
 * - 결과: sourceImage의 헤어스타일 + targetFace의 얼굴
 */

(function() {
    'use strict';

    // ============ State ============
    const state = {
        currentTab: 'faceSwap',
        sourceImage: null,  // 헤어스타일 유지할 원본 사진
        targetFace: null,   // 바꿔 넣을 얼굴 사진
        videoSource: null,
        videoDuration: 5,
        userId: null,
        tokenBalance: 0,    // HAIRGATOR 토큰
        isProcessing: false
    };

    // ============ Constants ============
    const COSTS = {
        faceSwap: 300,    // 얼굴 변환: 300 토큰
        video5sec: 500,   // 영상 5초: 500 토큰
        video8sec: 800    // 영상 8초: 800 토큰
    };

    const API_BASE = '/.netlify/functions';

    // ============ Initialize ============
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        loadTheme();
        bindTabEvents();
        bindUploadEvents();
        bindOptionEvents();
        bindActionEvents();
        loadUserCredits();
    }

    // ============ Theme ============
    function loadTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    // ============ Tab Navigation ============
    function bindTabEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                switchTab(tab);
            });
        });
    }

    function switchTab(tabId) {
        state.currentTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabId + 'Panel');
        });
    }

    // ============ Upload Events ============
    function bindUploadEvents() {
        // Source image (헤어스타일 유지할 원본)
        const sourceInput = document.getElementById('sourceImageInput');
        if (sourceInput) {
            sourceInput.addEventListener('change', (e) => handleUpload(e, 'source'));
        }

        // Target face (바꿔 넣을 얼굴)
        const targetInput = document.getElementById('targetFaceInput');
        if (targetInput) {
            targetInput.addEventListener('change', (e) => handleUpload(e, 'target'));
        }

        // Video source
        const videoInput = document.getElementById('videoSourceInput');
        if (videoInput) {
            videoInput.addEventListener('change', (e) => handleUpload(e, 'video'));
        }
    }

    function handleUpload(e, type) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;

            if (type === 'source') {
                state.sourceImage = dataUrl;
                updateUploadCard('sourceImageCard', dataUrl);
                checkFaceSwapReady();
            } else if (type === 'target') {
                state.targetFace = dataUrl;
                updateUploadCard('targetFaceCard', dataUrl);
                checkFaceSwapReady();
            } else if (type === 'video') {
                state.videoSource = dataUrl;
                updateVideoUploadCard(dataUrl);
                checkVideoGenReady();
            }
        };
        reader.readAsDataURL(file);
    }

    function updateUploadCard(cardId, dataUrl) {
        const card = document.getElementById(cardId);
        if (!card) return;

        card.classList.add('has-image');

        // Remove placeholder and add image
        const placeholder = card.querySelector('.upload-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        let img = card.querySelector('img');
        if (!img) {
            img = document.createElement('img');
            card.insertBefore(img, card.firstChild);
        }
        img.src = dataUrl;
    }

    function updateVideoUploadCard(dataUrl) {
        const card = document.getElementById('videoSourceCard');
        if (!card) return;

        card.classList.add('has-image');

        const placeholder = card.querySelector('.upload-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        let img = card.querySelector('img');
        if (!img) {
            img = document.createElement('img');
            card.insertBefore(img, card.firstChild);
        }
        img.src = dataUrl;
    }

    // ============ Option Events ============
    function bindOptionEvents() {
        // Video duration options
        document.querySelectorAll('.option-btn[data-duration]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.option-btn[data-duration]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.videoDuration = parseInt(btn.dataset.duration);
                updateVideoCost();
            });
        });
    }

    function updateVideoCost() {
        const costEl = document.getElementById('videoCreditCost');
        if (costEl) {
            const cost = state.videoDuration === 5 ? COSTS.video5sec : COSTS.video8sec;
            costEl.textContent = cost;
        }
    }

    // ============ Action Events ============
    function bindActionEvents() {
        const faceSwapBtn = document.getElementById('faceSwapBtn');
        if (faceSwapBtn) {
            faceSwapBtn.addEventListener('click', handleFaceSwap);
        }

        const videoGenBtn = document.getElementById('videoGenBtn');
        if (videoGenBtn) {
            videoGenBtn.addEventListener('click', handleVideoGen);
        }
    }

    function checkFaceSwapReady() {
        const btn = document.getElementById('faceSwapBtn');
        if (btn) {
            btn.disabled = !(state.sourceImage && state.targetFace);
        }
    }

    function checkVideoGenReady() {
        const btn = document.getElementById('videoGenBtn');
        if (btn) {
            btn.disabled = !state.videoSource;
        }
    }

    // ============ Face Swap ============
    async function handleFaceSwap() {
        if (state.isProcessing) return;
        if (!state.sourceImage || !state.targetFace) {
            showToast('원본 사진과 참조 얼굴을 모두 업로드해주세요', 'error');
            return;
        }

        // Check credits
        if (state.tokenBalance < COSTS.faceSwap) {
            showToast(`토큰이 부족합니다 (필요: ${COSTS.faceSwap})`, 'error');
            return;
        }

        state.isProcessing = true;
        showLoading('얼굴 변환 중...', '잠시만 기다려주세요');

        try {
            // vModel API 파라미터:
            // - styleImageUrl (source): 헤어스타일 유지할 사진 = sourceImage
            // - customerPhotoUrl (target): 바꿔 넣을 얼굴 = targetFace
            const response = await fetch(`${API_BASE}/hair-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start',
                    styleImageUrl: state.sourceImage,      // 헤어스타일 유지 (source)
                    customerPhotoUrl: state.targetFace     // 바꿔 넣을 얼굴 (target)
                })
            });

            const data = await response.json();

            if (data.taskId) {
                // Poll for result
                await pollFaceSwapStatus(data.taskId);
            } else if (data.resultUrl || data.result) {
                showFaceSwapResult(data.resultUrl || data.result);
                await deductCredits(COSTS.faceSwap, 'faceSwap');
            } else {
                throw new Error(data.error || '얼굴 변환에 실패했습니다');
            }
        } catch (error) {
            console.error('Face swap error:', error);
            showToast(error.message || '얼굴 변환 중 오류가 발생했습니다', 'error');
        } finally {
            state.isProcessing = false;
            hideLoading();
        }
    }

    async function pollFaceSwapStatus(taskId, attempt = 0) {
        const maxAttempts = 30;
        const interval = 2000;

        if (attempt >= maxAttempts) {
            throw new Error('처리 시간이 초과되었습니다');
        }

        updateLoading(`얼굴 변환 중... (${attempt + 1}/${maxAttempts})`);

        const response = await fetch(`${API_BASE}/hair-change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status', taskId })
        });

        const data = await response.json();

        if (data.status === 'completed' && (data.resultUrl || data.result)) {
            showFaceSwapResult(data.resultUrl || data.result);
            await deductCredits(COSTS.faceSwap, 'faceSwap');
            return;
        } else if (data.status === 'failed') {
            throw new Error(data.error || '얼굴 변환에 실패했습니다');
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        return pollFaceSwapStatus(taskId, attempt + 1);
    }

    function showFaceSwapResult(imageUrl) {
        const resultSection = document.getElementById('faceSwapResult');
        const resultImg = document.getElementById('faceSwapResultImg');

        if (resultSection && resultImg) {
            resultImg.src = imageUrl;
            resultSection.classList.add('visible');
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ============ Video Generation ============
    async function handleVideoGen() {
        if (state.isProcessing) return;
        if (!state.videoSource) {
            showToast('이미지를 업로드해주세요', 'error');
            return;
        }

        const tokenCost = state.videoDuration === 5 ? COSTS.video5sec : COSTS.video8sec;
        if (state.tokenBalance < tokenCost) {
            showToast(`토큰이 부족합니다 (필요: ${tokenCost})`, 'error');
            return;
        }

        state.isProcessing = true;
        showLoading('영상 생성 중...', '3~8분 정도 소요됩니다');

        try {
            const response = await fetch(`${API_BASE}/gemini-video-proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: [state.videoSource.split(',')[1]],
                    duration: state.videoDuration,
                    aspectRatio: '9:16',
                    prompt: '자연스럽게 움직이는 헤어스타일'
                })
            });

            const data = await response.json();

            if (data.operationName) {
                await pollVideoStatus(data.operationName);
                await deductCredits(tokenCost, 'videoGen');
            } else if (data.videoUrl) {
                showVideoResult(data.videoUrl);
                await deductCredits(tokenCost, 'videoGen');
            } else {
                throw new Error(data.error || '영상 생성에 실패했습니다');
            }
        } catch (error) {
            console.error('Video gen error:', error);
            showToast(error.message || '영상 생성 중 오류가 발생했습니다', 'error');
        } finally {
            state.isProcessing = false;
            hideLoading();
        }
    }

    async function pollVideoStatus(operationName, attempt = 0) {
        const maxAttempts = 60;
        const interval = 5000;

        if (attempt >= maxAttempts) {
            throw new Error('처리 시간이 초과되었습니다');
        }

        const minutes = Math.floor((attempt * 5) / 60);
        const seconds = (attempt * 5) % 60;
        updateLoading(`영상 생성 중... ${minutes}분 ${seconds}초`);

        const response = await fetch(`${API_BASE}/gemini-video-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName })
        });

        const data = await response.json();

        if (data.done) {
            if (data.videoUrl) {
                showVideoResult(data.videoUrl);
                return;
            } else if (data.error) {
                throw new Error(data.error);
            }
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        return pollVideoStatus(operationName, attempt + 1);
    }

    function showVideoResult(videoUrl) {
        const resultContainer = document.getElementById('videoResult');
        const videoPlayer = document.getElementById('videoResultPlayer');

        if (resultContainer && videoPlayer) {
            videoPlayer.src = videoUrl;
            resultContainer.classList.add('visible');
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ============ Credits (HAIRGATOR Token) ============
    async function loadUserCredits() {
        try {
            // Wait for Firebase Bridge to be ready
            if (window.FirebaseBridge) {
                await waitForAuth();
                const user = window.currentDesigner;
                if (user) {
                    state.userId = user.id;
                    state.tokenBalance = user.tokenBalance || 0;
                    updateCreditDisplay();
                }
            }
        } catch (error) {
            console.error('Error loading credits:', error);
        }
    }

    function waitForAuth() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.currentDesigner) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async function deductCredits(tokenCost, feature) {
        try {
            // HAIRGATOR 토큰 차감
            if (window.FirebaseBridge && window.FirebaseBridge.deductTokens) {
                await window.FirebaseBridge.deductTokens(tokenCost, feature);
            }
            state.tokenBalance -= tokenCost;
            updateCreditDisplay();
        } catch (error) {
            console.error('Error deducting credits:', error);
        }
    }

    function updateCreditDisplay() {
        const display = document.getElementById('creditDisplay');
        if (display) {
            // 토큰 잔액 표시
            display.textContent = state.tokenBalance.toLocaleString();
        }
    }

    // ============ UI Helpers ============
    function showLoading(title, desc) {
        const overlay = document.getElementById('loadingOverlay');
        const textEl = document.getElementById('loadingText');
        const progressEl = document.getElementById('loadingProgress');

        if (overlay) overlay.classList.add('visible');
        if (textEl) textEl.textContent = title || '처리 중...';
        if (progressEl) progressEl.textContent = desc || '';
    }

    function updateLoading(text) {
        const progressEl = document.getElementById('loadingProgress');
        if (progressEl) progressEl.textContent = text;
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('visible');
    }

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'toast visible ' + type;

        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }

    // ============ Download & Reset ============
    window.downloadResult = function(type) {
        let url, filename;

        if (type === 'faceSwap') {
            const img = document.getElementById('faceSwapResultImg');
            url = img?.src;
            filename = 'hairgator-faceswap.png';
        } else if (type === 'video') {
            const video = document.getElementById('videoResultPlayer');
            url = video?.src;
            filename = 'hairgator-video.mp4';
        }

        if (url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
        }
    };

    window.resetFaceSwap = function() {
        state.sourceImage = null;
        state.targetFace = null;

        // Reset cards
        ['sourceImageCard', 'targetFaceCard'].forEach(id => {
            const card = document.getElementById(id);
            if (card) {
                card.classList.remove('has-image');
                const img = card.querySelector('img');
                if (img) img.remove();
                const placeholder = card.querySelector('.upload-placeholder');
                if (placeholder) placeholder.style.display = '';
            }
        });

        // Reset inputs
        const sourceInput = document.getElementById('sourceImageInput');
        const targetInput = document.getElementById('targetFaceInput');
        if (sourceInput) sourceInput.value = '';
        if (targetInput) targetInput.value = '';

        // Hide result
        const result = document.getElementById('faceSwapResult');
        if (result) result.classList.remove('visible');

        checkFaceSwapReady();
    };

    window.resetVideoGen = function() {
        state.videoSource = null;

        const card = document.getElementById('videoSourceCard');
        if (card) {
            card.classList.remove('has-image');
            const img = card.querySelector('img');
            if (img) img.remove();
            const placeholder = card.querySelector('.upload-placeholder');
            if (placeholder) placeholder.style.display = '';
        }

        document.getElementById('videoSourceInput').value = '';

        const result = document.getElementById('videoResult');
        if (result) result.classList.remove('visible');

        checkVideoGenReady();
    };

})();
