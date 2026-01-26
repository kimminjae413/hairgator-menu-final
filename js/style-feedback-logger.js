// style-feedback-logger.js
// 스타일 추천 피드백 로깅 모듈
// 수집 이벤트: impression, click, dwell_time
// 2026-01-26

(function() {
    'use strict';

    // 현재 세션 ID (페이지 로드 시 생성)
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 모달 열린 시간 (dwell_time 계산용)
    let modalOpenTime = null;
    let currentViewingStyleId = null;

    // 이미 로깅된 impression 추적 (중복 방지)
    const loggedImpressions = new Set();

    /**
     * 사용자 ID 가져오기
     */
    function getUserId() {
        const user = window.currentDesigner;
        if (user && user.docId) return user.docId;
        if (user && user.email) {
            return user.email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_');
        }
        return 'anonymous_' + sessionId;
    }

    /**
     * 피드백 이벤트 로깅
     * @param {string} eventType - 이벤트 타입 (impression, click, dwell_time)
     * @param {Object} data - 이벤트 데이터
     */
    async function logFeedbackEvent(eventType, data) {
        try {
            const db = window.db;
            if (!db) {
                console.warn('[FeedbackLogger] Firestore not available');
                return;
            }

            const logEntry = {
                eventType: eventType,
                userId: getUserId(),
                sessionId: sessionId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                clientTimestamp: new Date().toISOString(),
                ...data
            };

            // 디버그 로그 (개발용)
            console.log(`[FeedbackLogger] ${eventType}:`, logEntry);

            // Firestore에 저장
            await db.collection('style_feedback_logs').add(logEntry);

        } catch (error) {
            console.error('[FeedbackLogger] Error logging event:', error);
        }
    }

    /**
     * Impression 로깅 - 스타일 카드가 화면에 노출될 때
     * @param {Array} styles - 노출된 스타일 목록 [{styleId, score, rank}]
     * @param {string} categoryName - 카테고리명
     * @param {string} faceShape - 감지된 얼굴형
     * @param {string} gender - 성별
     */
    function logImpression(styles, categoryName, faceShape, gender) {
        if (!styles || styles.length === 0) return;

        // 각 스타일에 대해 impression 로깅
        styles.forEach((style, index) => {
            const impressionKey = `${sessionId}_${style.styleId}_${index}`;

            // 이미 로깅된 경우 스킵 (중복 방지)
            if (loggedImpressions.has(impressionKey)) return;
            loggedImpressions.add(impressionKey);

            logFeedbackEvent('impression', {
                styleId: style.styleId,
                styleName: style.name || style.styleId,
                score: style.score,
                rankPosition: index + 1, // 1-based rank
                categoryName: categoryName,
                faceShape: faceShape,
                gender: gender,
                totalInCategory: styles.length
            });
        });
    }

    /**
     * Click 로깅 - 스타일 카드 클릭 시
     * @param {string} styleId - 클릭한 스타일 ID
     * @param {number} rankPosition - 클릭한 카드의 순위 (1-based)
     * @param {number} score - 해당 스타일 점수
     * @param {string} categoryName - 카테고리명
     */
    function logClick(styleId, rankPosition, score, categoryName) {
        // dwell_time 측정 시작
        modalOpenTime = Date.now();
        currentViewingStyleId = styleId;

        logFeedbackEvent('click', {
            styleId: styleId,
            rankPosition: rankPosition,
            score: score,
            categoryName: categoryName
        });
    }

    /**
     * Dwell Time 로깅 - 모달 닫힐 때 체류 시간 기록
     * @param {string} styleId - 스타일 ID
     * @param {string} action - 모달에서 취한 액션 (close, lookbook, hairTry)
     */
    function logDwellTime(styleId, action = 'close') {
        if (!modalOpenTime || !currentViewingStyleId) return;

        const dwellTimeMs = Date.now() - modalOpenTime;
        const dwellTimeSec = Math.round(dwellTimeMs / 1000);

        // 최소 1초 이상 체류한 경우만 로깅 (우연 클릭 필터링)
        if (dwellTimeSec >= 1) {
            logFeedbackEvent('dwell_time', {
                styleId: currentViewingStyleId,
                dwellTimeMs: dwellTimeMs,
                dwellTimeSec: dwellTimeSec,
                exitAction: action // close, lookbook, hairTry
            });
        }

        // 초기화
        modalOpenTime = null;
        currentViewingStyleId = null;
    }

    /**
     * 강한 긍정 신호 로깅 - 룩북/헤어체험 버튼 클릭 시
     * @param {string} styleId - 스타일 ID
     * @param {string} actionType - 액션 타입 (lookbook, hairTry)
     */
    function logPositiveAction(styleId, actionType) {
        // dwell_time도 함께 기록 (exit action 포함)
        logDwellTime(styleId, actionType);

        logFeedbackEvent('positive_action', {
            styleId: styleId,
            actionType: actionType
        });
    }

    // 전역 공개
    window.StyleFeedbackLogger = {
        logImpression: logImpression,
        logClick: logClick,
        logDwellTime: logDwellTime,
        logPositiveAction: logPositiveAction,
        getSessionId: () => sessionId
    };

    console.log('[StyleFeedbackLogger] Initialized, sessionId:', sessionId);

})();
