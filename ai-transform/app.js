/**
 * HAIRGATOR AI Transform
 * Face Swap & Video Generation
 */

(function() {
    'use strict';

    // ============ State ============
    const state = {
        currentTab: 'face',
        originalImage: null,
        targetImage: null,
        videoSourceImage: null,
        videoDuration: 5,
        userId: null,
        credits: 0,
        isProcessing: false
    };

    // ============ DOM Elements ============
    const elements = {};

    // ============ Constants ============
    const COSTS = {
        faceSwap: 350,
        video5sec: 500,
        video8sec: 800
    };

    const API_BASE = '/.netlify/functions';

    // ============ Initialize ============
    function init() {
        cacheElements();
        bindEvents();
        initAuth();
        updateVideoCost();
    }

    function cacheElements() {
        // Tabs
        elements.tabBtns = document.querySelectorAll('.tab-btn');
        elements.tabContents = document.querySelectorAll('.tab-content');

        // Face Swap
        elements.originalZone = document.getElementById('originalZone');
        elements.originalInput = document.getElementById('originalInput');
        elements.originalPreview = document.getElementById('originalPreview');
        elements.targetZone = document.getElementById('targetZone');
        elements.targetInput = document.getElementById('targetInput');
        elements.targetPreview = document.getElementById('targetPreview');
        elements.faceSwapBtn = document.getElementById('faceSwapBtn');
        elements.faceResultArea = document.getElementById('faceResultArea');
        elements.faceResultImage = document.getElementById('faceResultImage');
        elements.downloadFaceBtn = document.getElementById('downloadFaceBtn');

        // Video
        elements.videoSourceZone = document.getElementById('videoSourceZone');
        elements.videoSourceInput = document.getElementById('videoSourceInput');
        elements.videoSourcePreview = document.getElementById('videoSourcePreview');
        elements.videoPrompt = document.getElementById('videoPrompt');
        elements.promptCount = document.getElementById('promptCount');
        elements.videoCost = document.getElementById('videoCost');
        elements.videoGenBtn = document.getElementById('videoGenBtn');
        elements.videoResultArea = document.getElementById('videoResultArea');
        elements.resultVideo = document.getElementById('resultVideo');
        elements.downloadVideoBtn = document.getElementById('downloadVideoBtn');
        elements.durationBtns = document.querySelectorAll('.option-btn[data-duration]');

        // UI
        elements.creditAmount = document.getElementById('creditAmount');
        elements.loadingOverlay = document.getElementById('loadingOverlay');
        elements.loadingTitle = document.getElementById('loadingTitle');
        elements.loadingDesc = document.getElementById('loadingDesc');
        elements.progressBar = document.getElementById('progressBar');
        elements.toast = document.getElementById('toast');
    }

    function bindEvents() {
        // Tab Navigation
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Face Swap Upload Zones
        elements.originalZone.addEventListener('click', () => elements.originalInput.click());
        elements.originalInput.addEventListener('change', (e) => handleImageUpload(e, 'original'));
        elements.targetZone.addEventListener('click', () => elements.targetInput.click());
        elements.targetInput.addEventListener('change', (e) => handleImageUpload(e, 'target'));

        // Face Swap Button
        elements.faceSwapBtn.addEventListener('click', handleFaceSwap);
        elements.downloadFaceBtn.addEventListener('click', () => downloadImage(elements.faceResultImage.src, 'hairgator-faceswap.png'));

        // Video Upload
        elements.videoSourceZone.addEventListener('click', () => elements.videoSourceInput.click());
        elements.videoSourceInput.addEventListener('change', (e) => handleImageUpload(e, 'videoSource'));

        // Video Options
        elements.durationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.durationBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.videoDuration = parseInt(btn.dataset.duration);
                updateVideoCost();
            });
        });

        // Video Prompt
        elements.videoPrompt.addEventListener('input', () => {
            const count = elements.videoPrompt.value.length;
            elements.promptCount.textContent = count;
            if (count > 200) {
                elements.videoPrompt.value = elements.videoPrompt.value.slice(0, 200);
                elements.promptCount.textContent = 200;
            }
        });

        // Video Generate
        elements.videoGenBtn.addEventListener('click', handleVideoGeneration);
        elements.downloadVideoBtn.addEventListener('click', () => downloadVideo(elements.resultVideo.src));

        // Drag & Drop
        [elements.originalZone, elements.targetZone, elements.videoSourceZone].forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });
    }

    // ============ Auth ============
    async function initAuth() {
        try {
            // Firebase Auth 상태 확인
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(async (user) => {
                    if (user) {
                        state.userId = user.uid;
                        await loadCredits();
                    } else {
                        // 로그인 필요
                        showToast('로그인이 필요합니다', 'error');
                        setTimeout(() => {
                            window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.href);
                        }, 1500);
                    }
                });
            } else {
                // URL 파라미터에서 userId 확인 (fallback)
                const params = new URLSearchParams(window.location.search);
                state.userId = params.get('userId');
                if (state.userId) {
                    await loadCredits();
                }
            }
        } catch (error) {
            console.error('Auth init error:', error);
        }
    }

    async function loadCredits() {
        try {
            if (window.FirebaseBridge && typeof window.FirebaseBridge.getTokenBalance === 'function') {
                const result = await window.FirebaseBridge.getTokenBalance(state.userId);
                state.credits = result.tokenBalance || 0;
                elements.creditAmount.textContent = state.credits.toLocaleString();
            }
        } catch (error) {
            console.error('Failed to load credits:', error);
            elements.creditAmount.textContent = '--';
        }
    }

    // ============ Tab Navigation ============
    function switchTab(tabName) {
        state.currentTab = tabName;

        elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
    }

    // ============ Image Upload ============
    function handleImageUpload(e, type) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('이미지 파일만 업로드 가능합니다', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;

            if (type === 'original') {
                state.originalImage = dataUrl;
                elements.originalPreview.src = dataUrl;
                elements.originalZone.classList.add('has-image');
            } else if (type === 'target') {
                state.targetImage = dataUrl;
                elements.targetPreview.src = dataUrl;
                elements.targetZone.classList.add('has-image');
            } else if (type === 'videoSource') {
                state.videoSourceImage = dataUrl;
                elements.videoSourcePreview.src = dataUrl;
                elements.videoSourceZone.classList.add('has-image');
            }

            updateButtonStates();
        };
        reader.readAsDataURL(file);
    }

    // Drag & Drop
    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
        e.currentTarget.style.background = 'var(--accent-ghost)';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.background = '';
    }

    function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.background = '';

        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        // Determine which zone was dropped on
        const zone = e.currentTarget;
        let type = 'original';
        if (zone === elements.targetZone) type = 'target';
        else if (zone === elements.videoSourceZone) type = 'videoSource';

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;

            if (type === 'original') {
                state.originalImage = dataUrl;
                elements.originalPreview.src = dataUrl;
                elements.originalZone.classList.add('has-image');
            } else if (type === 'target') {
                state.targetImage = dataUrl;
                elements.targetPreview.src = dataUrl;
                elements.targetZone.classList.add('has-image');
            } else if (type === 'videoSource') {
                state.videoSourceImage = dataUrl;
                elements.videoSourcePreview.src = dataUrl;
                elements.videoSourceZone.classList.add('has-image');
            }

            updateButtonStates();
        };
        reader.readAsDataURL(file);
    }

    function updateButtonStates() {
        // Face Swap Button
        const canFaceSwap = state.originalImage && state.targetImage && !state.isProcessing;
        elements.faceSwapBtn.disabled = !canFaceSwap;

        // Video Generate Button
        const canGenVideo = state.videoSourceImage && !state.isProcessing;
        elements.videoGenBtn.disabled = !canGenVideo;
    }

    function updateVideoCost() {
        const cost = state.videoDuration === 5 ? COSTS.video5sec : COSTS.video8sec;
        elements.videoCost.textContent = cost;
    }

    // ============ Face Swap ============
    async function handleFaceSwap() {
        if (state.isProcessing) return;
        if (!state.originalImage || !state.targetImage) {
            showToast('이미지를 모두 업로드해주세요', 'error');
            return;
        }

        const cost = COSTS.faceSwap;
        if (state.credits < cost) {
            showToast(`크레딧이 부족합니다 (필요: ${cost})`, 'error');
            return;
        }

        state.isProcessing = true;
        showLoading('얼굴 변환 중', 'AI가 이미지를 분석하고 있습니다...');

        try {
            // 1. Upload images and get URLs
            const [originalUrl, targetUrl] = await Promise.all([
                uploadImage(state.originalImage),
                uploadImage(state.targetImage)
            ]);

            updateProgress(30);

            // 2. Call face swap API (vModel or similar)
            const response = await fetch(`${API_BASE}/hair-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start',
                    userImage: originalUrl,
                    styleImage: targetUrl,
                    userId: state.userId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '얼굴 변환 실패');
            }

            updateProgress(50);

            // 3. Poll for result if async
            let resultUrl = data.resultUrl;
            if (data.taskId) {
                resultUrl = await pollTaskStatus(data.taskId, 'hair-change');
            }

            updateProgress(90);

            // 4. Deduct credits
            await deductCredits(cost, 'faceSwap');

            // 5. Show result
            elements.faceResultImage.src = resultUrl;
            elements.faceResultArea.classList.add('visible');

            updateProgress(100);
            hideLoading();
            showToast('얼굴 변환 완료!', 'success');

        } catch (error) {
            console.error('Face swap error:', error);
            hideLoading();
            showToast(error.message || '처리 중 오류가 발생했습니다', 'error');
        } finally {
            state.isProcessing = false;
            updateButtonStates();
        }
    }

    // ============ Video Generation ============
    async function handleVideoGeneration() {
        if (state.isProcessing) return;
        if (!state.videoSourceImage) {
            showToast('이미지를 업로드해주세요', 'error');
            return;
        }

        const cost = state.videoDuration === 5 ? COSTS.video5sec : COSTS.video8sec;
        if (state.credits < cost) {
            showToast(`크레딧이 부족합니다 (필요: ${cost})`, 'error');
            return;
        }

        state.isProcessing = true;
        showLoading('영상 생성 중', '3-5분 정도 소요됩니다...');

        try {
            // 1. Convert image to base64 (remove data URL prefix)
            const base64Image = state.videoSourceImage.split(',')[1];

            updateProgress(10);

            // 2. Call Gemini Video API
            const response = await fetch(`${API_BASE}/gemini-video-proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: [base64Image],
                    prompt: elements.videoPrompt.value || '자연스럽게 움직이는 모습',
                    duration: state.videoDuration,
                    aspectRatio: '9:16'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '영상 생성 시작 실패');
            }

            updateProgress(20);

            // 3. Poll for video status
            const videoUrl = await pollVideoStatus(data.operationName || data.taskId);

            updateProgress(90);

            // 4. Deduct credits
            await deductCredits(cost, 'videoGen');

            // 5. Show result
            elements.resultVideo.src = videoUrl;
            elements.videoResultArea.classList.add('visible');

            updateProgress(100);
            hideLoading();
            showToast('영상 생성 완료!', 'success');

        } catch (error) {
            console.error('Video generation error:', error);
            hideLoading();
            showToast(error.message || '처리 중 오류가 발생했습니다', 'error');
        } finally {
            state.isProcessing = false;
            updateButtonStates();
        }
    }

    async function pollVideoStatus(operationName, maxAttempts = 60) {
        const pollInterval = 5000; // 5초

        for (let i = 0; i < maxAttempts; i++) {
            await sleep(pollInterval);

            const progress = 20 + Math.min(70, (i / maxAttempts) * 70);
            updateProgress(progress);

            try {
                const response = await fetch(`${API_BASE}/gemini-video-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operationName })
                });

                const data = await response.json();

                if (data.done && data.videoUrl) {
                    return data.videoUrl;
                }

                if (data.error) {
                    throw new Error(data.error);
                }

            } catch (error) {
                console.error('Poll error:', error);
                if (i === maxAttempts - 1) throw error;
            }
        }

        throw new Error('영상 생성 시간 초과');
    }

    async function pollTaskStatus(taskId, endpoint, maxAttempts = 30) {
        const pollInterval = 2000;

        for (let i = 0; i < maxAttempts; i++) {
            await sleep(pollInterval);

            const progress = 50 + Math.min(40, (i / maxAttempts) * 40);
            updateProgress(progress);

            try {
                const response = await fetch(`${API_BASE}/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'status',
                        taskId
                    })
                });

                const data = await response.json();

                if (data.status === 'completed' && data.resultUrl) {
                    return data.resultUrl;
                }

                if (data.status === 'failed') {
                    throw new Error(data.error || '처리 실패');
                }

            } catch (error) {
                console.error('Poll error:', error);
                if (i === maxAttempts - 1) throw error;
            }
        }

        throw new Error('처리 시간 초과');
    }

    // ============ Utilities ============
    async function uploadImage(dataUrl) {
        // Simple approach: return the data URL as-is for now
        // In production, upload to Firebase Storage or Cloudinary
        return dataUrl;
    }

    async function deductCredits(amount, feature) {
        try {
            if (window.FirebaseBridge && typeof window.FirebaseBridge.deductTokensDynamic === 'function') {
                await window.FirebaseBridge.deductTokensDynamic(state.userId, amount, feature);
                state.credits -= amount;
                elements.creditAmount.textContent = state.credits.toLocaleString();
            }
        } catch (error) {
            console.error('Failed to deduct credits:', error);
        }
    }

    function showLoading(title, desc) {
        elements.loadingTitle.textContent = title;
        elements.loadingDesc.textContent = desc;
        elements.progressBar.style.width = '0%';
        elements.loadingOverlay.classList.add('visible');
    }

    function hideLoading() {
        elements.loadingOverlay.classList.remove('visible');
    }

    function updateProgress(percent) {
        elements.progressBar.style.width = `${percent}%`;
    }

    function showToast(message, type = 'success') {
        const toast = elements.toast;
        toast.className = `toast ${type}`;
        toast.querySelector('.toast-message').textContent = message;
        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }

    function downloadImage(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    }

    function downloadVideo(url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'hairgator-video.mp4';
        link.click();
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============ Start ============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
