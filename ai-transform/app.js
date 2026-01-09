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
        sourceImage: null,  // 헤어스타일 유지할 원본 사진
        targetFace: null,   // 바꿔 넣을 얼굴 사진
        userId: null,
        tokenBalance: 0,    // HAIRGATOR 토큰
        isProcessing: false
    };

    // ============ Constants ============
    const COSTS = {
        faceSwap: 300       // 얼굴 변환: 300 토큰 (의상/배경 포함)
    };

    const API_BASE = '/.netlify/functions';

    // ============ Initialize ============
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        loadTheme();
        bindUploadEvents();
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

    // ============ Action Events ============
    function bindActionEvents() {
        const faceSwapBtn = document.getElementById('faceSwapBtn');
        if (faceSwapBtn) {
            faceSwapBtn.addEventListener('click', handleFaceSwap);
        }
    }

    function checkFaceSwapReady() {
        const btn = document.getElementById('faceSwapBtn');
        if (btn) {
            btn.disabled = !(state.sourceImage && state.targetFace);
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

        console.log('📋 옵션 확인:', {
            clothingPrompt: clothingPrompt || '(없음)',
            backgroundPrompt: backgroundPrompt || '(없음)',
            hasTransformOptions: hasTransformOptions
        });

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

            console.log('✅ Step 1 완료, 결과 URL:', faceSwapResultUrl ? '있음' : '없음');

            // Step 2: 의상/배경 옵션이 있으면 Gemini 변환
            if (hasTransformOptions && faceSwapResultUrl) {
                console.log('🔄 Step 2: Gemini 의상/배경 변환 시작');
                console.log('- 의상:', clothingPrompt || '없음');
                console.log('- 배경:', backgroundPrompt || '없음');
                updateLoading('의상/배경 변환 중...');

                const finalResult = await applyGeminiTransform(faceSwapResultUrl, clothingPrompt, backgroundPrompt);
                console.log('✅ Step 2 결과:', finalResult ? '성공' : '실패');
                if (finalResult) {
                    faceSwapResultUrl = finalResult;
                }
            } else {
                console.log('⏭️ Step 2 건너뜀 - hasTransformOptions:', hasTransformOptions, ', faceSwapResultUrl:', !!faceSwapResultUrl);
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
            console.log('🎨 Gemini 변환 요청');
            console.log('- 의상:', clothingPrompt || '변경 안함');
            console.log('- 배경:', backgroundPrompt || '변경 안함');
            console.log('- 이미지:', imageUrl.startsWith('data:') ? 'base64' : 'URL');

            // 서버에서 URL fetch하도록 변경 (Flutter WebView CORS 우회)
            const requestBody = {
                clothingPrompt: clothingPrompt,
                backgroundPrompt: backgroundPrompt
            };

            // data URL이면 imageBase64로, 외부 URL이면 imageUrl로 전송
            if (imageUrl.startsWith('data:')) {
                requestBody.imageBase64 = imageUrl;
            } else {
                requestBody.imageUrl = imageUrl;  // 서버에서 fetch
            }

            console.log('🚀 image-transform API 호출 중...');
            const response = await fetch(`${API_BASE}/image-transform`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 API 응답 상태:', response.status);
            const data = await response.json();
            console.log('📥 API 응답 데이터:', data);

            if (data.success && data.resultImage) {
                console.log('✅ Gemini 변환 완료');
                return data.resultImage;
            } else {
                console.warn('⚠️ Gemini 변환 실패:', data.error || data.message);
                showToast(`의상/배경 변환 실패: ${data.error || data.message || '알 수 없는 오류'}`, 'error');
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
        // 긴급 숨김 CSS 제거
        const emergencyStyle = document.getElementById('emergency-hide-spinner');
        if (emergencyStyle) emergencyStyle.remove();

        const overlay = document.getElementById('loadingOverlay');
        const textEl = document.getElementById('loadingText');
        const progressEl = document.getElementById('loadingProgress');

        if (overlay) {
            overlay.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
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
            overlay.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
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
    window.downloadResult = async function() {
        const img = document.getElementById('faceSwapResultImg');
        const url = img?.src;

        if (!url) {
            showToast('다운로드할 파일이 없습니다', 'error');
            return;
        }

        // Flutter WebView에서는 DownloadChannel 사용
        if (window.DownloadChannel) {
            console.log('[AI Transform] Flutter 채널로 이미지 저장 요청');
            window.DownloadChannel.postMessage(url);
            showToast('갤러리에 저장됩니다', 'success');
            return;
        }

        // 모바일 체크
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // 모바일 브라우저: 새 탭에서 길게 눌러 저장 안내
            window.open(url, '_blank');
            showToast('이미지를 길게 눌러 저장하세요', 'info');
            return;
        }

        // 데스크톱: 직접 다운로드
        try {
            showToast('다운로드 준비 중...', 'info');

            let blobUrl;

            // base64 data URL인 경우 직접 blob 변환
            if (url.startsWith('data:')) {
                const [header, base64Data] = url.split(',');
                const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
                const byteString = atob(base64Data);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeType });
                blobUrl = URL.createObjectURL(blob);
            } else {
                const response = await fetch(url);
                const blob = await response.blob();
                blobUrl = URL.createObjectURL(blob);
            }

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'hairgator-faceswap.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            showToast('다운로드 완료!', 'success');
        } catch (error) {
            console.error('다운로드 실패:', error);
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

})();
