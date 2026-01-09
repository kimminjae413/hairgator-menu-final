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
        faceSwap: 300,       // 얼굴 변환: 300 토큰
        video5sec: 500,      // 영상 5초: 500 토큰
        video8sec: 800,      // 영상 8초: 800 토큰
        imageTransform: 200  // 의상/배경 변환: 200 토큰
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

        // 의상/배경 옵션 미리 가져오기
        const clothingSelect = document.getElementById('clothingSelect');
        const backgroundSelect = document.getElementById('backgroundSelect');
        const clothingPrompt = clothingSelect?.value || '';
        const backgroundPrompt = backgroundSelect?.value || '';
        const hasTransformOptions = clothingPrompt || backgroundPrompt;

        state.isProcessing = true;
        showLoading('얼굴 변환 중...', '잠시만 기다려주세요');

        try {
            // Step 1: VModel 얼굴 변환
            console.log('🔄 Step 1: VModel 얼굴 변환 시작');
            const response = await fetch(`${API_BASE}/face-swap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start',
                    targetImage: state.sourceImage,
                    swapImage: state.targetFace
                })
            });

            const data = await response.json();
            let faceSwapResultUrl = null;

            if (data.taskId) {
                faceSwapResultUrl = await pollFaceSwapStatus(data.taskId, hasTransformOptions);
            } else if (data.resultUrl || data.result) {
                faceSwapResultUrl = data.resultUrl || data.result;
            } else {
                throw new Error(data.error || '얼굴 변환에 실패했습니다');
            }

            // Step 2: 의상/배경 옵션이 있으면 Gemini 변환
            if (hasTransformOptions && faceSwapResultUrl) {
                console.log('🔄 Step 2: Gemini 의상/배경 변환 시작');
                updateLoading('의상/배경 변환 중...');

                const finalResult = await applyGeminiTransform(faceSwapResultUrl, clothingPrompt, backgroundPrompt);
                if (finalResult) {
                    faceSwapResultUrl = finalResult;
                }
            }

            // 최종 결과 표시
            showFaceSwapResult(faceSwapResultUrl);

            // 토큰 차감 (300토큰 - 의상/배경 포함)
            await deductCredits('faceSwap', {
                feature: 'AI 얼굴변환',
                clothing: clothingPrompt || '없음',
                background: backgroundPrompt || '없음'
            });

            // 선택 초기화
            if (clothingSelect) clothingSelect.value = '';
            if (backgroundSelect) backgroundSelect.value = '';

        } catch (error) {
            console.error('Face swap error:', error);
            showToast(error.message || '얼굴 변환 중 오류가 발생했습니다', 'error');
        } finally {
            state.isProcessing = false;
            hideLoading();
        }
    }

    async function pollFaceSwapStatus(taskId, hasTransformOptions = false, attempt = 0) {
        const maxAttempts = 30;
        const interval = 2000;

        if (attempt >= maxAttempts) {
            throw new Error('처리 시간이 초과되었습니다');
        }

        updateLoading(`얼굴 변환 중... (${attempt + 1}/${maxAttempts})`);

        const response = await fetch(`${API_BASE}/face-swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status', taskId })
        });

        const data = await response.json();

        if (data.status === 'completed' && (data.resultUrl || data.result)) {
            // URL 반환 (handleFaceSwap에서 Gemini 변환 체인 처리)
            return data.resultUrl || data.result;
        } else if (data.status === 'failed') {
            throw new Error(data.error || '얼굴 변환에 실패했습니다');
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        return pollFaceSwapStatus(taskId, hasTransformOptions, attempt + 1);
    }

    // Gemini 의상/배경 변환
    async function applyGeminiTransform(imageUrl, clothingPrompt, backgroundPrompt) {
        try {
            // URL을 base64로 변환
            let imageBase64 = imageUrl;
            if (!imageUrl.startsWith('data:')) {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                imageBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }

            console.log('🎨 Gemini 변환 요청');
            console.log('- 의상:', clothingPrompt || '변경 안함');
            console.log('- 배경:', backgroundPrompt || '변경 안함');

            const response = await fetch(`${API_BASE}/image-transform`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: imageBase64,
                    clothingPrompt: clothingPrompt,
                    backgroundPrompt: backgroundPrompt
                })
            });

            const data = await response.json();

            if (data.success && data.resultImage) {
                console.log('✅ Gemini 변환 완료');
                return data.resultImage;
            } else {
                console.warn('⚠️ Gemini 변환 실패:', data.error || data.message);
                showToast('의상/배경 변환 실패. 얼굴 변환 결과만 표시합니다.', 'error');
                return null; // 실패해도 얼굴 변환 결과는 유지
            }
        } catch (error) {
            console.error('Gemini transform error:', error);
            showToast('의상/배경 변환 중 오류. 얼굴 변환 결과만 표시합니다.', 'error');
            return null;
        }
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

        // 토큰 체크는 API 성공 후 FirebaseBridge에서 처리 (룩북/헤어체험 패턴)
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

            // 영상 길이에 따른 feature 이름 결정
            const videoFeature = state.videoDuration === 5 ? 'video5sec' : 'video8sec';

            if (data.operationName) {
                await pollVideoStatus(data.operationName);
                // 토큰 차감 (룩북/헤어체험 패턴)
                await deductCredits(videoFeature, { feature: `AI 영상생성 ${state.videoDuration}초` });
            } else if (data.videoUrl) {
                showVideoResult(data.videoUrl);
                // 토큰 차감 (룩북/헤어체험 패턴)
                await deductCredits(videoFeature, { feature: `AI 영상생성 ${state.videoDuration}초` });
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
    function loadUserCredits() {
        console.log('🔄 AI Transform 토큰 로드 시작...');

        // 1. URL 파라미터에서 토큰 로드 (가장 확실한 방법)
        const loaded = loadFromUrlParams();

        // 2. URL 파라미터 없으면 localStorage에서 로드
        if (!loaded) {
            loadFromLocalStorage();
        }

        // 3. Firebase Auth 준비되면 Firestore에서 최신 값 업데이트 (비동기적)
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('✅ Firebase Auth 사용자:', user.email || user.uid);
                    await fetchTokenBalanceFromFirestore(user);
                }
            });
        }
    }

    // URL 파라미터에서 토큰 로드 (메인 페이지에서 전달)
    function loadFromUrlParams() {
        try {
            const params = new URLSearchParams(window.location.search);
            const tokenParam = params.get('token');
            const userIdParam = params.get('userId');

            if (tokenParam !== null) {
                state.tokenBalance = parseInt(tokenParam, 10) || 0;
                state.userId = userIdParam || '';
                console.log('🔗 URL 파라미터에서 토큰 로드:', state.tokenBalance);
                return true;
            }
            return false;
        } catch (e) {
            console.warn('URL 파라미터 로드 실패:', e);
            return false;
        }
    }

    // localStorage에서 로드 (폴백)
    function loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('firebase_user');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.tokenBalance !== undefined) {
                    state.tokenBalance = parsed.tokenBalance;
                    state.userId = parsed.id;
                    console.log('📦 localStorage 토큰 로드:', state.tokenBalance);
                }
            }
        } catch (e) {
            console.warn('localStorage 로드 실패:', e);
        }
    }

    // Firestore에서 최신 값 가져오기 (백그라운드 업데이트)
    async function fetchTokenBalanceFromFirestore(user) {
        try {
            let docId = null;
            if (user.email) {
                docId = user.email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_');
            } else {
                docId = user.uid;
            }

            console.log('🔍 Firestore 토큰 조회, docId:', docId);

            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(docId).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const firestoreBalance = userData.tokenBalance || 0;

                // Firestore 값이 다르면 업데이트
                if (state.tokenBalance !== firestoreBalance) {
                    console.log('🔄 Firestore에서 토큰 업데이트:', state.tokenBalance, '→', firestoreBalance);
                    state.tokenBalance = firestoreBalance;
                }
                state.userId = docId;
                console.log('✅ Firestore 토큰 확인 완료:', state.tokenBalance, '플랜:', userData.plan);
            } else {
                console.warn('⚠️ Firestore 사용자 문서 없음:', docId);
            }
        } catch (error) {
            console.error('❌ Firestore 토큰 조회 오류:', error);
            // 오류 발생해도 localStorage 값 유지
        }
    }

    /**
     * 토큰 차감 (룩북/헤어체험과 동일한 패턴)
     * - FirebaseBridge.deductTokens(null, feature, metadata) 호출
     * - 토큰 부족 시 /#products로 이동
     */
    async function deductCredits(feature, metadata = {}) {
        try {
            // FirebaseBridge 사용 (룩북/헤어체험과 동일)
            if (window.FirebaseBridge && typeof window.FirebaseBridge.deductTokens === 'function') {
                const result = await window.FirebaseBridge.deductTokens(null, feature, metadata);
                console.log('💳 토큰 차감 결과:', result);

                if (result.success) {
                    state.tokenBalance = result.newBalance;
                    console.log('✅ 토큰 차감 성공:', result.newBalance, '토큰 남음');
                    return true;
                } else {
                    console.error('토큰 차감 실패:', result);
                    // 토큰 부족 시 - 디버그 정보 포함
                    if (result.error && result.error.includes('부족')) {
                        const debugMsg = `토큰 부족 (현재: ${result.currentBalance || 0}, 필요: ${result.required || '?'})`;
                        console.error(debugMsg);
                        showToast(debugMsg + ' - 업그레이드 페이지로 이동합니다.', 'error');
                        setTimeout(() => {
                            window.location.href = '/#products';
                        }, 2500);
                    } else {
                        showToast(`토큰 차감 실패: ${result.error || 'Unknown'}`, 'error');
                    }
                    return false;
                }
            } else {
                console.error('FirebaseBridge를 사용할 수 없습니다');
                showToast('토큰 차감에 실패했습니다', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error deducting credits:', error);
            showToast('토큰 차감 중 오류가 발생했습니다', 'error');
            return false;
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

        if (overlay) {
            overlay.style.display = 'flex';  // 인라인 스타일 오버라이드
            overlay.classList.add('visible');
        }
        if (textEl) textEl.textContent = title || '처리 중...';
        if (progressEl) progressEl.textContent = desc || '';
    }

    function updateLoading(text) {
        const progressEl = document.getElementById('loadingProgress');
        if (progressEl) progressEl.textContent = text;
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
            overlay.style.display = 'none';
        }
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
    window.downloadResult = async function(type) {
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

        if (!url) {
            showToast('다운로드할 파일이 없습니다', 'error');
            return;
        }

        try {
            showToast('다운로드 준비 중...', 'info');

            // iOS/iPadOS에서 외부 URL 다운로드를 위해 fetch + blob 사용
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // blob URL 해제
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

            showToast('다운로드 완료!', 'success');
        } catch (error) {
            console.error('다운로드 실패:', error);
            // 폴백: 새 탭에서 열기
            window.open(url, '_blank');
            showToast('새 탭에서 이미지를 길게 눌러 저장하세요', 'info');
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
