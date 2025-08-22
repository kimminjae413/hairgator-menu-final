// ============ HAIRGATOR Main Application (v1.8-COMPLETE-FINAL) ============
// 인라인 스크립트에서 이동, 기능 100% 동일 + 모든 누락 기능 포함

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    console.log('🚀 HAIRGATOR v1.8-COMPLETE-FINAL 로딩 시작');
    
    // ========== 상수 및 설정 ==========
    const CONFIG = {
        CACHE_PREFIX: 'hairgator_',
        ANIMATION_DURATION: 300,
        MAX_RETRIES: 3,
        NEW_THRESHOLD_DAYS: 7
    };

    // ========== 유틸리티 함수 ==========
    const utils = {
        setStorage: function(key, value) {
            try {
                localStorage.setItem(CONFIG.CACHE_PREFIX + key, value);
            } catch(e) {
                console.warn('Storage failed:', e);
            }
        },
        
        getStorage: function(key) {
            try {
                return localStorage.getItem(CONFIG.CACHE_PREFIX + key);
            } catch(e) {
                console.warn('Storage retrieval failed:', e);
                return null;
            }
        },
        
        showLoading: function(show) {
            if (elements.loadingOverlay) {
                elements.loadingOverlay.classList.toggle('active', show);
            }
        },
        
        handleError: function(error, context) {
            context = context || '';
            console.error('Error in ' + context + ':', error);
            alert('오류가 발생했습니다: ' + error.message);
        }
    };

    // ========== 메뉴 데이터 ==========
    const MENU_DATA = {
        male: {
            categories: [
                { 
                    id: 'side-fringe', 
                    name: 'SIDE FRINGE',
                    description: '사이드 프린지는 클래식함과 모던함의 대명사로 스타일링이 따라 원하는 이미지를 자유롭게 표현할 수 있습니다.'
                },
                { 
                    id: 'side-part', 
                    name: 'SIDE PART',
                    description: '사이드 파트는 정갈하고 단정한 스타일로 비즈니스맨들에게 인기가 많습니다.'
                },
                { 
                    id: 'fringe-up', 
                    name: 'FRINGE UP',
                    description: '프린지 업은 앞머리를 올려 이마를 드러내는 시원한 스타일입니다.'
                },
                { 
                    id: 'pushed-back', 
                    name: 'PUSHED BACK',
                    description: '푸시백은 머리를 뒤로 넘긴 댄디한 스타일입니다.'
                },
                { 
                    id: 'buzz', 
                    name: 'BUZZ',
                    description: '버즈컷은 짧고 깔끔한 스타일로 관리가 편합니다.'
                },
                { 
                    id: 'crop', 
                    name: 'CROP',
                    description:
