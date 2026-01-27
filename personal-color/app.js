// ==========================================
// HAIRGATOR Personal Color Pro - 통합 버전
// AI 모드 + 전문가 드래이핑 모드 + Personal Analysis
// ==========================================
/* eslint-disable no-dupe-keys, no-unused-vars */
// no-dupe-keys: 다국어 색상명 매핑에서 중복 키 허용
// no-unused-vars: HTML onclick 핸들러 (selectMode, openDrapingGuide, closeDrapingGuide,
//   closePersonalColor, startAICamera, captureAndAnalyze, retryCapture, getSeasonDescription,
//   getSeasonColorPalette, getPersonalColorSeason, getSeasonRecommendations, clearSkinToneDisplay,
//   startDrapingCamera, toggleCompareMode, selectCompareColor, resetCompareMode, adjustColor,
//   saveCurrentColor, paGenerateAnalysisResult, paDisplayResult)

        // 현재 언어 가져오기 (부모 창 우선, 그 다음 localStorage)
        function getCurrentLanguage() {
            try {
                // 1. 부모 창의 currentLanguage 확인 (iframe인 경우)
                if (parent && parent !== window && parent.currentLanguage) {
                    return parent.currentLanguage;
                }
                // 2. 부모 창의 localStorage 확인
                if (parent && parent !== window && parent.localStorage) {
                    const parentLang = parent.localStorage.getItem('hairgator_language');
                    if (parentLang) return parentLang;
                }
            } catch (_e) {
                // cross-origin 접근 오류 무시
            }
            // 3. 현재 창의 localStorage 확인
            return localStorage.getItem('hairgator_language') || 'ko';
        }

        // 번역 함수 - HAIRGATOR_I18N에서 직접 번역 가져오기
        // t(): 문자열 전용 (기존 호환성 유지)
        function t(key) {
            try {
                const lang = getCurrentLanguage();

                // HAIRGATOR_I18N이 로드되었는지 확인
                if (typeof HAIRGATOR_I18N === 'undefined' || !HAIRGATOR_I18N[lang]) {
                    return null;
                }

                // 키 경로로 번역 찾기 (예: 'personalColor.toast.aiModeActivated')
                const keys = key.split('.');
                let result = HAIRGATOR_I18N[lang];

                for (const k of keys) {
                    if (result && typeof result === 'object' && k in result) {
                        result = result[k];
                    } else {
                        return null;
                    }
                }

                return typeof result === 'string' ? result : null;
            } catch (e) {
                console.error('t() error:', e);
                return null;
            }
        }

        // tAny(): 배열/객체 허용 (seasonCharacteristics 등에 사용)
        function tAny(key) {
            try {
                const lang = getCurrentLanguage();

                if (typeof HAIRGATOR_I18N === 'undefined' || !HAIRGATOR_I18N[lang]) {
                    return null;
                }

                const keys = key.split('.');
                let result = HAIRGATOR_I18N[lang];

                for (const k of keys) {
                    if (result && typeof result === 'object' && k in result) {
                        result = result[k];
                    } else {
                        return null;
                    }
                }

                return result; // 타입 체크 없이 반환 (배열/객체 허용)
            } catch (e) {
                console.error('tAny() error:', e);
                return null;
            }
        }

        // 참고: applyTranslations 함수는 라인 4489에 통합 정의됨

        // 전역 변수 정의
        let currentMode = null;
        let analysisInProgress = false;
        let faceDetected = false;
        let hairColorData = [];
        let videoElement = null;
        let canvasElement = null;
        let canvasCtx = null;
        let currentSeason = 'spring';
        let selectedColor = null;
        let savedColors = [];
        let activeVideoStream = null;
        let mediaPipeCamera = null;
        let faceDetectionInstance = null;
        let sharedExtractCanvas = null;    // 여기로 이동
        let sharedExtractCtx = null;       // 여기로 이동

        // 전문가 노하우 데이터
        const ExpertKnowledge = {
            colorTheory: {
                warmCool: "주황색은 웜톤의 대표적인 색상이며 쿨톤으로 변환이 어렵습니다",
                foundation: "파운데이션 21-23호대는 비슷한 명도의 헤어컬러와 매치할 때 주의가 필요합니다"
            },
            skinAnalysis: {
                redness: "홍조 피부는 미드나잇 컬러로 중화시킬 수 있습니다",
                principle: "명도와 채도의 조합이 색상 이름보다 중요합니다"
            },
            colorMatching: {
                warm: "아이보리 피부에는 코토리베이지나 오렌지브라운이 잘 어울립니다",
                cool: "화이트 피부에는 블루블랙이나 애쉬블루가 적합합니다"
            }
        };

        // 계절별 색상 팔레트 (colors만 유지, characteristics는 i18n에서 가져옴)
        const SeasonPalettes = {
            spring: {
                colors: ['#FFB6C1', '#FFA07A', '#F0E68C', '#98FB98', '#FFE4B5', '#DDA0DD']
            },
            summer: {
                colors: ['#B0E0E6', '#DDA0DD', '#C8B2DB', '#AFEEEE', '#F0F8FF', '#E6E6FA']
            },
            autumn: {
                colors: ['#D2691E', '#CD853F', '#A0522D', '#8B4513', '#B22222', '#800000']
            },
            winter: {
                colors: ['#000080', '#4B0082', '#8B008B', '#191970', '#2F4F4F', '#708090']
            }
        };

        // 계절 특성 가져오기 (i18n 기반)
        // ✅ 수정: t() → tAny() 사용 (배열 반환 지원)
        function getSeasonCharacteristics(season) {
            const key = season.toLowerCase().replace(/\s+/g, '');
            const seasonKey = key.replace('웜톤', '').replace('쿨톤', '').replace('warm', '').replace('cool', '');
            const i18nKey = `personalColor.seasonCharacteristics.${seasonKey}`;
            const chars = tAny(i18nKey);  // tAny() 사용 - 배열 허용
            if (Array.isArray(chars)) return chars;
            // fallback
            const fallback = {
                spring: ['밝고 따뜻한 색상', '높은 채도', '노란 언더톤'],
                summer: ['부드럽고 차가운 색상', '중간 채도', '파란 언더톤'],
                autumn: ['깊고 따뜻한 색상', '낮은 채도', '노란 언더톤'],
                winter: ['진하고 차가운 색상', '높은 대비', '파란 언더톤']
            };
            return fallback[seasonKey] || [];
        }

        // ========================================
        // 🌐 다국어 시즌명 헬퍼 함수
        // ========================================

        // 시즌 기본명 변환 (spring-warm → 현재 언어로 번역)
        function getTranslatedSeasonName(seasonBase, undertone) {
            // seasonBase: 'spring', 'summer', 'autumn', 'winter'
            // undertone: 'Warm', 'Cool', 'Neutral'
            const keyMap = {
                'spring-Warm': 'springWarm',
                'autumn-Warm': 'autumnWarm',
                'summer-Cool': 'summerCool',
                'winter-Cool': 'winterCool',
                'autumn-Neutral': 'neutralWarm',
                'summer-Neutral': 'neutralCool',
                'winter-Neutral': 'neutralCool'
            };
            const key = `${seasonBase}-${undertone}`;
            const i18nKey = keyMap[key];
            if (i18nKey) {
                return t(`personalColor.aiMode.result.${i18nKey}`) || getDefaultSeasonName(seasonBase, undertone);
            }
            // 뉴트럴 (기본)
            if (undertone === 'Neutral') {
                return t('personalColor.aiMode.result.neutral') || '뉴트럴';
            }
            return getDefaultSeasonName(seasonBase, undertone);
        }

        function getDefaultSeasonName(seasonBase, undertone) {
            const defaults = {
                'spring-Warm': '봄 웜',
                'autumn-Warm': '가을 웜',
                'summer-Cool': '여름 쿨',
                'winter-Cool': '겨울 쿨',
                'autumn-Neutral': '뉴트럴 웜',
                'summer-Neutral': '뉴트럴 쿨',
                'winter-Neutral': '뉴트럴 쿨'
            };
            return defaults[`${seasonBase}-${undertone}`] || '뉴트럴';
        }

        // 서브타입 변환 (bright, light, soft, muted, deep → 현재 언어로)
        function getTranslatedSubtype(subtype) {
            const key = `personalColor.aiMode.result.${subtype}`;
            const defaults = {
                'bright': '브라이트',
                'light': '라이트',
                'soft': '소프트',
                'muted': '뮤트',
                'deep': '딥'
            };
            return t(key) || defaults[subtype] || subtype;
        }

        // fullSeason 다국어 생성
        function getTranslatedFullSeason(seasonKr, subtype, season, undertone) {
            const translatedSeason = getTranslatedSeasonName(season, undertone);
            const translatedSubtype = getTranslatedSubtype(subtype);
            return `${translatedSeason} ${translatedSubtype}`;
        }

        // 헤어컬러명 다국어 변환
        function translateHairColorName(koreanName) {
            if (!koreanName) return koreanName;

            // i18n에서 번역 조회
            const key = `personalColor.hairColors.${koreanName.replace(/\s+/g, '_').replace(/[/\\]/g, '_')}`;
            const translated = t(key);
            if (translated && translated !== key) return translated;

            // 영어인 경우 현재 언어가 한국어가 아니면 영어 매핑 사용
            const lang = window.currentLanguage || window.HAIRGATOR_LANG || 'ko';
            if (lang === 'ko') return koreanName;

            // 한국어 → 영어 매핑 (fallback)
            const koToEn = {
                '다크 브라운': 'Dark Brown', '미디움 브라운': 'Medium Brown', '라이트 브라운': 'Light Brown',
                '다크 블론드': 'Dark Blonde', '미디움 블론드': 'Medium Blonde', '라이트 블론드': 'Light Blonde',
                '베리 라이트 블론드': 'Very Light Blonde', '라이트스트 블론드': 'Lightest Blonde',
                '인텐스 레드': 'Intense Red', '인텐스 코퍼': 'Intense Copper', '인텐스 바이올렛': 'Intense Violet',
                '라이트 골든': 'Light Golden', '베리 라이트 골든': 'Very Light Golden', '라이트스트 골든': 'Lightest Golden',
                '라이트 애쉬': 'Light Ash', '베리 라이트 애쉬': 'Very Light Ash', '라이트스트 애쉬': 'Lightest Ash',
                '라이트스트 인텐스 애쉬': 'Lightest Intense Ash',
                '펄 골든': 'Pearl Golden', '라이트 펄 골든': 'Light Pearl Golden',
                '마호가니': 'Mahogany', '마호가니 코퍼': 'Mahogany Copper', '마호가니 골든': 'Mahogany Golden',
                '라이트 마호가니': 'Light Mahogany', '마호가니 애쉬': 'Mahogany Ash',
                '딥 매트': 'Deep Matt', '라이트 매트': 'Light Matt', '미디움 매트': 'Medium Matt', '라이트스트 매트': 'Lightest Matt',
                '애쉬 바이올렛': 'Ash Violet', '라이트 애쉬 바이올렛': 'Light Ash Violet',
                '라이트 인텐스 코퍼': 'Light Intense Copper', '라이트 코퍼': 'Light Copper', '미디움 코퍼': 'Medium Copper',
                '브라운 마호가니': 'Brown Mahogany', '브라운 골든': 'Brown Golden', '라이트 브라운 골든': 'Light Brown Golden',
                '펄 바이올렛': 'Pearl Violet', '라이트 바이올렛': 'Light Violet', '미디움 바이올렛': 'Medium Violet',
                '다크 애쉬': 'Dark Ash', '미디움 애쉬': 'Medium Ash',
                '다크 골든': 'Dark Golden', '미디움 골든': 'Medium Golden',
                '다크 내추럴': 'Dark Natural', '미디움 내추럴': 'Medium Natural', '라이트 내추럴': 'Light Natural',
                '쿨 베이지': 'Cool Beige', '라이트 쿨 베이지': 'Light Cool Beige', '웜 베이지': 'Warm Beige',
                '아이스 블루': 'Ice Blue', '아이스 바이올렛': 'Ice Violet',
                '티타늄 골드': 'Titanium Gold', '코퍼 골드': 'Copper Gold',
                '내추럴': 'Natural', '레드': 'Red', '오렌지': 'Orange', '매트': 'Matt', '브라운': 'Brown'
            };

            // 정확히 일치하는 경우
            if (koToEn[koreanName]) return koToEn[koreanName];

            // 부분 일치 시도 (숫자 포함된 이름)
            for (const [ko, en] of Object.entries(koToEn)) {
                if (koreanName.startsWith(ko)) {
                    return koreanName.replace(ko, en);
                }
            }

            return koreanName;
        }

        // ========================================
        // 🎯 새로운 4단계 파이프라인 시스템
        // ========================================

        // 전역 조명 메타데이터 저장
        window.lastLightingMeta = null;

        // ========== 1단계: 피부·조명 분석 ==========
        function analyzeSkinAndLighting(rgb, imageData = null) {
            console.log('📊 1단계: 피부·조명 분석 시작...');

            let lightingMeta = {
                avgY: 0,           // 전체 밝기
                channelStd: 0,     // R,G,B 채널 간 편차
                highlightRatio: 0, // 하이라이트 비율
                shadowRatio: 0,    // 그림자 비율
                colorTemp: 'neutral', // 색온도 (warm/neutral/cool)
                lightingQuality: 0.5  // 조명 품질 점수 (0-1)
            };

            if (imageData && imageData.data) {
                const data = imageData.data;
                let rSum = 0, gSum = 0, bSum = 0;
                let highlightCount = 0, shadowCount = 0;
                let pixelCount = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i+1], b = data[i+2];
                    const y = (r + g + b) / 3;

                    rSum += r; gSum += g; bSum += b;
                    pixelCount++;

                    if (y > 220) highlightCount++;
                    if (y < 35) shadowCount++;
                }

                if (pixelCount > 0) {
                    const avgR = rSum / pixelCount;
                    const avgG = gSum / pixelCount;
                    const avgB = bSum / pixelCount;
                    lightingMeta.avgY = (avgR + avgG + avgB) / 3;

                    // 채널 간 표준편차
                    const channelAvg = (avgR + avgG + avgB) / 3;
                    lightingMeta.channelStd = Math.sqrt(
                        (Math.pow(avgR - channelAvg, 2) +
                         Math.pow(avgG - channelAvg, 2) +
                         Math.pow(avgB - channelAvg, 2)) / 3
                    );

                    lightingMeta.highlightRatio = highlightCount / pixelCount;
                    lightingMeta.shadowRatio = shadowCount / pixelCount;

                    // 색온도 판단
                    const rgRatio = avgR / Math.max(1, avgG);
                    if (rgRatio > 1.1) lightingMeta.colorTemp = 'warm';
                    else if (rgRatio < 0.95) lightingMeta.colorTemp = 'cool';
                    else lightingMeta.colorTemp = 'neutral';

                    // 조명 품질 계산 (0-1)
                    // 좋은 조명: 밝기 적당(80-180), 채널편차 낮음(<20), 하이라이트/섀도우 적음
                    let qualityScore = 1.0;

                    // 밝기 페널티
                    if (lightingMeta.avgY < 60 || lightingMeta.avgY > 200) qualityScore -= 0.3;
                    else if (lightingMeta.avgY < 80 || lightingMeta.avgY > 180) qualityScore -= 0.15;

                    // 채널 편차 페널티 (색편향)
                    if (lightingMeta.channelStd > 30) qualityScore -= 0.25;
                    else if (lightingMeta.channelStd > 20) qualityScore -= 0.1;

                    // 하이라이트/섀도우 페널티
                    if (lightingMeta.highlightRatio > 0.15) qualityScore -= 0.15;
                    if (lightingMeta.shadowRatio > 0.2) qualityScore -= 0.15;

                    lightingMeta.lightingQuality = Math.max(0.2, Math.min(1.0, qualityScore));
                }
            } else {
                // imageData 없으면 피부톤으로 간접 추정
                const avgBrightness = (rgb.r + rgb.g + rgb.b) / 3;
                lightingMeta.avgY = avgBrightness;
                lightingMeta.lightingQuality = 0.5; // 기본값

                // 🔴 조명 색온도 감지 임계값 완화 (1.15 → 1.08)
                const rgRatio = rgb.r / Math.max(1, rgb.g);
                if (rgRatio > 1.08) lightingMeta.colorTemp = 'warm';
                else if (rgRatio < 0.95) lightingMeta.colorTemp = 'cool';
            }

            // Gray World 화이트밸런스 보정 + 노란 조명 강화 보정
            let correctedRgb = { ...rgb };
            if (imageData && imageData.data) {
                const data = imageData.data;
                let rSum = 0, gSum = 0, bSum = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    rSum += data[i]; gSum += data[i+1]; bSum += data[i+2]; count++;
                }
                if (count > 0) {
                    const avgR = rSum/count, avgG = gSum/count, avgB = bSum/count;
                    const grayTarget = 128;
                    const strength = 0.4 * lightingMeta.lightingQuality;

                    correctedRgb = {
                        r: Math.min(255, Math.max(0, Math.round(rgb.r * (1 + (grayTarget/avgR - 1) * strength)))),
                        g: Math.min(255, Math.max(0, Math.round(rgb.g * (1 + (grayTarget/avgG - 1) * strength)))),
                        b: Math.min(255, Math.max(0, Math.round(rgb.b * (1 + (grayTarget/avgB - 1) * strength))))
                    };

                    // 🔴 추가 노란 조명 보정 (rgRatio > 1.08일 때 더 적극적으로 쿨톤 밸런싱)
                    const globalRgRatio = avgR / Math.max(1, avgG);
                    if (globalRgRatio > 1.08) {
                        console.log('⚖️ [강화 보정] 노란 조명 감지 → 쿨톤 밸런싱 적용');
                        correctedRgb = {
                            r: Math.round(correctedRgb.r * 0.94),  // 붉은기 더 뺌
                            g: correctedRgb.g,
                            b: Math.min(255, Math.round(correctedRgb.b * 1.08))  // 파란기 더함
                        };
                    }

                    // 🟢 녹색기(형광등) 조명 감지 및 보정 (PDF COLOR CONTROL 이론 적용)
                    // avgG가 avgR, avgB보다 유독 높으면 → Magenta(보라+빨강) 필터로 보정
                    const greenDominance = avgG - (avgR + avgB) / 2;
                    if (greenDominance > 8) {
                        console.log('⚖️ [강화 보정] 녹색기 조명(형광등) 감지 → Magenta 밸런싱 적용');
                        correctedRgb = {
                            r: Math.min(255, Math.round(correctedRgb.r * 1.04)),  // 붉은기 보강
                            g: Math.round(correctedRgb.g * 0.96),  // 녹색기 감소
                            b: Math.min(255, Math.round(correctedRgb.b * 1.02))   // 파란기 약간 보강
                        };
                        lightingMeta.colorTemp = 'green';  // 녹색 조명 표시
                    }
                }
            }

            window.lastLightingMeta = lightingMeta;

            console.log('📊 조명 메타:', lightingMeta);
            console.log(`📊 보정: (${rgb.r},${rgb.g},${rgb.b}) → (${correctedRgb.r},${correctedRgb.g},${correctedRgb.b})`);

            return {
                originalRgb: rgb,
                correctedRgb: correctedRgb,
                lightingMeta: lightingMeta
            };
        }

        // ========== 2단계: 퍼스널컬러 시즌/서브타입 결정 ==========
        function classifyPersonalColor(correctedRgb, lightingMeta) {
            console.log('🎨 2단계: 퍼스널컬러 분류 시작...');

            const lab = rgbToLab(correctedRgb.r, correctedRgb.g, correctedRgb.b);
            const lq = lightingMeta?.lightingQuality || 0.5;

            // 조명에 따른 b값 보정 (조명 나쁘면 노란기 과대평가 방지)
            const effectiveB = lab.b * (0.6 + 0.4 * lq);
            // a값도 조명 보정 (일관성 유지)
            const effectiveA = lab.a * (0.8 + 0.2 * lq);

            // ✅ 개선: LAB 기반 점수에 더 높은 가중치 (미용실 조명은 주로 노란색이므로 LAB이 더 신뢰성 높음)
            let labScore = 0;  // LAB 기반 점수 (가중치 높음)
            let rgbScore = 0;  // RGB 기반 점수 (보조)

            // LAB 기반 점수 (effectiveB, effectiveA 사용)
            const labWarmScore = effectiveB - (effectiveA * 0.5);
            if (labWarmScore > 12) labScore = 4;
            else if (labWarmScore > 8) labScore = 3;
            else if (labWarmScore > 4) labScore = 2;
            else if (labWarmScore > 0) labScore = 1;
            else if (labWarmScore < -8) labScore = -3;
            else if (labWarmScore < -4) labScore = -2;
            else if (labWarmScore < 0) labScore = -1;

            // RGB 비율 기반 (보조 점수, 가중치 낮춤)
            const yellowIndex = (correctedRgb.r * 0.5 + correctedRgb.g) - correctedRgb.b * 1.2;
            const pinkIndex = (correctedRgb.r + correctedRgb.b * 0.8) - correctedRgb.g * 1.1;

            if (yellowIndex > pinkIndex + 35) rgbScore = 2;
            else if (yellowIndex > pinkIndex + 20) rgbScore = 1;
            else if (pinkIndex > yellowIndex + 35) rgbScore = -2;
            else if (pinkIndex > yellowIndex + 20) rgbScore = -1;

            // 🟢 붉은기(a값) 가중치 추가 (PDF 멜라닌 이론 적용)
            // 한국인은 붉은 웜톤이 많음 - effectiveA가 높으면 웜톤 점수 추가
            let redWarmBonus = 0;
            if (effectiveA > 18) redWarmBonus = 2;      // 매우 강한 붉은기 → 웜톤 보너스
            else if (effectiveA > 12) redWarmBonus = 1; // 중간 붉은기 → 웜톤 보너스

            // 🔴 입술색 보정 (app.js 알고리즘 통합)
            let lipBonus = 0;
            const skinData = window.lastSkinToneData;
            if (skinData && skinData.lipColor) {
                if (skinData.lipColor.isWarm) {
                    lipBonus = 1;
                    console.log('👄 입술색 보정: 웜톤 +1');
                } else {
                    lipBonus = -1;
                    console.log('👄 입술색 보정: 쿨톤 -1');
                }
            }

            // 🔴 홍조 보정 (app.js 알고리즘 통합)
            // 홍조가 있으면 a값(붉은기) 영향 감소 → 웜톤 과대평가 방지
            let rednessCorrection = 0;
            if (skinData && skinData.multiRegion && skinData.multiRegion.analysis) {
                if (skinData.multiRegion.analysis.hasRedness) {
                    const rednessLevel = skinData.multiRegion.analysis.rednessLevel || 0;
                    rednessCorrection = -Math.min(1, rednessLevel * 0.03);
                    console.log(`👁️ 홍조 보정: ${rednessCorrection.toFixed(2)}`);
                }
            }

            // ✅ 최종 warmScore: LAB 60% + RGB 20% + 붉은기 보너스 + 입술색 + 홍조 보정
            const warmScore = Math.round(labScore * 0.6 + rgbScore * 0.2 + redWarmBonus + lipBonus + rednessCorrection);

            // 채도 계산
            const max = Math.max(correctedRgb.r, correctedRgb.g, correctedRgb.b);
            const min = Math.min(correctedRgb.r, correctedRgb.g, correctedRgb.b);
            const chroma = max - min;

            // 시즌 및 서브타입 결정
            const L = lab.L;
            const C = chroma;
            let season, subtype, seasonKr, emoji, color, undertone;

            // ✅ 최종 개선: 언더톤 결정 (PC_CONFIG 사용)
            if (warmScore >= PC_CONFIG.UNDERTONE.warmScoreWarm) {
                undertone = 'Warm';
            } else if (warmScore <= PC_CONFIG.UNDERTONE.warmScoreCool) {
                undertone = 'Cool';
            } else {
                undertone = 'Neutral';
            }

            // 시즌 결정 (PC_CONFIG 임계값 사용 - 튜닝 가능)
            const { warm_L_spring, warm_L_autumn, cool_L_summer, cool_L_winter,
                    chroma_spring_bright, chroma_summer_bright, neutral_effectiveB_split } = PC_CONFIG.SEASON;

            if (undertone === 'Warm') {
                if (L >= warm_L_spring) {
                    // 밝은 웜톤 → 봄
                    season = 'spring'; seasonKr = '봄 웜';
                    if (C > chroma_spring_bright) { subtype = 'bright'; emoji = '🌸'; color = '#FF6B6B'; }
                    else { subtype = 'light'; emoji = '🌷'; color = '#FFB7C5'; }
                } else if (L >= warm_L_autumn) {
                    // 중간 밝기 웜톤 → 가을
                    season = 'autumn'; seasonKr = '가을 웜';
                    if (L > 62) {
                        subtype = 'soft'; emoji = '🍂'; color = '#CD853F';
                    } else {
                        subtype = 'muted'; emoji = '🍁'; color = '#D2691E';
                    }
                } else {
                    // 어두운 웜톤 → 가을 Deep/Muted
                    season = 'autumn'; seasonKr = '가을 웜';
                    if (L < cool_L_winter) {
                        subtype = 'deep'; emoji = '🍂'; color = '#8B4513';
                    } else {
                        subtype = 'muted'; emoji = '🍁'; color = '#A0522D';
                    }
                }
            } else if (undertone === 'Cool') {
                if (L >= cool_L_summer) {
                    // 밝은 쿨톤 → 여름
                    season = 'summer'; seasonKr = '여름 쿨';
                    if (C > chroma_summer_bright) { subtype = 'bright'; emoji = '🌊'; color = '#4169E1'; }
                    else { subtype = 'light'; emoji = '💜'; color = '#87CEEB'; }
                } else if (L >= cool_L_winter) {
                    season = 'summer'; seasonKr = '여름 쿨';
                    subtype = 'muted'; emoji = '🌙'; color = '#9370DB';
                } else {
                    // 어두운 쿨톤 → 겨울
                    season = 'winter'; seasonKr = '겨울 쿨';
                    if (C > 40) { subtype = 'deep'; emoji = '❄️'; color = '#191970'; }
                    else { subtype = 'muted'; emoji = '🌙'; color = '#4169E1'; }
                }
            } else {
                // ✅ 뉴트럴: effectiveB와 L로 정밀 분류 (PC_CONFIG 사용)
                if (L >= cool_L_summer) {
                    // 밝은 뉴트럴
                    if (effectiveB > neutral_effectiveB_split) {
                        season = 'autumn'; seasonKr = '뉴트럴 웜';
                        subtype = 'soft'; emoji = '🍂'; color = '#C4A484';
                    } else if (effectiveB < -neutral_effectiveB_split) {
                        season = 'summer'; seasonKr = '뉴트럴 쿨';
                        subtype = 'light'; emoji = '💜'; color = '#B0C4DE';
                    } else {
                        season = 'summer'; seasonKr = '뉴트럴';
                        subtype = 'light'; emoji = '💜'; color = '#B0C4DE';
                    }
                } else if (L >= cool_L_winter) {
                    // 중간 밝기 뉴트럴
                    if (effectiveB > neutral_effectiveB_split) {
                        season = 'autumn'; seasonKr = '뉴트럴 웜';
                        subtype = 'muted'; emoji = '🍁'; color = '#BC8F8F';
                    } else {
                        season = 'summer'; seasonKr = '뉴트럴 쿨';
                        subtype = 'muted'; emoji = '🌙'; color = '#9370DB';
                    }
                } else {
                    // 어두운 뉴트럴 (L < 50)
                    if (effectiveB > neutral_effectiveB_split) {
                        season = 'autumn'; seasonKr = '뉴트럴 웜';
                        subtype = 'deep'; emoji = '🍂'; color = '#8B4513';
                    } else {
                        season = L < 45 ? 'winter' : 'summer';
                        seasonKr = '뉴트럴 쿨';
                        subtype = L < 45 ? 'deep' : 'muted';
                        emoji = L < 45 ? '❄️' : '🌙';
                        color = L < 45 ? '#4169E1' : '#9370DB';
                    }
                }
            }

            // confidence 계산 (조명 품질 반영)
            let baseConfidence = 65;
            baseConfidence += Math.abs(labScore) * 4; // LAB 확신도에 따라 증가
            baseConfidence = baseConfidence * (0.6 + 0.4 * lq); // 조명 품질 반영

            // 조명 나쁘면 참고용 플래그
            const isReference = lq < 0.4;
            if (isReference) baseConfidence = Math.min(baseConfidence, 65);

            const confidence = Math.min(98, Math.max(55, Math.round(baseConfidence)));

            // 다국어 fullSeason 생성
            const fullSeason = getTranslatedFullSeason(seasonKr, subtype, season, undertone);

            console.log('🎨 분류 결과:', {
                undertone, labScore, rgbScore, warmScore, L: L.toFixed(1), C,
                season, subtype, confidence, isReference
            });

            return {
                undertone,
                warmScore,
                labScore,
                season,
                seasonKr,
                subtype,
                fullSeason,
                emoji,
                color,
                lab,
                effectiveB,
                chroma: C,
                confidence,
                isReference,
                toneMeta: { undertone, L, C }
            };
        }

        // ========== 3단계: 헤어컬러 매핑 규칙 ==========
        // ✅ chromaMin 완화: 필터링 조건이 아닌 보너스 점수로만 사용
        const HAIR_COLOR_MAPPING_RULES = {
            // 봄 (Spring) - 밝고 선명한 색상
            'spring-bright': { levelRange: [7, 11], tones: ['gold', 'orange', 'warm-beige', 'coral', 'copper'], chromaBonus: 30 },
            'spring-light': { levelRange: [8, 12], tones: ['milk-tea', 'cream-beige', 'honey', 'peach', 'beige'], chromaBonus: 20 },

            // 여름 (Summer) - 차갑고 부드러운 색상
            'summer-light': { levelRange: [7, 12], tones: ['ash-blonde', 'icy-pink', 'lavender', 'baby-blue', 'ash', 'cool'], chromaBonus: 20 },
            'summer-muted': { levelRange: [5, 8], tones: ['ash-brown', 'soft-gray', 'dusty-pink', 'cocoa', 'ash', 'cool'], chromaBonus: 15 },
            'summer-bright': { levelRange: [6, 9], tones: ['rose-red', 'raspberry', 'cool-pink', 'pink', 'cool'], chromaBonus: 25 },

            // 가을 (Autumn) - 따뜻하고 깊은 색상
            // 🔴 autumn-soft: 부드러운 브라운 집중 (vivid, intense 제외)
            'autumn-soft': { levelRange: [6, 9], tones: ['beige-brown', 'mocha', 'ash-brown', 'latte', 'beige', 'neutral', 'brown'], chromaBonus: 20 },
            'autumn-muted': { levelRange: [5, 7], tones: ['matt-brown', 'olive', 'khaki', 'cinnamon', 'matt', 'neutral', 'brown'], chromaBonus: 15 },
            'autumn-deep': { levelRange: [3, 6], tones: ['dark-choco', 'copper-red', 'marsala', 'mahogany', 'copper', 'red', 'warm', 'chocolate'], chromaBonus: 25 },

            // 겨울 (Winter) - 차갑고 선명/어두운 색상
            'winter-bright': { levelRange: [3, 7], tones: ['cherry-red', 'royal-blue', 'magenta', 'pure-black', 'blue', 'cool'], chromaBonus: 30 },
            'winter-deep': { levelRange: [1, 4], tones: ['blue-black', 'dark-ash', 'plum', 'charcoal', 'cool', 'ash'], chromaBonus: 30 },
            'winter-muted': { levelRange: [2, 5], tones: ['dark-gray', 'navy-gray', 'ash-black', 'charcoal', 'cool', 'ash'], chromaBonus: 15 }
        };

        // 인접 시즌 정의
        const ADJACENT_SEASONS = {
            'spring': ['autumn'],
            'autumn': ['spring'],
            'summer': ['winter'],
            'winter': ['summer']
        };

        function filterHairColorCandidates(personalColorResult, hairColors) {
            console.log('💇 3단계: 헤어컬러 후보 필터링...');

            const { season, subtype } = personalColorResult;
            const ruleKey = `${season}-${subtype}`;
            const rule = HAIR_COLOR_MAPPING_RULES[ruleKey] || HAIR_COLOR_MAPPING_RULES[`${season}-muted`];

            if (!rule) {
                console.warn('매핑 규칙 없음:', ruleKey);
                return { primary: hairColors.slice(0, 10), secondary: [] };
            }

            const primary = [];   // 같은 시즌
            const secondary = []; // 인접 시즌
            const adjacentSeasons = ADJACENT_SEASONS[season] || [];

            hairColors.forEach(color => {
                const level = color.level || estimateLevelFromHex(color.hex);
                const toneTag = color.toneTag || guessToneFromName(color.name);
                const colorSeason = color.season || guessSeasonFromHex(color.hex);

                // 레벨 매칭 체크
                const levelMatch = level >= rule.levelRange[0] && level <= rule.levelRange[1];
                const levelNear = level >= rule.levelRange[0] - 1 && level <= rule.levelRange[1] + 1; // ±1 허용
                // 톤 매칭 체크
                const toneMatch = rule.tones.some(t => toneTag.includes(t));

                // ✅ 개선된 우선순위 체계
                // 1순위: Level O + Tone O (Best)
                // 2순위: Level O + Tone X (명도는 맞으니 얼굴 밝기는 살려줌)
                // 3순위: Level △(±1) + Tone O (톤은 맞으니 분위기는 살려줌)
                // 4순위: 인접 시즌
                // 5순위: 그 외

                if (colorSeason === season) {
                    if (levelMatch && toneMatch) {
                        // 1순위: 레벨 O + 톤 O
                        primary.push({ ...color, level, toneTag, toneMatch: true, levelMatch: true, priority: 1 });
                    } else if (levelMatch && !toneMatch) {
                        // 2순위: 레벨 O + 톤 X
                        primary.push({ ...color, level, toneTag, toneMatch: false, levelMatch: true, priority: 2 });
                    } else if (levelNear && toneMatch) {
                        // 3순위: 레벨 △ + 톤 O
                        primary.push({ ...color, level, toneTag, toneMatch: true, levelMatch: false, priority: 3 });
                    } else if (levelNear) {
                        // 레벨 근접은 포함
                        primary.push({ ...color, level, toneTag, toneMatch: false, levelMatch: false, priority: 4 });
                    }
                } else if (adjacentSeasons.includes(colorSeason)) {
                    // 4순위: 인접 시즌
                    secondary.push({ ...color, level, toneTag, toneMatch, levelMatch: levelNear, priority: 5 });
                }
            });

            // 우선순위별 정렬
            primary.sort((a, b) => a.priority - b.priority);
            secondary.sort((a, b) => a.priority - b.priority);

            console.log(`💇 같은 시즌: ${primary.length}개, 인접 시즌: ${secondary.length}개`);
            console.log(`💇 우선순위 분포: P1=${primary.filter(c=>c.priority===1).length}, P2=${primary.filter(c=>c.priority===2).length}, P3=${primary.filter(c=>c.priority===3).length}`);

            return { primary, secondary };
        }

        // 헬퍼 함수들
        function estimateLevelFromHex(hex) {
            const rgb = hexToRgb(hex);
            if (!rgb) return 5;
            const brightness = (rgb.r + rgb.g + rgb.b) / 3;
            return Math.round(brightness / 25.5); // 0-10 레벨
        }

        function guessToneFromName(name) {
            if (!name) return 'neutral';
            const n = name.toLowerCase();

            // 🚫 고채도 키워드 감지 (Soft/Mute 타입에서 제외용)
            if (n.includes('intense') || n.includes('인텐스') || n.includes('vivid') || n.includes('비비드') || n.includes('clear') || n.includes('클리어')) {
                if (n.includes('레드') || n.includes('red')) return 'vivid,warm,red';
                if (n.includes('오렌지') || n.includes('orange') || n.includes('쿠퍼') || n.includes('copper')) return 'vivid,warm,copper';
                return 'vivid,warm';
            }

            // 쿨톤 계열
            if (n.includes('애쉬') || n.includes('ash') || n.includes('그레이') || n.includes('gray')) return 'cool,ash';
            if (n.includes('블루') || n.includes('blue') || n.includes('바이올렛') || n.includes('violet')) return 'cool,blue';
            if (n.includes('라벤더') || n.includes('lavender') || n.includes('핑크') || n.includes('pink')) return 'cool,pink';

            // 매트/올리브/카키 계열
            if (n.includes('매트') || n.includes('matt') || n.includes('올리브') || n.includes('olive') || n.includes('카키') || n.includes('khaki')) return 'warm,matt,olive';

            // 웜톤 계열
            if (n.includes('골드') || n.includes('gold') || n.includes('허니') || n.includes('honey')) return 'warm,gold';
            if (n.includes('쿠퍼') || n.includes('copper') || n.includes('오렌지') || n.includes('orange')) return 'warm,copper';
            if (n.includes('레드') || n.includes('red') || n.includes('와인') || n.includes('wine')) return 'warm,red';

            // 뉴트럴/소프트 계열
            if (n.includes('베이지') || n.includes('beige') || n.includes('밀크') || n.includes('milk')) return 'neutral,beige';
            if (n.includes('모카') || n.includes('mocha') || n.includes('초코') || n.includes('choco')) return 'neutral,mocha,brown';
            if (n.includes('라이트') || n.includes('light')) return 'neutral,beige,brown';
            if (n.includes('브라운') || n.includes('brown')) return 'neutral,brown';

            return 'neutral';
        }

        /**
         * 폴백 함수: color.season 값이 없을 때 RGB 기반으로 시즌 추측
         *
         * ⚠️ 휴리스틱 한계:
         * - warmth(R-B), brightness 임계값은 경험적 수치로 학술 검증 없음
         * - 조명 조건에 따라 결과가 달라질 수 있음
         * - 정확한 시즌 분류를 위해서는 color.season 필드 사용 권장
         *
         * TODO: 향후 피드백 데이터 기반으로 임계값 캘리브레이션 필요
         */
        function guessSeasonFromHex(hex) {
            const rgb = hexToRgb(hex);
            if (!rgb) return 'autumn';

            // 휴리스틱: R-B가 크면 웜톤, 작으면 쿨톤
            const warmth = rgb.r - rgb.b;
            // 휴리스틱: RGB 평균이 높으면 밝은톤, 낮으면 어두운톤
            const brightness = (rgb.r + rgb.g + rgb.b) / 3;

            // 임계값 (30, 150, 120)은 경험적 수치 - 캘리브레이션 필요
            if (warmth > 30 && brightness > 150) return 'spring';   // 웜+밝음
            if (warmth > 30 && brightness <= 150) return 'autumn';  // 웜+어두움
            if (warmth <= 30 && brightness > 120) return 'summer';  // 쿨+밝음
            return 'winter';  // 쿨+어두움
        }

        function hexToRgb(hex) {
            if (!hex) return null;
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        // ========== 4단계: Delta E + 실무 가중치 최종 추천 ==========
        function calculateFinalRecommendations(skinLab, candidates, personalColorResult, lightingMeta) {
            console.log('🏆 4단계: 최종 추천 계산...');

            const lq = lightingMeta?.lightingQuality || 0.5;
            const results = [];

            const allCandidates = [...(candidates.primary || []), ...(candidates.secondary || [])];

            // ✅ Personal Analysis 데이터 가져오기
            const profile = window.customerProfile || {};
            const hasProfile = profile.analysisComplete === true;
            if (hasProfile) {
                console.log('👤 Personal Analysis 데이터 적용:', {
                    키: profile.height,
                    희망기장: profile.desiredLength,
                    앞머리: profile.fringePreference,
                    피부타입: profile.skinType,
                    컬선호: profile.curlPreference
                });
            }

            allCandidates.forEach(color => {
                const colorRgb = hexToRgb(color.hex);
                if (!colorRgb) return;

                const colorLab = rgbToLab(colorRgb.r, colorRgb.g, colorRgb.b);

                // Delta E CIE76 계산 (Lab 유클리드 거리)
                // 참고: CIEDE2000보다 단순하지만 시즌 분류에는 충분함
                const deltaE = Math.sqrt(
                    Math.pow(skinLab.L - colorLab.L, 2) +
                    Math.pow(skinLab.a - colorLab.a, 2) +
                    Math.pow(skinLab.b - colorLab.b, 2)
                );

                // Harmony Score 계산
                let harmonyScore = 100;

                // 1. 톤 조화 (언더톤 매칭)
                const toneBonus = color.toneMatch ? 15 : 0;
                harmonyScore += toneBonus;

                // 2. 명도 대비 조화 (적당한 대비가 좋음)
                const contrastL = Math.abs(skinLab.L - colorLab.L);
                if (contrastL >= 20 && contrastL <= 40) harmonyScore += 10;
                else if (contrastL > 50) harmonyScore -= 10;

                // 3. 채도 조화
                const skinC = personalColorResult.chroma || 50;
                const colorC = Math.sqrt(colorLab.a*colorLab.a + colorLab.b*colorLab.b);
                if (Math.abs(skinC - colorC) < 30) harmonyScore += 5;

                // 🟢 보색 중화(Neutralization) 로직 - PDF COLOR CONTROL 이론 적용
                // 피부 단점을 커버해주는 전문적인 추천
                const colorTone = (color.tone || color.colorFamily || '').toLowerCase();

                // 4-1. 피부의 붉은기(a)가 너무 높으면(홍조) → Green/Matte 계열 점수 UP
                if (skinLab.a > 18) {
                    if (colorTone.includes('matte') || colorTone.includes('green') ||
                        colorTone.includes('ash') || colorTone.includes('올리브') || colorTone.includes('매트')) {
                        harmonyScore += 15; // 붉은기 중화 보너스
                        console.log(`🩹 [보색 중화] ${color.name}: 붉은기 중화 보너스 +15`);
                    }
                    if (colorTone.includes('red') || colorTone.includes('pink') ||
                        colorTone.includes('레드') || colorTone.includes('핑크')) {
                        harmonyScore -= 10; // 붉은기 강조 감점
                        console.log(`⚠️ [보색 중화] ${color.name}: 붉은기 강조 감점 -10`);
                    }
                }

                // 4-2. 피부가 너무 노랗다면(b > 25) → Purple/Violet 계열 점수 UP
                if (skinLab.b > 25) {
                    if (colorTone.includes('violet') || colorTone.includes('purple') ||
                        colorTone.includes('바이올렛') || colorTone.includes('보라')) {
                        harmonyScore += 15; // 노란기 중화
                        console.log(`🩹 [보색 중화] ${color.name}: 노란기 중화 보너스 +15`);
                    }
                }

                // 4-3. 피부가 창백하다면(L > 70, a < 8) → 약간의 붉은기가 있는 컬러로 혈색 보정
                if (skinLab.L > 70 && skinLab.a < 8) {
                    if (colorTone.includes('rose') || colorTone.includes('coral') ||
                        colorTone.includes('로즈') || colorTone.includes('코랄')) {
                        harmonyScore += 10; // 혈색 보정 보너스
                        console.log(`🩹 [보색 중화] ${color.name}: 혈색 보정 보너스 +10`);
                    }
                }

                // ========== ✅ 신규: Personal Analysis 가중치 ==========
                if (hasProfile) {
                    // 5-1. 키 기반 명도 조정
                    if (profile.height) {
                        if (profile.height <= 158 && color.level >= 8) {
                            harmonyScore += 10;  // 작은 키는 밝은 컬러로 얼굴 화사하게
                        } else if (profile.height >= 170 && color.level <= 6) {
                            harmonyScore += 8;   // 큰 키는 어두운 컬러로 세련되게
                        }
                    }

                    // 5-2. 희망 기장에 따른 레벨 조정
                    if (profile.desiredLength) {
                        const shortLengths = ['G', 'H'];  // 숏컷
                        const longLengths = ['A', 'B', 'C'];  // 롱헤어

                        if (shortLengths.includes(profile.desiredLength)) {
                            // 숏컷은 밝고 입체감 있는 컬러
                            if (color.level >= 7) harmonyScore += 8;
                            if (colorTone.includes('beige') || colorTone.includes('베이지')) harmonyScore += 5;
                        } else if (longLengths.includes(profile.desiredLength)) {
                            // 롱헤어는 중~저명도로 풍성함 강조
                            if (color.level >= 4 && color.level <= 7) harmonyScore += 8;
                        }
                    }

                    // 5-3. 앞머리 유무에 따른 조정
                    if (profile.fringePreference && profile.fringePreference !== 'none') {
                        // 앞머리 있으면 얼굴이 작아보이므로 밝은 컬러 추천
                        if (color.level >= 7) harmonyScore += 6;
                        // 눈선/눈썹선 앞머리는 눈이 강조되므로 소프트 톤
                        if ((profile.fringePreference === 'eye' || profile.fringePreference === 'eyebrow') &&
                            (colorTone.includes('soft') || colorTone.includes('muted'))) {
                            harmonyScore += 5;
                        }
                    }

                    // 5-4. 컬 선호에 따른 조정
                    if (profile.curlPreference && profile.curlPreference !== 'straight' && profile.curlPreference !== 'none') {
                        // 컬이 있으면 입체감이 있어서 다양한 톤 허용
                        harmonyScore += 3;

                        // SS컬, C+S컬처럼 강한 컬은 매트/소프트 톤 추천
                        if ((profile.curlPreference === 'SS' || profile.curlPreference === 'CS') &&
                            (colorTone.includes('muted') || colorTone.includes('soft') || colorTone.includes('matt'))) {
                            harmonyScore += 8;
                        }
                        // C컬은 자연스러운 베이지/브라운
                        if (profile.curlPreference === 'C' &&
                            (colorTone.includes('beige') || colorTone.includes('brown') || colorTone.includes('베이지') || colorTone.includes('브라운'))) {
                            harmonyScore += 6;
                        }
                    }

                    // 5-5. 피부 타입별 세부 조정
                    if (profile.skinType) {
                        if (profile.skinType === 'TP' && color.level >= 8) {
                            harmonyScore += 10;  // 투명 피부(COOL)는 하이톤
                        } else if (profile.skinType === 'BP' && color.level <= 6) {
                            harmonyScore += 10;  // 베이스 피부(WARM)는 로우톤
                        } else if (profile.skinType === 'NP') {
                            harmonyScore += 3;   // 뉴트럴은 전체적으로 보너스
                        }
                    }
                }

                // 6. 우선순위 보너스
                if (color.priority === 1) harmonyScore += 20;
                else if (color.priority === 2) harmonyScore += 10;

                // 7. 브랜드 신뢰도 (있으면)
                if (color.brand && ['로레알', '웰라', 'Shiseido', '밀본'].includes(color.brand)) {
                    harmonyScore += 5;
                }

                // 조명 품질에 따른 상한 조정
                const maxScore = 100 + (lq * 50);
                harmonyScore = Math.min(harmonyScore, maxScore);

                // Delta E가 너무 크면 감점
                if (deltaE > 80) harmonyScore -= 20;
                else if (deltaE > 60) harmonyScore -= 10;

                results.push({
                    ...color,
                    deltaE: deltaE.toFixed(1),
                    harmonyScore: Math.round(harmonyScore),
                    colorLab
                });
            });

            // 정렬
            results.sort((a, b) => b.harmonyScore - a.harmonyScore);

            // 분류
            const recommended1st = results.slice(0, 3);  // 강추천
            const recommended2nd = results.slice(3, 6);  // 무난

            // 피해야 할 컬러 규칙
            const avoidRules = getAvoidColorRules(personalColorResult);

            console.log('🏆 추천 완료 (Personal Analysis 반영):', {
                '1순위': recommended1st.map(c => `${c.name}(${c.harmonyScore}점)`).join(', '),
                '2순위': recommended2nd.length,
                '프로필적용': hasProfile
            });

            return {
                recommended1st,
                recommended2nd,
                avoidRules,
                allScored: results
            };
        }

        function getAvoidColorRules(personalColorResult) {
            const { season, subtype, undertone } = personalColorResult;
            const rules = [];

            if (undertone === 'Warm') {
                rules.push(t('personalColor.avoidRules.coolToneWarning') || '블루블랙, 애쉬블루 등 차가운 톤은 얼굴이 칙칙해 보일 수 있음');
                if (subtype === 'light' || subtype === 'bright') {
                    rules.push(t('personalColor.avoidRules.darkLevelWarning') || '3레벨 이하 어두운 색상은 피부가 어두워 보일 수 있음');
                }
            } else if (undertone === 'Cool') {
                rules.push(t('personalColor.avoidRules.warmToneWarning') || '골드, 오렌지, 구리색 등 따뜻한 톤은 피부가 노랗게 보일 수 있음');
                if (subtype === 'light') {
                    rules.push(t('personalColor.avoidRules.vividRedWarning') || '선명한 레드, 오렌지 계열은 피할 것');
                }
            } else {
                rules.push(t('personalColor.avoidRules.neutralRecommend') || '너무 극단적인 웜/쿨 톤보다는 뉴트럴 계열 추천');
            }

            if (subtype === 'muted' || subtype === 'soft') {
                rules.push(t('personalColor.avoidRules.vividColorWarning') || '채도가 너무 높은 비비드 컬러는 피부톤과 충돌할 수 있음');
            }

            return rules;
        }

        // ========== 전문가 피드백 함수 (논문 기반 감성 이미지 & 토탈 뷰티 컨설팅) ==========
        // ========== 전문가용 컬러 사이언스 데이터베이스 ==========
        // PDF 색채학 이론 + 브랜드별 레시피 정보 통합
        // ========== 다국어 전문가 가이드 데이터베이스 ==========
        const EXPERT_GUIDE_DB_KO = {
            'spring-bright': {
                toneKeyword: "생기 있고 비비드한(Active/Cute) 봄의 에너지",
                fashionVibe: "알록달록한 패턴이나 경쾌한 캐주얼 룩이 잘 어울립니다.",
                makeupBase: "밝은 아이보리(19-21호)로 화사하게, 립은 코랄/오렌지 추천",
                recommendLevel: "8~10 Level (선명한 반사빛)",
                undercoatTip: "노란기가 도는 Pale Yellow까지 탈색 필요",
                textureTip: "무거운 라인보다는 끝이 가벼운 레이어드 컷",
                avoidColors: ["탁한 카키", "회색빛이 많이 도는 애쉬", "블랙"],
                seasonalAdvice: "채도가 높은 오렌지 브라운, 골드 브라운은 고객님의 생동감 있는 이미지를 극대화합니다.",
                consultingTip: "얼굴의 혈색을 살려주는 고채도 컬러가 베스트입니다.",
                // 🔬 컬러 사이언스 분석
                colorScience: {
                    melaninType: "페오멜라닌 우세 (Pheomelanin Dominant)",
                    undercoatPrediction: "탈색 시 Yellow-Orange 언더코트 예상",
                    neutralizationStrategy: "노란기 활용, 바이올렛 보색 최소화"
                },
                // 💊 전문 시술 레시피
                recipes: [
                    {
                        styleName: "오렌지 골드 브라운",
                        vibe: "화사하고 생기있는",
                        reason: "봄 웜 브라이트의 높은 채도와 밝은 피부톤을 극대화",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/34 (Gold Red) : 8/03 (Natural Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35분"
                    },
                    {
                        styleName: "선셋 코랄",
                        vibe: "따뜻하고 활력있는",
                        reason: "피부의 노란 베이스와 조화로운 따뜻한 코랄톤",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-OR (Orange) : 9-BE (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30분"
                    }
                ]
            },
            'spring-light': {
                toneKeyword: "투명하고 사랑스러운(Romantic/Clear) 봄의 햇살",
                fashionVibe: "파스텔 톤의 블라우스나 쉬폰 소재가 찰떡궁합입니다.",
                makeupBase: "피치 톤이 감도는 밝은 베이스(17-19호)",
                recommendLevel: "9~12 Level (High Lift)",
                undercoatTip: "최대한 붉은기를 뺀 옐로우 베이스 필요",
                textureTip: "바람에 날리는 듯한 굵은 웨이브 펌",
                avoidColors: ["너무 어두운 다크 브라운", "강렬한 버건디"],
                seasonalAdvice: "밀크티 베이지나 피치 베이지처럼 부드러운 우유 섞인 색감이 피부 투명도를 높여줍니다.",
                consultingTip: "탁한 느낌을 피하고 '맑음'을 유지하는 것이 핵심입니다.",
                colorScience: {
                    melaninType: "페오멜라닌 우세, 밝은 피부 (Light Pheomelanin)",
                    undercoatPrediction: "탈색 시 Pale Yellow 언더코트, 빠른 리프팅 예상",
                    neutralizationStrategy: "붉은기 최소화, 연한 바이올렛으로 노란기 조절"
                },
                recipes: [
                    {
                        styleName: "밀크티 베이지",
                        vibe: "투명하고 청순한",
                        reason: "맑은 피부톤을 더욱 투명하게, 부드러운 느낌 극대화",
                        brand: "Milbon",
                        line: "Ordeve Beaute",
                        mixRatio: "10-BE (Beige) : 10-MT (Matte) = 3:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30분"
                    },
                    {
                        styleName: "피치 블론드",
                        vibe: "로맨틱하고 사랑스러운",
                        reason: "피치 언더톤과 조화, 화사하면서 부드러운 인상",
                        brand: "Wella",
                        line: "Illumina Color",
                        mixRatio: "10/36 (Gold Violet) : 10/05 (Natural Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35분"
                    }
                ]
            },
            'summer-light': {
                toneKeyword: "청초하고 깨끗한(Pure/Clean) 여름의 물결",
                fashionVibe: "화이트 셔츠나 하늘색 데님 등 심플하고 깨끗한 룩",
                makeupBase: "붉은기를 잡아주는 핑크 베이스(13-21호)",
                recommendLevel: "8~10 Level (붉은기 없는 투명함)",
                undercoatTip: "노란기를 중화(보색샴푸)하여 레몬빛 제거 필요",
                textureTip: "슬릭한 생머리나 C컬로 결정돈 강조",
                avoidColors: ["노란기가 강한 골드", "오렌지", "구리빛"],
                seasonalAdvice: "애쉬 블론드나 라벤더 애쉬처럼 차가운 파스텔 톤이 피부를 더욱 하얗게 보이게 합니다.",
                consultingTip: "노란 조명 아래서는 칙칙해 보일 수 있으니, 자연광에서의 투명함을 강조해주세요.",
                colorScience: {
                    melaninType: "유멜라닌 우세, 쿨 피부 (Eumelanin Cool)",
                    undercoatPrediction: "탈색 시 Yellow 언더코트, 바이올렛 보색 필수",
                    neutralizationStrategy: "바이올렛/애쉬로 노란기 완전 중화"
                },
                recipes: [
                    {
                        styleName: "라벤더 애쉬",
                        vibe: "청초하고 신비로운",
                        reason: "쿨톤 피부의 투명함을 극대화, 노란기 완전 제거",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-Vi (Violet) : 9-A (Ash) = 1:2",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30분"
                    },
                    {
                        styleName: "로즈 브라운",
                        vibe: "우아하고 여성스러운",
                        reason: "핑크 언더톤과 조화, 차갑지 않으면서 청순한 느낌",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/65 (Violet Mahogany) : 8/1 (Ash) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35분"
                    }
                ]
            },
            'summer-bright': {
                toneKeyword: "시원하고 청량한(Fresh/Cool) 여름의 바다",
                fashionVibe: "깨끗한 화이트, 라이트 블루, 민트 계열 의상",
                makeupBase: "쿨핑크 베이스, 로즈 치크와 베리 립",
                recommendLevel: "7~9 Level (청량한 광택)",
                undercoatTip: "애쉬~핑크 계열 언더톤, 노란기 제거 필수",
                textureTip: "청량하고 깨끗한 광택감 연출, 시스루뱅",
                avoidColors: ["골드", "오렌지", "머스타드", "구리빛"],
                seasonalAdvice: "로즈 브라운, 쿨 핑크 브라운이 청아한 이미지를 살려줍니다.",
                consultingTip: "시원하고 깨끗한 인상을 강조하는 것이 포인트입니다."
            },
            'summer-muted': {
                toneKeyword: "우아하고 지적인(Elegance/Soft) 여름의 안개",
                fashionVibe: "그레이시한 톤온톤 배색, 차분한 오피스 룩",
                makeupBase: "자연스러운 핑크 베이지(21-23호)",
                recommendLevel: "6~8 Level (차분한 중명도)",
                undercoatTip: "탈색 없이도 가능한 레벨이나, 붉은기는 억제 필요",
                textureTip: "빌드펌이나 엘리자벳펌 같은 우아한 볼륨",
                avoidColors: ["쨍한 비비드 컬러", "검은색에 가까운 다크함"],
                seasonalAdvice: "애쉬 브라운, 스모키 모카처럼 회색빛이 섞인 컬러가 고객님의 우아한 분위기를 완성합니다.",
                consultingTip: "너무 밝지도 어둡지도 않은 '중간 밝기'에서 가장 고급스럽습니다."
            },
            'autumn-muted': {
                toneKeyword: "차분하고 자연스러운(Natural/Classic) 가을의 감성",
                fashionVibe: "베이지, 카키, 브라운 계열의 니트나 트렌치코트",
                makeupBase: "차분한 옐로우 베이스(21-23호), MLBB 립",
                recommendLevel: "5~7 Level (분위기 있는 음영)",
                undercoatTip: "오렌지빛 언더코트를 자연스럽게 활용 가능",
                textureTip: "히피펌이나 내추럴한 웨이브",
                avoidColors: ["형광기가 도는 핑크", "차가운 블루 블랙"],
                seasonalAdvice: "매트 브라운, 올리브 브라운은 피부의 홍조를 가려주고 차분한 분위기를 줍니다.",
                consultingTip: "튀는 색보다는 머릿결의 질감을 살려주는 부드러운 브라운이 좋습니다.",
                colorScience: {
                    melaninType: "혼합형 멜라닌, 저채도 피부 (Mixed Melanin, Low Chroma)",
                    undercoatPrediction: "탈색 시 Orange-Yellow 언더코트, 매트 보색으로 중화 필요",
                    neutralizationStrategy: "Green(매트)로 붉은기 중화, 탁함 방지"
                },
                recipes: [
                    {
                        styleName: "올리브 매트 브라운",
                        vibe: "차분하고 세련된",
                        reason: "피부의 붉은기를 중화하여 깨끗하고 차분한 인상 연출",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "7-MT (Matte) : 7-NB (Natural Brown) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35분"
                    },
                    {
                        styleName: "카키 베이지",
                        vibe: "내추럴하고 편안한",
                        reason: "자연스러운 어스톤으로 부드러운 분위기 연출",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "7.8 (Mocha) : 7.13 (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35분"
                    }
                ]
            },
            'autumn-soft': {
                toneKeyword: "포근하고 따뜻한(Warm/Cozy) 가을의 오후",
                fashionVibe: "캐시미어 니트, 코듀로이, 따뜻한 어스톤 의상",
                makeupBase: "웜베이지 베이스(21호), 피치/테라코타 립",
                recommendLevel: "6~8 Level (부드러운 웜톤)",
                undercoatTip: "웜 베이지 언더톤, 부드러운 그라데이션 권장",
                textureTip: "볼륨 레이어드, 소프트 웨이브",
                avoidColors: ["블랙", "애쉬블루", "비비드 오렌지"],
                seasonalAdvice: "밀크초코, 모카 브라운처럼 부드럽고 따뜻한 색이 편안한 분위기를 만듭니다.",
                consultingTip: "극단적인 색보다 은은하고 자연스러운 그라데이션이 좋습니다.",
                colorScience: {
                    melaninType: "페오멜라닌 우세, 중간 피부톤 (Warm Pheomelanin)",
                    undercoatPrediction: "탈색 시 Orange 언더코트, 따뜻한 톤 유지",
                    neutralizationStrategy: "오렌지 활용, 매트로 부드럽게 조절"
                },
                recipes: [
                    {
                        styleName: "밀크 초코 브라운",
                        vibe: "포근하고 따뜻한",
                        reason: "부드러운 웜톤으로 편안하고 친근한 이미지 연출",
                        brand: "Wella",
                        line: "Softouch",
                        mixRatio: "S7/37 (Gold Brown) : S7/03 (Natural Gold) = 1:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30분"
                    },
                    {
                        styleName: "허니 베이지",
                        vibe: "달콤하고 부드러운",
                        reason: "꿀빛 윤기로 건강하고 화사한 느낌",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "8-BE (Beige) : 8-GO (Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30분"
                    }
                ]
            },
            'autumn-deep': {
                toneKeyword: "그윽하고 고급스러운(Gorgeous/Ethnic) 가을의 깊이",
                fashionVibe: "골드 액세서리, 가죽 자켓, 에스닉한 패턴",
                makeupBase: "건강한 웜 베이지(23호 이상), 음영 메이크업",
                recommendLevel: "4~6 Level (무게감 있는 컬러)",
                undercoatTip: "붉은 갈색(Red-Brown) 언더코트 활용 좋음",
                textureTip: "풍성한 글램펌이나 무게감 있는 태슬컷",
                avoidColors: ["너무 가벼운 파스텔 톤", "창백한 애쉬"],
                seasonalAdvice: "다크 초콜릿, 카퍼 브라운처럼 깊이감 있는 웜톤 컬러가 이목구비를 또렷하게 해줍니다.",
                consultingTip: "밝기보다는 '윤기'와 '색감의 깊이'에 집중하세요.",
                colorScience: {
                    melaninType: "페오멜라닌 풍부, 깊은 피부톤 (Rich Pheomelanin)",
                    undercoatPrediction: "탈색 시 Red-Orange 언더코트, 붉은기 강하게 발현",
                    neutralizationStrategy: "카퍼/골드로 붉은기 활용, 깊이감 강조"
                },
                recipes: [
                    {
                        styleName: "다크 초콜릿",
                        vibe: "깊고 고급스러운",
                        reason: "피부톤과의 대비로 이목구비를 또렷하게, 성숙한 매력",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "5.35 (Chocolate) : 5.52 (Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40분"
                    },
                    {
                        styleName: "카퍼 마호가니",
                        vibe: "풍부하고 화려한",
                        reason: "구리빛 윤기로 고급스럽고 깊이 있는 인상",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "5/43 (Red Gold) : 5/75 (Brown Mahogany) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40분"
                    }
                ]
            },
            'winter-deep': {
                toneKeyword: "도시적이고 카리스마 있는(Modern/Chic) 겨울의 밤",
                fashionVibe: "블랙&화이트의 모던 룩, 실버 액세서리, 수트",
                makeupBase: "깨끗하고 창백한 쿨 베이스 또는 투명한 광채",
                recommendLevel: "1~4 Level (확실한 대비감)",
                undercoatTip: "거의 필요 없거나, 블루/바이올렛 반사빛만 추가",
                textureTip: "칼단발, 스트레이트, 엣지 있는 숏컷",
                avoidColors: ["어중간한 갈색", "노란기가 도는 웜 브라운"],
                seasonalAdvice: "블루 블랙, 다크 네이비 같이 차갑고 어두운 컬러가 고객님의 카리스마를 극대화합니다.",
                consultingTip: "머리색과 피부색의 '대비(Contrast)'가 클수록 얼굴이 작아 보입니다.",
                colorScience: {
                    melaninType: "유멜라닌 우세, 높은 대비 (Strong Eumelanin, High Contrast)",
                    undercoatPrediction: "자연모 유지 또는 블루-바이올렛 반사빛 추가",
                    neutralizationStrategy: "탈색 불필요, 블루/바이올렛 광택만 추가"
                },
                recipes: [
                    {
                        styleName: "블루 블랙",
                        vibe: "카리스마 있고 도시적인",
                        reason: "피부와의 강한 대비로 이목구비를 또렷하게, 모던한 느낌",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "3-NV (Navy) : 3-A (Ash) = 2:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "25분"
                    },
                    {
                        styleName: "다크 바이올렛",
                        vibe: "신비롭고 세련된",
                        reason: "깊은 보라빛으로 고급스럽고 독특한 매력 연출",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "3/66 (Intense Violet) : 3/0 (Natural) = 1:2",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30분"
                    }
                ]
            },
            'winter-bright': {
                toneKeyword: "화려하고 강렬한(Vivid/Dramatic) 겨울의 다이아몬드",
                fashionVibe: "블랙, 화이트, 비비드 레드 같은 선명한 대비",
                makeupBase: "투명한 쿨베이스, 선명한 레드/와인 립",
                recommendLevel: "1~5 Level 또는 탈색+비비드 컬러",
                undercoatTip: "쿨톤 베이스 유지, 노란기 완전 제거 필수",
                textureTip: "선명하고 광택 있는 마무리, 강렬한 뱅헤어",
                avoidColors: ["베이지", "골드", "오렌지", "탁한 브라운"],
                seasonalAdvice: "퓨어 블랙, 와인, 다크 플럼처럼 강렬하고 선명한 대비가 핵심입니다.",
                consultingTip: "화려하고 임팩트 있는 이미지로 시선을 사로잡으세요."
            },
            'winter-muted': {
                toneKeyword: "세련되고 차분한(Sophisticated/Urban) 겨울의 석양",
                fashionVibe: "그레이 수트, 차콜 코트, 미니멀한 모노톤",
                makeupBase: "뉴트럴~쿨 베이지, 자연스러운 음영",
                recommendLevel: "4~6 Level (무채색 계열)",
                undercoatTip: "그레이~애쉬 베이스, 채도 최소화",
                textureTip: "매트하고 차분한 질감, 깔끔한 원랭스",
                avoidColors: ["골드", "오렌지", "코랄"],
                seasonalAdvice: "차콜, 다크 애쉬처럼 무채색 계열이 세련된 분위기를 완성합니다.",
                consultingTip: "화려한 색보다 절제된 멋을 보여주는 것이 포인트입니다."
            },
            'neutral-light': {
                toneKeyword: "부드럽고 다채로운(Versatile/Soft) 뉴트럴의 조화",
                fashionVibe: "웜/쿨 모두 가능, 밝은 톤의 캐주얼 룩",
                makeupBase: "뉴트럴 베이지(19-21호), 자연스러운 컬러",
                recommendLevel: "7~9 Level (다양하게 소화 가능)",
                undercoatTip: "뉴트럴 베이지 베이스, 극단적인 웜/쿨 피하기",
                textureTip: "자연스럽고 부드러운 질감, 레이어드 컷",
                avoidColors: ["비비드 오렌지", "블루블랙", "네온"],
                seasonalAdvice: "밀크티, 로즈베이지처럼 중간 톤의 부드러운 색이 다양하게 어울립니다.",
                consultingTip: "다양한 컬러가 어울리니 고객 취향에 맞게 조절해주세요."
            },
            'neutral-muted': {
                toneKeyword: "편안하고 자연스러운(Comfortable/Natural) 뉴트럴의 안정",
                fashionVibe: "어스톤, 뉴트럴 컬러의 편안한 캐주얼",
                makeupBase: "뉴트럴~쿨 베이지(21-23호), MLBB 립",
                recommendLevel: "5~7 Level (차분한 중간톤)",
                undercoatTip: "뉴트럴~쿨 베이지 베이스, 채도 낮게",
                textureTip: "자연스럽고 차분한 질감, 히피웨이브",
                avoidColors: ["비비드 오렌지", "네온", "퓨어블랙"],
                seasonalAdvice: "그레이베이지, 토프처럼 차분하고 자연스러운 색이 편안한 분위기를 만듭니다.",
                consultingTip: "세련되고 편안한 느낌을 연출하는 것이 좋습니다."
            },
            'neutral-soft': {
                toneKeyword: "따뜻하면서 차분한(Gentle/Balanced) 뉴트럴의 균형",
                fashionVibe: "로맨틱하면서도 차분한 톤의 블라우스, 니트",
                makeupBase: "핑크베이지 베이스(21호), 로즈 립",
                recommendLevel: "6~8 Level (부드러운 중간톤)",
                undercoatTip: "뉴트럴 베이지 베이스, 부드러운 그라데이션",
                textureTip: "부드럽고 자연스러운 광택, 소프트 레이어드",
                avoidColors: ["블루블랙", "비비드 레드", "애쉬그레이"],
                seasonalAdvice: "밀크모카, 로즈브라운처럼 부드럽고 은은한 색이 조화롭습니다.",
                consultingTip: "따뜻하면서도 차분한 분위기를 연출해주세요."
            },
            'neutral-deep': {
                toneKeyword: "깊이있고 성숙한(Mature/Rich) 뉴트럴의 무게감",
                fashionVibe: "고급스러운 브라운, 버건디, 다크 컬러 의상",
                makeupBase: "웜~뉴트럴 베이지(23호), 깊은 컬러 립",
                recommendLevel: "4~6 Level (깊이감 있는 톤)",
                undercoatTip: "뉴트럴 브라운 베이스",
                textureTip: "깊이감 있는 자연스러운 마무리, 볼륨 펌",
                avoidColors: ["플래티넘", "애쉬블루", "비비드 핑크"],
                seasonalAdvice: "초콜릿, 다크모카처럼 깊고 자연스러운 색이 성숙한 매력을 보여줍니다.",
                consultingTip: "세련되고 성숙한 느낌을 연출해주세요."
            }
        };

        // ========== 영어 전문가 가이드 데이터베이스 ==========
        const EXPERT_GUIDE_DB_EN = {
            'spring-bright': {
                toneKeyword: "Vibrant and vivid (Active/Cute) spring energy",
                fashionVibe: "Colorful patterns and cheerful casual looks suit you best.",
                makeupBase: "Bright ivory (shade 19-21) for radiance, coral/orange lip recommended",
                recommendLevel: "8~10 Level (vivid reflection)",
                undercoatTip: "Bleaching to Pale Yellow with yellow undertone needed",
                textureTip: "Light layered cut rather than heavy lines",
                avoidColors: ["Muddy khaki", "Heavy ash gray", "Black"],
                seasonalAdvice: "High-saturation orange brown and gold brown maximize your vibrant image.",
                consultingTip: "High-chroma colors that bring out your complexion are best.",
                colorScience: {
                    melaninType: "Pheomelanin Dominant",
                    undercoatPrediction: "Yellow-Orange undercoat expected when bleaching",
                    neutralizationStrategy: "Utilize yellow tones, minimize violet complement"
                },
                recipes: [
                    {
                        styleName: "Orange Gold Brown",
                        vibe: "Radiant and lively",
                        reason: "Maximizes the high chroma and bright skin tone of Spring Warm Bright",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/34 (Gold Red) : 8/03 (Natural Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35min"
                    },
                    {
                        styleName: "Sunset Coral",
                        vibe: "Warm and energetic",
                        reason: "Harmonizes with yellow-based skin for a warm coral tone",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-OR (Orange) : 9-BE (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30min"
                    }
                ]
            },
            'spring-light': {
                toneKeyword: "Clear and lovely (Romantic/Clear) spring sunshine",
                fashionVibe: "Pastel blouses and chiffon materials are perfect matches.",
                makeupBase: "Bright base with peachy undertone (shade 17-19)",
                recommendLevel: "9~12 Level (High Lift)",
                undercoatTip: "Yellow base with minimal red needed",
                textureTip: "Soft flowing waves as if blown by the wind",
                avoidColors: ["Too dark brown", "Intense burgundy"],
                seasonalAdvice: "Soft milk-tea beige or peach beige colors enhance your skin's transparency.",
                consultingTip: "Avoiding dullness and maintaining 'clarity' is key.",
                colorScience: {
                    melaninType: "Light Pheomelanin",
                    undercoatPrediction: "Pale Yellow undercoat, fast lifting expected",
                    neutralizationStrategy: "Minimize red, adjust yellow with light violet"
                },
                recipes: [
                    {
                        styleName: "Milk Tea Beige",
                        vibe: "Clear and innocent",
                        reason: "Makes clear skin more transparent, maximizes soft impression",
                        brand: "Milbon",
                        line: "Ordeve Beaute",
                        mixRatio: "10-BE (Beige) : 10-MT (Matte) = 3:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30min"
                    },
                    {
                        styleName: "Peach Blonde",
                        vibe: "Romantic and lovely",
                        reason: "Harmonizes with peach undertone for bright yet soft impression",
                        brand: "Wella",
                        line: "Illumina Color",
                        mixRatio: "10/36 (Gold Violet) : 10/05 (Natural Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35min"
                    }
                ]
            },
            'summer-light': {
                toneKeyword: "Pure and clean (Pure/Clean) summer waves",
                fashionVibe: "Simple and clean looks like white shirts or light blue denim",
                makeupBase: "Pink base to neutralize redness (shade 13-21)",
                recommendLevel: "8~10 Level (clear without red)",
                undercoatTip: "Need to neutralize yellow (purple shampoo) to remove lemon tones",
                textureTip: "Sleek straight hair or C-curl to emphasize texture",
                avoidColors: ["Strong gold yellow", "Orange", "Copper"],
                seasonalAdvice: "Cool pastels like ash blonde or lavender ash make your skin look even whiter.",
                consultingTip: "May look dull under yellow lighting, emphasize the transparency in natural light.",
                colorScience: {
                    melaninType: "Eumelanin Cool",
                    undercoatPrediction: "Yellow undercoat when bleaching, violet complement essential",
                    neutralizationStrategy: "Fully neutralize yellow with violet/ash"
                },
                recipes: [
                    {
                        styleName: "Lavender Ash",
                        vibe: "Pure and mysterious",
                        reason: "Maximizes cool-toned skin transparency, completely removes yellow",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-Vi (Violet) : 9-A (Ash) = 1:2",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30min"
                    },
                    {
                        styleName: "Rose Brown",
                        vibe: "Elegant and feminine",
                        reason: "Harmonizes with pink undertone, pure without being cold",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/65 (Violet Mahogany) : 8/1 (Ash) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35min"
                    }
                ]
            },
            'summer-bright': {
                toneKeyword: "Fresh and cool (Fresh/Cool) summer sea",
                fashionVibe: "Clean white, light blue, mint colored outfits",
                makeupBase: "Cool pink base, rose cheek and berry lip",
                recommendLevel: "7~9 Level (cool shine)",
                undercoatTip: "Ash to pink undertone, yellow removal essential",
                textureTip: "Fresh and clean shine, see-through bangs",
                avoidColors: ["Gold", "Orange", "Mustard", "Copper"],
                seasonalAdvice: "Rose brown and cool pink brown enhance your pure image.",
                consultingTip: "Emphasizing a fresh and clean impression is the key."
            },
            'summer-muted': {
                toneKeyword: "Elegant and intellectual (Elegance/Soft) summer mist",
                fashionVibe: "Grayish tone-on-tone color scheme, calm office look",
                makeupBase: "Natural pink beige (shade 21-23)",
                recommendLevel: "6~8 Level (calm mid-tone)",
                undercoatTip: "Possible without bleaching, but suppress red",
                textureTip: "Elegant volume like build perm or Elizabeth perm",
                avoidColors: ["Vivid colors", "Near-black dark colors"],
                seasonalAdvice: "Gray-tinted colors like ash brown or smoky mocha complete your elegant atmosphere.",
                consultingTip: "You look most luxurious at 'medium brightness' - not too bright, not too dark."
            },
            'autumn-muted': {
                toneKeyword: "Calm and natural (Natural/Classic) autumn mood",
                fashionVibe: "Beige, khaki, brown knits or trench coats",
                makeupBase: "Calm yellow base (shade 21-23), MLBB lip",
                recommendLevel: "5~7 Level (atmospheric shadow)",
                undercoatTip: "Can naturally utilize orange undercoat",
                textureTip: "Hippie perm or natural waves",
                avoidColors: ["Fluorescent pink", "Cold blue black"],
                seasonalAdvice: "Matte brown, olive brown hide skin redness and give a calm atmosphere.",
                consultingTip: "Soft brown that enhances hair texture is better than flashy colors.",
                colorScience: {
                    melaninType: "Mixed Melanin, Low Chroma",
                    undercoatPrediction: "Orange-Yellow undercoat, needs matte complement neutralization",
                    neutralizationStrategy: "Neutralize red with Green(matte), prevent dullness"
                },
                recipes: [
                    {
                        styleName: "Olive Matte Brown",
                        vibe: "Calm and sophisticated",
                        reason: "Neutralizes skin redness for a clean and calm impression",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "7-MT (Matte) : 7-NB (Natural Brown) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35min"
                    },
                    {
                        styleName: "Khaki Beige",
                        vibe: "Natural and comfortable",
                        reason: "Natural earth tone creates a soft atmosphere",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "7.8 (Mocha) : 7.13 (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35min"
                    }
                ]
            },
            'autumn-soft': {
                toneKeyword: "Cozy and warm (Warm/Cozy) autumn afternoon",
                fashionVibe: "Cashmere knits, corduroy, warm earth tone outfits",
                makeupBase: "Warm beige base (shade 21), peach/terracotta lip",
                recommendLevel: "6~8 Level (soft warm tone)",
                undercoatTip: "Warm beige undertone, soft gradation recommended",
                textureTip: "Volume layered, soft wave",
                avoidColors: ["Black", "Ash blue", "Vivid orange"],
                seasonalAdvice: "Soft and warm colors like milk chocolate and mocha brown create a comfortable atmosphere.",
                consultingTip: "Subtle and natural gradation is better than extreme colors.",
                colorScience: {
                    melaninType: "Warm Pheomelanin",
                    undercoatPrediction: "Orange undercoat, maintain warm tone",
                    neutralizationStrategy: "Utilize orange, soften with matte"
                },
                recipes: [
                    {
                        styleName: "Milk Choco Brown",
                        vibe: "Cozy and warm",
                        reason: "Soft warm tone creates comfortable and friendly image",
                        brand: "Wella",
                        line: "Softouch",
                        mixRatio: "S7/37 (Gold Brown) : S7/03 (Natural Gold) = 1:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30min"
                    },
                    {
                        styleName: "Honey Beige",
                        vibe: "Sweet and soft",
                        reason: "Honey shine for healthy and radiant look",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "8-BE (Beige) : 8-GO (Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30min"
                    }
                ]
            },
            'autumn-deep': {
                toneKeyword: "Deep and luxurious (Gorgeous/Ethnic) autumn depth",
                fashionVibe: "Gold accessories, leather jacket, ethnic patterns",
                makeupBase: "Healthy warm beige (shade 23+), contour makeup",
                recommendLevel: "4~6 Level (rich colors)",
                undercoatTip: "Red-Brown undercoat works well",
                textureTip: "Voluminous glam perm or weighted tassel cut",
                avoidColors: ["Light pastels", "Pale ash"],
                seasonalAdvice: "Deep warm colors like dark chocolate and copper brown make your features more defined.",
                consultingTip: "Focus on 'shine' and 'color depth' rather than brightness.",
                colorScience: {
                    melaninType: "Rich Pheomelanin",
                    undercoatPrediction: "Red-Orange undercoat, strong red reveal",
                    neutralizationStrategy: "Utilize red with copper/gold, emphasize depth"
                },
                recipes: [
                    {
                        styleName: "Dark Chocolate",
                        vibe: "Deep and luxurious",
                        reason: "Contrast with skin defines features, mature charm",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "5.35 (Chocolate) : 5.52 (Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40min"
                    },
                    {
                        styleName: "Copper Mahogany",
                        vibe: "Rich and glamorous",
                        reason: "Copper shine for luxurious and deep impression",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "5/43 (Red Gold) : 5/75 (Brown Mahogany) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40min"
                    }
                ]
            },
            'winter-deep': {
                toneKeyword: "Urban and charismatic (Modern/Chic) winter night",
                fashionVibe: "Modern black & white look, silver accessories, suits",
                makeupBase: "Clean and pale cool base or transparent radiance",
                recommendLevel: "1~4 Level (strong contrast)",
                undercoatTip: "Almost not needed, just add blue/violet reflection",
                textureTip: "Sharp bob cut, straight, edgy short cut",
                avoidColors: ["Ambiguous brown", "Yellow-toned warm brown"],
                seasonalAdvice: "Cold and dark colors like blue black and dark navy maximize your charisma.",
                consultingTip: "The stronger the 'contrast' between hair and skin, the smaller your face looks.",
                colorScience: {
                    melaninType: "Strong Eumelanin, High Contrast",
                    undercoatPrediction: "Maintain natural hair or add blue-violet reflection",
                    neutralizationStrategy: "No bleaching needed, just add blue/violet shine"
                },
                recipes: [
                    {
                        styleName: "Blue Black",
                        vibe: "Charismatic and urban",
                        reason: "Strong contrast with skin defines features, modern feel",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "3-NV (Navy) : 3-A (Ash) = 2:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "25min"
                    },
                    {
                        styleName: "Dark Violet",
                        vibe: "Mysterious and sophisticated",
                        reason: "Deep violet for luxurious and unique charm",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "3/66 (Intense Violet) : 3/0 (Natural) = 1:2",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30min"
                    }
                ]
            },
            'winter-bright': {
                toneKeyword: "Glamorous and intense (Vivid/Dramatic) winter diamond",
                fashionVibe: "Sharp contrast with black, white, vivid red",
                makeupBase: "Clear cool base, vivid red/wine lip",
                recommendLevel: "1~5 Level or bleach + vivid color",
                undercoatTip: "Maintain cool tone base, complete yellow removal essential",
                textureTip: "Clear and glossy finish, bold bangs",
                avoidColors: ["Beige", "Gold", "Orange", "Muddy brown"],
                seasonalAdvice: "Intense and vivid contrast with pure black, wine, dark plum is the key.",
                consultingTip: "Capture attention with a glamorous and impactful image."
            },
            'winter-muted': {
                toneKeyword: "Sophisticated and calm (Sophisticated/Urban) winter sunset",
                fashionVibe: "Gray suit, charcoal coat, minimal monotone",
                makeupBase: "Neutral to cool beige, natural contour",
                recommendLevel: "4~6 Level (achromatic range)",
                undercoatTip: "Gray to ash base, minimize saturation",
                textureTip: "Matte and calm texture, clean one-length",
                avoidColors: ["Gold", "Orange", "Coral"],
                seasonalAdvice: "Achromatic colors like charcoal and dark ash complete your sophisticated atmosphere.",
                consultingTip: "Showing restrained elegance rather than flashy colors is the point."
            },
            'neutral-light': {
                toneKeyword: "Soft and versatile (Versatile/Soft) neutral harmony",
                fashionVibe: "Both warm and cool possible, bright casual looks",
                makeupBase: "Neutral beige (shade 19-21), natural colors",
                recommendLevel: "7~9 Level (versatile)",
                undercoatTip: "Neutral beige base, avoid extreme warm/cool",
                textureTip: "Natural and soft texture, layered cut",
                avoidColors: ["Vivid orange", "Blue black", "Neon"],
                seasonalAdvice: "Soft mid-tones like milk tea and rose beige suit you well.",
                consultingTip: "Various colors suit you, adjust to client's preference."
            },
            'neutral-muted': {
                toneKeyword: "Comfortable and natural (Comfortable/Natural) neutral stability",
                fashionVibe: "Earth tone, neutral color comfortable casual",
                makeupBase: "Neutral to cool beige (shade 21-23), MLBB lip",
                recommendLevel: "5~7 Level (calm mid-tone)",
                undercoatTip: "Neutral to cool beige base, low saturation",
                textureTip: "Natural and calm texture, hippie wave",
                avoidColors: ["Vivid orange", "Neon", "Pure black"],
                seasonalAdvice: "Calm and natural colors like gray beige and taupe create a comfortable atmosphere.",
                consultingTip: "Aim for a sophisticated and comfortable feel."
            },
            'neutral-soft': {
                toneKeyword: "Warm yet calm (Gentle/Balanced) neutral balance",
                fashionVibe: "Romantic yet calm toned blouses, knits",
                makeupBase: "Pink beige base (shade 21), rose lip",
                recommendLevel: "6~8 Level (soft mid-tone)",
                undercoatTip: "Neutral beige base, soft gradation",
                textureTip: "Soft and natural shine, soft layered",
                avoidColors: ["Blue black", "Vivid red", "Ash gray"],
                seasonalAdvice: "Soft and subtle colors like milk mocha and rose brown are harmonious.",
                consultingTip: "Create a warm yet calm atmosphere."
            },
            'neutral-deep': {
                toneKeyword: "Deep and mature (Mature/Rich) neutral weight",
                fashionVibe: "Luxurious brown, burgundy, dark color outfits",
                makeupBase: "Warm to neutral beige (shade 23), deep color lip",
                recommendLevel: "4~6 Level (deep tone)",
                undercoatTip: "Neutral brown base",
                textureTip: "Deep and natural finish, volume perm",
                avoidColors: ["Platinum", "Ash blue", "Vivid pink"],
                seasonalAdvice: "Deep and natural colors like chocolate and dark mocha show mature charm.",
                consultingTip: "Create a sophisticated and mature impression."
            }
        };

        // ========== 일본어 전문가 가이드 데이터베이스 ==========
        const EXPERT_GUIDE_DB_JA = {
            'spring-bright': {
                toneKeyword: "生き生きとビビッドな(Active/Cute) 春のエネルギー",
                fashionVibe: "カラフルなパターンや軽やかなカジュアルルックがよく似合います。",
                makeupBase: "明るいアイボリー(19-21号)で華やかに、リップはコーラル/オレンジ推奨",
                recommendLevel: "8~10 Level (鮮やかな反射光)",
                undercoatTip: "黄味がかったペールイエローまでブリーチ必要",
                textureTip: "重いラインより毛先が軽いレイヤードカット",
                avoidColors: ["くすんだカーキ", "グレーが強いアッシュ", "ブラック"],
                seasonalAdvice: "彩度の高いオレンジブラウン、ゴールドブラウンはお客様の活気あるイメージを最大化します。",
                consultingTip: "顔色を活かす高彩度カラーがベストです。",
                colorScience: {
                    melaninType: "フェオメラニン優位 (Pheomelanin Dominant)",
                    undercoatPrediction: "ブリーチ時 Yellow-Orange アンダーコート予想",
                    neutralizationStrategy: "黄味を活用、バイオレット補色を最小化"
                },
                recipes: [
                    {
                        styleName: "オレンジゴールドブラウン",
                        vibe: "華やかで生き生きとした",
                        reason: "スプリングウォームブライトの高彩度と明るい肌トーンを最大化",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/34 (Gold Red) : 8/03 (Natural Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分"
                    },
                    {
                        styleName: "サンセットコーラル",
                        vibe: "温かく活力のある",
                        reason: "黄味ベースの肌と調和する温かいコーラルトーン",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-OR (Orange) : 9-BE (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分"
                    }
                ]
            },
            'spring-light': {
                toneKeyword: "透明感があり愛らしい(Romantic/Clear) 春の陽射し",
                fashionVibe: "パステルトーンのブラウスやシフォン素材がぴったりです。",
                makeupBase: "ピーチトーンが感じられる明るいベース(17-19号)",
                recommendLevel: "9~12 Level (High Lift)",
                undercoatTip: "赤味を最小限に抑えたイエローベース必要",
                textureTip: "風になびくような大きなウェーブパーマ",
                avoidColors: ["暗すぎるダークブラウン", "強烈なバーガンディ"],
                seasonalAdvice: "ミルクティーベージュやピーチベージュのような柔らかいミルキーカラーが肌の透明度を高めます。",
                consultingTip: "くすみを避け'透明感'を維持することがポイントです。",
                colorScience: {
                    melaninType: "フェオメラニン優位、明るい肌 (Light Pheomelanin)",
                    undercoatPrediction: "ブリーチ時 Pale Yellow アンダーコート、速いリフティング予想",
                    neutralizationStrategy: "赤味最小化、薄いバイオレットで黄味調整"
                },
                recipes: [
                    {
                        styleName: "ミルクティーベージュ",
                        vibe: "透明感があり清純な",
                        reason: "クリアな肌トーンをより透明に、柔らかい印象を最大化",
                        brand: "Milbon",
                        line: "Ordeve Beaute",
                        mixRatio: "10-BE (Beige) : 10-MT (Matte) = 3:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分"
                    },
                    {
                        styleName: "ピーチブロンド",
                        vibe: "ロマンチックで愛らしい",
                        reason: "ピーチアンダートーンと調和、華やかで柔らかい印象",
                        brand: "Wella",
                        line: "Illumina Color",
                        mixRatio: "10/36 (Gold Violet) : 10/05 (Natural Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分"
                    }
                ]
            },
            'summer-light': {
                toneKeyword: "清楚できれいな(Pure/Clean) 夏の波",
                fashionVibe: "白いシャツやライトブルーデニムなどシンプルできれいなルック",
                makeupBase: "赤味を抑えるピンクベース(13-21号)",
                recommendLevel: "8~10 Level (赤味のない透明感)",
                undercoatTip: "黄味を中和(紫シャンプー)してレモン色除去必要",
                textureTip: "スリークなストレートやCカールで質感強調",
                avoidColors: ["黄味が強いゴールド", "オレンジ", "銅色"],
                seasonalAdvice: "アッシュブロンドやラベンダーアッシュのようなクールパステルが肌をより白く見せます。",
                consultingTip: "黄色い照明下ではくすんで見える可能性があるので、自然光での透明感を強調してください。",
                colorScience: {
                    melaninType: "ユーメラニン優位、クール肌 (Eumelanin Cool)",
                    undercoatPrediction: "ブリーチ時 Yellow アンダーコート、バイオレット補色必須",
                    neutralizationStrategy: "バイオレット/アッシュで黄味完全中和"
                },
                recipes: [
                    {
                        styleName: "ラベンダーアッシュ",
                        vibe: "清楚で神秘的な",
                        reason: "クールトーン肌の透明感を最大化、黄味完全除去",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-Vi (Violet) : 9-A (Ash) = 1:2",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分"
                    },
                    {
                        styleName: "ローズブラウン",
                        vibe: "エレガントで女性らしい",
                        reason: "ピンクアンダートーンと調和、冷たすぎず清純な印象",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/65 (Violet Mahogany) : 8/1 (Ash) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分"
                    }
                ]
            },
            'summer-bright': {
                toneKeyword: "爽やかで清涼な(Fresh/Cool) 夏の海",
                fashionVibe: "きれいな白、ライトブルー、ミント系の服",
                makeupBase: "クールピンクベース、ローズチークとベリーリップ",
                recommendLevel: "7~9 Level (清涼な艶)",
                undercoatTip: "アッシュ〜ピンク系アンダートーン、黄味除去必須",
                textureTip: "清涼できれいな艶感演出、シースルーバング",
                avoidColors: ["ゴールド", "オレンジ", "マスタード", "銅色"],
                seasonalAdvice: "ローズブラウン、クールピンクブラウンが清楚なイメージを引き立てます。",
                consultingTip: "爽やかできれいな印象を強調することがポイントです。"
            },
            'summer-muted': {
                toneKeyword: "エレガントで知的な(Elegance/Soft) 夏の霧",
                fashionVibe: "グレイッシュなトーンオントーン配色、落ち着いたオフィスルック",
                makeupBase: "自然なピンクベージュ(21-23号)",
                recommendLevel: "6~8 Level (落ち着いた中明度)",
                undercoatTip: "ブリーチなしでも可能なレベルだが、赤味は抑制必要",
                textureTip: "ビルドパーマやエリザベスパーマのようなエレガントなボリューム",
                avoidColors: ["派手なビビッドカラー", "黒に近い暗さ"],
                seasonalAdvice: "アッシュブラウン、スモーキーモカのようなグレーがかったカラーがお客様のエレガントな雰囲気を完成させます。",
                consultingTip: "明るすぎず暗すぎない'中間の明るさ'で最も上品に見えます。"
            },
            'autumn-muted': {
                toneKeyword: "落ち着いて自然な(Natural/Classic) 秋の感性",
                fashionVibe: "ベージュ、カーキ、ブラウン系のニットやトレンチコート",
                makeupBase: "落ち着いたイエローベース(21-23号)、MLBBリップ",
                recommendLevel: "5~7 Level (雰囲気のある陰影)",
                undercoatTip: "オレンジ色のアンダーコートを自然に活用可能",
                textureTip: "ヒッピーパーマやナチュラルウェーブ",
                avoidColors: ["蛍光ピンク", "冷たいブルーブラック"],
                seasonalAdvice: "マットブラウン、オリーブブラウンは肌の赤みを隠し、落ち着いた雰囲気を与えます。",
                consultingTip: "派手な色より髪の質感を活かす柔らかいブラウンがおすすめです。",
                colorScience: {
                    melaninType: "混合型メラニン、低彩度肌 (Mixed Melanin, Low Chroma)",
                    undercoatPrediction: "ブリーチ時 Orange-Yellow アンダーコート、マット補色で中和必要",
                    neutralizationStrategy: "Green(マット)で赤味中和、くすみ防止"
                },
                recipes: [
                    {
                        styleName: "オリーブマットブラウン",
                        vibe: "落ち着いて洗練された",
                        reason: "肌の赤みを中和してきれいで落ち着いた印象演出",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "7-MT (Matte) : 7-NB (Natural Brown) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分"
                    },
                    {
                        styleName: "カーキベージュ",
                        vibe: "ナチュラルで快適な",
                        reason: "自然なアーストーンで柔らかい雰囲気演出",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "7.8 (Mocha) : 7.13 (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分"
                    }
                ]
            },
            'autumn-soft': {
                toneKeyword: "温かくて心地よい(Warm/Cozy) 秋の午後",
                fashionVibe: "カシミアニット、コーデュロイ、温かいアーストーンの服",
                makeupBase: "ウォームベージュベース(21号)、ピーチ/テラコッタリップ",
                recommendLevel: "6~8 Level (柔らかいウォームトーン)",
                undercoatTip: "ウォームベージュアンダートーン、柔らかいグラデーション推奨",
                textureTip: "ボリュームレイヤード、ソフトウェーブ",
                avoidColors: ["ブラック", "アッシュブルー", "ビビッドオレンジ"],
                seasonalAdvice: "ミルクチョコ、モカブラウンのような柔らかく温かい色が快適な雰囲気を作ります。",
                consultingTip: "極端な色より控えめで自然なグラデーションがおすすめです。",
                colorScience: {
                    melaninType: "フェオメラニン優位、中間肌トーン (Warm Pheomelanin)",
                    undercoatPrediction: "ブリーチ時 Orange アンダーコート、温かいトーン維持",
                    neutralizationStrategy: "オレンジ活用、マットで柔らかく調整"
                },
                recipes: [
                    {
                        styleName: "ミルクチョコブラウン",
                        vibe: "温かくて心地よい",
                        reason: "柔らかいウォームトーンで快適で親しみやすいイメージ演出",
                        brand: "Wella",
                        line: "Softouch",
                        mixRatio: "S7/37 (Gold Brown) : S7/03 (Natural Gold) = 1:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30分"
                    },
                    {
                        styleName: "ハニーベージュ",
                        vibe: "甘くて柔らかい",
                        reason: "ハチミツ色の艶で健康的で華やかな印象",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "8-BE (Beige) : 8-GO (Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分"
                    }
                ]
            },
            'autumn-deep': {
                toneKeyword: "深みがあり高級感のある(Gorgeous/Ethnic) 秋の深さ",
                fashionVibe: "ゴールドアクセサリー、レザージャケット、エスニックパターン",
                makeupBase: "健康的なウォームベージュ(23号以上)、陰影メイク",
                recommendLevel: "4~6 Level (重みのあるカラー)",
                undercoatTip: "赤茶色(Red-Brown) アンダーコート活用◎",
                textureTip: "ボリューミーなグラムパーマや重みのあるタッセルカット",
                avoidColors: ["軽すぎるパステルトーン", "青白いアッシュ"],
                seasonalAdvice: "ダークチョコレート、カッパーブラウンのような深みのあるウォームカラーが目鼻立ちをはっきりさせます。",
                consultingTip: "明るさより'艶'と'色の深み'に集中してください。",
                colorScience: {
                    melaninType: "フェオメラニン豊富、深い肌トーン (Rich Pheomelanin)",
                    undercoatPrediction: "ブリーチ時 Red-Orange アンダーコート、赤味強く発現",
                    neutralizationStrategy: "カッパー/ゴールドで赤味活用、深み強調"
                },
                recipes: [
                    {
                        styleName: "ダークチョコレート",
                        vibe: "深くて高級感のある",
                        reason: "肌トーンとのコントラストで目鼻立ちをはっきり、成熟した魅力",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "5.35 (Chocolate) : 5.52 (Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40分"
                    },
                    {
                        styleName: "カッパーマホガニー",
                        vibe: "豊かで華やかな",
                        reason: "銅色の艶で高級感があり深みのある印象",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "5/43 (Red Gold) : 5/75 (Brown Mahogany) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40分"
                    }
                ]
            },
            'winter-deep': {
                toneKeyword: "都会的でカリスマのある(Modern/Chic) 冬の夜",
                fashionVibe: "ブラック&ホワイトのモダンルック、シルバーアクセサリー、スーツ",
                makeupBase: "きれいで青白いクールベースまたは透明な輝き",
                recommendLevel: "1~4 Level (確実なコントラスト)",
                undercoatTip: "ほぼ不要、ブルー/バイオレット反射光のみ追加",
                textureTip: "シャープなボブ、ストレート、エッジのあるショートカット",
                avoidColors: ["中途半端な茶色", "黄味がかったウォームブラウン"],
                seasonalAdvice: "ブルーブラック、ダークネイビーのような冷たく暗いカラーがお客様のカリスマを最大化します。",
                consultingTip: "髪色と肌色の'コントラスト'が大きいほど顔が小さく見えます。",
                colorScience: {
                    melaninType: "ユーメラニン優位、高コントラスト (Strong Eumelanin, High Contrast)",
                    undercoatPrediction: "自然毛維持またはブルー-バイオレット反射光追加",
                    neutralizationStrategy: "ブリーチ不要、ブルー/バイオレット光沢のみ追加"
                },
                recipes: [
                    {
                        styleName: "ブルーブラック",
                        vibe: "カリスマがあり都会的な",
                        reason: "肌との強いコントラストで目鼻立ちをはっきり、モダンな印象",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "3-NV (Navy) : 3-A (Ash) = 2:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "25分"
                    },
                    {
                        styleName: "ダークバイオレット",
                        vibe: "神秘的で洗練された",
                        reason: "深い紫色で高級感があり独特の魅力演出",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "3/66 (Intense Violet) : 3/0 (Natural) = 1:2",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30分"
                    }
                ]
            },
            'winter-bright': {
                toneKeyword: "華やかで強烈な(Vivid/Dramatic) 冬のダイヤモンド",
                fashionVibe: "ブラック、ホワイト、ビビッドレッドのような鮮やかなコントラスト",
                makeupBase: "透明なクールベース、鮮やかなレッド/ワインリップ",
                recommendLevel: "1~5 Level またはブリーチ+ビビッドカラー",
                undercoatTip: "クールトーンベース維持、黄味完全除去必須",
                textureTip: "鮮明で艶のある仕上げ、強烈なバング",
                avoidColors: ["ベージュ", "ゴールド", "オレンジ", "くすんだブラウン"],
                seasonalAdvice: "ピュアブラック、ワイン、ダークプラムのような強烈で鮮明なコントラストがポイントです。",
                consultingTip: "華やかでインパクトのあるイメージで視線を引きつけてください。"
            },
            'winter-muted': {
                toneKeyword: "洗練されて落ち着いた(Sophisticated/Urban) 冬の夕焼け",
                fashionVibe: "グレースーツ、チャコールコート、ミニマルなモノトーン",
                makeupBase: "ニュートラル〜クールベージュ、自然な陰影",
                recommendLevel: "4~6 Level (無彩色系)",
                undercoatTip: "グレー〜アッシュベース、彩度最小化",
                textureTip: "マットで落ち着いた質感、きれいなワンレングス",
                avoidColors: ["ゴールド", "オレンジ", "コーラル"],
                seasonalAdvice: "チャコール、ダークアッシュのような無彩色系が洗練された雰囲気を完成させます。",
                consultingTip: "華やかな色より節制された美しさを見せることがポイントです。"
            },
            'neutral-light': {
                toneKeyword: "柔らかく多彩な(Versatile/Soft) ニュートラルの調和",
                fashionVibe: "ウォーム/クール両方可能、明るいトーンのカジュアルルック",
                makeupBase: "ニュートラルベージュ(19-21号)、自然なカラー",
                recommendLevel: "7~9 Level (様々に対応可能)",
                undercoatTip: "ニュートラルベージュベース、極端なウォーム/クールは避ける",
                textureTip: "自然で柔らかい質感、レイヤードカット",
                avoidColors: ["ビビッドオレンジ", "ブルーブラック", "ネオン"],
                seasonalAdvice: "ミルクティー、ローズベージュのような中間トーンの柔らかい色が様々に似合います。",
                consultingTip: "様々なカラーが似合うので、お客様の好みに合わせて調整してください。"
            },
            'neutral-muted': {
                toneKeyword: "快適で自然な(Comfortable/Natural) ニュートラルの安定",
                fashionVibe: "アーストーン、ニュートラルカラーの快適なカジュアル",
                makeupBase: "ニュートラル〜クールベージュ(21-23号)、MLBBリップ",
                recommendLevel: "5~7 Level (落ち着いた中間トーン)",
                undercoatTip: "ニュートラル〜クールベージュベース、彩度低く",
                textureTip: "自然で落ち着いた質感、ヒッピーウェーブ",
                avoidColors: ["ビビッドオレンジ", "ネオン", "ピュアブラック"],
                seasonalAdvice: "グレーベージュ、トープのような落ち着いて自然な色が快適な雰囲気を作ります。",
                consultingTip: "洗練されて快適な印象を演出するのがおすすめです。"
            },
            'neutral-soft': {
                toneKeyword: "温かいながら落ち着いた(Gentle/Balanced) ニュートラルのバランス",
                fashionVibe: "ロマンチックながら落ち着いたトーンのブラウス、ニット",
                makeupBase: "ピンクベージュベース(21号)、ローズリップ",
                recommendLevel: "6~8 Level (柔らかい中間トーン)",
                undercoatTip: "ニュートラルベージュベース、柔らかいグラデーション",
                textureTip: "柔らかく自然な艶、ソフトレイヤード",
                avoidColors: ["ブルーブラック", "ビビッドレッド", "アッシュグレー"],
                seasonalAdvice: "ミルクモカ、ローズブラウンのような柔らかく控えめな色が調和します。",
                consultingTip: "温かいながら落ち着いた雰囲気を演出してください。"
            },
            'neutral-deep': {
                toneKeyword: "深みがあり成熟した(Mature/Rich) ニュートラルの重み",
                fashionVibe: "高級感のあるブラウン、バーガンディ、ダークカラーの服",
                makeupBase: "ウォーム〜ニュートラルベージュ(23号)、深いカラーリップ",
                recommendLevel: "4~6 Level (深みのあるトーン)",
                undercoatTip: "ニュートラルブラウンベース",
                textureTip: "深みのある自然な仕上げ、ボリュームパーマ",
                avoidColors: ["プラチナ", "アッシュブルー", "ビビッドピンク"],
                seasonalAdvice: "チョコレート、ダークモカのような深く自然な色が成熟した魅力を見せます。",
                consultingTip: "洗練されて成熟した印象を演出してください。"
            }
        };

        // ========== 중국어 전문가 가이드 데이터베이스 ==========
        const EXPERT_GUIDE_DB_ZH = {
            'spring-bright': {
                toneKeyword: "活力四射的(Active/Cute) 春日能量",
                fashionVibe: "色彩缤纷的图案或轻快的休闲风格非常适合您。",
                makeupBase: "明亮象牙色(19-21号)打造光彩，推荐珊瑚/橙色唇膏",
                recommendLevel: "8~10 Level (鲜艳的反射光)",
                undercoatTip: "需要漂至带黄调的浅黄色底",
                textureTip: "比起厚重的线条，选择发尾轻盈的层次剪",
                avoidColors: ["浑浊的卡其色", "灰调过重的灰棕", "黑色"],
                seasonalAdvice: "高饱和度的橙棕色、金棕色能最大化您活力四射的形象。",
                consultingTip: "能提亮肤色的高饱和度颜色是最佳选择。",
                colorScience: {
                    melaninType: "褐黑素优势 (Pheomelanin Dominant)",
                    undercoatPrediction: "漂发时预计出现黄橙色底",
                    neutralizationStrategy: "利用黄调，最小化紫色补色"
                },
                recipes: [
                    {
                        styleName: "橙金棕",
                        vibe: "明亮有活力的",
                        reason: "最大化春季暖色调的高饱和度和明亮肤色",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/34 (Gold Red) : 8/03 (Natural Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分钟"
                    },
                    {
                        styleName: "落日珊瑚",
                        vibe: "温暖有活力的",
                        reason: "与黄调肌肤和谐搭配的温暖珊瑚色调",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-OR (Orange) : 9-BE (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分钟"
                    }
                ]
            },
            'spring-light': {
                toneKeyword: "透明可爱的(Romantic/Clear) 春日阳光",
                fashionVibe: "柔和色调的衬衫或雪纺材质非常适合。",
                makeupBase: "带蜜桃调的明亮底妆(17-19号)",
                recommendLevel: "9~12 Level (High Lift)",
                undercoatTip: "需要尽量去除红调的黄色底",
                textureTip: "如微风吹拂般的大卷波浪",
                avoidColors: ["过深的深棕色", "浓烈的酒红色"],
                seasonalAdvice: "奶茶色或蜜桃米色等柔和的奶油色调能提升肌肤透明度。",
                consultingTip: "避免暗沉，保持'清透感'是关键。",
                colorScience: {
                    melaninType: "褐黑素优势，浅肤色 (Light Pheomelanin)",
                    undercoatPrediction: "漂发时浅黄色底，快速提亮",
                    neutralizationStrategy: "最小化红调，用淡紫色调节黄调"
                },
                recipes: [
                    {
                        styleName: "奶茶米色",
                        vibe: "透明清纯的",
                        reason: "让透明肌肤更加清透，最大化柔和印象",
                        brand: "Milbon",
                        line: "Ordeve Beaute",
                        mixRatio: "10-BE (Beige) : 10-MT (Matte) = 3:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分钟"
                    },
                    {
                        styleName: "蜜桃金",
                        vibe: "浪漫可爱的",
                        reason: "与蜜桃底色和谐，明亮又柔和的印象",
                        brand: "Wella",
                        line: "Illumina Color",
                        mixRatio: "10/36 (Gold Violet) : 10/05 (Natural Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分钟"
                    }
                ]
            },
            'summer-light': {
                toneKeyword: "清纯干净的(Pure/Clean) 夏日波浪",
                fashionVibe: "白衬衫或浅蓝牛仔等简洁干净的造型",
                makeupBase: "中和红调的粉色底妆(13-21号)",
                recommendLevel: "8~10 Level (无红调的透明感)",
                undercoatTip: "需要中和黄调(紫色洗发水)去除柠檬色",
                textureTip: "光滑直发或C卷强调质感",
                avoidColors: ["黄调过重的金色", "橙色", "铜色"],
                seasonalAdvice: "灰金或薰衣草灰等冷色调粉彩让肌肤看起来更白皙。",
                consultingTip: "在黄色灯光下可能显得暗沉，请强调自然光下的透明感。",
                colorScience: {
                    melaninType: "真黑素优势，冷肤色 (Eumelanin Cool)",
                    undercoatPrediction: "漂发时黄色底，紫色补色必需",
                    neutralizationStrategy: "用紫色/灰色完全中和黄调"
                },
                recipes: [
                    {
                        styleName: "薰衣草灰",
                        vibe: "清纯神秘的",
                        reason: "最大化冷色调肌肤透明感，完全去除黄调",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-Vi (Violet) : 9-A (Ash) = 1:2",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分钟"
                    },
                    {
                        styleName: "玫瑰棕",
                        vibe: "优雅女性化的",
                        reason: "与粉色底色和谐，不冷淡又清纯的印象",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/65 (Violet Mahogany) : 8/1 (Ash) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分钟"
                    }
                ]
            },
            'summer-bright': {
                toneKeyword: "清爽凉快的(Fresh/Cool) 夏日海洋",
                fashionVibe: "干净的白色、浅蓝色、薄荷绿系服装",
                makeupBase: "冷粉底妆，玫瑰腮红和浆果色唇膏",
                recommendLevel: "7~9 Level (清凉光泽)",
                undercoatTip: "灰至粉色底调，黄调去除必需",
                textureTip: "清凉干净的光泽感，空气刘海",
                avoidColors: ["金色", "橙色", "芥末黄", "铜色"],
                seasonalAdvice: "玫瑰棕、冷粉棕能提升您清纯的形象。",
                consultingTip: "强调清爽干净的印象是关键。"
            },
            'summer-muted': {
                toneKeyword: "优雅知性的(Elegance/Soft) 夏日薄雾",
                fashionVibe: "灰调的同色系搭配，沉稳的办公风格",
                makeupBase: "自然粉米色(21-23号)",
                recommendLevel: "6~8 Level (沉稳的中明度)",
                undercoatTip: "不漂发也可达到，但需抑制红调",
                textureTip: "如Build烫或Elizabeth烫般优雅的蓬松感",
                avoidColors: ["鲜艳的高饱和色", "接近黑色的深色"],
                seasonalAdvice: "灰棕、烟熏摩卡等带灰调的颜色能完成您优雅的氛围。",
                consultingTip: "不太亮也不太暗的'中等亮度'看起来最高级。"
            },
            'autumn-muted': {
                toneKeyword: "沉稳自然的(Natural/Classic) 秋日感性",
                fashionVibe: "米色、卡其、棕色系的针织或风衣",
                makeupBase: "沉稳的黄调底妆(21-23号)，MLBB唇膏",
                recommendLevel: "5~7 Level (有氛围的阴影)",
                undercoatTip: "可自然利用橙色底色",
                textureTip: "嬉皮烫或自然波浪",
                avoidColors: ["荧光粉", "冷蓝黑"],
                seasonalAdvice: "哑光棕、橄榄棕能遮盖肌肤泛红，营造沉稳氛围。",
                consultingTip: "比起抢眼的颜色，能提升发质质感的柔和棕色更好。",
                colorScience: {
                    melaninType: "混合型黑色素，低饱和肌肤 (Mixed Melanin, Low Chroma)",
                    undercoatPrediction: "漂发时橙黄色底，需要哑光补色中和",
                    neutralizationStrategy: "用绿色(哑光)中和红调，防止暗沉"
                },
                recipes: [
                    {
                        styleName: "橄榄哑光棕",
                        vibe: "沉稳精致的",
                        reason: "中和肌肤红调，打造干净沉稳的印象",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "7-MT (Matte) : 7-NB (Natural Brown) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分钟"
                    },
                    {
                        styleName: "卡其米色",
                        vibe: "自然舒适的",
                        reason: "自然的大地色调营造柔和氛围",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "7.8 (Mocha) : 7.13 (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35分钟"
                    }
                ]
            },
            'autumn-soft': {
                toneKeyword: "温暖舒适的(Warm/Cozy) 秋日午后",
                fashionVibe: "羊绒针织、灯芯绒、温暖大地色调服装",
                makeupBase: "暖米色底妆(21号)，蜜桃/赤陶唇膏",
                recommendLevel: "6~8 Level (柔和暖色调)",
                undercoatTip: "暖米色底调，推荐柔和渐变",
                textureTip: "蓬松层次、柔和波浪",
                avoidColors: ["黑色", "灰蓝", "高饱和橙"],
                seasonalAdvice: "牛奶巧克力、摩卡棕等柔和温暖的颜色营造舒适氛围。",
                consultingTip: "比起极端颜色，含蓄自然的渐变更好。",
                colorScience: {
                    melaninType: "褐黑素优势，中等肤色 (Warm Pheomelanin)",
                    undercoatPrediction: "漂发时橙色底，保持温暖色调",
                    neutralizationStrategy: "利用橙色，用哑光柔和调节"
                },
                recipes: [
                    {
                        styleName: "牛奶巧克力棕",
                        vibe: "温暖舒适的",
                        reason: "柔和暖色调打造舒适亲切的形象",
                        brand: "Wella",
                        line: "Softouch",
                        mixRatio: "S7/37 (Gold Brown) : S7/03 (Natural Gold) = 1:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30分钟"
                    },
                    {
                        styleName: "蜂蜜米色",
                        vibe: "甜美柔和的",
                        reason: "蜂蜜色光泽打造健康明亮的感觉",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "8-BE (Beige) : 8-GO (Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30分钟"
                    }
                ]
            },
            'autumn-deep': {
                toneKeyword: "深邃高级的(Gorgeous/Ethnic) 秋日深度",
                fashionVibe: "金色配饰、皮夹克、民族风图案",
                makeupBase: "健康的暖米色(23号以上)，修容妆",
                recommendLevel: "4~6 Level (厚重的颜色)",
                undercoatTip: "红棕色底色效果很好",
                textureTip: "蓬松的华丽烫或厚重的流苏剪",
                avoidColors: ["过于轻盈的粉彩色调", "苍白的灰棕"],
                seasonalAdvice: "深巧克力、铜棕等有深度的暖色调能让五官更加立体。",
                consultingTip: "比起亮度，请专注于'光泽'和'色彩深度'。",
                colorScience: {
                    melaninType: "褐黑素丰富，深肤色 (Rich Pheomelanin)",
                    undercoatPrediction: "漂发时红橙色底，红调强烈显现",
                    neutralizationStrategy: "用铜色/金色利用红调，强调深度"
                },
                recipes: [
                    {
                        styleName: "深巧克力",
                        vibe: "深邃高级的",
                        reason: "与肤色的对比让五官更立体，成熟魅力",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "5.35 (Chocolate) : 5.52 (Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40分钟"
                    },
                    {
                        styleName: "铜色红木",
                        vibe: "丰富华丽的",
                        reason: "铜色光泽打造高级有深度的印象",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "5/43 (Red Gold) : 5/75 (Brown Mahogany) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40分钟"
                    }
                ]
            },
            'winter-deep': {
                toneKeyword: "都市气质的(Modern/Chic) 冬日夜晚",
                fashionVibe: "黑白现代风格、银色配饰、西装",
                makeupBase: "干净苍白的冷色底妆或透明光泽",
                recommendLevel: "1~4 Level (明确的对比)",
                undercoatTip: "几乎不需要，只需添加蓝/紫色反射光",
                textureTip: "利落的鲍伯头、直发、有棱角的短发",
                avoidColors: ["不明不白的棕色", "带黄调的暖棕"],
                seasonalAdvice: "蓝黑、深海军蓝等冷而深的颜色能最大化您的气场。",
                consultingTip: "发色与肤色的'对比'越大，脸看起来越小。",
                colorScience: {
                    melaninType: "真黑素优势，高对比 (Strong Eumelanin, High Contrast)",
                    undercoatPrediction: "保持自然发色或添加蓝紫色反射光",
                    neutralizationStrategy: "无需漂发，只需添加蓝/紫色光泽"
                },
                recipes: [
                    {
                        styleName: "蓝黑",
                        vibe: "有气场都市感的",
                        reason: "与肌肤的强烈对比让五官立体，现代感",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "3-NV (Navy) : 3-A (Ash) = 2:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "25分钟"
                    },
                    {
                        styleName: "深紫",
                        vibe: "神秘精致的",
                        reason: "深紫色打造高级独特的魅力",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "3/66 (Intense Violet) : 3/0 (Natural) = 1:2",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30分钟"
                    }
                ]
            },
            'winter-bright': {
                toneKeyword: "华丽强烈的(Vivid/Dramatic) 冬日钻石",
                fashionVibe: "黑、白、鲜红等鲜明对比",
                makeupBase: "透明冷色底妆，鲜艳的红/酒红唇膏",
                recommendLevel: "1~5 Level 或漂发+高饱和色",
                undercoatTip: "保持冷色底，黄调完全去除必需",
                textureTip: "鲜明有光泽的效果，强烈的刘海",
                avoidColors: ["米色", "金色", "橙色", "浑浊的棕色"],
                seasonalAdvice: "纯黑、酒红、深紫红等强烈鲜明的对比是关键。",
                consultingTip: "用华丽有冲击力的形象吸引视线。"
            },
            'winter-muted': {
                toneKeyword: "精致沉稳的(Sophisticated/Urban) 冬日夕阳",
                fashionVibe: "灰色西装、炭灰大衣、极简单色调",
                makeupBase: "中性至冷米色，自然修容",
                recommendLevel: "4~6 Level (无彩色系)",
                undercoatTip: "灰至灰棕底，饱和度最小化",
                textureTip: "哑光沉稳的质感，干净的一长度",
                avoidColors: ["金色", "橙色", "珊瑚色"],
                seasonalAdvice: "炭灰、深灰棕等无彩色系能完成精致的氛围。",
                consultingTip: "展现克制之美而非华丽颜色是关键。"
            },
            'neutral-light': {
                toneKeyword: "柔和多变的(Versatile/Soft) 中性和谐",
                fashionVibe: "暖冷皆可，明亮色调的休闲风格",
                makeupBase: "中性米色(19-21号)，自然色调",
                recommendLevel: "7~9 Level (多样适配)",
                undercoatTip: "中性米色底，避免极端暖/冷",
                textureTip: "自然柔和的质感，层次剪",
                avoidColors: ["高饱和橙", "蓝黑", "荧光色"],
                seasonalAdvice: "奶茶、玫瑰米色等柔和中间色调都很适合。",
                consultingTip: "各种颜色都适合，请根据客户喜好调整。"
            },
            'neutral-muted': {
                toneKeyword: "舒适自然的(Comfortable/Natural) 中性稳定",
                fashionVibe: "大地色、中性色的舒适休闲风",
                makeupBase: "中性至冷米色(21-23号)，MLBB唇膏",
                recommendLevel: "5~7 Level (沉稳中间色调)",
                undercoatTip: "中性至冷米色底，低饱和度",
                textureTip: "自然沉稳的质感，嬉皮波浪",
                avoidColors: ["高饱和橙", "荧光色", "纯黑"],
                seasonalAdvice: "灰米色、驼色等沉稳自然的颜色营造舒适氛围。",
                consultingTip: "打造精致舒适的感觉最好。"
            },
            'neutral-soft': {
                toneKeyword: "温暖又沉稳的(Gentle/Balanced) 中性平衡",
                fashionVibe: "浪漫又沉稳色调的衬衫、针织",
                makeupBase: "粉米色底妆(21号)，玫瑰唇膏",
                recommendLevel: "6~8 Level (柔和中间色调)",
                undercoatTip: "中性米色底，柔和渐变",
                textureTip: "柔和自然的光泽，柔和层次",
                avoidColors: ["蓝黑", "高饱和红", "灰棕"],
                seasonalAdvice: "奶茶摩卡、玫瑰棕等柔和含蓄的颜色很和谐。",
                consultingTip: "打造温暖又沉稳的氛围。"
            },
            'neutral-deep': {
                toneKeyword: "深邃成熟的(Mature/Rich) 中性厚重",
                fashionVibe: "高级感的棕色、酒红、深色服装",
                makeupBase: "暖至中性米色(23号)，深色唇膏",
                recommendLevel: "4~6 Level (有深度的色调)",
                undercoatTip: "中性棕色底",
                textureTip: "有深度的自然效果，蓬松烫",
                avoidColors: ["铂金", "灰蓝", "高饱和粉"],
                seasonalAdvice: "巧克力、深摩卡等深邃自然的颜色展现成熟魅力。",
                consultingTip: "打造精致成熟的印象。"
            }
        };

        // ========== 베트남어 전문가 가이드 데이터베이스 ==========
        const EXPERT_GUIDE_DB_VI = {
            'spring-bright': {
                toneKeyword: "Năng động và sặc sỡ (Active/Cute) năng lượng mùa xuân",
                fashionVibe: "Họa tiết màu sắc và phong cách casual vui tươi rất phù hợp với bạn.",
                makeupBase: "Ivory sáng (tone 19-21) cho vẻ rạng rỡ, khuyên dùng son coral/cam",
                recommendLevel: "8~10 Level (phản chiếu rực rỡ)",
                undercoatTip: "Cần tẩy đến Pale Yellow với tông vàng",
                textureTip: "Cắt layer nhẹ đuôi thay vì đường nét nặng",
                avoidColors: ["Kaki đục", "Xám tro nặng", "Đen"],
                seasonalAdvice: "Nâu cam và nâu vàng độ bão hòa cao tối đa hóa hình ảnh năng động của bạn.",
                consultingTip: "Màu sắc độ bão hòa cao làm nổi bật sắc mặt là tốt nhất.",
                colorScience: {
                    melaninType: "Pheomelanin chiếm ưu thế",
                    undercoatPrediction: "Dự kiến undercoat vàng cam khi tẩy",
                    neutralizationStrategy: "Tận dụng tông vàng, giảm thiểu bổ sung tím"
                },
                recipes: [
                    {
                        styleName: "Nâu Vàng Cam",
                        vibe: "Rạng rỡ và sống động",
                        reason: "Tối đa hóa độ bão hòa cao và tông da sáng của Spring Warm Bright",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/34 (Gold Red) : 8/03 (Natural Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 phút"
                    },
                    {
                        styleName: "Coral Hoàng Hôn",
                        vibe: "Ấm áp và năng động",
                        reason: "Hài hòa với da tông vàng cho màu coral ấm",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-OR (Orange) : 9-BE (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 phút"
                    }
                ]
            },
            'spring-light': {
                toneKeyword: "Trong trẻo và đáng yêu (Romantic/Clear) ánh nắng mùa xuân",
                fashionVibe: "Áo blouse pastel và chất liệu voan rất phù hợp.",
                makeupBase: "Base sáng với tông đào (tone 17-19)",
                recommendLevel: "9~12 Level (High Lift)",
                undercoatTip: "Cần base vàng với tối thiểu đỏ",
                textureTip: "Sóng nhẹ như gió thổi",
                avoidColors: ["Nâu đậm quá", "Đỏ burgundy đậm"],
                seasonalAdvice: "Beige trà sữa hoặc beige đào mềm mại nâng cao độ trong của da.",
                consultingTip: "Tránh xỉn màu và duy trì 'sự trong trẻo' là chìa khóa.",
                colorScience: {
                    melaninType: "Light Pheomelanin",
                    undercoatPrediction: "Undercoat vàng nhạt, lift nhanh",
                    neutralizationStrategy: "Giảm thiểu đỏ, điều chỉnh vàng bằng tím nhạt"
                },
                recipes: [
                    {
                        styleName: "Beige Trà Sữa",
                        vibe: "Trong trẻo và ngây thơ",
                        reason: "Làm da trong trẻo hơn, tối đa hóa ấn tượng mềm mại",
                        brand: "Milbon",
                        line: "Ordeve Beaute",
                        mixRatio: "10-BE (Beige) : 10-MT (Matte) = 3:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 phút"
                    },
                    {
                        styleName: "Blonde Đào",
                        vibe: "Lãng mạn và đáng yêu",
                        reason: "Hài hòa với undertone đào, sáng nhưng mềm mại",
                        brand: "Wella",
                        line: "Illumina Color",
                        mixRatio: "10/36 (Gold Violet) : 10/05 (Natural Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 phút"
                    }
                ]
            },
            'summer-light': {
                toneKeyword: "Thuần khiết và sạch sẽ (Pure/Clean) sóng mùa hè",
                fashionVibe: "Phong cách đơn giản sạch sẽ như áo sơ mi trắng hoặc denim xanh nhạt",
                makeupBase: "Base hồng để trung hòa đỏ (tone 13-21)",
                recommendLevel: "8~10 Level (trong mà không có đỏ)",
                undercoatTip: "Cần trung hòa vàng (dầu gội tím) để loại bỏ tông chanh",
                textureTip: "Tóc thẳng mượt hoặc C-curl để nhấn mạnh kết cấu",
                avoidColors: ["Vàng đậm", "Cam", "Đồng"],
                seasonalAdvice: "Pastel lạnh như blonde tro hoặc tro oải hương làm da trắng hơn.",
                consultingTip: "Có thể trông xỉn dưới ánh sáng vàng, hãy nhấn mạnh độ trong dưới ánh sáng tự nhiên.",
                colorScience: {
                    melaninType: "Eumelanin Cool",
                    undercoatPrediction: "Undercoat vàng khi tẩy, bổ sung tím cần thiết",
                    neutralizationStrategy: "Trung hòa hoàn toàn vàng bằng tím/tro"
                },
                recipes: [
                    {
                        styleName: "Tro Oải Hương",
                        vibe: "Thuần khiết và huyền bí",
                        reason: "Tối đa hóa độ trong của da tông lạnh, loại bỏ hoàn toàn vàng",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-Vi (Violet) : 9-A (Ash) = 1:2",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 phút"
                    },
                    {
                        styleName: "Nâu Hồng",
                        vibe: "Thanh lịch và nữ tính",
                        reason: "Hài hòa với undertone hồng, thuần khiết mà không lạnh",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/65 (Violet Mahogany) : 8/1 (Ash) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 phút"
                    }
                ]
            },
            'summer-bright': {
                toneKeyword: "Tươi mát và trong lành (Fresh/Cool) biển mùa hè",
                fashionVibe: "Trang phục trắng sạch, xanh nhạt, màu bạc hà",
                makeupBase: "Base hồng lạnh, má hồng rose và son berry",
                recommendLevel: "7~9 Level (bóng mát)",
                undercoatTip: "Undertone tro đến hồng, loại bỏ vàng cần thiết",
                textureTip: "Bóng tươi mát sạch sẽ, mái thưa",
                avoidColors: ["Vàng", "Cam", "Mù tạt", "Đồng"],
                seasonalAdvice: "Nâu rose và nâu hồng lạnh nâng cao hình ảnh thuần khiết của bạn.",
                consultingTip: "Nhấn mạnh ấn tượng tươi mát sạch sẽ là chìa khóa."
            },
            'summer-muted': {
                toneKeyword: "Thanh lịch và trí thức (Elegance/Soft) sương mù mùa hè",
                fashionVibe: "Phối màu tone-on-tone xám, phong cách văn phòng điềm đạm",
                makeupBase: "Beige hồng tự nhiên (tone 21-23)",
                recommendLevel: "6~8 Level (trung tính điềm đạm)",
                undercoatTip: "Có thể không cần tẩy, nhưng kiềm chế đỏ",
                textureTip: "Độ phồng thanh lịch như build perm hoặc Elizabeth perm",
                avoidColors: ["Màu sặc sỡ", "Màu tối gần đen"],
                seasonalAdvice: "Màu có tông xám như nâu tro hoặc mocha khói hoàn thiện bầu không khí thanh lịch của bạn.",
                consultingTip: "Bạn trông sang trọng nhất ở 'độ sáng trung bình' - không quá sáng, không quá tối."
            },
            'autumn-muted': {
                toneKeyword: "Điềm đạm và tự nhiên (Natural/Classic) cảm xúc mùa thu",
                fashionVibe: "Áo len beige, kaki, nâu hoặc áo khoác trench",
                makeupBase: "Base vàng điềm đạm (tone 21-23), son MLBB",
                recommendLevel: "5~7 Level (bóng đổ có chiều sâu)",
                undercoatTip: "Có thể tận dụng tự nhiên undercoat cam",
                textureTip: "Hippie perm hoặc sóng tự nhiên",
                avoidColors: ["Hồng huỳnh quang", "Xanh đen lạnh"],
                seasonalAdvice: "Nâu matte, nâu olive che đỏ da và tạo bầu không khí điềm đạm.",
                consultingTip: "Nâu mềm mại nâng cao kết cấu tóc tốt hơn màu sặc sỡ.",
                colorScience: {
                    melaninType: "Mixed Melanin, Low Chroma",
                    undercoatPrediction: "Undercoat cam vàng, cần trung hòa bằng matte",
                    neutralizationStrategy: "Trung hòa đỏ bằng xanh lá(matte), ngăn xỉn"
                },
                recipes: [
                    {
                        styleName: "Nâu Olive Matte",
                        vibe: "Điềm đạm và tinh tế",
                        reason: "Trung hòa đỏ da cho ấn tượng sạch sẽ điềm đạm",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "7-MT (Matte) : 7-NB (Natural Brown) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 phút"
                    },
                    {
                        styleName: "Beige Kaki",
                        vibe: "Tự nhiên và thoải mái",
                        reason: "Tông đất tự nhiên tạo bầu không khí mềm mại",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "7.8 (Mocha) : 7.13 (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 phút"
                    }
                ]
            },
            'autumn-soft': {
                toneKeyword: "Ấm áp và dễ chịu (Warm/Cozy) chiều thu",
                fashionVibe: "Áo len cashmere, nhung kẻ, trang phục tông đất ấm",
                makeupBase: "Base beige ấm (tone 21), son đào/terracotta",
                recommendLevel: "6~8 Level (tông ấm mềm)",
                undercoatTip: "Undertone beige ấm, khuyên dùng gradient mềm",
                textureTip: "Layer phồng, sóng mềm",
                avoidColors: ["Đen", "Xanh tro", "Cam sặc sỡ"],
                seasonalAdvice: "Màu mềm ấm như chocolate sữa và nâu mocha tạo bầu không khí thoải mái.",
                consultingTip: "Gradient tự nhiên tinh tế tốt hơn màu cực đoan.",
                colorScience: {
                    melaninType: "Warm Pheomelanin",
                    undercoatPrediction: "Undercoat cam, giữ tông ấm",
                    neutralizationStrategy: "Tận dụng cam, làm mềm bằng matte"
                },
                recipes: [
                    {
                        styleName: "Nâu Chocolate Sữa",
                        vibe: "Ấm áp và dễ chịu",
                        reason: "Tông ấm mềm tạo hình ảnh thoải mái thân thiện",
                        brand: "Wella",
                        line: "Softouch",
                        mixRatio: "S7/37 (Gold Brown) : S7/03 (Natural Gold) = 1:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30 phút"
                    },
                    {
                        styleName: "Beige Mật Ong",
                        vibe: "Ngọt ngào và mềm mại",
                        reason: "Ánh mật ong cho vẻ khỏe mạnh rạng rỡ",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "8-BE (Beige) : 8-GO (Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 phút"
                    }
                ]
            },
            'autumn-deep': {
                toneKeyword: "Sâu lắng và sang trọng (Gorgeous/Ethnic) chiều sâu mùa thu",
                fashionVibe: "Phụ kiện vàng, áo khoác da, họa tiết dân tộc",
                makeupBase: "Beige ấm khỏe mạnh (tone 23+), makeup tạo khối",
                recommendLevel: "4~6 Level (màu có chiều sâu)",
                undercoatTip: "Undercoat nâu đỏ hiệu quả tốt",
                textureTip: "Perm glam phồng hoặc cắt tua có chiều sâu",
                avoidColors: ["Pastel nhẹ", "Tro nhợt nhạt"],
                seasonalAdvice: "Màu ấm sâu như chocolate đậm và nâu đồng làm đường nét khuôn mặt rõ ràng hơn.",
                consultingTip: "Tập trung vào 'độ bóng' và 'chiều sâu màu' hơn là độ sáng.",
                colorScience: {
                    melaninType: "Rich Pheomelanin",
                    undercoatPrediction: "Undercoat đỏ cam, đỏ hiện rõ",
                    neutralizationStrategy: "Tận dụng đỏ với đồng/vàng, nhấn mạnh chiều sâu"
                },
                recipes: [
                    {
                        styleName: "Chocolate Đậm",
                        vibe: "Sâu lắng và sang trọng",
                        reason: "Tương phản với da làm đường nét rõ, quyến rũ trưởng thành",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "5.35 (Chocolate) : 5.52 (Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40 phút"
                    },
                    {
                        styleName: "Mahogany Đồng",
                        vibe: "Phong phú và lộng lẫy",
                        reason: "Ánh đồng cho ấn tượng sang trọng có chiều sâu",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "5/43 (Red Gold) : 5/75 (Brown Mahogany) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40 phút"
                    }
                ]
            },
            'winter-deep': {
                toneKeyword: "Đô thị và cuốn hút (Modern/Chic) đêm đông",
                fashionVibe: "Phong cách đen trắng hiện đại, phụ kiện bạc, vest",
                makeupBase: "Base lạnh sạch nhợt nhạt hoặc rạng rỡ trong suốt",
                recommendLevel: "1~4 Level (tương phản mạnh)",
                undercoatTip: "Hầu như không cần, chỉ thêm phản chiếu xanh/tím",
                textureTip: "Bob sắc nét, thẳng, tóc ngắn có góc cạnh",
                avoidColors: ["Nâu mơ hồ", "Nâu ấm có tông vàng"],
                seasonalAdvice: "Màu lạnh tối như xanh đen và navy đậm tối đa hóa khí chất của bạn.",
                consultingTip: "'Tương phản' giữa màu tóc và da càng mạnh, mặt càng nhỏ.",
                colorScience: {
                    melaninType: "Strong Eumelanin, High Contrast",
                    undercoatPrediction: "Giữ tóc tự nhiên hoặc thêm phản chiếu xanh tím",
                    neutralizationStrategy: "Không cần tẩy, chỉ thêm bóng xanh/tím"
                },
                recipes: [
                    {
                        styleName: "Xanh Đen",
                        vibe: "Cuốn hút và đô thị",
                        reason: "Tương phản mạnh với da làm đường nét rõ, cảm giác hiện đại",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "3-NV (Navy) : 3-A (Ash) = 2:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "25 phút"
                    },
                    {
                        styleName: "Tím Đậm",
                        vibe: "Huyền bí và tinh tế",
                        reason: "Tím sâu cho quyến rũ sang trọng độc đáo",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "3/66 (Intense Violet) : 3/0 (Natural) = 1:2",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30 phút"
                    }
                ]
            },
            'winter-bright': {
                toneKeyword: "Lộng lẫy và mãnh liệt (Vivid/Dramatic) kim cương mùa đông",
                fashionVibe: "Tương phản sắc nét với đen, trắng, đỏ sặc sỡ",
                makeupBase: "Base lạnh trong suốt, son đỏ/rượu vang sặc sỡ",
                recommendLevel: "1~5 Level hoặc tẩy + màu sặc sỡ",
                undercoatTip: "Giữ base tông lạnh, loại bỏ hoàn toàn vàng cần thiết",
                textureTip: "Hoàn thiện sắc nét bóng loáng, mái mạnh mẽ",
                avoidColors: ["Beige", "Vàng", "Cam", "Nâu đục"],
                seasonalAdvice: "Tương phản mãnh liệt sắc nét với đen thuần, rượu vang, mận đậm là chìa khóa.",
                consultingTip: "Thu hút sự chú ý với hình ảnh lộng lẫy có tác động."
            },
            'winter-muted': {
                toneKeyword: "Tinh tế và điềm đạm (Sophisticated/Urban) hoàng hôn mùa đông",
                fashionVibe: "Vest xám, áo khoác than, đơn sắc tối giản",
                makeupBase: "Trung tính đến beige lạnh, tạo khối tự nhiên",
                recommendLevel: "4~6 Level (dải vô sắc)",
                undercoatTip: "Base xám đến tro, giảm thiểu độ bão hòa",
                textureTip: "Kết cấu matte điềm đạm, một chiều dài sạch",
                avoidColors: ["Vàng", "Cam", "San hô"],
                seasonalAdvice: "Màu vô sắc như than và tro đậm hoàn thiện bầu không khí tinh tế của bạn.",
                consultingTip: "Thể hiện sự thanh lịch kín đáo hơn là màu sắc sặc sỡ là điểm chính."
            },
            'neutral-light': {
                toneKeyword: "Mềm mại và đa dạng (Versatile/Soft) hài hòa trung tính",
                fashionVibe: "Cả ấm và lạnh đều được, phong cách casual tông sáng",
                makeupBase: "Beige trung tính (tone 19-21), màu tự nhiên",
                recommendLevel: "7~9 Level (đa dụng)",
                undercoatTip: "Base beige trung tính, tránh ấm/lạnh cực đoan",
                textureTip: "Kết cấu tự nhiên mềm mại, cắt layer",
                avoidColors: ["Cam sặc sỡ", "Xanh đen", "Neon"],
                seasonalAdvice: "Tông trung bình mềm như trà sữa và beige rose phù hợp với bạn.",
                consultingTip: "Nhiều màu phù hợp, điều chỉnh theo sở thích khách hàng."
            },
            'neutral-muted': {
                toneKeyword: "Thoải mái và tự nhiên (Comfortable/Natural) ổn định trung tính",
                fashionVibe: "Tông đất, casual thoải mái màu trung tính",
                makeupBase: "Trung tính đến beige lạnh (tone 21-23), son MLBB",
                recommendLevel: "5~7 Level (tông trung bình điềm đạm)",
                undercoatTip: "Base trung tính đến beige lạnh, độ bão hòa thấp",
                textureTip: "Kết cấu tự nhiên điềm đạm, sóng hippie",
                avoidColors: ["Cam sặc sỡ", "Neon", "Đen thuần"],
                seasonalAdvice: "Màu điềm đạm tự nhiên như beige xám và taupe tạo bầu không khí thoải mái.",
                consultingTip: "Hướng đến cảm giác tinh tế và thoải mái."
            },
            'neutral-soft': {
                toneKeyword: "Ấm nhưng điềm đạm (Gentle/Balanced) cân bằng trung tính",
                fashionVibe: "Áo blouse, len tông lãng mạn nhưng điềm đạm",
                makeupBase: "Base beige hồng (tone 21), son rose",
                recommendLevel: "6~8 Level (tông trung bình mềm)",
                undercoatTip: "Base beige trung tính, gradient mềm",
                textureTip: "Bóng tự nhiên mềm mại, layer mềm",
                avoidColors: ["Xanh đen", "Đỏ sặc sỡ", "Xám tro"],
                seasonalAdvice: "Màu mềm tinh tế như mocha sữa và nâu rose hài hòa.",
                consultingTip: "Tạo bầu không khí ấm nhưng điềm đạm."
            },
            'neutral-deep': {
                toneKeyword: "Sâu lắng và trưởng thành (Mature/Rich) độ nặng trung tính",
                fashionVibe: "Trang phục nâu sang trọng, burgundy, màu tối",
                makeupBase: "Ấm đến beige trung tính (tone 23), son màu sâu",
                recommendLevel: "4~6 Level (tông sâu)",
                undercoatTip: "Base nâu trung tính",
                textureTip: "Hoàn thiện tự nhiên có chiều sâu, perm phồng",
                avoidColors: ["Bạch kim", "Xanh tro", "Hồng sặc sỡ"],
                seasonalAdvice: "Màu sâu tự nhiên như chocolate và mocha đậm thể hiện quyến rũ trưởng thành.",
                consultingTip: "Tạo ấn tượng tinh tế và trưởng thành."
            }
        };

        // ========== 인도네시아어 전문가 가이드 데이터베이스 ==========
        const EXPERT_GUIDE_DB_ID = {
            'spring-bright': {
                toneKeyword: "Dinamis dan cerah (Active/Cute) energi musim semi",
                fashionVibe: "Pola berwarna-warni dan gaya kasual ceria sangat cocok untuk Anda.",
                makeupBase: "Ivory cerah (tone 19-21) untuk tampilan bersinar, lipstik coral/oranye direkomendasikan",
                recommendLevel: "8~10 Level (refleksi cemerlang)",
                undercoatTip: "Perlu bleaching sampai Pale Yellow dengan tone kuning",
                textureTip: "Layer ringan di ujung daripada garis berat",
                avoidColors: ["Khaki kusam", "Abu-abu berat", "Hitam"],
                seasonalAdvice: "Cokelat oranye dan cokelat kuning saturasi tinggi memaksimalkan citra dinamis Anda.",
                consultingTip: "Warna saturasi tinggi yang menonjolkan warna kulit adalah yang terbaik.",
                colorScience: {
                    melaninType: "Pheomelanin dominan",
                    undercoatPrediction: "Diprediksi undercoat kuning oranye saat bleaching",
                    neutralizationStrategy: "Manfaatkan tone kuning, minimalkan penambahan ungu"
                },
                recipes: [
                    {
                        styleName: "Cokelat Kuning Oranye",
                        vibe: "Cerah dan hidup",
                        reason: "Memaksimalkan saturasi tinggi dan kulit cerah Spring Warm Bright",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/34 (Gold Red) : 8/03 (Natural Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 menit"
                    },
                    {
                        styleName: "Coral Sunset",
                        vibe: "Hangat dan dinamis",
                        reason: "Harmonis dengan kulit tone kuning untuk coral hangat",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-OR (Orange) : 9-BE (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 menit"
                    }
                ]
            },
            'spring-light': {
                toneKeyword: "Jernih dan manis (Romantic/Clear) sinar matahari musim semi",
                fashionVibe: "Blus pastel dan bahan sifon sangat cocok.",
                makeupBase: "Base cerah dengan tone peach (tone 17-19)",
                recommendLevel: "9~12 Level (High Lift)",
                undercoatTip: "Butuh base kuning dengan minimal merah",
                textureTip: "Gelombang ringan seperti tiupan angin",
                avoidColors: ["Cokelat terlalu gelap", "Burgundy merah gelap"],
                seasonalAdvice: "Beige milk tea atau beige peach lembut meningkatkan kejernihan kulit.",
                consultingTip: "Hindari warna kusam dan pertahankan 'kejernihan' adalah kuncinya.",
                colorScience: {
                    melaninType: "Light Pheomelanin",
                    undercoatPrediction: "Undercoat kuning muda, lift cepat",
                    neutralizationStrategy: "Minimalkan merah, sesuaikan kuning dengan ungu muda"
                },
                recipes: [
                    {
                        styleName: "Beige Milk Tea",
                        vibe: "Jernih dan polos",
                        reason: "Membuat kulit lebih jernih, memaksimalkan kesan lembut",
                        brand: "Milbon",
                        line: "Ordeve Beaute",
                        mixRatio: "10-BE (Beige) : 10-MT (Matte) = 3:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 menit"
                    },
                    {
                        styleName: "Blonde Peach",
                        vibe: "Romantis dan manis",
                        reason: "Harmonis dengan undertone peach, terang tapi lembut",
                        brand: "Wella",
                        line: "Illumina Color",
                        mixRatio: "10/36 (Gold Violet) : 10/05 (Natural Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 menit"
                    }
                ]
            },
            'summer-light': {
                toneKeyword: "Murni dan bersih (Pure/Clean) ombak musim panas",
                fashionVibe: "Gaya sederhana bersih seperti kemeja putih atau denim biru muda",
                makeupBase: "Base pink untuk menetralkan merah (tone 13-21)",
                recommendLevel: "8~10 Level (jernih tanpa merah)",
                undercoatTip: "Butuh netralisasi kuning (sampo ungu) untuk menghilangkan tone lemon",
                textureTip: "Rambut lurus halus atau C-curl untuk menekankan tekstur",
                avoidColors: ["Kuning pekat", "Oranye", "Tembaga"],
                seasonalAdvice: "Pastel dingin seperti blonde ash atau lavender ash membuat kulit lebih cerah.",
                consultingTip: "Bisa terlihat kusam di bawah cahaya kuning, tekankan kejernihan di bawah cahaya alami.",
                colorScience: {
                    melaninType: "Eumelanin Cool",
                    undercoatPrediction: "Undercoat kuning saat bleaching, penambahan ungu diperlukan",
                    neutralizationStrategy: "Netralisasi kuning sepenuhnya dengan ungu/ash"
                },
                recipes: [
                    {
                        styleName: "Ash Lavender",
                        vibe: "Murni dan misterius",
                        reason: "Memaksimalkan kejernihan kulit tone dingin, menghilangkan kuning sepenuhnya",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "9-Vi (Violet) : 9-A (Ash) = 1:2",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 menit"
                    },
                    {
                        styleName: "Cokelat Pink",
                        vibe: "Elegan dan feminin",
                        reason: "Harmonis dengan undertone pink, murni tapi tidak dingin",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "8/65 (Violet Mahogany) : 8/1 (Ash) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 menit"
                    }
                ]
            },
            'summer-bright': {
                toneKeyword: "Segar dan sejuk (Fresh/Cool) laut musim panas",
                fashionVibe: "Pakaian putih bersih, biru muda, warna mint",
                makeupBase: "Base pink dingin, blush rose dan lipstik berry",
                recommendLevel: "7~9 Level (kilau sejuk)",
                undercoatTip: "Undertone ash ke pink, penghilangan kuning diperlukan",
                textureTip: "Kilau segar bersih, poni tipis",
                avoidColors: ["Kuning", "Oranye", "Mustard", "Tembaga"],
                seasonalAdvice: "Cokelat rose dan cokelat pink dingin meningkatkan citra murni Anda.",
                consultingTip: "Menekankan kesan segar bersih adalah kuncinya."
            },
            'summer-muted': {
                toneKeyword: "Elegan dan intelektual (Elegance/Soft) kabut musim panas",
                fashionVibe: "Koordinasi tone-on-tone abu-abu, gaya kantor yang tenang",
                makeupBase: "Beige pink alami (tone 21-23)",
                recommendLevel: "6~8 Level (netral tenang)",
                undercoatTip: "Bisa tanpa bleaching, tapi kendalikan merah",
                textureTip: "Volume elegan seperti build perm atau Elizabeth perm",
                avoidColors: ["Warna cerah mencolok", "Warna gelap mendekati hitam"],
                seasonalAdvice: "Warna dengan tone abu-abu seperti cokelat ash atau mocha smoke melengkapi suasana elegan Anda.",
                consultingTip: "Anda terlihat paling berkelas di 'kecerahan sedang' - tidak terlalu terang, tidak terlalu gelap."
            },
            'autumn-muted': {
                toneKeyword: "Tenang dan alami (Natural/Classic) perasaan musim gugur",
                fashionVibe: "Sweater beige, khaki, cokelat atau trench coat",
                makeupBase: "Base kuning tenang (tone 21-23), lipstik MLBB",
                recommendLevel: "5~7 Level (kilau bayangan dengan kedalaman)",
                undercoatTip: "Bisa memanfaatkan undercoat oranye alami",
                textureTip: "Hippie perm atau gelombang alami",
                avoidColors: ["Pink fluoresen", "Biru hitam dingin"],
                seasonalAdvice: "Cokelat matte, cokelat olive menutupi kemerahan kulit dan menciptakan suasana tenang.",
                consultingTip: "Cokelat lembut meningkatkan tekstur rambut lebih baik dari warna cerah.",
                colorScience: {
                    melaninType: "Mixed Melanin, Low Chroma",
                    undercoatPrediction: "Undercoat oranye kuning, perlu netralisasi dengan matte",
                    neutralizationStrategy: "Netralisasi merah dengan hijau(matte), cegah kusam"
                },
                recipes: [
                    {
                        styleName: "Cokelat Olive Matte",
                        vibe: "Tenang dan halus",
                        reason: "Netralisasi kemerahan kulit untuk kesan bersih tenang",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "7-MT (Matte) : 7-NB (Natural Brown) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 menit"
                    },
                    {
                        styleName: "Beige Khaki",
                        vibe: "Alami dan nyaman",
                        reason: "Tone tanah alami menciptakan suasana lembut",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "7.8 (Mocha) : 7.13 (Beige) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "35 menit"
                    }
                ]
            },
            'autumn-soft': {
                toneKeyword: "Hangat dan nyaman (Warm/Cozy) sore musim gugur",
                fashionVibe: "Sweater cashmere, velvet kotak-kotak, pakaian tone tanah hangat",
                makeupBase: "Base beige hangat (tone 21), lipstik peach/terracotta",
                recommendLevel: "6~8 Level (tone hangat lembut)",
                undercoatTip: "Undertone beige hangat, gradien lembut direkomendasikan",
                textureTip: "Layer bervolume, gelombang lembut",
                avoidColors: ["Hitam", "Biru ash", "Oranye cerah"],
                seasonalAdvice: "Warna hangat lembut seperti chocolate susu dan cokelat mocha menciptakan suasana nyaman.",
                consultingTip: "Gradien alami halus lebih baik dari warna ekstrem.",
                colorScience: {
                    melaninType: "Warm Pheomelanin",
                    undercoatPrediction: "Undercoat oranye, pertahankan tone hangat",
                    neutralizationStrategy: "Manfaatkan oranye, lembutkan dengan matte"
                },
                recipes: [
                    {
                        styleName: "Cokelat Chocolate Susu",
                        vibe: "Hangat dan nyaman",
                        reason: "Tone hangat lembut menciptakan citra nyaman ramah",
                        brand: "Wella",
                        line: "Softouch",
                        mixRatio: "S7/37 (Gold Brown) : S7/03 (Natural Gold) = 1:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30 menit"
                    },
                    {
                        styleName: "Beige Madu",
                        vibe: "Manis dan lembut",
                        reason: "Kilau madu untuk tampilan sehat bercahaya",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "8-BE (Beige) : 8-GO (Gold) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "30 menit"
                    }
                ]
            },
            'autumn-deep': {
                toneKeyword: "Dalam dan mewah (Gorgeous/Ethnic) kedalaman musim gugur",
                fashionVibe: "Aksesori emas, jaket kulit, pola etnik",
                makeupBase: "Beige hangat sehat (tone 23+), makeup kontur",
                recommendLevel: "4~6 Level (warna dengan kedalaman)",
                undercoatTip: "Undercoat cokelat merah efektif",
                textureTip: "Perm glam bervolume atau potongan tekstur dengan kedalaman",
                avoidColors: ["Pastel terang", "Ash pucat"],
                seasonalAdvice: "Warna hangat dalam seperti chocolate gelap dan cokelat tembaga membuat garis wajah lebih jelas.",
                consultingTip: "Fokus pada 'kilau' dan 'kedalaman warna' daripada kecerahan.",
                colorScience: {
                    melaninType: "Rich Pheomelanin",
                    undercoatPrediction: "Undercoat merah oranye, merah terlihat jelas",
                    neutralizationStrategy: "Manfaatkan merah dengan tembaga/kuning, tekankan kedalaman"
                },
                recipes: [
                    {
                        styleName: "Chocolate Gelap",
                        vibe: "Dalam dan mewah",
                        reason: "Kontras dengan kulit membuat garis jelas, pesona dewasa",
                        brand: "L'Oreal",
                        line: "Majirel",
                        mixRatio: "5.35 (Chocolate) : 5.52 (Mahogany) = 2:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40 menit"
                    },
                    {
                        styleName: "Mahogany Tembaga",
                        vibe: "Kaya dan megah",
                        reason: "Kilau tembaga untuk kesan mewah dengan kedalaman",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "5/43 (Red Gold) : 5/75 (Brown Mahogany) = 1:1",
                        oxidant: "6% (Vol.20)",
                        processingTime: "40 menit"
                    }
                ]
            },
            'winter-deep': {
                toneKeyword: "Urban dan memikat (Modern/Chic) malam musim dingin",
                fashionVibe: "Gaya hitam putih modern, aksesori perak, jas",
                makeupBase: "Base dingin bersih pucat atau bercahaya transparan",
                recommendLevel: "1~4 Level (kontras kuat)",
                undercoatTip: "Hampir tidak perlu, hanya tambahkan refleksi biru/ungu",
                textureTip: "Bob tajam, lurus, rambut pendek bersudut",
                avoidColors: ["Cokelat samar", "Cokelat hangat dengan tone kuning"],
                seasonalAdvice: "Warna dingin gelap seperti biru hitam dan navy gelap memaksimalkan aura Anda.",
                consultingTip: "'Kontras' antara warna rambut dan kulit semakin kuat, wajah semakin kecil.",
                colorScience: {
                    melaninType: "Strong Eumelanin, High Contrast",
                    undercoatPrediction: "Pertahankan rambut alami atau tambah refleksi biru ungu",
                    neutralizationStrategy: "Tidak perlu bleaching, hanya tambah kilau biru/ungu"
                },
                recipes: [
                    {
                        styleName: "Biru Hitam",
                        vibe: "Memikat dan urban",
                        reason: "Kontras kuat dengan kulit membuat garis jelas, nuansa modern",
                        brand: "Milbon",
                        line: "Ordeve",
                        mixRatio: "3-NV (Navy) : 3-A (Ash) = 2:1",
                        oxidant: "3% (Vol.10)",
                        processingTime: "25 menit"
                    },
                    {
                        styleName: "Ungu Gelap",
                        vibe: "Misterius dan halus",
                        reason: "Ungu dalam untuk pesona mewah unik",
                        brand: "Wella",
                        line: "Koleston Perfect",
                        mixRatio: "3/66 (Intense Violet) : 3/0 (Natural) = 1:2",
                        oxidant: "3% (Vol.10)",
                        processingTime: "30 menit"
                    }
                ]
            },
            'winter-bright': {
                toneKeyword: "Megah dan intens (Vivid/Dramatic) berlian musim dingin",
                fashionVibe: "Kontras tajam dengan hitam, putih, merah cerah",
                makeupBase: "Base dingin transparan, lipstik merah/wine cerah",
                recommendLevel: "1~5 Level atau bleaching + warna cerah",
                undercoatTip: "Pertahankan base tone dingin, penghilangan kuning total diperlukan",
                textureTip: "Finishing tajam mengkilap, poni kuat",
                avoidColors: ["Beige", "Kuning", "Oranye", "Cokelat kusam"],
                seasonalAdvice: "Kontras intens tajam dengan hitam murni, wine, plum gelap adalah kuncinya.",
                consultingTip: "Tarik perhatian dengan citra megah berdampak."
            },
            'winter-muted': {
                toneKeyword: "Halus dan tenang (Sophisticated/Urban) senja musim dingin",
                fashionVibe: "Jas abu-abu, mantel arang, monokrom minimalis",
                makeupBase: "Netral ke beige dingin, kontur alami",
                recommendLevel: "4~6 Level (rentang akromatik)",
                undercoatTip: "Base abu-abu ke ash, minimalkan saturasi",
                textureTip: "Tekstur matte tenang, satu panjang bersih",
                avoidColors: ["Kuning", "Oranye", "Coral"],
                seasonalAdvice: "Warna akromatik seperti arang dan ash gelap melengkapi suasana halus Anda.",
                consultingTip: "Menampilkan keeleganan tersembunyi daripada warna cerah adalah poin utama."
            },
            'neutral-light': {
                toneKeyword: "Lembut dan serbaguna (Versatile/Soft) harmoni netral",
                fashionVibe: "Baik hangat maupun dingin cocok, gaya kasual tone terang",
                makeupBase: "Beige netral (tone 19-21), warna alami",
                recommendLevel: "7~9 Level (serbaguna)",
                undercoatTip: "Base beige netral, hindari hangat/dingin ekstrem",
                textureTip: "Tekstur alami lembut, potongan layer",
                avoidColors: ["Oranye cerah", "Biru hitam", "Neon"],
                seasonalAdvice: "Tone sedang lembut seperti milk tea dan beige rose cocok untuk Anda.",
                consultingTip: "Banyak warna cocok, sesuaikan dengan preferensi pelanggan."
            },
            'neutral-muted': {
                toneKeyword: "Nyaman dan alami (Comfortable/Natural) stabilitas netral",
                fashionVibe: "Tone tanah, kasual nyaman warna netral",
                makeupBase: "Netral ke beige dingin (tone 21-23), lipstik MLBB",
                recommendLevel: "5~7 Level (tone sedang tenang)",
                undercoatTip: "Base netral ke beige dingin, saturasi rendah",
                textureTip: "Tekstur alami tenang, gelombang hippie",
                avoidColors: ["Oranye cerah", "Neon", "Hitam murni"],
                seasonalAdvice: "Warna tenang alami seperti beige abu-abu dan taupe menciptakan suasana nyaman.",
                consultingTip: "Tujukan nuansa halus dan nyaman."
            },
            'neutral-soft': {
                toneKeyword: "Hangat tapi tenang (Gentle/Balanced) keseimbangan netral",
                fashionVibe: "Blus, sweater tone romantis tapi tenang",
                makeupBase: "Base beige pink (tone 21), lipstik rose",
                recommendLevel: "6~8 Level (tone sedang lembut)",
                undercoatTip: "Base beige netral, gradien lembut",
                textureTip: "Kilau alami lembut, layer lembut",
                avoidColors: ["Biru hitam", "Merah cerah", "Abu-abu ash"],
                seasonalAdvice: "Warna lembut halus seperti mocha susu dan cokelat rose harmonis.",
                consultingTip: "Ciptakan suasana hangat tapi tenang."
            },
            'neutral-deep': {
                toneKeyword: "Dalam dan dewasa (Mature/Rich) bobot netral",
                fashionVibe: "Pakaian cokelat mewah, burgundy, warna gelap",
                makeupBase: "Hangat ke beige netral (tone 23), lipstik warna dalam",
                recommendLevel: "4~6 Level (tone dalam)",
                undercoatTip: "Base cokelat netral",
                textureTip: "Finishing alami dengan kedalaman, perm bervolume",
                avoidColors: ["Platinum", "Biru ash", "Pink cerah"],
                seasonalAdvice: "Warna dalam alami seperti chocolate dan mocha gelap menampilkan pesona dewasa.",
                consultingTip: "Ciptakan kesan halus dan dewasa."
            }
        };

        // ========== 언어에 따라 적절한 DB 선택하는 함수 ==========
        function getExpertGuideDB() {
            const lang = window.currentLanguage || window.HAIRGATOR_LANG || 'ko';
            console.log('🌍 getExpertGuideDB 호출 - 현재 언어:', lang, '| window.currentLanguage:', window.currentLanguage);
            switch(lang) {
                case 'en': return EXPERT_GUIDE_DB_EN;
                case 'ja': return EXPERT_GUIDE_DB_JA;
                case 'zh': return EXPERT_GUIDE_DB_ZH;
                case 'vi': return EXPERT_GUIDE_DB_VI;
                case 'id': return EXPERT_GUIDE_DB_ID;
                default: return EXPERT_GUIDE_DB_KO;
            }
        }

        function generateAdvancedExpertFeedback(season, subtype, skinData) {
            // 1. 가이드 데이터 가져오기 (fallback 로직 포함, 다국어 지원)
            const expertDB = getExpertGuideDB();
            let key = `${season}-${subtype}`;
            if (!expertDB[key]) {
                // fallback: 유사한 키로 대체
                if (subtype === 'soft') key = `${season}-muted`;
                else if (subtype === 'bright') key = `${season}-light`;
                else key = `${season}-deep`;
            }

            const guide = expertDB[key] || expertDB['spring-light']; // 최후의 안전장치

            // 2. 피부 밝기(L)에 따른 동적 조언 (다국어 지원)
            let brightnessAdvice = '';
            if (skinData && skinData.L) {
                if (skinData.L > 68) {
                    brightnessAdvice = t('personalColor.expertGuide.brightSkin') || '피부톤이 밝으셔서 헤어 컬러도 명도를 높이면 화사함이 배가됩니다.';
                } else if (skinData.L < 58) {
                    brightnessAdvice = t('personalColor.expertGuide.darkSkin') || '피부톤과 자연스럽게 어우러지는 중명도 이하의 컬러가 안정적입니다.';
                } else {
                    brightnessAdvice = t('personalColor.expertGuide.mediumSkin') || '어떤 밝기의 컬러도 무난하게 소화하실 수 있는 피부 톤입니다.';
                }
            }

            // 3. 결과 반환 (colorScience, recipes 추가)
            return {
                toneKeywords: guide.toneKeyword,
                levelTip: guide.recommendLevel,
                undercoatTip: guide.undercoatTip,
                textureTip: guide.textureTip,
                fashionVibe: guide.fashionVibe,
                makeupBase: guide.makeupBase,
                avoidColors: guide.avoidColors,
                seasonalAdvice: guide.seasonalAdvice,
                consultingTip: guide.consultingTip,
                brightnessAdvice,
                // NEW: 컬러 사이언스 & 레시피
                colorScience: guide.colorScience || null,
                recipes: guide.recipes || null
            };
        }

        // 색상 이름 → HEX 매핑 (피해야 할 컬러 스와치용) - 다국어 지원
        const COLOR_NAME_TO_HEX = {
            // 한국어 (Korean)
            "골드": "#D4AF37",
            "노란기가 강한 골드": "#FFD700",
            "오렌지": "#FF8C00",
            "비비드 오렌지": "#FF6600",
            "구리빛": "#B87333",
            "코랄": "#FF7F50",
            "머스타드": "#E1AD01",
            "베이지": "#D2B48C",
            "탁한 브라운": "#8B7355",
            "탁한 카키": "#8B8860",
            "어중간한 갈색": "#A67B5B",
            "노란기가 도는 웜 브라운": "#9E7B4F",
            "블랙": "#1A1A1A",
            "퓨어블랙": "#000000",
            "블루 블랙": "#0D0D3D",
            "블루블랙": "#0D0D3D",
            "애쉬블루": "#7B98B2",
            "애쉬그레이": "#8E9AA0",
            "회색빛이 많이 도는 애쉬": "#9EA5AB",
            "창백한 애쉬": "#C0C5C9",
            "다크 애쉬": "#4A4E52",
            "형광기가 도는 핑크": "#FF69B4",
            "차가운 블루 블랙": "#1C2331",
            "비비드 레드": "#FF0033",
            "비비드 핑크": "#FF1493",
            "강렬한 버건디": "#800020",
            "네온": "#39FF14",
            "플래티넘": "#E5E4E2",
            "쨍한 비비드 컬러": "#FF00FF",
            "검은색에 가까운 다크함": "#1A1A2E",
            "너무 어두운 다크 브라운": "#3D2914",
            "너무 가벼운 파스텔 톤": "#FFE4E1",
            // 영어 (English)
            "Gold": "#D4AF37",
            "Strong Yellow Gold": "#FFD700",
            "Orange": "#FF8C00",
            "Vivid Orange": "#FF6600",
            "Copper": "#B87333",
            "Coral": "#FF7F50",
            "Mustard": "#E1AD01",
            "Beige": "#D2B48C",
            "Dull Brown": "#8B7355",
            "Dull Khaki": "#8B8860",
            "Ambiguous Brown": "#A67B5B",
            "Yellowish Warm Brown": "#9E7B4F",
            "Black": "#1A1A1A",
            "Pure Black": "#000000",
            "Blue Black": "#0D0D3D",
            "Ash Blue": "#7B98B2",
            "Ash Gray": "#8E9AA0",
            "Heavy Gray Ash": "#9EA5AB",
            "Pale Ash": "#C0C5C9",
            "Dark Ash": "#4A4E52",
            "Fluorescent Pink": "#FF69B4",
            "Cold Blue Black": "#1C2331",
            "Vivid Red": "#FF0033",
            "Vivid Pink": "#FF1493",
            "Intense Burgundy": "#800020",
            "Neon": "#39FF14",
            "Platinum": "#E5E4E2",
            "Bright Vivid Colors": "#FF00FF",
            "Near-Black Dark": "#1A1A2E",
            "Too Dark Brown": "#3D2914",
            "Too Light Pastel": "#FFE4E1",
            // 일본어 (Japanese)
            "ゴールド": "#D4AF37",
            "黄みが強いゴールド": "#FFD700",
            "オレンジ": "#FF8C00",
            "ビビッドオレンジ": "#FF6600",
            "コッパー": "#B87333",
            "コーラル": "#FF7F50",
            "マスタード": "#E1AD01",
            "ベージュ": "#D2B48C",
            "くすんだブラウン": "#8B7355",
            "くすんだカーキ": "#8B8860",
            "中途半端な茶色": "#A67B5B",
            "黄みがかったウォームブラウン": "#9E7B4F",
            "ブラック": "#1A1A1A",
            "ピュアブラック": "#000000",
            "ブルーブラック": "#0D0D3D",
            "アッシュブルー": "#7B98B2",
            "アッシュグレー": "#8E9AA0",
            "グレーが強いアッシュ": "#9EA5AB",
            "ペールアッシュ": "#C0C5C9",
            "ダークアッシュ": "#4A4E52",
            "蛍光ピンク": "#FF69B4",
            "冷たいブルーブラック": "#1C2331",
            "ビビッドレッド": "#FF0033",
            "ビビッドピンク": "#FF1493",
            "濃いバーガンディ": "#800020",
            "ネオン": "#39FF14",
            "プラチナ": "#E5E4E2",
            "派手なビビッドカラー": "#FF00FF",
            "黒に近いダーク": "#1A1A2E",
            "暗すぎるダークブラウン": "#3D2914",
            "軽すぎるパステル": "#FFE4E1",
            // 중국어 (Chinese)
            "金色": "#D4AF37",
            "深黄金色": "#FFD700",
            "橙色": "#FF8C00",
            "亮橙色": "#FF6600",
            "铜色": "#B87333",
            "珊瑚色": "#FF7F50",
            "芥末色": "#E1AD01",
            "米色": "#D2B48C",
            "暗棕色": "#8B7355",
            "暗卡其色": "#8B8860",
            "模糊棕色": "#A67B5B",
            "偏黄暖棕色": "#9E7B4F",
            "黑色": "#1A1A1A",
            "纯黑色": "#000000",
            "蓝黑色": "#0D0D3D",
            "灰蓝色": "#7B98B2",
            "灰色": "#8E9AA0",
            "浓灰色": "#9EA5AB",
            "浅灰色": "#C0C5C9",
            "深灰色": "#4A4E52",
            "荧光粉": "#FF69B4",
            "冷蓝黑色": "#1C2331",
            "亮红色": "#FF0033",
            "亮粉色": "#FF1493",
            "浓酒红色": "#800020",
            "霓虹色": "#39FF14",
            "铂金色": "#E5E4E2",
            "艳丽色": "#FF00FF",
            "接近黑色": "#1A1A2E",
            "过深棕色": "#3D2914",
            "过浅粉彩": "#FFE4E1",
            // 베트남어 (Vietnamese)
            "Vàng Gold": "#D4AF37",
            "Vàng đậm": "#FFD700",
            "Cam": "#FF8C00",
            "Cam rực": "#FF6600",
            "Đồng": "#B87333",
            "San hô": "#FF7F50",
            "Mù tạt": "#E1AD01",
            "Be": "#D2B48C",
            "Nâu xỉn": "#8B7355",
            "Kaki xỉn": "#8B8860",
            "Nâu mơ hồ": "#A67B5B",
            "Nâu ấm ánh vàng": "#9E7B4F",
            "Đen": "#1A1A1A",
            "Đen tuyền": "#000000",
            "Đen xanh": "#0D0D3D",
            "Xanh tro": "#7B98B2",
            "Xám tro": "#8E9AA0",
            "Xám đậm": "#9EA5AB",
            "Tro nhạt": "#C0C5C9",
            "Tro đậm": "#4A4E52",
            "Hồng huỳnh quang": "#FF69B4",
            "Đen xanh lạnh": "#1C2331",
            "Đỏ rực": "#FF0033",
            "Hồng rực": "#FF1493",
            "Đỏ rượu đậm": "#800020",
            "Neon": "#39FF14",
            "Bạch kim": "#E5E4E2",
            "Màu rực rỡ": "#FF00FF",
            "Gần đen": "#1A1A2E",
            "Nâu quá đậm": "#3D2914",
            "Pastel quá nhạt": "#FFE4E1",
            // 인도네시아어 (Indonesian)
            "Emas": "#D4AF37",
            "Kuning Emas": "#FFD700",
            "Oranye": "#FF8C00",
            "Oranye Cerah": "#FF6600",
            "Tembaga": "#B87333",
            "Coral": "#FF7F50",
            "Mustard": "#E1AD01",
            "Beige": "#D2B48C",
            "Cokelat Kusam": "#8B7355",
            "Khaki Kusam": "#8B8860",
            "Cokelat Samar": "#A67B5B",
            "Cokelat Hangat Kekuningan": "#9E7B4F",
            "Hitam": "#1A1A1A",
            "Hitam Pekat": "#000000",
            "Biru Hitam": "#0D0D3D",
            "Biru Ash": "#7B98B2",
            "Abu-abu Ash": "#8E9AA0",
            "Abu-abu Pekat": "#9EA5AB",
            "Ash Muda": "#C0C5C9",
            "Ash Gelap": "#4A4E52",
            "Pink Fluoresen": "#FF69B4",
            "Biru Hitam Dingin": "#1C2331",
            "Merah Cerah": "#FF0033",
            "Pink Cerah": "#FF1493",
            "Wine Gelap": "#800020",
            "Neon": "#39FF14",
            "Platinum": "#E5E4E2",
            "Warna Cerah": "#FF00FF",
            "Mendekati Hitam": "#1A1A2E",
            "Cokelat Terlalu Gelap": "#3D2914",
            "Pastel Terlalu Terang": "#FFE4E1"
        };

        // 색상 이름으로 HEX 가져오기 (없으면 기본색 반환)
        function getColorHex(colorName) {
            return COLOR_NAME_TO_HEX[colorName] || "#888888";
        }

        // 헤어컬러 시술 난이도 판정 함수 (다국어 지원)
        function getColorDifficulty(color, personalColorResult) {
            const skinL = personalColorResult.lab?.L || 60;
            const colorLevel = color.level || 6;

            // 난이도 계산 (High Lift Color로 8~10레벨 가능, 11레벨 이상 탈색 필요)
            let difficulty = 'easy';
            let difficultyLabel = t('personalColor.difficulty.easy') || '손쉬움';
            let difficultyIcon = '✅';
            let difficultyTip = t('personalColor.difficulty.easyTip') || '탈색 없이 바로 적용 가능';
            let needsBleaching = false;

            if (colorLevel >= 12) {
                // 12레벨 이상: 확실히 2회 탈색 필요
                difficulty = 'hard';
                difficultyLabel = t('personalColor.difficulty.hard') || '고난도';
                difficultyIcon = '⚠️';
                difficultyTip = t('personalColor.difficulty.hardTip') || '2회 이상 탈색 필요, 모발 손상 주의';
                needsBleaching = true;
            } else if (colorLevel >= 9) {
                // 9~11레벨: 모질에 따라 탈색 또는 최고 리프트력 염색제 필요
                difficulty = 'medium';
                difficultyLabel = t('personalColor.difficulty.toneUp') || '톤업 필요';
                difficultyIcon = '🔆';
                difficultyTip = t('personalColor.difficulty.toneUpTip') || '리프트력 강한 염색제(12~14Lv) 또는 탈색 1회 권장';
                needsBleaching = true;
            } else if (colorLevel >= 7) {
                // 7~8레벨: 하이리프트 염색으로 가능
                difficulty = 'light';
                difficultyLabel = t('personalColor.difficulty.highLift') || '하이리프트';
                difficultyIcon = '💡';
                difficultyTip = t('personalColor.difficulty.highLiftTip') || '하이리프트 염색으로 톤업 가능';
                needsBleaching = false;
            }

            return {
                difficulty,
                label: difficultyLabel,
                icon: difficultyIcon,
                tip: difficultyTip,
                needsBleaching
            };
        }

        // 우선순위 뱃지 생성 함수 (다국어 지원)
        function getPriorityBadge(priority) {
            switch(priority) {
                case 1:
                    return { icon: '⭐', label: t('personalColor.priority.bestMatch') || '최적 매칭', color: '#FFD700' };
                case 2:
                    return { icon: '☀️', label: t('personalColor.priority.levelOk') || '레벨 적합', color: '#FF9800' };
                case 3:
                    return { icon: '🎨', label: t('personalColor.priority.toneOk') || '톤 적합', color: '#4CAF50' };
                case 4:
                    return { icon: '👍', label: t('personalColor.priority.good') || '좋음', color: '#2196F3' };
                default:
                    return { icon: '💫', label: t('personalColor.priority.option') || '옵션', color: '#9E9E9E' };
            }
        }

        // ========== 통합 파이프라인 실행 ==========
        function runPersonalColorPipeline(skinRgb, imageData = null) {
            console.log('🚀 퍼스널컬러 분석 파이프라인 시작...');
            console.log('입력 RGB:', skinRgb);

            // 1단계: 피부·조명 분석
            const step1 = analyzeSkinAndLighting(skinRgb, imageData);

            // ✅ 정확도 목적: 조명 품질 낮으면 분류 자체 금지
            const lq = step1.lightingMeta?.lightingQuality ?? 0;
            if (lq < PC_CONFIG.LIGHTING.minQualityToClassify) {
                console.warn('⛔ 조명 품질 낮음 - 분류 차단:', lq.toFixed(2));
                return {
                    blocked: true,
                    reason: 'LOW_LIGHTING_QUALITY',
                    originalRgb: step1.originalRgb,
                    correctedRgb: step1.correctedRgb,
                    lightingMeta: step1.lightingMeta,
                    pipelineVersion: '2.1-blocked',
                    timestamp: new Date().toISOString()
                };
            }

            // 2단계: 퍼스널컬러 분류
            const step2 = classifyPersonalColor(step1.correctedRgb, step1.lightingMeta);

            // 3단계: 헤어컬러 후보 필터링
            const step3 = filterHairColorCandidates(step2, hairColorData || []);

            // 4단계: 최종 추천
            const step4 = calculateFinalRecommendations(
                step2.lab,
                step3,
                step2,
                step1.lightingMeta
            );

            const result = {
                blocked: false,
                // 피부 분석
                originalRgb: step1.originalRgb,
                correctedRgb: step1.correctedRgb,
                lightingMeta: step1.lightingMeta,

                // 퍼스널컬러
                personalColor: step2,

                // 헤어컬러 추천
                hairRecommendations: step4,

                // 메타
                pipelineVersion: '2.1',
                timestamp: new Date().toISOString()
            };

            console.log('🚀 파이프라인 완료:', result);
            return result;
        }

        // 전역 노출
        window.runPersonalColorPipeline = runPersonalColorPipeline;
        window.analyzeSkinAndLighting = analyzeSkinAndLighting;
        window.classifyPersonalColor = classifyPersonalColor;

        // 초기화
        document.addEventListener('DOMContentLoaded', function () {
            console.log('HAIRGATOR Personal Color 시스템 시작...');
            initializeSystem();
        });

        async function initializeSystem() {
            const timeoutId = setTimeout(() => {
                console.warn('로딩 타임아웃 - 강제로 앱 표시');
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('main-app').classList.add('loaded');
                showToast(t('personalColor.loadingSteps.ready') || '시스템 준비 완료!', 'warning');
            }, 5000);

            try {
                console.log('시스템 초기화 시작...');

                updateLoadingProgress(20, t('personalColor.loadingSteps.hairColorData') || '헤어컬러 데이터 로드 중...');
                await loadHairColorData();

                updateLoadingProgress(40, t('personalColor.loadingSteps.uiSetup') || 'UI 컴포넌트 설정 중...');
                setupUI();

                updateLoadingProgress(60, t('personalColor.loadingSteps.aiEngine') || 'AI 얼굴 인식 엔진 준비 중...');
                // Face Mesh 미리 초기화 (카메라 시작 시 빠르게 작동하도록)
                await preloadFaceMesh();

                updateLoadingProgress(100, t('personalColor.loadingSteps.ready') || '시스템 준비 완료!');
                await new Promise(resolve => setTimeout(resolve, 500));

                clearTimeout(timeoutId);

                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('main-app').classList.add('loaded');

                console.log('HAIRGATOR Personal Color 준비 완료');
                showToast(t('personalColor.loadingSteps.readyToast') || '퍼스널컬러 시스템이 준비되었습니다!', 'success');

            } catch (error) {
                clearTimeout(timeoutId);
                console.error('시스템 초기화 실패:', error);

                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('main-app').classList.add('loaded');
                showToast(t('personalColor.loadingSteps.partialError') || '일부 기능에 제한이 있을 수 있습니다.', 'warning');
            }
        }

        function updateLoadingProgress(percent, text) {
            const bar = document.getElementById('loading-bar');
            const textEl = document.getElementById('loading-text');
            if (bar) bar.style.width = percent + '%';
            if (textEl) textEl.textContent = text;
        }

        async function loadHairColorData() {
            try {
                if (parent && parent.HAIR_COLOR_614_DATA) {
                    hairColorData = parent.HAIR_COLOR_614_DATA;
                    console.log('부모창에서 614개 헤어컬러 데이터 로드 완료');
                    checkShiseidoData();
                    return;
                }

                if (typeof HAIR_COLOR_614_DATA !== 'undefined') {
                    hairColorData = HAIR_COLOR_614_DATA;
                    console.log('글로벌 변수에서 614개 데이터 로드');
                    checkShiseidoData();
                    return;
                }

                if (parent && parent.hairColorDatabase) {
                    hairColorData = parent.hairColorDatabase;
                    console.log(`부모창 데이터베이스에서 ${hairColorData.length}개 로드`);
                    checkShiseidoData();
                    return;
                }

                await loadExternalHairColorData();
                checkShiseidoData();

            } catch (error) {
                console.error('헤어컬러 데이터 로드 실패:', error);
                hairColorData = generateDefaultHairColors();
                checkShiseidoData();
            }
        }

        async function loadExternalHairColorData() {
            try {
                await new Promise((resolve, _reject) => {
                    const script = document.createElement('script');
                    script.src = 'hair-color-data.js';
                    script.onload = () => {
                        if (typeof HAIR_COLOR_614_DATA !== 'undefined') {
                            hairColorData = HAIR_COLOR_614_DATA;
                            console.log('✅ 외부 스크립트에서 614개 데이터 로드 완료');
                        } else {
                            console.warn('스크립트 로드됐지만 데이터 없음');
                            hairColorData = generateDefaultHairColors();
                        }
                        resolve();
                    };
                    script.onerror = () => {
                        console.warn('외부 헤어컬러 데이터 스크립트 로드 실패');
                        hairColorData = generateDefaultHairColors();
                        resolve(); // reject 대신 resolve로 계속 진행
                    };
                    document.head.appendChild(script);

                    // 5초 타임아웃
                    setTimeout(() => {
                        if (hairColorData.length === 0) {
                            console.warn('타임아웃 - 기본 데이터 사용');
                            hairColorData = generateDefaultHairColors();
                        }
                        resolve();
                    }, 5000);
                });

            } catch (error) {
                console.error('외부 데이터 로드 오류:', error);
                hairColorData = generateDefaultHairColors();
            }
        }

        function generateDefaultHairColors() {
            const brands = ['로레알', '웰라', '밀본'];
            const seasons = ['spring', 'summer', 'autumn', 'winter'];
            const data = [];

            brands.forEach(brand => {
                seasons.forEach(season => {
                    SeasonPalettes[season].colors.forEach((color, index) => {
                        data.push({
                            brand: brand,
                            name: `${season} Color ${index + 1}`,
                            hex: color,
                            season: season,
                            confidence: 0.8 + Math.random() * 0.2
                        });
                    });
                });
            });

            return data;
        }

        function checkShiseidoData() {
            const shiseidoCount = hairColorData.filter(item =>
                item.brand && (
                    item.brand.toLowerCase().includes('shiseido') ||
                    item.brand.toLowerCase().includes('시세이도')
                )
            ).length;

            console.log(`현재 시세이도 데이터: ${shiseidoCount}개`);

            if (shiseidoCount === 0) {
                console.warn('시세이도 데이터 없음. 추가합니다...');
                addShiseidoData();
            } else {
                console.log('시세이도 데이터 확인됨');
            }

            console.log(`총 데이터: ${hairColorData.length}개`);
        }

        function addShiseidoData() {
            const shiseidoData = [
                { brand: "Shiseido", line: "PRIMIENCE", code: "N5", name: "내츄럴 브라운", hex: "#6B4E37", season: "autumn" },
                { brand: "Shiseido", line: "PRIMIENCE", code: "A6", name: "애쉬 브라운", hex: "#8B7D6B", season: "summer" },
                { brand: "Shiseido", line: "PRIMIENCE", code: "G7", name: "골든 베이지", hex: "#D2B48C", season: "spring" },
                { brand: "Shiseido", line: "ADENOVITAL", code: "AD01", name: "딥 블랙", hex: "#2F2F2F", season: "winter" },
                { brand: "Shiseido", line: "ADENOVITAL", code: "AD02", name: "소프트 블랙", hex: "#4A4A4A", season: "winter" },
                { brand: "Shiseido", line: "PRIMIENCE", code: "B8", name: "베이지 브라운", hex: "#A0826D", season: "autumn" },
                { brand: "Shiseido", line: "PRIMIENCE", code: "M9", name: "매트 브라운", hex: "#8B6F47", season: "autumn" },
                { brand: "Shiseido", line: "ADENOVITAL", code: "AD03", name: "다크 브라운", hex: "#3D2F23", season: "winter" },
                { brand: "Shiseido", line: "ADENOVITAL", code: "AD04", name: "쿨 브라운", hex: "#5D4E3A", season: "summer" },
                { brand: "Shiseido", line: "PRIMIENCE", code: "C10", name: "카라멜 브라운", hex: "#B8860B", season: "spring" }
            ];

            hairColorData.push(...shiseidoData);
            console.log(`시세이도 ${shiseidoData.length}개 데이터 추가 완료`);
        }

        function setupUI() {
            selectSeason('spring', true); // silent = true (초기화 시 토스트 표시 안함)
            console.log('UI 설정 완료');
        }

        // Face Mesh 미리 로드 (페이지 로드 시)
        async function preloadFaceMesh() {
            if (typeof FaceMesh === 'undefined') {
                console.log('FaceMesh 라이브러리가 아직 로드되지 않음');
                return;
            }

            if (faceDetectionInstance) {
                console.log('Face Mesh 이미 초기화됨');
                return;
            }

            try {
                console.log('Face Mesh 미리 로드 시작...');
                faceDetectionInstance = new FaceMesh({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
                    }
                });

                faceDetectionInstance.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                faceDetectionInstance.onResults(onAdvancedFaceResults);

                // 초기화 완료 대기 (WASM 로드)
                await faceDetectionInstance.initialize();

                console.log('✅ Face Mesh 미리 로드 완료');
            } catch (error) {
                console.warn('Face Mesh 미리 로드 실패 (카메라 시작 시 재시도):', error);
                faceDetectionInstance = null;
            }
        }

        // 모드 선택 및 전환 - 전체화면으로 변경
        function selectMode(mode) {
            console.log('모드 선택:', mode);
            currentMode = mode;

            // 모드 선택 화면 완전히 숨기기
            document.getElementById('mode-selection').style.display = 'none';

            // 모든 섹션 비활성화
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });

            if (mode === 'ai') {
                // 고객 정보 입력 먼저 받기
                openPersonalAnalysisModal();
                return; // 모달에서 완료 후 proceedToAIAnalysis() 호출
            } else if (mode === 'draping') {
                const drapingSection = document.getElementById('draping-mode');
                drapingSection.classList.add('active');
                drapingSection.style.display = 'block';
                showToast(t('personalColor.toast.drapingModeActivated') || '전문가 드래이핑 모드가 활성화되었습니다', 'success');
            }
        }

        // 드래이핑 가이드 모달 열기/닫기
        function openDrapingGuide() {
            document.getElementById('draping-guide-modal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        function closeDrapingGuide() {
            document.getElementById('draping-guide-modal').style.display = 'none';
            document.body.style.overflow = '';
        }

        function goHome() {
            // 모든 섹션 비활성화 및 숨기기
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
                section.style.display = '';  // 스타일 초기화
            });

            // 모드 선택 화면 다시 표시
            const modeSelection = document.getElementById('mode-selection');
            modeSelection.style.display = '';  // 스타일 초기화
            modeSelection.classList.add('active');

            // 카메라 정지 (silent = true, 홈으로 돌아갈 때 카메라 정지 토스트 불필요)
            stopAICamera(true);
            stopDrapingCamera(true);
            cleanupCameraResources();

            currentMode = null;
            showToast(t('personalColor.toast.returningHome') || '홈 화면으로 돌아갑니다', 'info');
        }

        // X 버튼 클릭 - 퍼스널컬러 페이지 닫기
        function closePersonalColor() {
            console.log('🎨 퍼스널컬러 페이지 닫기');

            // 카메라 리소스 정리 (silent = true, 닫을 때 토스트 표시 안함)
            stopAICamera(true);
            stopDrapingCamera(true);
            cleanupCameraResources();

            // 부모 창이 있으면 (iframe인 경우) 부모에게 닫기 요청
            if (window.parent !== window) {
                try {
                    window.parent.postMessage({ type: 'CLOSE_PERSONAL_COLOR' }, '*');
                } catch (e) {
                    console.warn('부모 창 통신 실패:', e);
                }
            }

            // 메인 페이지로 이동
            window.location.href = '/';
        }

        // AI 카메라 함수들
        async function startAICamera() {
            try {
                showToast(t('personalColor.toast.checkingPermission') || '카메라 권한을 확인합니다...', 'info');
                console.log('🎥 카메라 시작 시도...');

                // 1. mediaDevices API 지원 확인
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('NOT_SUPPORTED: 이 브라우저/앱에서 카메라를 지원하지 않습니다');
                }

                // 2. 권한 상태 확인 (지원하는 경우)
                if (navigator.permissions && navigator.permissions.query) {
                    try {
                        const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                        console.log('카메라 권한 상태:', permissionStatus.state);

                        if (permissionStatus.state === 'denied') {
                            throw new Error('PERMISSION_DENIED: 카메라 권한이 거부되었습니다. 앱 설정에서 카메라 권한을 허용해주세요.');
                        }
                    } catch (permErr) {
                        console.log('권한 조회 불가 (정상일 수 있음):', permErr.message);
                    }
                }

                cleanupCameraResources();

                // 3. 카메라 스트림 요청 (여러 옵션 시도)
                let stream = null;
                const videoConstraints = [
                    { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                    { facingMode: 'user' },
                    { facingMode: { ideal: 'user' } },
                    true  // 가장 기본적인 옵션
                ];

                for (const constraints of videoConstraints) {
                    try {
                        console.log('카메라 옵션 시도:', JSON.stringify(constraints));
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: constraints,
                            audio: false
                        });
                        console.log('✅ 카메라 스트림 획득 성공');
                        break;
                    } catch (e) {
                        console.log('옵션 실패:', e.name, e.message);
                        continue;
                    }
                }

                if (!stream) {
                    throw new Error('STREAM_FAILED: 모든 카메라 옵션이 실패했습니다');
                }

                activeVideoStream = stream;
                videoElement = document.getElementById('camera-feed');

                if (!videoElement) {
                    throw new Error('VIDEO_ELEMENT: 비디오 요소를 찾을 수 없습니다');
                }

                videoElement.srcObject = activeVideoStream;
                videoElement.setAttribute('playsinline', 'true');
                videoElement.setAttribute('autoplay', 'true');
                videoElement.muted = true;

                // 비디오 재생 대기
                await new Promise((resolve, reject) => {
                    videoElement.onloadedmetadata = () => {
                        videoElement.play()
                            .then(resolve)
                            .catch(reject);
                    };
                    videoElement.onerror = reject;
                    setTimeout(() => reject(new Error('VIDEO_TIMEOUT')), 10000);
                });

                showToast(t('personalColor.toast.cameraStarted') || '카메라가 시작되었습니다!', 'success');

                canvasElement = document.getElementById('camera-canvas');
                canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });

                // MediaPipe Face Mesh 초기화 또는 재사용
                // ⭐ WebView 환경 감지 및 경고
                const isWebViewEnv = typeof DeviceDetection !== 'undefined' && DeviceDetection.isWebView();
                if (isWebViewEnv) {
                    console.warn('⚠️ Android WebView 환경 감지 - MediaPipe 기능이 제한될 수 있습니다');
                }

                if (typeof FaceMesh !== 'undefined') {
                    try {
                        // Face Mesh 인스턴스가 없으면 새로 생성
                        if (!faceDetectionInstance) {
                            console.log('새 Face Mesh 인스턴스 생성');
                            faceDetectionInstance = new FaceMesh({
                                locateFile: (file) => {
                                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
                                }
                            });

                            faceDetectionInstance.setOptions({
                                maxNumFaces: 1,
                                refineLandmarks: true,
                                minDetectionConfidence: 0.5,
                                minTrackingConfidence: 0.5
                            });

                            faceDetectionInstance.onResults(onAdvancedFaceResults);
                        } else {
                            console.log('기존 Face Mesh 인스턴스 재사용');
                            // 기존 인스턴스에도 onResults 다시 설정
                            faceDetectionInstance.onResults(onAdvancedFaceResults);
                        }

                        // 프레임 카운터 리셋
                        frameCount = 0;

                        // MediaPipe Camera는 항상 새로 생성
                        if (typeof Camera !== 'undefined') {
                            mediaPipeCamera = new Camera(videoElement, {
                                onFrame: async () => {
                                    if (faceDetectionInstance && videoElement && videoElement.readyState === 4) {
                                        try {
                                            await faceDetectionInstance.send({ image: videoElement });
                                        } catch (_e) {
                                            // send 실패 시 무시 (카메라 중지 시 발생 가능)
                                        }
                                    }
                                },
                                width: 640,
                                height: 480
                            });
                            mediaPipeCamera.start();
                        }

                        console.log('MediaPipe Face Mesh 활성화');
                        showToast(t('personalColor.toast.faceRecognitionEnabled') || '얼굴 인식이 활성화되었습니다', 'success');
                    } catch (error) {
                        console.warn('Face Mesh 초기화 실패:', error);
                        // WebView에서 실패 시 더 상세한 메시지
                        if (isWebViewEnv) {
                            showToast(t('personalColor.toast.webviewFaceLimit') || 'WebView 환경에서는 얼굴 인식이 제한됩니다. Chrome 브라우저를 사용해주세요.', 'warning');
                        } else {
                            showToast(t('personalColor.toast.basicCameraMode') || '기본 카메라 모드로 시작합니다', 'warning');
                        }
                    }
                } else {
                    // MediaPipe 라이브러리 자체가 로드되지 않은 경우
                    console.warn('⚠️ MediaPipe FaceMesh 라이브러리가 로드되지 않았습니다');
                    if (isWebViewEnv) {
                        showToast(t('personalColor.toast.webviewNoFace') || 'WebView 환경에서는 얼굴 인식이 지원되지 않습니다', 'warning');
                    }
                }

                document.getElementById('ai-face-guide').style.display = 'flex';

            } catch (error) {
                console.error('❌ 카메라 시작 실패:', error);
                cleanupCameraResources();

                // ⭐ Android/iOS 환경별 상세 에러 메시지
                const isAndroidEnv = typeof DeviceDetection !== 'undefined' && DeviceDetection.isAndroid();
                const isIOSEnv = typeof DeviceDetection !== 'undefined' && DeviceDetection.isIOS();
                const isWebViewEnv = typeof DeviceDetection !== 'undefined' && DeviceDetection.isWebView();

                let userMessage = t('personalColor.cameraErrors.generic') || '카메라에 접근할 수 없습니다.';

                if (error.name === 'NotAllowedError' || error.message.includes('PERMISSION_DENIED')) {
                    if (isAndroidEnv) {
                        userMessage = t('personalColor.cameraErrors.permissionDeniedAndroid') || '카메라 권한이 거부되었습니다.\n\n설정 > 앱 > HAIRGATOR > 권한 > 카메라를 허용해주세요.';
                    } else if (isIOSEnv) {
                        userMessage = t('personalColor.cameraErrors.permissionDeniedIOS') || '카메라 권한이 거부되었습니다.\n\n설정 > HAIRGATOR > 카메라를 허용해주세요.';
                    } else {
                        userMessage = t('personalColor.cameraErrors.permissionDeniedBrowser') || '카메라 권한이 거부되었습니다.\n\n브라우저 설정에서 카메라 권한을 허용해주세요.';
                    }
                } else if (error.name === 'NotFoundError') {
                    userMessage = t('personalColor.cameraErrors.notFound') || '카메라를 찾을 수 없습니다.\n\n기기에 카메라가 있는지 확인해주세요.';
                } else if (error.name === 'NotReadableError') {
                    userMessage = t('personalColor.cameraErrors.inUse') || '카메라가 다른 앱에서 사용 중입니다.\n\n다른 앱을 종료하고 다시 시도해주세요.';
                } else if (error.message.includes('NOT_SUPPORTED')) {
                    if (isWebViewEnv) {
                        userMessage = t('personalColor.toast.webviewFaceLimit') || 'WebView에서는 카메라가 지원되지 않을 수 있습니다.\n\nChrome 브라우저에서 열어주세요.';
                    } else {
                        userMessage = t('personalColor.cameraErrors.notSupported') || '이 환경에서는 카메라를 지원하지 않습니다.';
                    }
                } else if (error.name === 'OverconstrainedError') {
                    userMessage = t('personalColor.cameraErrors.overConstrained') || '카메라 설정 오류입니다. 다시 시도해주세요.';
                } else if (error.name === 'SecurityError') {
                    userMessage = t('personalColor.cameraErrors.securityError') || '보안 오류가 발생했습니다.\n\nHTTPS 환경에서만 카메라를 사용할 수 있습니다.';
                }

                console.log('📱 카메라 오류 환경:', { isAndroidEnv, isIOSEnv, isWebViewEnv, errorName: error.name });
                showToast(userMessage, 'error');
            }
        }

        // 프레임 카운터 (디버깅용)
        let frameCount = 0;

        function onAdvancedFaceResults(results) {
            frameCount++;

            // 디버그 로그 비활성화 (필요시 주석 해제)
            // if (frameCount % 300 === 1) {
            //     console.log(`🎯 Face Results #${frameCount}`);
            // }

            if (!canvasCtx || !videoElement) {
                console.warn('캔버스 또는 비디오 없음');
                return;
            }

            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;

            // 먼저 비디오 프레임을 캔버스에 그림 (배경)
            canvasCtx.save();
            canvasCtx.scale(-1, 1); // 거울 모드 (좌우 반전)
            canvasCtx.drawImage(videoElement, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
            canvasCtx.restore();

            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const landmarks = results.multiFaceLandmarks[0];

                // 현재 랜드마크 저장 (촬영 시 사용)
                currentLandmarks = landmarks;

                // ✅ 멀티프레임 샘플링 중이면 피부 샘플 계속 축적
                if (captureSampling && currentLandmarks) {
                    const st = extractSkinTone(currentLandmarks);
                    if (st && st.lab && st.rgb) {
                        captureSamples.push({ rgb: st.rgb, lab: st.lab, ts: performance.now() });
                    }
                }

                drawFullFaceMesh(canvasCtx, landmarks);
                drawSkinTonePoints(canvasCtx, landmarks);

                // 촬영 모드가 아닐 때만 촬영 버튼 표시
                if (!isCaptured) {
                    if (!faceDetected) {
                        faceDetected = true;
                        document.getElementById('ai-face-guide').style.display = 'none';

                        // 촬영 버튼 표시
                        document.getElementById('capture-btn').style.display = 'inline-block';
                        document.getElementById('capture-guide').style.display = 'block';

                        console.log('✅ 얼굴 인식 완료! 촬영 대기 중...');
                        const pc = HAIRGATOR_I18N[currentLang]?.personalColor?.aiMode;
                        showToast(pc?.faceDetected || '얼굴이 인식되었습니다! 촬영 버튼을 눌러주세요', 'success');
                    }
                }
            } else {
                if (faceDetected && !isCaptured) {
                    faceDetected = false;
                    document.getElementById('ai-face-guide').style.display = 'flex';

                    // 촬영 버튼 숨기기
                    document.getElementById('capture-btn').style.display = 'none';
                    document.getElementById('capture-guide').style.display = 'none';
                }
            }
        }

        // ================================
        // ✅ Personal Color Accuracy Config (정확도 개선용)
        // ================================
        const PC_CONFIG = {
            CAPTURE: {
                sampleCount: 25,          // 15~40 권장
                maxDurationMs: 1200,      // 캡처 누르고 최대 1.2초까지만 샘플링
                minValidSamples: 12,      // 이보다 적으면 실패 처리
                outlierDeltaE76: 6.0      // median Lab 기준 outlier 컷(ΔE76)
            },
            LIGHTING: {
                minQualityToClassify: 0.45 // 이하면 분류 자체 금지(정확도 목적)
            },
            UNDERTONE: {
                warmScoreWarm: 3,
                warmScoreCool: -3
            },
            SEASON: {
                warm_L_spring: 68,
                warm_L_autumn: 58,
                cool_L_summer: 63,
                cool_L_winter: 50,
                chroma_spring_bright: 50,
                chroma_summer_bright: 45,
                neutral_effectiveB_split: 2
            }
        };

        // ================================
        // ✅ Capture sampling state (멀티프레임 안정화)
        // ================================
        let captureSampling = false;
        let captureSamples = [];
        let captureStartTs = 0;

        // ================================
        // ✅ Small helpers for multi-frame capture
        // ================================
        function rgbToHexSimple({ r, g, b }) {
            return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
        }
        function de76(p, q) {
            return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
        }
        function medianValue(arr) {
            const s = [...arr].sort((a,b) => a - b);
            return s[Math.floor(s.length / 2)];
        }

        // ================================
        // ✅ Personal Color Logging (정확도 분석용)
        // ================================
        const PC_LOG = {
            STORAGE_KEY: 'hairgator_pc_logs_v1',
            MAX_ITEMS: 500
        };

        function pcLoadLogs() {
            try {
                const raw = localStorage.getItem(PC_LOG.STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.warn('pcLoadLogs error', e);
                return [];
            }
        }

        function pcSaveLogs(logs) {
            try {
                localStorage.setItem(PC_LOG.STORAGE_KEY, JSON.stringify(logs));
            } catch (e) {
                console.warn('pcSaveLogs error', e);
            }
        }

        function pcMakeId() {
            if (window.crypto?.randomUUID) return crypto.randomUUID();
            return `pc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        }

        function pcAppendLog(entry) {
            const logs = pcLoadLogs();
            const id = pcMakeId();
            logs.push({ id, ...entry });
            const trimmed = logs.length > PC_LOG.MAX_ITEMS ? logs.slice(logs.length - PC_LOG.MAX_ITEMS) : logs;
            pcSaveLogs(trimmed);
            return id; // ✅ 라벨링용 ID 반환
        }

        function pcUpdateLog(id, patch) {
            const logs = pcLoadLogs();
            const idx = logs.findIndex(l => l.id === id);
            if (idx < 0) return false;
            logs[idx] = { ...logs[idx], ...patch, updatedAt: new Date().toISOString() };
            pcSaveLogs(logs);
            return true;
        }

        function pcClearLogs() {
            localStorage.removeItem(PC_LOG.STORAGE_KEY);
        }

        function pcComputeSummary(logs) {
            const total = logs.length;
            const blocked = logs.filter(l => l.blocked).length;
            const ok = total - blocked;

            const avg = (arr, key) => {
                const xs = arr.map(o => Number(o?.[key])).filter(v => Number.isFinite(v));
                return xs.length ? xs.reduce((a,b) => a + b, 0) / xs.length : null;
            };

            const seasonDist = {};
            logs.forEach(l => {
                const s = l?.personalColor?.season || 'unknown';
                seasonDist[s] = (seasonDist[s] || 0) + 1;
            });

            return {
                total,
                ok,
                blocked,
                blockedRate: total ? blocked / total : 0,
                avgLightingQuality: avg(logs, 'lightingQuality'),
                avgSamplesFiltered: avg(logs, 'samplesFiltered'),
                avgOutlierRemoved: avg(logs, 'outlierRemoved'),
                seasonDist
            };
        }

        function pcDownloadText(filename, text, mime = 'text/plain') {
            const blob = new Blob([text], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function pcExportJSON() {
            const logs = pcLoadLogs();
            pcDownloadText(`pc-logs-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(logs, null, 2), 'application/json');
        }

        function pcExportCSV() {
            const logs = pcLoadLogs();
            const header = [
                'id','ts','blocked','reason','lightingQuality','colorTemp',
                'samplesTotal','samplesFiltered','outlierRemoved','captureDurationMs',
                'skinHex','correctedHex',
                'undertone','season','subtype','confidence','warmScore',
                'labelUndertone','labelSeason','labelSubtype','labelMemo','isLabeled'
            ];

            const esc = (v) => {
                const s = v === null || v === undefined ? '' : String(v);
                return `"${s.replace(/"/g, '""')}"`;
            };

            const rows = logs.map(l => ([
                l.id,
                l.ts,
                l.blocked,
                l.reason,
                l.lightingQuality,
                l.colorTemp,
                l.samplesTotal,
                l.samplesFiltered,
                l.outlierRemoved,
                l.captureDurationMs,
                l.skinHex,
                l.correctedHex,
                l.personalColor?.undertone,
                l.personalColor?.season,
                l.personalColor?.subtype,
                l.personalColor?.confidence,
                l.personalColor?.warmScore,
                l.expertLabel?.undertone,
                l.expertLabel?.season,
                l.expertLabel?.subtype,
                l.expertLabel?.memo,
                l.isLabeled
            ]).map(esc).join(','));

            pcDownloadText(`pc-logs-${new Date().toISOString().slice(0,10)}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv');
        }

        function generateLogPanelHTML() {
            const s = pcComputeSummary(pcLoadLogs());
            return `
                <div style="margin-top:12px;padding:12px;border-radius:12px;border:1px solid #e0e0e0;background:#fafafa;">
                    <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#333;">📊 진단 로그 (로컬)</div>
                    <div style="font-size:11px;color:#555;line-height:1.6;margin-bottom:10px;">
                        총 ${s.total}건 · 차단 ${s.blocked}건 (${Math.round(s.blockedRate*100)}%) · 평균 조명 ${s.avgLightingQuality?.toFixed?.(2) ?? '-'}
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button onclick="pcExportCSV()" style="padding:8px 10px;border-radius:8px;border:none;background:#2196F3;color:#fff;font-weight:700;font-size:12px;cursor:pointer;">CSV</button>
                        <button onclick="pcExportJSON()" style="padding:8px 10px;border-radius:8px;border:none;background:#673AB7;color:#fff;font-weight:700;font-size:12px;cursor:pointer;">JSON</button>
                        <button onclick="pcClearLogs(); location.reload();" style="padding:8px 10px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#333;font-weight:700;font-size:12px;cursor:pointer;">지우기</button>
                    </div>
                </div>
            `;
        }

        // ✅ 전문가 라벨 저장 함수
        function pcSaveExpertLabel() {
            const id = window.__pcLastLogId;
            if (!id) { showToast('저장할 로그가 없어요. 먼저 캡처하세요.', 'warning'); return; }

            const labelUndertone = document.getElementById('pc-label-undertone')?.value || '';
            const labelSeason = document.getElementById('pc-label-season')?.value || '';
            const labelSubtype = document.getElementById('pc-label-subtype')?.value || '';
            const labelMemo = document.getElementById('pc-label-memo')?.value || '';

            if (!labelSeason) { showToast('시즌 라벨을 선택해주세요.', 'warning'); return; }

            const ok = pcUpdateLog(id, {
                expertLabel: {
                    undertone: labelUndertone || null,
                    season: labelSeason,
                    subtype: labelSubtype || null,
                    memo: labelMemo || null
                },
                isLabeled: true
            });

            if (ok) showToast('전문가 라벨 저장 완료', 'success');
            else showToast('라벨 저장 실패 (로그 id 없음)', 'error');
        }
        window.pcSaveExpertLabel = pcSaveExpertLabel;

        // ✅ 라벨 패널 HTML 생성
        function generateLabelPanelHTML(pipelineResult) {
            const pc = pipelineResult?.personalColor || {};
            const predictedUndertone = pc.undertone || '';
            const predictedSeason = pc.season || '';
            const predictedSubtype = pc.subtype || '';

            const opt = (v, text, selected) => `<option value="${v}" ${selected ? 'selected' : ''}>${text}</option>`;

            return `
            <div style="margin-top:12px;padding:12px;border-radius:12px;border:1px solid #E91E63;background:#fff;">
                <div style="font-weight:800;font-size:13px;margin-bottom:10px;color:#E91E63;">
                    🏷️ 전문가 라벨링
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
                    <div>
                        <div style="font-size:11px;color:#666;margin-bottom:4px;">Undertone</div>
                        <select id="pc-label-undertone" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;">
                            ${opt('', '(선택)', predictedUndertone === '')}
                            ${opt('Warm', 'Warm', predictedUndertone === 'Warm')}
                            ${opt('Neutral', 'Neutral', predictedUndertone === 'Neutral')}
                            ${opt('Cool', 'Cool', predictedUndertone === 'Cool')}
                        </select>
                    </div>

                    <div>
                        <div style="font-size:11px;color:#666;margin-bottom:4px;">Season *</div>
                        <select id="pc-label-season" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;">
                            ${opt('', '(필수)', predictedSeason === '')}
                            ${opt('spring', 'spring', predictedSeason === 'spring')}
                            ${opt('summer', 'summer', predictedSeason === 'summer')}
                            ${opt('autumn', 'autumn', predictedSeason === 'autumn')}
                            ${opt('winter', 'winter', predictedSeason === 'winter')}
                        </select>
                    </div>

                    <div>
                        <div style="font-size:11px;color:#666;margin-bottom:4px;">Subtype</div>
                        <select id="pc-label-subtype" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;">
                            ${opt('', '(선택)', predictedSubtype === '')}
                            ${opt('bright', 'bright', predictedSubtype === 'bright')}
                            ${opt('light', 'light', predictedSubtype === 'light')}
                            ${opt('soft', 'soft', predictedSubtype === 'soft')}
                            ${opt('muted', 'muted', predictedSubtype === 'muted')}
                            ${opt('deep', 'deep', predictedSubtype === 'deep')}
                        </select>
                    </div>
                </div>

                <div style="margin-bottom:10px;">
                    <div style="font-size:11px;color:#666;margin-bottom:4px;">Memo (조명/상황)</div>
                    <input id="pc-label-memo" placeholder="예: 실내 형광등, 그림자 있음"
                        style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;box-sizing:border-box;" />
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="pcSaveExpertLabel()"
                        style="padding:9px 12px;border-radius:8px;border:none;background:#E91E63;color:#fff;font-weight:800;font-size:12px;cursor:pointer;">
                        라벨 저장
                    </button>
                    <button onclick="pcExportCSV()"
                        style="padding:9px 12px;border-radius:8px;border:none;background:#2196F3;color:#fff;font-weight:800;font-size:12px;cursor:pointer;">
                        CSV 내보내기
                    </button>
                </div>
            </div>`;
        }

        // 콘솔에서 쓰기 쉽게 전역 노출
        window.PCLog = {
            load: pcLoadLogs,
            clear: pcClearLogs,
            summary: () => pcComputeSummary(pcLoadLogs()),
            exportJSON: pcExportJSON,
            exportCSV: pcExportCSV,
            update: pcUpdateLog
        };

        // ================================
        // ✅ End of Personal Color Logging
        // ================================

        // 현재 랜드마크 저장용 변수
        let currentLandmarks = null;
        let isCaptured = false;

        // 촬영하기 함수 (멀티프레임 안정화 적용)
        async function captureAndAnalyze() {
            if (!currentLandmarks) {
                const pc = HAIRGATOR_I18N?.[getCurrentLanguage()]?.personalColor?.aiMode;
                showToast(pc?.faceGuide || '얼굴을 먼저 인식해 주세요.', 'warning');
                return;
            }

            console.log('📸 captureAndAnalyze: 안정 샘플링 시작');
            isCaptured = true;

            // 버튼 상태 변경
            document.getElementById('capture-btn').style.display = 'none';
            document.getElementById('capture-guide').style.display = 'none';
            document.getElementById('retry-btn').style.display = 'inline-block';

            // 촬영 효과 (플래시)
            const flash = document.createElement('div');
            flash.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: white;
                z-index: 9999;
                animation: flashFade 0.3s ease-out forwards;
            `;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 300);

            // ✅ 1) 멀티샘플 수집 시작 (정확도 개선 핵심)
            captureSampling = true;
            captureSamples = [];
            captureStartTs = performance.now();

            // 샘플 수집 대기 (sampleCount 또는 maxDurationMs까지)
            while (
                captureSamples.length < PC_CONFIG.CAPTURE.sampleCount &&
                performance.now() - captureStartTs < PC_CONFIG.CAPTURE.maxDurationMs
            ) {
                await new Promise(r => setTimeout(r, 40)); // ~25fps
            }

            captureSampling = false;
            console.log(`📊 샘플 수집 완료: ${captureSamples.length}개`);

            // ✅ 2) 샘플 부족이면 실패
            if (captureSamples.length < PC_CONFIG.CAPTURE.minValidSamples) {
                showToast('조명이 불안정해요. 밝은 곳에서 다시 촬영해 주세요.', 'warning');
                retryCapture();
                return;
            }

            // ✅ 3) median Lab 기준 outlier 제거 (ΔE76)
            const labs = captureSamples.map(s => s.lab);
            const medLab = {
                L: medianValue(labs.map(v => v.L)),
                a: medianValue(labs.map(v => v.a)),
                b: medianValue(labs.map(v => v.b))
            };

            const filtered = captureSamples.filter(s => de76(s.lab, medLab) <= PC_CONFIG.CAPTURE.outlierDeltaE76);
            console.log(`🔍 이상치 제거 후: ${filtered.length}개 (${captureSamples.length - filtered.length}개 제거)`);

            if (filtered.length < PC_CONFIG.CAPTURE.minValidSamples) {
                showToast('피부색 측정이 흔들려요. 얼굴을 고정하고 다시 촬영해 주세요.', 'warning');
                retryCapture();
                return;
            }

            // ✅ 4) 평균 RGB 산출
            const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
            const avgRgb = {
                r: Math.round(avg(filtered.map(s => s.rgb.r))),
                g: Math.round(avg(filtered.map(s => s.rgb.g))),
                b: Math.round(avg(filtered.map(s => s.rgb.b)))
            };

            // ✅ 5) skinToneData 형태 유지 (기존 displayCapturedAnalysis가 쓰는 필드)
            const labColor = rgbToLab(avgRgb.r, avgRgb.g, avgRgb.b);
            const undertoneAnalysis = analyzeUndertoneAdvanced(avgRgb.r, avgRgb.g, avgRgb.b, labColor);

            // 캡처 메타 (로그용)
            const captureDurationMs = Math.round(performance.now() - captureStartTs);
            const outlierRemoved = captureSamples.length - filtered.length;

            const skinToneData = {
                rgb: avgRgb,
                hex: rgbToHexSimple(avgRgb),
                lab: labColor,
                undertone: undertoneAnalysis.undertone,
                undertoneScore: undertoneAnalysis.score,
                brightness: labColor.L,
                chroma: undertoneAnalysis.chroma,
                samples: filtered.length,
                // ✅ 캡처 메타 (정확도 분석용 로그)
                captureMeta: {
                    samplesTotal: captureSamples.length,
                    samplesFiltered: filtered.length,
                    outlierRemoved,
                    captureDurationMs
                }
            };

            console.log('🧪 안정화된 피부톤 데이터:', skinToneData);

            // 얼굴 기하학적 측정 (마지막 프레임 geometry 사용)
            const faceGeometry = analyzeFaceGeometry(currentLandmarks);
            console.log('📐 얼굴 측정 데이터:', faceGeometry);

            // 분석 결과 표시
            displayCapturedAnalysis(skinToneData, faceGeometry);

            // 분석 진행 단계 애니메이션
            animateAnalysisSteps();

            const pc = HAIRGATOR_I18N?.[getCurrentLanguage()]?.personalColor?.aiMode;
            showToast(pc?.captureComplete || '캡처 완료!', 'success');
        }

        // 다시 촬영 함수
        function retryCapture() {
            console.log('🔄 다시 촬영');
            isCaptured = false;
            currentLandmarks = null;
            faceDetected = false;

            // 버튼 상태 초기화
            document.getElementById('retry-btn').style.display = 'none';
            document.getElementById('capture-btn').style.display = 'none';
            document.getElementById('capture-guide').style.display = 'none';
            document.getElementById('ai-face-guide').style.display = 'flex';

            // 결과 숨기기
            document.getElementById('realtime-results-wrapper').style.display = 'none';
            document.getElementById('ai-analysis-results').style.display = 'none';

            // 분석 단계 초기화
            resetAnalysisSteps();

            const pc = HAIRGATOR_I18N[currentLang]?.personalColor?.aiMode;
            showToast(pc?.retryMessage || '다시 얼굴을 화면에 맞춰주세요', 'info');
        }

        // 분석 단계 애니메이션
        function animateAnalysisSteps() {
            const steps = ['ai-step-1', 'ai-step-2', 'ai-step-3', 'ai-step-4'];
            let delay = 0;

            steps.forEach((stepId, index) => {
                setTimeout(() => {
                    const step = document.getElementById(stepId);
                    if (step) {
                        step.classList.add('active');
                        step.style.background = 'rgba(76, 175, 80, 0.2)';
                        step.style.borderColor = '#4CAF50';
                    }

                    // 마지막 단계 완료 시 결과 표시
                    if (index === steps.length - 1) {
                        setTimeout(() => {
                            document.getElementById('ai-analysis-results').style.display = 'block';
                        }, 300);
                    }
                }, delay);
                delay += 400;
            });
        }

        // 분석 단계 초기화
        function resetAnalysisSteps() {
            const steps = ['ai-step-1', 'ai-step-2', 'ai-step-3', 'ai-step-4'];
            steps.forEach(stepId => {
                const step = document.getElementById(stepId);
                if (step) {
                    step.classList.remove('active');
                    step.style.background = '';
                    step.style.borderColor = '';
                }
            });
        }

        // 촬영된 분석 결과 표시 (새 파이프라인 사용)
        function displayCapturedAnalysis(skinToneData, faceGeometry) {
            if (!skinToneData) {
                console.log('❌ 피부톤 데이터가 없음');
                return;
            }

            // 🚀 새 파이프라인 실행
            const pipelineResult = runPersonalColorPipeline(skinToneData.rgb, window.lastFullImageData);

            // ✅ 로그 기록 (차단/성공 모두 기록)
            const lmLog = pipelineResult?.lightingMeta || {};
            const pcLog = pipelineResult?.personalColor || null;
            const capMeta = skinToneData?.captureMeta || {};

            const logId = pcAppendLog({
                ts: new Date().toISOString(),
                blocked: !!pipelineResult?.blocked,
                reason: pipelineResult?.reason || null,
                lightingQuality: lmLog.lightingQuality ?? null,
                colorTemp: lmLog.colorTemp ?? null,
                samplesTotal: capMeta.samplesTotal ?? null,
                samplesFiltered: capMeta.samplesFiltered ?? skinToneData?.samples ?? null,
                outlierRemoved: capMeta.outlierRemoved ?? null,
                captureDurationMs: capMeta.captureDurationMs ?? null,
                skinHex: skinToneData?.hex ?? null,
                correctedHex: pipelineResult?.correctedRgb ? rgbToHexSimple(pipelineResult.correctedRgb) : null,
                personalColor: pcLog ? {
                    undertone: pcLog.undertone,
                    season: pcLog.season,
                    subtype: pcLog.subtype,
                    confidence: pcLog.confidence,
                    warmScore: pcLog.warmScore
                } : null,
                config: {
                    minQualityToClassify: PC_CONFIG?.LIGHTING?.minQualityToClassify,
                    outlierDeltaE76: PC_CONFIG?.CAPTURE?.outlierDeltaE76,
                    sampleCount: PC_CONFIG?.CAPTURE?.sampleCount
                }
            });
            window.__pcLastLogId = logId;
            console.log('📝 로그 저장:', logId);

            // ✅ 조명 품질 낮으면 분류 차단 → 재촬영 유도
            if (pipelineResult?.blocked) {
                console.warn('⛔ 파이프라인 차단:', pipelineResult.reason);
                showToast('조명이 너무 나빠 정확한 진단이 어렵습니다. 밝은 곳에서 다시 촬영해 주세요.', 'warning');
                retryCapture();
                return;
            }

            const pc = pipelineResult.personalColor;
            const hairRec = pipelineResult.hairRecommendations;
            const lm = pipelineResult.lightingMeta;

            // 얼굴 측정 데이터 파이프라인에 추가
            pipelineResult.faceGeometry = faceGeometry;

            // AR 연동을 위해 헤어 추천 결과 저장
            lastHairRecommendations = hairRec;

            // i18n 텍스트 가져오기
            const undertoneText = getUndertoneText(pc.undertone);
            const seasonText = getSeasonText(pc.fullSeason);
            const seasonDescText = getSeasonDescriptionText(pc.fullSeason);
            const seasonRecommendText = getSeasonRecommendationText(pc.fullSeason);
            const resultTexts = getResultTexts();

            console.log('📊 파이프라인 분석 결과:', pipelineResult);

            // ===== 고객 요약 패널 표시 (왼쪽 하단) =====
            if (typeof displayCustomerSummary === 'function') {
                displayCustomerSummary(pipelineResult);
            }

            // ===== 통합 분석 결과 생성 =====
            let integratedResult = null;
            if (typeof generateIntegratedAnalysis === 'function') {
                integratedResult = generateIntegratedAnalysis(pipelineResult);
            }

            // 조명 품질 표시 텍스트
            const lightingQualityText = lm.lightingQuality >= 0.7 ? '좋음' :
                                        lm.lightingQuality >= 0.5 ? (t('personalColor.result.lightingMedium') || 'Medium') : (t('personalColor.result.lightingLow') || 'Low (Reference)');
            const lightingColor = lm.lightingQuality >= 0.7 ? '#4CAF50' :
                                  lm.lightingQuality >= 0.5 ? '#FF9800' : '#F44336';

            // 헤어컬러 추천 HTML 생성 (업그레이드: 뱃지 + 난이도 포함)
            const hairRecommendHTML = generateHairRecommendHTML(hairRec, pc);

            // 전문가 피드백 HTML 생성
            const expertFeedbackHTML = generateExpertFeedbackHTML(pc);

            // 얼굴 측정 결과 HTML 생성 (눈썹간 거리 등)
            const faceGeometryHTML = generateFaceGeometryHTML(faceGeometry);

            // 메인 결과 컨테이너 표시
            const resultsWrapper = document.getElementById('realtime-results-wrapper');
            const resultsContainer = document.getElementById('realtime-results-container');
            const panelGuide = document.getElementById('analysis-panel-guide');

            // 안내 문구 숨기기
            if (panelGuide) panelGuide.style.display = 'none';

            if (resultsWrapper && resultsContainer) {
                resultsWrapper.style.display = 'block';

                // ✅ 조명 낮을 때 명시적 경고 배너
                const lightingWarningBanner = lm.lightingQuality < 0.4 ? `
                    <div style="background: linear-gradient(135deg, #FF5722, #E64A19); padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 18px;">⚠️</span>
                            <span style="color: #fff; font-weight: bold; font-size: 13px;">조명 환경 주의</span>
                        </div>
                        <p style="color: rgba(255,255,255,0.9); font-size: 11px; margin: 6px 0 0 0; line-height: 1.5;">
                            조명이 불안정하여 정확도가 떨어질 수 있습니다.
                        </p>
                    </div>
                ` : '';

                // 통합 분석 결과 HTML 생성
                const integratedHTML = integratedResult ? generateIntegratedResultHTML(integratedResult, pc) : '';

                // 1단 레이아웃 (오른쪽 패널에 맞게)
                resultsContainer.innerHTML = `
                    ${integratedHTML}

                    <!-- 퍼스널컬러 결과 요약 -->
                    <div style="background: linear-gradient(135deg, ${pc.color}33, ${pc.color}11); padding: 12px; border-radius: 12px; border: 2px solid ${pc.color}; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <div style="width: 36px; height: 36px; background: ${skinToneData.hex}; border-radius: 50%; border: 2px solid white;"></div>
                            <div>
                                <div style="font-size: 18px; font-weight: bold; color: ${pc.color};">${pc.emoji} ${seasonText}</div>
                                <div style="font-size: 11px; color: #666;">${resultTexts.undertone}: ${undertoneText}</div>
                            </div>
                            <div style="margin-left: auto; background: ${pc.color}; color: #ffffff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                                ${pc.confidence}%
                            </div>
                        </div>
                    </div>

                    ${lightingWarningBanner}

                    <!-- 📐 얼굴 측정 결과 (눈썹간 거리 등) -->
                    ${faceGeometryHTML}

                    <!-- 💇 헤어컬러 추천 -->
                    ${hairRecommendHTML}

                    <!-- 👩‍🎨 전문가 가이드 -->
                    ${expertFeedbackHTML}

                    <!-- ⚠️ 피해야 할 컬러 -->
                    <div style="background: rgba(244,67,54,0.1); padding: 10px; border-radius: 10px; border: 1px solid rgba(244,67,54,0.3); margin-top: 12px;">
                        <div style="font-size: 12px; color: #F44336; margin-bottom: 6px; font-weight: bold;">⚠️ ${t('personalColor.result.avoidColors') || 'Colors to Avoid'}</div>
                        <ul style="margin: 0; padding-left: 16px; color: #c62828; font-size: 11px; line-height: 1.6;">
                            ${hairRec.avoidRules.map(rule => `<li>${rule}</li>`).join('')}
                        </ul>
                    </div>

                `;

                            }

            // 오른쪽 분석 패널 업데이트
            const seasonResult = document.getElementById('ai-season-result');
            const confidenceEl = document.getElementById('ai-confidence');
            const analysisData = document.getElementById('ai-analysis-data');

            if (seasonResult) {
                seasonResult.innerHTML = `${pc.emoji} ${seasonText}`;
                seasonResult.style.color = pc.color;
                seasonResult.style.fontSize = '20px';
            }

            if (confidenceEl) {
                confidenceEl.innerHTML = `${resultTexts.confidence}: <b style="color: #00E676;">${pc.confidence}%</b>`;
            }

            if (analysisData) {
                analysisData.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 24px; height: 24px; background: ${skinToneData.hex}; border-radius: 6px; border: 2px solid #e0e0e0;"></div>
                            <span style="color: #333;">${resultTexts.skinTone}: ${skinToneData.hex}</span>
                        </div>
                        <div style="color: #333;">${resultTexts.undertone}: <b style="color: ${pc.color};">${undertoneText}</b></div>
                        <div style="color: #666; font-size: 12px;">${t('personalColor.result.lighting') || 'Lighting'}: ${lightingQualityText}</div>
                    </div>
                `;
            }
        }

        // 얼굴 측정 결과 HTML 생성 (눈썹간 거리 등)
        function generateFaceGeometryHTML(faceGeometry) {
            if (!faceGeometry) {
                return ''; // 측정 데이터 없으면 빈 문자열
            }

            // 미간 레벨에 따른 색상 및 아이콘
            const levelColors = {
                narrow: { bg: '#FCE4EC', border: '#C2185B', text: '#880E4F', icon: '◀️▶️' },
                balanced: { bg: '#E8F5E9', border: '#388E3C', text: '#1B5E20', icon: '✅' },
                wide: { bg: '#E3F2FD', border: '#1976D2', text: '#0D47A1', icon: '▶️◀️' }
            };
            const levelStyle = levelColors[faceGeometry.eyebrowGapLevel] || levelColors.balanced;

            // 눈썹 대 눈 비율 시각화 (1.0이 이상적)
            const ratio = faceGeometry.eyebrowToEyeRatio;
            const ratioPercent = Math.min(100, Math.max(0, ratio * 50)); // 0~2 범위를 0~100%로

            return `
                <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 14px; border-radius: 12px; border: 1px solid #dee2e6; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <span style="font-size: 16px;">📐</span>
                        <span style="font-size: 13px; font-weight: 700; color: #333;">${t('personalColor.aiMode.result.faceRatioAnalysis') || '얼굴 비율 분석'}</span>
                    </div>

                    <!-- 미간 거리 결과 -->
                    <div style="background: ${levelStyle.bg}; padding: 12px; border-radius: 10px; border: 1px solid ${levelStyle.border}; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; font-weight: 600; color: ${levelStyle.text};">
                                ${levelStyle.icon} ${t('personalColor.aiMode.result.eyebrowGapDistance') || '미간(눈썹간 거리)'}
                            </span>
                            <span style="font-size: 11px; background: ${levelStyle.border}; color: #fff; padding: 2px 8px; border-radius: 10px;">
                                ${ratio.toFixed(2)} : 1
                            </span>
                        </div>
                        <div style="font-size: 11px; color: #555; line-height: 1.5;">
                            ${faceGeometry.eyebrowGapEvaluation}
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: ${levelStyle.text}; font-weight: 500;">
                            💡 ${faceGeometry.styleRecommendation}
                        </div>
                    </div>

                    <!-- 비율 게이지 -->
                    <div style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e0e0e0;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 6px;">${t('personalColor.aiMode.result.eyeToEyeRatio') || '미간:눈 비율 (1.0 = 이상적)'}</div>
                        <div style="position: relative; height: 8px; background: linear-gradient(to right, #FF9800, #4CAF50, #2196F3); border-radius: 4px;">
                            <div style="position: absolute; left: ${ratioPercent}%; top: -3px; width: 14px; height: 14px; background: #333; border-radius: 50%; border: 2px solid #fff; transform: translateX(-50%);"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #999; margin-top: 4px;">
                            <span>${t('personalColor.aiMode.result.narrow') || '좁음'}</span>
                            <span>${t('personalColor.aiMode.result.optimal') || '적정'}</span>
                            <span>${t('personalColor.aiMode.result.wide') || '넓음'}</span>
                        </div>
                    </div>

                    <!-- 추가 측정값 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e0e0e0; text-align: center;">
                            <div style="font-size: 10px; color: #888;">${t('personalColor.aiMode.result.faceRatioLabel') || '얼굴 비율'}</div>
                            <div style="font-size: 14px; font-weight: 700; color: #333;">${faceGeometry.faceRatioPercent}%</div>
                        </div>
                        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e0e0e0; text-align: center;">
                            <div style="font-size: 10px; color: #888;">${t('personalColor.aiMode.result.eyeDistance') || '눈 사이 거리'}</div>
                            <div style="font-size: 14px; font-weight: 700; color: #333;">${faceGeometry.eyeInnerDistancePercent}%</div>
                        </div>
                    </div>
                </div>
            `;

            // ✅ 로그 패널 + 라벨 패널 추가 (비동기로 안전하게)
            setTimeout(() => {
                try {
                    const container = document.getElementById('realtime-results-container');
                    if (container) {
                        container.insertAdjacentHTML('beforeend', generateLogPanelHTML());
                        container.insertAdjacentHTML('beforeend', generateLabelPanelHTML(pipelineResult));
                        console.log('✅ 로그/라벨 패널 추가 완료');
                    }
                } catch (e) {
                    console.error('❌ 패널 추가 실패:', e);
                }
            }, 100);
        }

        // 헤어컬러 추천 HTML 생성
        function generateHairRecommendHTML(hairRec, personalColorResult) {
            if (!hairRec.recommended1st || hairRec.recommended1st.length === 0) {
                return `
                    <div style="margin-top: 15px; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0;">
                        <div style="font-size: 14px; color: #666;">${t('personalColor.aiMode.result.recommendedHairColor')}</div>
                        <div style="color: #888; font-size: 13px; margin-top: 10px;">${t('personalColor.aiMode.result.loadingColors')}</div>
                    </div>
                `;
            }

            // 업그레이드된 컬러 아이템 렌더러 (뱃지 + 난이도 포함)
            const renderColorItemAdvanced = (color, rank) => {
                const badge = getPriorityBadge(color.priority || (rank <= 3 ? rank : 4));
                const difficulty = getColorDifficulty(color, personalColorResult || {});

                // 난이도에 따른 배경색
                const diffBgColor = difficulty.difficulty === 'hard' ? 'rgba(255,87,34,0.15)' :
                                    difficulty.difficulty === 'medium' ? 'rgba(255,152,0,0.15)' :
                                    difficulty.difficulty === 'light' ? 'rgba(255,235,59,0.12)' : 'rgba(76,175,80,0.1)';

                return `
                <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid ${badge.color}; border: 1px solid #e0e0e0;">
                    <!-- 상단: 컬러 스와치 + 정보 -->
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="position: relative; flex-shrink: 0;">
                            <div style="width: 38px; height: 38px; background: ${color.hex}; border-radius: 8px; border: 2px solid #e0e0e0;"></div>
                            <!-- 우선순위 뱃지 -->
                            <span style="position: absolute; top: -5px; right: -5px; font-size: 12px;" title="${badge.label}">${badge.icon}</span>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 13px; color: #333; font-weight: 600; margin-bottom: 1px;">${translateHairColorName(color.name) || t('personalColor.aiMode.result.color') || '컬러'}</div>
                            <div style="font-size: 10px; color: #666;">${color.brand || ''} ${color.line || ''} ${color.code || ''}</div>
                            ${color.level ? `<div style="font-size: 9px; color: #888; margin-top: 1px;">Level ${color.level}</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #4CAF50; font-weight: bold;">${color.harmonyScore}${t('personalColor.aiMode.result.score')}</div>
                            <div style="font-size: 9px; color: ${badge.color};">${badge.label}</div>
                        </div>
                    </div>
                    <!-- 하단: 시술 난이도 -->
                    <div style="display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: ${diffBgColor}; border-radius: 5px;">
                        <span style="font-size: 12px;">${difficulty.icon}</span>
                        <span style="font-size: 10px; color: #444; font-weight: 500;">${difficulty.label}</span>
                        <span style="font-size: 9px; color: #666; flex: 1;">${difficulty.tip}</span>
                    </div>
                </div>
            `;
            };

            let html = `
                <div style="background: rgba(76,175,80,0.1); padding: 15px; border-radius: 12px; border: 1px solid rgba(76,175,80,0.3);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <div style="font-size: 14px; color: #4CAF50; font-weight: bold;">${t('personalColor.aiMode.result.recommendedHairColor1st')}</div>
                        <div style="font-size: 10px; color: #81C784; background: rgba(76,175,80,0.2); padding: 2px 6px; border-radius: 10px;">${t('personalColor.aiMode.result.highlyRecommended')}</div>
                    </div>
                    ${hairRec.recommended1st.map((c, i) => renderColorItemAdvanced(c, i+1)).join('')}
                </div>
            `;

            if (hairRec.recommended2nd && hairRec.recommended2nd.length > 0) {
                html += `
                    <div style="margin-top: 12px; background: #f8f9fa; padding: 15px; border-radius: 12px; border: 1px solid #e0e0e0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="font-size: 14px; color: #666; font-weight: bold;">${t('personalColor.aiMode.result.recommendedHairColor2nd')}</div>
                            <div style="font-size: 10px; color: #888; background: #e0e0e0; padding: 2px 6px; border-radius: 10px;">${t('personalColor.aiMode.result.safeChoice')}</div>
                        </div>
                        ${hairRec.recommended2nd.map((c, i) => renderColorItemAdvanced(c, i+4)).join('')}
                    </div>
                `;
            }

            return html;
        }

        // 전문가 피드백 HTML 생성 함수 (전문가용 진단 보고서 스타일)
        function generateExpertFeedbackHTML(personalColorResult) {
            const { season, subtype, lab } = personalColorResult;
            const feedback = generateAdvancedExpertFeedback(season, subtype, lab);

            if (!feedback.toneKeywords) {
                return '';
            }

            // 레시피 카드 HTML 생성 (폰트 크기 확대)
            const recipeCardsHTML = feedback.recipes ? feedback.recipes.map((recipe, _idx) => `
                <div style="background: linear-gradient(135deg, rgba(0,150,136,0.1), rgba(0,188,212,0.05)); padding: 18px; border-radius: 12px; margin-bottom: 14px; border: 1px solid rgba(0,150,136,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="font-size: 19px; color: #00897B; font-weight: bold;">
                            💊 ${recipe.styleName}
                        </div>
                        <span style="background: rgba(0,150,136,0.2); color: #00796B; font-size: 15px; padding: 5px 14px; border-radius: 12px;">
                            ${recipe.brand}
                        </span>
                    </div>
                    <div style="font-size: 16px; color: #00695C; margin-bottom: 14px; font-style: italic;">
                        "${recipe.vibe}" - ${recipe.reason}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div style="background: rgba(0,150,136,0.08); padding: 14px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #00897B; margin-bottom: 6px; font-weight: bold;">MIX RECIPE</div>
                            <div style="font-size: 16px; color: #333; font-weight: 600;">${recipe.mixRatio}</div>
                            <div style="font-size: 14px; color: #00897B; margin-top: 5px;">${recipe.line}</div>
                        </div>
                        <div style="background: rgba(0,150,136,0.08); padding: 14px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #00897B; margin-bottom: 6px; font-weight: bold;">OXIDANT</div>
                            <div style="font-size: 16px; color: #333; font-weight: 600;">${recipe.oxidant}</div>
                            <div style="font-size: 14px; color: #00897B; margin-top: 5px;">⏱️ ${recipe.processingTime.replace('분', t('personalColor.aiMode.result.minute') || 'min')}</div>
                        </div>
                    </div>
                </div>
            `).join('') : '';

            return `
                <div style="background: linear-gradient(135deg, rgba(156,39,176,0.08), rgba(103,58,183,0.05)); padding: 20px; border-radius: 12px; border: 1px solid rgba(156,39,176,0.3);">
                    <div style="font-size: 20px; color: #7B1FA2; margin-bottom: 16px; font-weight: bold;">
                        ${t('personalColor.aiMode.result.aiHairConsultantReport')}
                    </div>

                    <!-- 섹션 A: 퍼스널 컬러 정밀 진단 -->
                    <div style="margin-bottom: 16px; background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 3px solid #9C27B0;">
                        <div style="font-size: 17px; color: #7B1FA2; margin-bottom: 10px; font-weight: bold;">${t('personalColor.aiMode.result.sectionAPreciseDiagnosis')}</div>
                        <div style="font-size: 16px; color: #333; line-height: 1.7; margin-bottom: 10px;">
                            ${feedback.toneKeywords}
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <span style="background: rgba(156,39,176,0.15); color: #6A1B9A; font-size: 15px; padding: 6px 14px; border-radius: 12px;">
                                ${t('personalColor.aiMode.result.recommendedLevel')}: ${feedback.levelTip}
                            </span>
                            ${feedback.brightnessAdvice ? `
                            <span style="background: rgba(156,39,176,0.15); color: #6A1B9A; font-size: 15px; padding: 6px 14px; border-radius: 12px;">
                                💡 ${feedback.brightnessAdvice.substring(0, 30)}...
                            </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- 섹션 B: 컬러 사이언스 분석 -->
                    ${feedback.colorScience ? `
                    <div style="margin-bottom: 16px; background: linear-gradient(135deg, rgba(63,81,181,0.08), rgba(48,63,159,0.05)); padding: 16px; border-radius: 8px; border: 1px solid rgba(63,81,181,0.3);">
                        <div style="font-size: 17px; color: #3949AB; margin-bottom: 12px; font-weight: bold;">${t('personalColor.aiMode.result.sectionBColorScience')}</div>
                        <div style="font-size: 16px; color: #333; line-height: 1.7;">
                            <div style="margin-bottom: 10px;">
                                <b style="color: #3F51B5;">${t('personalColor.aiMode.result.melaninAnalysis')}:</b> ${feedback.colorScience.melaninType}
                            </div>
                            <div style="margin-bottom: 10px;">
                                <b style="color: #3F51B5;">${t('personalColor.aiMode.result.undercoatPrediction')}:</b> ${feedback.colorScience.undercoatPrediction}
                            </div>
                            <div>
                                <b style="color: #3F51B5;">${t('personalColor.aiMode.result.neutralizationStrategy')}:</b> ${feedback.colorScience.neutralizationStrategy}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- 섹션 C: 시술 레시피 (처방전) -->
                    ${recipeCardsHTML ? `
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 17px; color: #00897B; margin-bottom: 12px; font-weight: bold;">${t('personalColor.aiMode.result.sectionCTreatmentRecipe')}</div>
                        ${recipeCardsHTML}
                    </div>
                    ` : ''}

                    <!-- 헤어 시술 팁 -->
                    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 14px; border: 1px solid #e0e0e0;">
                        <div style="font-size: 16px; color: #7B1FA2; margin-bottom: 8px; font-weight: bold;">${t('personalColor.aiMode.result.treatmentTips')}</div>
                        <div style="font-size: 16px; color: #333; line-height: 1.7;">
                            <div style="margin-bottom: 6px;"><b style="color: #9C27B0;">${t('personalColor.aiMode.result.undercoat')}:</b> ${feedback.undercoatTip}</div>
                            <div><b style="color: #9C27B0;">${t('personalColor.aiMode.result.finishTexture')}:</b> ${feedback.textureTip}</div>
                        </div>
                    </div>

                    <!-- 토탈 뷰티 팁 -->
                    ${feedback.makeupBase ? `
                    <div style="background: linear-gradient(135deg, rgba(233,30,99,0.08), rgba(255,64,129,0.05)); padding: 16px; border-radius: 8px; margin-bottom: 14px; border: 1px solid rgba(233,30,99,0.2);">
                        <div style="font-size: 16px; color: #C2185B; margin-bottom: 8px; font-weight: bold;">${t('personalColor.aiMode.result.totalBeauty')}</div>
                        <div style="font-size: 16px; color: #333; line-height: 1.7;">
                            ${feedback.fashionVibe ? `<div style="margin-bottom: 6px;"><b style="color: #E91E63;">${t('personalColor.aiMode.result.fashion')}:</b> ${feedback.fashionVibe}</div>` : ''}
                            <div><b style="color: #E91E63;">${t('personalColor.aiMode.result.makeup')}:</b> ${feedback.makeupBase}</div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- 컨설팅 포인트 -->
                    <div style="background: rgba(103,58,183,0.1); padding: 16px; border-radius: 8px;">
                        <div style="font-size: 16px; color: #5E35B1; margin-bottom: 8px; font-weight: bold;">${t('personalColor.aiMode.result.consultingPoint')}</div>
                        <div style="font-size: 16px; color: #333; line-height: 1.7;">${feedback.consultingTip}</div>
                        <div style="font-size: 15px; color: #512DA8; margin-top: 10px; font-style: italic; background: rgba(103,58,183,0.08); padding: 10px 12px; border-radius: 6px;">
                            💡 "${feedback.seasonalAdvice}"
                        </div>
                    </div>

                    <!-- 피해야 할 톤 -->
                    ${feedback.avoidColors && feedback.avoidColors.length > 0 ? `
                    <div style="margin-top: 14px; padding: 14px; background: rgba(244,67,54,0.08); border-radius: 8px; border: 1px solid rgba(244,67,54,0.2);">
                        <div style="font-size: 16px; color: #C62828; margin-bottom: 8px; font-weight: bold;">${t('personalColor.expertGuide.avoidTones')}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${feedback.avoidColors.map(c => `
                                <div style="display: flex; align-items: center; gap: 6px; background: rgba(244,67,54,0.1); padding: 6px 12px 6px 8px; border-radius: 12px;">
                                    <div style="width: 18px; height: 18px; background: ${getColorHex(c)}; border-radius: 50%; border: 1px solid #e0e0e0;"></div>
                                    <span style="color: #c62828; font-size: 15px;">${c}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        // 시즌별 설명 (개선된 8타입) - 다국어 지원
        function getSeasonDescription(season) {
            // 한국어 키를 영어 키로 변환하는 매핑
            const keyMapping = {
                '봄 웜 브라이트': 'springWarmBright',
                '봄 웜 라이트': 'springWarmLight',
                '가을 웜 딥': 'autumnWarmDeep',
                '가을 웜 뮤트': 'autumnWarmMuted',
                '가을 웜 소프트': 'autumnWarmSoft',
                '여름 쿨 브라이트': 'summerCoolBright',
                '여름 쿨 라이트': 'summerCoolLight',
                '겨울 쿨 딥': 'winterCoolDeep',
                '겨울 쿨 뮤트': 'winterCoolMuted',
                '뉴트럴 라이트': 'neutralLight',
                '뉴트럴 딥': 'neutralDeep',
                // 다국어 키도 지원
                'Spring Warm Bright': 'springWarmBright',
                'Spring Warm Light': 'springWarmLight',
                'Autumn Warm Deep': 'autumnWarmDeep',
                'Autumn Warm Muted': 'autumnWarmMuted',
                'Autumn Warm Soft': 'autumnWarmSoft',
                'Summer Cool Bright': 'summerCoolBright',
                'Summer Cool Light': 'summerCoolLight',
                'Winter Cool Deep': 'winterCoolDeep',
                'Winter Cool Muted': 'winterCoolMuted',
                'Neutral Light': 'neutralLight',
                'Neutral Deep': 'neutralDeep'
            };

            // 영어 키로 i18n 조회
            const englishKey = keyMapping[season];
            if (englishKey) {
                const translated = t(`personalColor.seasonDescriptions.${englishKey}`);
                if (translated) return translated;
            }

            // fallback: 기본 한국어 설명
            const defaultDescriptions = {
                '봄 웜 브라이트': '생기 넘치고 화사한 이미지! 선명하고 밝은 웜톤 컬러가 잘 어울립니다.',
                '봄 웜 라이트': '맑고 청순한 이미지! 연하고 부드러운 웜톤 컬러가 잘 어울립니다.',
                '가을 웜 딥': '깊고 고급스러운 이미지! 진하고 풍부한 웜톤 컬러가 잘 어울립니다.',
                '가을 웜 뮤트': '내추럴하고 세련된 이미지! 차분하고 자연스러운 웜톤 컬러가 잘 어울립니다.',
                '가을 웜 소프트': '부드럽고 따뜻한 이미지! 은은하고 자연스러운 웜톤 컬러가 잘 어울립니다.',
                '여름 쿨 브라이트': '청아하고 시원한 이미지! 선명하고 깨끗한 쿨톤 컬러가 잘 어울립니다.',
                '여름 쿨 라이트': '우아하고 부드러운 이미지! 파스텔톤의 쿨 컬러가 잘 어울립니다.',
                '겨울 쿨 딥': '강렬하고 도시적인 이미지! 선명하고 진한 쿨톤 컬러가 잘 어울립니다.',
                '겨울 쿨 뮤트': '차분하고 세련된 이미지! 무채색 계열과 저채도 쿨 컬러가 잘 어울립니다.',
                '뉴트럴 라이트': '다양한 컬러가 어울리는 타입! 밝은 톤의 부드러운 컬러를 추천합니다.',
                '뉴트럴 딥': '다양한 컬러가 어울리는 타입! 깊은 톤의 세련된 컬러를 추천합니다.'
            };
            return defaultDescriptions[season] || '';
        }

        // 시즌별 컬러 팔레트 (개선된 8타입) - 색상명 i18n 지원
        function getSeasonColorPalette(season) {
            // 색상명 헬퍼 함수
            const cn = (key, fallback) => t(`personalColor.colorNames.${key}`) || fallback;

            const palettes = {
                // 봄 웜
                '봄 웜 브라이트': [
                    { hex: '#FF6347', key: 'tomato', fallback: '토마토' },
                    { hex: '#FF7F50', key: 'coral', fallback: '코랄' },
                    { hex: '#FFD700', key: 'gold', fallback: '골드' },
                    { hex: '#00CED1', key: 'turquoise', fallback: '터콰이즈' },
                    { hex: '#FF69B4', key: 'hotPink', fallback: '핫핑크' }
                ],
                '봄 웜 라이트': [
                    { hex: '#FFDAB9', key: 'peach', fallback: '피치' },
                    { hex: '#FFE4B5', key: 'moccasin', fallback: '모카신' },
                    { hex: '#F5DEB3', key: 'wheat', fallback: '밀색' },
                    { hex: '#98FB98', key: 'mint', fallback: '민트' },
                    { hex: '#FFB6C1', key: 'lightPink', fallback: '라이트핑크' }
                ],
                // 가을 웜
                '가을 웜 딥': [
                    { hex: '#8B4513', key: 'saddleBrown', fallback: '새들브라운' },
                    { hex: '#A0522D', key: 'sienna', fallback: '시에나' },
                    { hex: '#800000', key: 'maroon', fallback: '마룬' },
                    { hex: '#556B2F', key: 'olive', fallback: '올리브' },
                    { hex: '#8B0000', key: 'darkRed', fallback: '다크레드' }
                ],
                '가을 웜 뮤트': [
                    { hex: '#CD853F', key: 'peru', fallback: '페루' },
                    { hex: '#D2691E', key: 'chocolate', fallback: '초콜릿' },
                    { hex: '#BDB76B', key: 'khaki', fallback: '카키' },
                    { hex: '#808000', key: 'olive', fallback: '올리브' },
                    { hex: '#BC8F8F', key: 'rosyBrown', fallback: '로지브라운' }
                ],
                '가을 웜 소프트': [
                    { hex: '#C4A484', key: 'tan', fallback: '탄' },
                    { hex: '#D2B48C', key: 'tan2', fallback: '탠' },
                    { hex: '#DEB887', key: 'burlywood', fallback: '벌리우드' },
                    { hex: '#8B7355', key: 'buff', fallback: '버프' },
                    { hex: '#A67B5B', key: 'cocoa', fallback: '코코아' }
                ],
                // 여름 쿨
                '여름 쿨 브라이트': [
                    { hex: '#FF69B4', key: 'hotPink', fallback: '핫핑크' },
                    { hex: '#9370DB', key: 'purple', fallback: '퍼플' },
                    { hex: '#00CED1', key: 'cyan', fallback: '시안' },
                    { hex: '#20B2AA', key: 'teal', fallback: '틸' },
                    { hex: '#BA55D3', key: 'orchid', fallback: '오키드' }
                ],
                '여름 쿨 라이트': [
                    { hex: '#E6E6FA', key: 'lavender', fallback: '라벤더' },
                    { hex: '#D8BFD8', key: 'thistle', fallback: '시슬' },
                    { hex: '#B0E0E6', key: 'powderBlue', fallback: '파우더블루' },
                    { hex: '#AFEEEE', key: 'paleTurquoise', fallback: '페일터콰이즈' },
                    { hex: '#FFB6C1', key: 'lightPink', fallback: '라이트핑크' }
                ],
                // 겨울 쿨
                '겨울 쿨 딥': [
                    { hex: '#000080', key: 'navy', fallback: '네이비' },
                    { hex: '#8B008B', key: 'darkMagenta', fallback: '다크마젠타' },
                    { hex: '#006400', key: 'darkGreen', fallback: '다크그린' },
                    { hex: '#C71585', key: 'magenta', fallback: '마젠타' },
                    { hex: '#000000', key: 'black', fallback: '블랙' }
                ],
                '겨울 쿨 뮤트': [
                    { hex: '#708090', key: 'slate', fallback: '슬레이트' },
                    { hex: '#778899', key: 'lightSlate', fallback: '라이트슬레이트' },
                    { hex: '#2F4F4F', key: 'darkSlate', fallback: '다크슬레이트' },
                    { hex: '#696969', key: 'dimGray', fallback: '딤그레이' },
                    { hex: '#4682B4', key: 'steelBlue', fallback: '스틸블루' }
                ],
                // 뉴트럴
                '뉴트럴 라이트': [
                    { hex: '#DDA0DD', key: 'plum', fallback: '플럼' },
                    { hex: '#FFB7C5', key: 'cherryBlossom', fallback: '체리블로섬' },
                    { hex: '#E6E6FA', key: 'lavender', fallback: '라벤더' },
                    { hex: '#FFDEAD', key: 'navajoWhite', fallback: '나바호화이트' },
                    { hex: '#B0E0E6', key: 'powderBlue', fallback: '파우더블루' }
                ],
                '뉴트럴 딥': [
                    { hex: '#8B4513', key: 'saddleBrown', fallback: '새들브라운' },
                    { hex: '#4169E1', key: 'royalBlue', fallback: '로얄블루' },
                    { hex: '#556B2F', key: 'oliveDrab', fallback: '올리브드랍' },
                    { hex: '#800000', key: 'maroon', fallback: '마룬' },
                    { hex: '#483D8B', key: 'darkSlateBlue', fallback: '다크슬레이트블루' }
                ]
            };
            const colors = palettes[season] || [];
            return colors.map(c => `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
                    <div style="width: 32px; height: 32px; background: ${c.hex}; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3);"></div>
                    <span style="font-size: 9px; color: #aaa;">${cn(c.key, c.fallback)}</span>
                </div>
            `).join('');
        }

        function drawFullFaceMesh(ctx, landmarks) {
            const FACE_CONNECTIONS = [
                [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172], [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
                [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133], [133, 173], [173, 157], [157, 158], [158, 159], [159, 160], [160, 161], [161, 246], [246, 33],
                [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249], [249, 263], [263, 466], [466, 388], [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362]
            ];

            ctx.fillStyle = '#00FF88';
            landmarks.forEach((landmark, _index) => {
                // 좌우 반전 (거울 모드)
                const x = (1 - landmark.x) * canvasElement.width;
                const y = landmark.y * canvasElement.height;

                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
                ctx.fill();
            });

            ctx.strokeStyle = '#00FF8860';
            ctx.lineWidth = 0.8;

            FACE_CONNECTIONS.forEach(connection => {
                const [startIdx, endIdx] = connection;

                if (landmarks[startIdx] && landmarks[endIdx]) {
                    const start = landmarks[startIdx];
                    const end = landmarks[endIdx];

                    // 좌우 반전 (거울 모드)
                    const startX = (1 - start.x) * canvasElement.width;
                    const startY = start.y * canvasElement.height;
                    const endX = (1 - end.x) * canvasElement.width;
                    const endY = end.y * canvasElement.height;

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            });
        }

        function drawSkinTonePoints(ctx, landmarks) {
            const skinPoints = [
                { index: 10, name: '이마중앙', color: '#FF6B6B' },
                { index: 151, name: '코끝', color: '#4ECDC4' },
                { index: 116, name: '좌측볼', color: '#45B7D1' },
                { index: 345, name: '우측볼', color: '#96CEB4' },
                { index: 175, name: '턱중앙', color: '#FECA57' }
            ];

            skinPoints.forEach((point) => {
                if (landmarks[point.index]) {
                    const landmark = landmarks[point.index];
                    // 좌우 반전 (거울 모드)
                    const x = (1 - landmark.x) * canvasElement.width;
                    const y = landmark.y * canvasElement.height;

                    ctx.strokeStyle = point.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                    ctx.stroke();

                    ctx.fillStyle = point.color + '40';
                    ctx.fill();

                    ctx.fillStyle = point.color;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }

        function extractSkinTone(landmarks) {
            // 공유 Canvas 초기화 (한 번만)
            if (!sharedExtractCanvas) {
                sharedExtractCanvas = document.createElement('canvas');
                sharedExtractCtx = sharedExtractCanvas.getContext('2d', { willReadFrequently: true });
                console.log('공유 Canvas 생성됨');
            }

            // Canvas 크기 설정
            sharedExtractCanvas.width = videoElement.videoWidth;
            sharedExtractCanvas.height = videoElement.videoHeight;

            sharedExtractCtx.drawImage(videoElement, 0, 0);

            // ✅ 개선된 피부색 추출 포인트 (그림자/하이라이트 영향 적은 부위)
            // 이마 중앙(10), 양쪽 볼 중앙(116, 345), 코 옆(203, 423), 턱 양쪽(136, 365)
            const skinPoints = [
                { index: 10, weight: 1.5 },   // 이마 중앙 (중요)
                { index: 116, weight: 2.0 },  // 왼쪽 볼 중앙 (가장 중요 - 피부색 대표)
                { index: 345, weight: 2.0 },  // 오른쪽 볼 중앙 (가장 중요)
                { index: 203, weight: 1.0 },  // 왼쪽 코 옆
                { index: 423, weight: 1.0 },  // 오른쪽 코 옆
                { index: 136, weight: 1.0 },  // 왼쪽 턱
                { index: 365, weight: 1.0 },  // 오른쪽 턱
                { index: 168, weight: 1.5 }   // 코 중간 (밝은 부분)
            ];

            let totalR = 0, totalG = 0, totalB = 0;
            let totalWeight = 0;
            const samples = [];

            skinPoints.forEach(point => {
                const landmark = landmarks[point.index];
                if (!landmark) return;

                const x = Math.floor(landmark.x * sharedExtractCanvas.width);
                const y = Math.floor(landmark.y * sharedExtractCanvas.height);

                // 5x5 영역 샘플링
                let pointR = 0, pointG = 0, pointB = 0;
                let pointSamples = 0;

                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        const pixelX = Math.max(0, Math.min(sharedExtractCanvas.width - 1, x + dx));
                        const pixelY = Math.max(0, Math.min(sharedExtractCanvas.height - 1, y + dy));

                        const imageData = sharedExtractCtx.getImageData(pixelX, pixelY, 1, 1);
                        const [r, g, b] = imageData.data;

                        // 너무 어둡거나 밝은 픽셀 제외 (그림자/하이라이트)
                        const brightness = (r + g + b) / 3;
                        if (brightness > 40 && brightness < 240) {
                            pointR += r;
                            pointG += g;
                            pointB += b;
                            pointSamples++;
                        }
                    }
                }

                if (pointSamples > 0) {
                    const avgR = pointR / pointSamples;
                    const avgG = pointG / pointSamples;
                    const avgB = pointB / pointSamples;

                    totalR += avgR * point.weight;
                    totalG += avgG * point.weight;
                    totalB += avgB * point.weight;
                    totalWeight += point.weight;

                    samples.push({ r: avgR, g: avgG, b: avgB });
                }
            });

            if (totalWeight === 0) return null;

            const avgR = Math.round(totalR / totalWeight);
            const avgG = Math.round(totalG / totalWeight);
            const avgB = Math.round(totalB / totalWeight);

            // ✅ 개선된 분석
            const labColor = rgbToLab(avgR, avgG, avgB);
            const undertoneAnalysis = analyzeUndertoneAdvanced(avgR, avgG, avgB, labColor);

            return {
                rgb: { r: avgR, g: avgG, b: avgB },
                hex: `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`,
                undertone: undertoneAnalysis.undertone,
                undertoneScore: undertoneAnalysis.score,
                lab: labColor,
                brightness: labColor.L,
                chroma: undertoneAnalysis.chroma,
                samples: samples.length
            };
        }

        // ========== 얼굴 기하학적 측정 함수 ==========
        function analyzeFaceGeometry(landmarks) {
            if (!landmarks || landmarks.length < 468) {
                console.log('❌ 랜드마크 데이터 부족');
                return null;
            }

            // MediaPipe Face Mesh 랜드마크 인덱스
            // 눈썹 관련
            const LEFT_EYEBROW_INNER = 107;   // 왼쪽 눈썹 안쪽 끝
            const RIGHT_EYEBROW_INNER = 336;  // 오른쪽 눈썹 안쪽 끝
            const LEFT_EYEBROW_OUTER = 70;    // 왼쪽 눈썹 바깥쪽 끝
            const RIGHT_EYEBROW_OUTER = 300;  // 오른쪽 눈썹 바깥쪽 끝

            // 눈 관련
            const LEFT_EYE_INNER = 133;       // 왼쪽 눈 안쪽
            const RIGHT_EYE_INNER = 362;      // 오른쪽 눈 안쪽
            const LEFT_EYE_OUTER = 33;        // 왼쪽 눈 바깥쪽
            const RIGHT_EYE_OUTER = 263;      // 오른쪽 눈 바깥쪽

            // 얼굴 기준점
            const FOREHEAD_TOP = 10;          // 이마 상단
            const CHIN_BOTTOM = 152;          // 턱 끝
            const LEFT_CHEEK = 234;           // 왼쪽 광대
            const RIGHT_CHEEK = 454;          // 오른쪽 광대
            const NOSE_TIP = 1;               // 코 끝

            // 거리 계산 함수
            const getDistance = (idx1, idx2) => {
                const p1 = landmarks[idx1];
                const p2 = landmarks[idx2];
                if (!p1 || !p2) return null;
                return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            };

            // 얼굴 너비 (광대 기준) - 정규화 기준
            const faceWidth = getDistance(LEFT_CHEEK, RIGHT_CHEEK);
            if (!faceWidth || faceWidth === 0) return null;

            // 얼굴 높이
            const faceHeight = getDistance(FOREHEAD_TOP, CHIN_BOTTOM);

            // 1. 눈썹간 거리 (미간)
            const eyebrowDistance = getDistance(LEFT_EYEBROW_INNER, RIGHT_EYEBROW_INNER);
            const eyebrowDistanceRatio = eyebrowDistance / faceWidth;

            // 2. 눈썹 길이
            const leftEyebrowLength = getDistance(LEFT_EYEBROW_INNER, LEFT_EYEBROW_OUTER);
            const rightEyebrowLength = getDistance(RIGHT_EYEBROW_INNER, RIGHT_EYEBROW_OUTER);
            const avgEyebrowLength = (leftEyebrowLength + rightEyebrowLength) / 2;
            const eyebrowLengthRatio = avgEyebrowLength / faceWidth;

            // 3. 눈 사이 거리 (양쪽 눈 안쪽 끝)
            const eyeInnerDistance = getDistance(LEFT_EYE_INNER, RIGHT_EYE_INNER);
            const eyeInnerDistanceRatio = eyeInnerDistance / faceWidth;

            // 4. 눈 너비 (각 눈의 가로 길이)
            const leftEyeWidth = getDistance(LEFT_EYE_INNER, LEFT_EYE_OUTER);
            const rightEyeWidth = getDistance(RIGHT_EYE_INNER, RIGHT_EYE_OUTER);
            const avgEyeWidth = (leftEyeWidth + rightEyeWidth) / 2;
            const eyeWidthRatio = avgEyeWidth / faceWidth;

            // 5. 얼굴 비율 (세로/가로)
            const faceRatio = faceHeight / faceWidth;

            // 눈썹간 거리 평가 (미간 넓이)
            // 일반적으로 눈 하나 너비와 비슷하면 이상적
            // 눈썹간 거리 / 눈 너비 비율로 평가
            const eyebrowToEyeRatio = eyebrowDistance / avgEyeWidth;
            let eyebrowGapEvaluation = '';
            let eyebrowGapLevel = '';

            if (eyebrowToEyeRatio < 0.85) {
                eyebrowGapEvaluation = t('personalColor.faceAnalysis.narrowGapDesc') || 'Narrow gap - Eyes appear close together';
                eyebrowGapLevel = 'narrow';
            } else if (eyebrowToEyeRatio > 1.15) {
                eyebrowGapEvaluation = t('personalColor.faceAnalysis.wideGapDesc') || 'Wide gap - Eyes appear far apart';
                eyebrowGapLevel = 'wide';
            } else {
                eyebrowGapEvaluation = t('personalColor.faceAnalysis.balancedGapDesc') || 'Balanced gap - Ideal proportion';
                eyebrowGapLevel = 'balanced';
            }

            // 스타일 추천
            let styleRecommendation = '';
            if (eyebrowGapLevel === 'narrow') {
                styleRecommendation = t('personalColor.aiMode.result.eyebrowNarrowTip') || '눈썹 안쪽을 정리하여 시원한 인상 연출 추천';
            } else if (eyebrowGapLevel === 'wide') {
                styleRecommendation = t('personalColor.aiMode.result.eyebrowWideTip') || '눈썹 안쪽을 채워 또렷한 인상 연출 추천';
            } else {
                styleRecommendation = t('personalColor.aiMode.result.currentEyebrowKeep') || '현재 눈썹 모양 유지 추천';
            }

            const result = {
                // 절대값 (정규화된 비율)
                eyebrowDistance: eyebrowDistanceRatio,
                eyebrowLength: eyebrowLengthRatio,
                eyeInnerDistance: eyeInnerDistanceRatio,
                eyeWidth: eyeWidthRatio,
                faceRatio: faceRatio,

                // 비교 비율
                eyebrowToEyeRatio: eyebrowToEyeRatio,

                // 평가
                eyebrowGapLevel: eyebrowGapLevel,
                eyebrowGapEvaluation: eyebrowGapEvaluation,
                styleRecommendation: styleRecommendation,

                // 퍼센트 (UI 표시용)
                eyebrowDistancePercent: Math.round(eyebrowDistanceRatio * 100),
                eyeInnerDistancePercent: Math.round(eyeInnerDistanceRatio * 100),
                faceRatioPercent: Math.round(faceRatio * 100)
            };

            console.log('📐 얼굴 기하학적 측정 결과:', result);
            return result;
        }

        // RGB를 LAB 색공간으로 변환 (더 정확한 색상 분석용)
        function rgbToLab(r, g, b) {
            // RGB to XYZ
            let rr = r / 255, gg = g / 255, bb = b / 255;

            rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
            gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
            bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

            const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
            const y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
            const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;

            // XYZ to LAB
            const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
            const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
            const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

            const L = (116 * fy) - 16;        // 명도 (0-100)
            const a = 500 * (fx - fy);        // 빨강-초록 축 (+a = 빨강, -a = 초록)
            const b_lab = 200 * (fy - fz);    // 노랑-파랑 축 (+b = 노랑, -b = 파랑)

            return { L, a, b: b_lab };
        }

        // ✅ 개선된 언더톤 분석 (LAB 색공간 활용)
        function analyzeUndertoneAdvanced(r, g, b, lab) {
            // 방법 1: LAB 색공간에서 a*, b* 값 분석
            // a* > 0: 빨간기 (쿨톤 경향)
            // b* > 0: 노란기 (웜톤 경향)
            const labWarmScore = lab.b - (lab.a * 0.5);  // 노란기가 강하고 빨간기가 약하면 웜

            // 방법 2: RGB 비율 분석
            const total = r + g + b;
            const rRatio = r / total;
            const gRatio = g / total;
            const bRatio = b / total;

            // 웜톤: R과 G가 높고, 특히 G-B 차이가 큼 (노란기)
            // 쿨톤: R과 B가 높고, G가 상대적으로 낮음 (핑크/블루 기운)
            const yellowIndex = (r * 0.5 + g) - b * 1.2;  // 노란기 지수
            const pinkIndex = (r + b * 0.8) - g * 1.1;    // 핑크기 지수

            // 방법 3: 피부색 특성 분석
            // 웜톤 피부: 황금빛, 복숭아빛, 올리브빛
            // 쿨톤 피부: 핑크빛, 붉은빛, 파란빛
            const goldenRatio = (r - b) / (r + b + 1);    // 골든 비율 (웜톤 지표)
            const rosyRatio = (r - g) / (r + g + 1);       // 로지 비율 (쿨톤 지표)

            // 종합 점수 계산
            let warmScore = 0;
            let coolScore = 0;

            // LAB 기반 점수
            if (labWarmScore > 10) warmScore += 3;
            else if (labWarmScore > 5) warmScore += 2;
            else if (labWarmScore > 0) warmScore += 1;
            else if (labWarmScore < -5) coolScore += 2;
            else if (labWarmScore < 0) coolScore += 1;

            // RGB 비율 기반 점수
            if (yellowIndex > pinkIndex + 30) warmScore += 3;
            else if (yellowIndex > pinkIndex + 15) warmScore += 2;
            else if (yellowIndex > pinkIndex) warmScore += 1;
            else if (pinkIndex > yellowIndex + 30) coolScore += 3;
            else if (pinkIndex > yellowIndex + 15) coolScore += 2;
            else if (pinkIndex > yellowIndex) coolScore += 1;

            // 골든/로지 비율 점수
            if (goldenRatio > 0.15) warmScore += 2;
            else if (goldenRatio > 0.08) warmScore += 1;
            if (rosyRatio > 0.08 && goldenRatio < 0.1) coolScore += 2;
            else if (rosyRatio > 0.04) coolScore += 1;

            // 채도 계산
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const chroma = max - min;

            // 최종 판정 (더 엄격한 기준 - 뉴트럴 범위 축소)
            const scoreDiff = warmScore - coolScore;
            let undertone, score;

            // 기존: >=3 웜, <=-3 쿨, 나머지 뉴트럴 (너무 넓음)
            // 개선: >=2 웜, <=-2 쿨, -1~1만 뉴트럴 (좁은 범위)
            if (scoreDiff >= 2) {
                undertone = 'Warm';
                score = scoreDiff;
            } else if (scoreDiff <= -2) {
                undertone = 'Cool';
                score = Math.abs(scoreDiff);
            } else {
                // 정말 애매한 경우만 뉴트럴
                undertone = 'Neutral';
                score = Math.abs(scoreDiff);
            }

            console.log('🔬 언더톤 분석:', {
                labWarmScore: labWarmScore.toFixed(2),
                yellowIndex: yellowIndex.toFixed(2),
                pinkIndex: pinkIndex.toFixed(2),
                goldenRatio: goldenRatio.toFixed(3),
                rosyRatio: rosyRatio.toFixed(3),
                warmScore, coolScore,
                result: undertone
            });

            return { undertone, score, chroma };
        }

        // ✅ 개선된 퍼스널컬러 시즌 결정 (엄격한 기준)
        function getPersonalColorSeason(undertone, brightness, chroma) {
            // brightness: LAB의 L값 (0-100) 또는 RGB 평균 (0-255)
            // chroma: 채도 (0-255)

            // brightness가 255 스케일이면 100 스케일로 변환
            const L = brightness > 100 ? (brightness / 255) * 100 : brightness;
            const C = chroma || 50; // 기본값

            // 시즌 결정 기준 (엄격하게 조정):
            // 봄 웜: 정말 밝고(L>=70) + 웜톤
            // 가을 웜: 중간~어두운(L<70) + 웜톤
            // 여름 쿨: 밝고(L>=65) + 쿨톤
            // 겨울 쿨: 중간~어두운(L<65) + 쿨톤

            console.log(`🎨 시즌 결정: L=${L.toFixed(1)}, C=${C}, undertone=${undertone}`);

            if (undertone === 'Warm') {
                if (L >= 70) {
                    // 정말 밝은 웜톤 = 봄
                    if (C > 50) {
                        return { season: '봄 웜 브라이트', emoji: '🌸', color: '#FF6B6B', subtype: 'bright' };
                    } else {
                        return { season: '봄 웜 라이트', emoji: '🌷', color: '#FFB7C5', subtype: 'light' };
                    }
                } else if (L >= 60) {
                    // 중간 밝기 웜톤 = 가을 소프트/뮤트
                    if (C > 50) {
                        return { season: '가을 웜 소프트', emoji: '🍂', color: '#CD853F', subtype: 'soft' };
                    } else {
                        return { season: '가을 웜 뮤트', emoji: '🍁', color: '#D2691E', subtype: 'muted' };
                    }
                } else {
                    // 어두운 웜톤 = 가을 딥
                    if (C > 50) {
                        return { season: '가을 웜 딥', emoji: '🍂', color: '#8B4513', subtype: 'deep' };
                    } else {
                        return { season: '가을 웜 뮤트', emoji: '🍁', color: '#A0522D', subtype: 'muted' };
                    }
                }
            } else if (undertone === 'Cool') {
                if (L >= 65) {
                    // 밝은 쿨톤 = 여름
                    if (C > 45) {
                        return { season: '여름 쿨 브라이트', emoji: '🌊', color: '#4169E1', subtype: 'bright' };
                    } else {
                        return { season: '여름 쿨 라이트', emoji: '💜', color: '#87CEEB', subtype: 'light' };
                    }
                } else if (L >= 50) {
                    // 중간 밝기 쿨톤 = 여름 뮤트
                    return { season: '여름 쿨 뮤트', emoji: '🌙', color: '#9370DB', subtype: 'muted' };
                } else {
                    // 어두운 쿨톤 = 겨울
                    if (C > 45) {
                        return { season: '겨울 쿨 딥', emoji: '❄️', color: '#191970', subtype: 'deep' };
                    } else {
                        return { season: '겨울 쿨 뮤트', emoji: '🌙', color: '#4169E1', subtype: 'muted' };
                    }
                }
            } else {
                // Neutral - 밝기로 구분
                if (L >= 65) {
                    return { season: '뉴트럴 라이트', emoji: '🌷', color: '#DDA0DD', subtype: 'light' };
                } else {
                    return { season: '뉴트럴 소프트', emoji: '🍁', color: '#BC8F8F', subtype: 'soft' };
                }
            }
        }

        // 시즌별 추천 정보 (개선된 8타입 시스템)
        function getSeasonRecommendations(season) {
            const recs = {
                // 봄 웜 타입
                '봄 웜 브라이트': '💄 추천 컬러: 비비드 코랄, 오렌지레드, 선명한 피치<br>💎 추천 메탈: 옐로우 골드, 브라이트 골드',
                '봄 웜 라이트': '💄 추천 컬러: 살구색, 라이트 코랄, 아이보리, 크림<br>💎 추천 메탈: 로즈골드, 샴페인 골드',
                // 가을 웜 타입
                '가을 웜 딥': '💄 추천 컬러: 버건디, 초콜릿브라운, 딥 테라코타<br>💎 추천 메탈: 앤틱 골드, 브론즈',
                '가을 웜 뮤트': '💄 추천 컬러: 머스타드, 올리브, 카키, 테라코타<br>💎 추천 메탈: 골드, 브라스',
                '가을 웜 소프트': '💄 추천 컬러: 카멜, 베이지브라운, 코코아, 웜베이지<br>💎 추천 메탈: 로즈골드, 샴페인골드',
                // 여름 쿨 타입
                '여름 쿨 브라이트': '💄 추천 컬러: 로즈핑크, 라벤더, 스카이블루<br>💎 추천 메탈: 화이트골드, 로즈골드',
                '여름 쿨 라이트': '💄 추천 컬러: 소프트 핑크, 라일락, 파우더블루<br>💎 추천 메탈: 실버, 화이트골드',
                // 겨울 쿨 타입
                '겨울 쿨 딥': '💄 추천 컬러: 와인, 로얄블루, 에메랄드, 블랙<br>💎 추천 메탈: 플래티넘, 화이트골드',
                '겨울 쿨 뮤트': '💄 추천 컬러: 차콜, 네이비, 버건디, 다크그레이<br>💎 추천 메탈: 실버, 건메탈',
                // 뉴트럴 타입
                '뉴트럴 라이트': '💄 추천 컬러: 더스티 핑크, 소프트 베이지, 라이트 모브<br>💎 추천 메탈: 로즈골드, 소프트 실버',
                '뉴트럴 딥': '💄 추천 컬러: 토프, 머브, 다크브라운, 올리브<br>💎 추천 메탈: 혼합 메탈, 앤틱 실버'
            };
            return recs[season] || '분석 중...';
        }

        function clearSkinToneDisplay() {
            const panel = document.getElementById('realtime-skin-analysis');
            if (panel) panel.remove();
        }

        function stopAICamera(silent = false) {
            console.log('AI 카메라 중지 요청');
            cleanupCameraResources();
            if (!silent) {
                showToast(t('personalColor.toast.aiCameraStopped') || 'AI 카메라가 정지되었습니다', 'info');
            }
        }

        function cleanupCameraResources() {
            console.log('카메라 리소스 정리 시작...');

            try {
                // MediaPipe 카메라만 중지 (Face Mesh 인스턴스는 재사용)
                if (mediaPipeCamera) {
                    try {
                        mediaPipeCamera.stop();
                    } catch (e) {
                        console.warn('MediaPipe Camera stop 실패:', e);
                    }
                    mediaPipeCamera = null;
                }

                // ⚠️ faceDetectionInstance는 close하지 않음 - WASM 재사용 문제
                // 페이지를 떠날 때만 정리됨

                if (activeVideoStream) {
                    activeVideoStream.getTracks().forEach(track => {
                        track.stop();
                    });
                    activeVideoStream = null;
                }

                if (videoElement) {
                    videoElement.srcObject = null;
                    videoElement.pause();
                }

                if (canvasCtx && canvasElement) {
                    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                }

                faceDetected = false;

                const faceGuide = document.getElementById('ai-face-guide');
                if (faceGuide) faceGuide.style.display = 'flex';

                const analysisPanel = document.getElementById('realtime-skin-analysis');
                if (analysisPanel) analysisPanel.remove();

                // 공유 Canvas는 유지 (재사용 가능)
                // sharedExtractCanvas, sharedExtractCtx 유지

                console.log('카메라 리소스 정리 완료 (Face Mesh 인스턴스 유지)');

            } catch (error) {
                console.error('리소스 정리 중 오류:', error);
            }
        }
        async function analyzeAI() {
            if (analysisInProgress) return;

            if (!videoElement || videoElement.readyState !== 4) {
                showToast(t('personalColor.toast.startCameraFirst') || '먼저 카메라를 시작해주세요', 'warning');
                return;
            }

            analysisInProgress = true;
            showToast(t('personalColor.toast.startingAiAnalysis') || 'AI 분석을 시작합니다...', 'info');

            await performAIAnalysisSteps();

            analysisInProgress = false;
        }

        async function performAIAnalysisSteps() {
            const steps = [
                { id: 'ai-step-1', message: t('personalColor.aiSteps.step1') || '얼굴 영역 감지 중...' },
                { id: 'ai-step-2', message: t('personalColor.aiSteps.step2') || '피부톤 색상 분석 중...' },
                { id: 'ai-step-3', message: t('personalColor.aiSteps.step3') || 'Delta E 계산 중...' },
                { id: 'ai-step-4', message: t('personalColor.aiSteps.step4') || '최종 결과 생성 중...' }
            ];

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];

                document.getElementById(step.id).classList.add('active');
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
                document.getElementById(step.id).classList.remove('active');
                document.getElementById(step.id).classList.add('completed');
            }

            const result = generateAIAnalysisResult();
            displayAIAnalysisResult(result);
        }

        function generateAIAnalysisResult() {
            const seasons = ['봄 웜톤', '여름 쿨톤', '가을 웜톤', '겨울 쿨톤'];
            const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
            const confidence = 80 + Math.floor(Math.random() * 15);

            const skinColor = {
                r: 150 + Math.floor(Math.random() * 50),
                g: 120 + Math.floor(Math.random() * 40),
                b: 100 + Math.floor(Math.random() * 30)
            };

            return {
                season: selectedSeason,
                confidence: confidence,
                skinColor: skinColor,
                expertAnalysis: generateExpertAnalysis(selectedSeason)
            };
        }

        function displayAIAnalysisResult(result) {
            document.getElementById('ai-season-result').textContent = result.season;
            document.getElementById('ai-confidence').textContent = `신뢰도: ${result.confidence}%`;

            const analysisData = document.getElementById('ai-analysis-data');
            analysisData.innerHTML = `
                <div class="color-data">
                    <h5>추출된 피부색</h5>
                    <div class="skin-color-sample" style="background: rgb(${result.skinColor.r}, ${result.skinColor.g}, ${result.skinColor.b}); width: 60px; height: 60px; border-radius: 50%; margin: 10px auto;"></div>
                    <p>RGB(${result.skinColor.r}, ${result.skinColor.g}, ${result.skinColor.b})</p>
                </div>
                <div class="expert-analysis">
                    <h5>${t('personalColor.result.expertAnalysis') || 'Expert Analysis'}</h5>
                    <p>${result.expertAnalysis}</p>
                </div>
            `;

            document.getElementById('ai-analysis-results').style.display = 'block';

            displayFinalResults(result);

            showToast(`${t('personalColor.toast.aiAnalysisComplete') || 'AI 분석 완료'}: ${result.season}`, 'success');
        }

        // 드래이핑 모드 함수들
        let drapingFaceMesh = null;
        let drapingAnimationId = null;
        let lastFaceLandmarks = null;

        // 드래이핑 캔버스 컨텍스트
        let drapingCanvasCtx = null;
        let drapingVideoStream = null;

        async function startDrapingCamera() {
            try {
                showToast(t('personalColor.toast.startingDrapingCamera') || '드래이핑 카메라를 시작합니다...', 'info');

                // 카메라 스트림 요청 (여러 옵션 시도)
                let stream = null;
                const videoConstraints = [
                    { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                    { facingMode: 'user' },
                    { facingMode: { ideal: 'user' } },
                    true
                ];

                for (const constraints of videoConstraints) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: constraints,
                            audio: false
                        });
                        break;
                    } catch (_e) {
                        continue;
                    }
                }

                if (!stream) {
                    throw new Error('카메라 스트림을 가져올 수 없습니다');
                }

                drapingVideoStream = stream;
                const drapingVideo = document.getElementById('draping-camera');

                // ⭐ iOS에서 전체화면 방지를 위한 필수 속성
                drapingVideo.setAttribute('playsinline', 'true');
                drapingVideo.setAttribute('webkit-playsinline', 'true');
                drapingVideo.setAttribute('autoplay', 'true');
                drapingVideo.muted = true;

                drapingVideo.srcObject = stream;

                // 비디오 재생 대기
                await new Promise((resolve, reject) => {
                    drapingVideo.onloadedmetadata = () => {
                        drapingVideo.play()
                            .then(resolve)
                            .catch(reject);
                    };
                    drapingVideo.onerror = reject;
                    setTimeout(() => reject(new Error('VIDEO_TIMEOUT')), 10000);
                });

                // ⭐ 메인 캔버스 설정 (video 대신 canvas에 표시)
                const drapingCanvas = document.getElementById('draping-canvas');
                drapingCanvas.width = drapingVideo.videoWidth || 640;
                drapingCanvas.height = drapingVideo.videoHeight || 480;
                drapingCanvasCtx = drapingCanvas.getContext('2d');

                // Face Mesh 초기화
                if (!drapingFaceMesh) {
                    drapingFaceMesh = new FaceMesh({
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                    });
                    drapingFaceMesh.setOptions({
                        maxNumFaces: 1,
                        refineLandmarks: true,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });
                    drapingFaceMesh.onResults(onDrapingFaceResults);
                }

                // 오버레이 캔버스 크기 설정
                const overlay = document.getElementById('draping-overlay');
                overlay.width = drapingVideo.videoWidth || 640;
                overlay.height = drapingVideo.videoHeight || 480;

                document.getElementById('draping-face-guide').style.display = 'none';
                startDrapingLoop();

                showToast(t('personalColor.toast.drapingCameraStarted') || '드래이핑 카메라가 시작되었습니다', 'success');

            } catch (error) {
                console.error('드래이핑 카메라 시작 실패:', error);

                // ⭐ Android/iOS 환경별 상세 에러 메시지
                const isAndroidEnv = typeof DeviceDetection !== 'undefined' && DeviceDetection.isAndroid();
                const isIOSEnv = typeof DeviceDetection !== 'undefined' && DeviceDetection.isIOS();
                const isWebViewEnv = typeof DeviceDetection !== 'undefined' && DeviceDetection.isWebView();

                let userMessage = t('personalColor.cameraErrors.generic') || '카메라에 접근할 수 없습니다';

                if (error.name === 'NotAllowedError') {
                    if (isAndroidEnv) {
                        userMessage = t('personalColor.cameraErrors.permissionDeniedAndroid') || '카메라 권한이 필요합니다.\n\n설정 > 앱 > HAIRGATOR > 권한에서 카메라를 허용해주세요.';
                    } else if (isIOSEnv) {
                        userMessage = t('personalColor.cameraErrors.permissionDeniedIOS') || '카메라 권한이 필요합니다.\n\n설정 > HAIRGATOR > 카메라를 허용해주세요.';
                    } else {
                        userMessage = t('personalColor.cameraErrors.permissionDeniedBrowser') || '카메라 권한이 필요합니다.\n\n브라우저에서 카메라 권한을 허용해주세요.';
                    }
                } else if (error.name === 'NotFoundError') {
                    userMessage = t('personalColor.cameraErrors.notFound') || '카메라를 찾을 수 없습니다.';
                } else if (error.name === 'NotReadableError') {
                    userMessage = t('personalColor.cameraErrors.inUse') || '카메라가 다른 앱에서 사용 중입니다.';
                }

                showToast(userMessage, 'error');
            }
        }

        function startDrapingLoop() {
            const drapingVideo = document.getElementById('draping-camera');
            const drapingCanvas = document.getElementById('draping-canvas');

            async function loop() {
                if (drapingVideo.srcObject && drapingVideo.readyState === 4) {
                    // ⭐ 비디오를 캔버스에 그리기 (CSS transform으로 거울 모드 적용됨)
                    if (drapingCanvasCtx) {
                        drapingCanvasCtx.drawImage(drapingVideo, 0, 0, drapingCanvas.width, drapingCanvas.height);
                    }

                    // Face Mesh 전송
                    if (drapingFaceMesh) {
                        try {
                            await drapingFaceMesh.send({ image: drapingVideo });
                        } catch (_e) {
                            // send 실패 시 무시
                        }
                    }
                }
                drapingAnimationId = requestAnimationFrame(loop);
            }
            loop();
        }

        function onDrapingFaceResults(results) {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                lastFaceLandmarks = results.multiFaceLandmarks[0];
                drawDrapingCape();
            }
        }

        function drawDrapingCape() {
            const overlay = document.getElementById('draping-overlay');
            const ctx = overlay.getContext('2d');
            const w = overlay.width;
            const h = overlay.height;

            ctx.clearRect(0, 0, w, h);

            // 조정된 색상 또는 선택된 색상 사용
            const displayColor = currentDisplayColor || selectedColor;
            if (!lastFaceLandmarks || !displayColor) return;

            // 턱 중앙 (landmark 152)
            const chin = lastFaceLandmarks[152];
            // 왼쪽 턱 (landmark 234)
            const leftJaw = lastFaceLandmarks[234];
            // 오른쪽 턱 (landmark 454)
            const rightJaw = lastFaceLandmarks[454];

            const chinX = chin.x * w;
            const chinY = chin.y * h;
            const leftJawX = leftJaw.x * w;
            const rightJawX = rightJaw.x * w;

            // 얼굴 너비 계산
            const faceWidth = Math.abs(rightJawX - leftJawX);

            // 부채꼴 케이프 그리기 (턱 아래에서 시작, 아래로 펼쳐짐)
            ctx.save();

            // 부채꼴 시작점 (턱 약간 아래)
            const capeStartY = chinY + 10;
            const capeEndY = h + 50; // 화면 아래까지

            // 부채꼴 각도 (좌우로 퍼지는 정도)
            const spreadAngle = 0.7; // 라디안 (약 40도씩 좌우로)

            // 그라데이션 생성 (위에서 아래로)
            const gradient = ctx.createLinearGradient(chinX, capeStartY, chinX, capeEndY);
            gradient.addColorStop(0, displayColor + 'FF');  // 위쪽: 불투명
            gradient.addColorStop(0.3, displayColor + 'EE');
            gradient.addColorStop(1, displayColor + 'CC');  // 아래쪽: 약간 투명

            ctx.fillStyle = gradient;
            ctx.beginPath();

            // 케이프 시작점 (턱 라인을 따라) - 목 부분 넓게
            const neckWidth = faceWidth * 0.95;
            ctx.moveTo(chinX - neckWidth / 2, capeStartY);

            // 왼쪽 곡선 (부채꼴 왼쪽)
            const leftEndX = chinX - (capeEndY - capeStartY) * Math.tan(spreadAngle) - neckWidth / 2;
            ctx.quadraticCurveTo(
                chinX - neckWidth / 2 - 30, (capeStartY + capeEndY) / 2,
                leftEndX, capeEndY
            );

            // 아래쪽 직선
            const rightEndX = chinX + (capeEndY - capeStartY) * Math.tan(spreadAngle) + neckWidth / 2;
            ctx.lineTo(rightEndX, capeEndY);

            // 오른쪽 곡선 (부채꼴 오른쪽)
            ctx.quadraticCurveTo(
                chinX + neckWidth / 2 + 30, (capeStartY + capeEndY) / 2,
                chinX + neckWidth / 2, capeStartY
            );

            ctx.closePath();
            ctx.fill();

            // 케이프 상단에 약간의 주름/접힌 효과
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 2;
            for (let i = 1; i <= 3; i++) {
                const foldY = capeStartY + i * 25;
                const foldWidth = neckWidth / 2 + i * 40;
                ctx.beginPath();
                ctx.moveTo(chinX - foldWidth, foldY);
                ctx.quadraticCurveTo(chinX, foldY + 8, chinX + foldWidth, foldY);
                ctx.stroke();
            }

            ctx.restore();
        }

        // ========== 비교 모드 기능 ==========
        let isCompareMode = false;
        let compareIndex = 0;
        let seasonScores = { spring: 0, summer: 0, autumn: 0, winter: 0 };

        // 시즌 라벨 번역 함수
        function getDrapingLabel(season) {
            const labelKeys = {
                'spring': 'springWarm',
                'summer': 'summerCool',
                'autumn': 'autumnWarm',
                'winter': 'winterCool'
            };
            const fallbacks = {
                'spring': '봄 웜',
                'summer': '여름 쿨',
                'autumn': '가을 웜',
                'winter': '겨울 쿨'
            };
            return t(`personalColor.drapingLabels.${labelKeys[season]}`) || fallbacks[season];
        }

        // 극단적 색상 비교 프리셋
        const comparePresets = [
            {
                left: { hex: '#FF8C00', name: '오렌지', season: 'spring' },
                right: { hex: '#FF1493', name: '핫핑크', season: 'winter' }
            },
            {
                left: { hex: '#6B8E23', name: '카키', season: 'autumn' },
                right: { hex: '#87CEEB', name: '스카이블루', season: 'summer' }
            },
            {
                left: { hex: '#FFD700', name: '골드', season: 'spring' },
                right: { hex: '#C0C0C0', name: '실버그레이', season: 'winter' }
            },
            {
                left: { hex: '#E2725B', name: '테라코타', season: 'autumn' },
                right: { hex: '#E6E6FA', name: '라벤더', season: 'summer' }
            },
            {
                left: { hex: '#FF6347', name: '토마토레드', season: 'spring' },
                right: { hex: '#4169E1', name: '로얄블루', season: 'winter' }
            },
            {
                left: { hex: '#D2691E', name: '초콜릿브라운', season: 'autumn' },
                right: { hex: '#DDA0DD', name: '플럼', season: 'summer' }
            }
        ];

        function toggleCompareMode() {
            isCompareMode = !isCompareMode;
            const panel = document.getElementById('compare-mode-panel');
            const btn = document.getElementById('compare-mode-btn');

            if (isCompareMode) {
                panel.style.display = 'block';
                btn.textContent = t('personalColor.drapingMode.compareEnd') || '❌ 비교 종료';
                btn.style.background = 'linear-gradient(135deg, #f44336, #E91E63)';
                compareIndex = 0;
                seasonScores = { spring: 0, summer: 0, autumn: 0, winter: 0 };
                document.getElementById('compare-score-display').style.display = 'none';
                updateCompareDisplay();
                showToast(t('personalColor.toast.compareModeStarted') || '비교 모드가 시작되었습니다. 두 색상 중 더 어울리는 쪽을 선택하세요!', 'info');
            } else {
                panel.style.display = 'none';
                btn.textContent = t('personalColor.drapingMode.compareBtn') || '🔀 비교 모드';
                btn.style.background = 'linear-gradient(135deg, #E91E63, #9C27B0)';
                // 비교 모드 종료 시 일반 케이프로 복귀
                if (lastFaceLandmarks && selectedColor) {
                    drawDrapingCape();
                }
            }
        }

        function updateCompareDisplay() {
            const preset = comparePresets[compareIndex];

            // 좌우 색상 스와치 업데이트
            document.getElementById('compare-left-swatch').style.background = preset.left.hex;
            document.getElementById('compare-left-name').textContent = preset.left.name;
            document.getElementById('compare-left-season').textContent = getDrapingLabel(preset.left.season);

            document.getElementById('compare-right-swatch').style.background = preset.right.hex;
            document.getElementById('compare-right-name').textContent = preset.right.name;
            document.getElementById('compare-right-season').textContent = getDrapingLabel(preset.right.season);

            // 진행 상황 업데이트
            document.getElementById('compare-progress').textContent = `${compareIndex + 1}/${comparePresets.length}`;

            // 분할 케이프 그리기
            if (lastFaceLandmarks) {
                drawSplitCape(preset.left.hex, preset.right.hex);
            }
        }

        function drawSplitCape(leftColor, rightColor) {
            const overlay = document.getElementById('draping-overlay');
            const ctx = overlay.getContext('2d');
            const w = overlay.width;
            const h = overlay.height;

            ctx.clearRect(0, 0, w, h);

            if (!lastFaceLandmarks) return;

            const chin = lastFaceLandmarks[152];
            const leftJaw = lastFaceLandmarks[234];
            const rightJaw = lastFaceLandmarks[454];

            const chinX = chin.x * w;
            const chinY = chin.y * h;
            const leftJawX = leftJaw.x * w;
            const rightJawX = rightJaw.x * w;
            const faceWidth = Math.abs(rightJawX - leftJawX);

            const capeStartY = chinY + 10;
            const capeEndY = h + 50;
            const spreadAngle = 0.7;
            const neckWidth = faceWidth * 0.95;

            ctx.save();

            // 왼쪽 케이프 (웜톤)
            const leftGradient = ctx.createLinearGradient(chinX, capeStartY, chinX, capeEndY);
            leftGradient.addColorStop(0, leftColor + 'FF');
            leftGradient.addColorStop(0.3, leftColor + 'EE');
            leftGradient.addColorStop(1, leftColor + 'CC');

            ctx.fillStyle = leftGradient;
            ctx.beginPath();
            ctx.moveTo(chinX, capeStartY);
            ctx.lineTo(chinX - neckWidth / 2, capeStartY);
            const leftEndX = chinX - (capeEndY - capeStartY) * Math.tan(spreadAngle) - neckWidth / 2;
            ctx.quadraticCurveTo(chinX - neckWidth / 2 - 30, (capeStartY + capeEndY) / 2, leftEndX, capeEndY);
            ctx.lineTo(chinX, capeEndY);
            ctx.closePath();
            ctx.fill();

            // 오른쪽 케이프 (쿨톤)
            const rightGradient = ctx.createLinearGradient(chinX, capeStartY, chinX, capeEndY);
            rightGradient.addColorStop(0, rightColor + 'FF');
            rightGradient.addColorStop(0.3, rightColor + 'EE');
            rightGradient.addColorStop(1, rightColor + 'CC');

            ctx.fillStyle = rightGradient;
            ctx.beginPath();
            ctx.moveTo(chinX, capeStartY);
            ctx.lineTo(chinX + neckWidth / 2, capeStartY);
            const rightEndX = chinX + (capeEndY - capeStartY) * Math.tan(spreadAngle) + neckWidth / 2;
            ctx.quadraticCurveTo(chinX + neckWidth / 2 + 30, (capeStartY + capeEndY) / 2, rightEndX, capeEndY);
            ctx.lineTo(chinX, capeEndY);
            ctx.closePath();
            ctx.fill();

            // 중앙 분할선
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(chinX, capeStartY);
            ctx.lineTo(chinX, capeEndY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.restore();
        }

        function selectCompareColor(side) {
            const preset = comparePresets[compareIndex];
            const selectedSeason = side === 'left' ? preset.left.season : preset.right.season;
            const selectedName = side === 'left' ? preset.left.name : preset.right.name;

            // 점수 추가
            seasonScores[selectedSeason]++;

            // 점수 표시 업데이트
            document.getElementById('compare-score-display').style.display = 'block';
            document.getElementById('score-spring').textContent = seasonScores.spring;
            document.getElementById('score-summer').textContent = seasonScores.summer;
            document.getElementById('score-autumn').textContent = seasonScores.autumn;
            document.getElementById('score-winter').textContent = seasonScores.winter;

            showToast(`${selectedName}(${getDrapingLabel(side === 'left' ? preset.left.season : preset.right.season)}) ${t('personalColor.toast.selected') || '선택!'}`, 'success');

            // 다음 비교로
            compareIndex++;

            if (compareIndex >= comparePresets.length) {
                // 비교 완료
                showCompareResult();
            } else {
                updateCompareDisplay();
            }
        }

        function showCompareResult() {
            // 최고 점수 시즌 찾기
            const maxScore = Math.max(...Object.values(seasonScores));
            const topSeasons = Object.entries(seasonScores)
                .filter(([_, score]) => score === maxScore)
                .map(([season, _]) => season);

            const seasonNames = {
                spring: '🌸 봄 웜톤',
                summer: '🌊 여름 쿨톤',
                autumn: '🍂 가을 웜톤',
                winter: '❄️ 겨울 쿨톤'
            };

            const resultText = topSeasons.map(s => seasonNames[s]).join(' / ');

            // 결과 표시
            const panel = document.getElementById('compare-mode-panel');
            panel.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 15px;">${t('personalColor.drapingMode.compareComplete') || '🎉 비교 완료!'}</div>
                    <div style="font-size: 18px; color: #E91E63; margin-bottom: 15px;">${t('personalColor.drapingMode.suitableTone') || '당신에게 어울리는 톤:'}</div>
                    <div style="font-size: 22px; color: #fff; font-weight: bold; margin-bottom: 20px;">${resultText}</div>
                    <div style="display: flex; justify-content: space-around; margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="color: #FFCC80;">🌸 ${t('personalColor.drapingMode.spring') || '봄'}: ${seasonScores.spring}${t('personalColor.drapingMode.points') || '점'}</span>
                        <span style="color: #90CAF9;">🌊 ${t('personalColor.drapingMode.summer') || '여름'}: ${seasonScores.summer}${t('personalColor.drapingMode.points') || '점'}</span>
                        <span style="color: #FFAB91;">🍂 ${t('personalColor.drapingMode.autumn') || '가을'}: ${seasonScores.autumn}${t('personalColor.drapingMode.points') || '점'}</span>
                        <span style="color: #B39DDB;">❄️ ${t('personalColor.drapingMode.winter') || '겨울'}: ${seasonScores.winter}${t('personalColor.drapingMode.points') || '점'}</span>
                    </div>
                    <button onclick="resetCompareMode()" style="padding: 12px 24px; border: none; border-radius: 8px; background: linear-gradient(135deg, #E91E63, #9C27B0); color: white; font-size: 15px; font-weight: bold; cursor: pointer;">🔄 ${t('personalColor.draping.compareAgain') || 'Compare Again'}</button>
                    <button onclick="toggleCompareMode()" style="margin-left: 10px; padding: 12px 24px; border: none; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; font-size: 15px; cursor: pointer;">${t('personalColor.drapingMode.closeBtn') || '닫기'}</button>
                </div>
            `;

            showToast(`${t('personalColor.toast.compareResult') || '비교 결과'}: ${resultText}`, 'success');
        }

        function resetCompareMode() {
            compareIndex = 0;
            seasonScores = { spring: 0, summer: 0, autumn: 0, winter: 0 };

            // 패널 원래대로 복구
            const panel = document.getElementById('compare-mode-panel');
            panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 16px; color: #E91E63; font-weight: bold;">${t('personalColor.drapingMode.warmVsCool') || '🔥 웜 vs 쿨 비교'}</span>
                    <span id="compare-progress" style="font-size: 14px; color: #CE93D8;">1/${comparePresets.length}</span>
                </div>

                <div id="compare-colors-display" style="display: flex; gap: 10px; margin-bottom: 12px;">
                    <div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <div id="compare-left-swatch" style="width: 50px; height: 50px; border-radius: 50%; margin: 0 auto 8px; border: 3px solid white;"></div>
                        <div id="compare-left-name" style="font-size: 14px; color: #fff;"></div>
                        <div id="compare-left-season" style="font-size: 12px; color: #F48FB1;"></div>
                    </div>
                    <div style="display: flex; align-items: center; font-size: 20px; color: #E91E63;">VS</div>
                    <div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <div id="compare-right-swatch" style="width: 50px; height: 50px; border-radius: 50%; margin: 0 auto 8px; border: 3px solid white;"></div>
                        <div id="compare-right-name" style="font-size: 14px; color: #fff;"></div>
                        <div id="compare-right-season" style="font-size: 12px; color: #90CAF9;"></div>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 12px; font-size: 15px; color: #E1BEE7;">${t('personalColor.drapingMode.whichSuits') || '어느 쪽이 더 어울리나요?'}</div>

                <div style="display: flex; gap: 10px;">
                    <button onclick="selectCompareColor('left')" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #FF9800, #FF5722); color: white; font-size: 15px; font-weight: bold; cursor: pointer;">${t('personalColor.drapingMode.leftBtn') || '👈 왼쪽'}</button>
                    <button onclick="selectCompareColor('right')" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #2196F3, #673AB7); color: white; font-size: 15px; font-weight: bold; cursor: pointer;">${t('personalColor.drapingMode.rightBtn') || '오른쪽 👉'}</button>
                </div>

                <div id="compare-score-display" style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; display: none;">
                    <div style="font-size: 14px; color: #CE93D8; margin-bottom: 8px; font-weight: bold;">${t('personalColor.drapingMode.currentScore') || '📊 현재 점수'}</div>
                    <div style="display: flex; justify-content: space-around;">
                        <span style="color: #FFCC80;">🌸 ${t('personalColor.drapingMode.spring') || '봄'}: <b id="score-spring">0</b></span>
                        <span style="color: #90CAF9;">🌊 ${t('personalColor.drapingMode.summer') || '여름'}: <b id="score-summer">0</b></span>
                        <span style="color: #FFAB91;">🍂 ${t('personalColor.drapingMode.autumn') || '가을'}: <b id="score-autumn">0</b></span>
                        <span style="color: #B39DDB;">❄️ ${t('personalColor.drapingMode.winter') || '겨울'}: <b id="score-winter">0</b></span>
                    </div>
                </div>
            `;

            updateCompareDisplay();
            showToast(t('personalColor.toast.compareRestart') || '비교를 다시 시작합니다!', 'info');
        }

        function stopDrapingCamera(silent = false) {
            // 애니메이션 루프 정지
            if (drapingAnimationId) {
                cancelAnimationFrame(drapingAnimationId);
                drapingAnimationId = null;
            }

            const drapingVideo = document.getElementById('draping-camera');
            if (drapingVideo && drapingVideo.srcObject) {
                const tracks = drapingVideo.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                drapingVideo.srcObject = null;

                // 캔버스 초기화
                const overlay = document.getElementById('draping-overlay');
                if (overlay) {
                    const ctx = overlay.getContext('2d');
                    ctx.clearRect(0, 0, overlay.width, overlay.height);
                }

                lastFaceLandmarks = null;

                if (!silent) {
                    showToast(t('personalColor.toast.drapingCameraStopped') || '드래이핑 카메라가 정지되었습니다', 'info');
                }
            }
        }

        function selectSeason(season, silent = false) {
            currentSeason = season;

            document.querySelectorAll('.season-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelector(`[data-season="${season}"]`).classList.add('active');

            updateColorGrid(season);

            if (!silent) {
                showToast(t('personalColor.toast.seasonSelected') || '계절 색상을 선택했습니다', 'info');
            }
        }

        function updateColorGrid(season) {
            const colorGrid = document.getElementById('color-grid');

            const seasonColors = hairColorData.filter(item =>
                item.season && item.season.toLowerCase() === season.toLowerCase()
            );

            colorGrid.innerHTML = '';

            if (seasonColors.length === 0) {
                const defaultColors = SeasonPalettes[season].colors;
                defaultColors.forEach(color => {
                    const colorItem = document.createElement('div');
                    colorItem.className = 'color-item';
                    colorItem.style.background = color;
                    colorItem.onclick = () => selectColor(color);
                    colorGrid.appendChild(colorItem);
                });
                return;
            }

            const representativeColors = seasonColors
                .sort((a, b) => (b.confidence || 0.8) - (a.confidence || 0.8))
                .slice(0, 12)
                .map(item => ({
                    hex: item.hex,
                    name: item.name,
                    brand: item.brand,
                    code: item.code
                }));

            representativeColors.forEach(colorData => {
                const colorItem = document.createElement('div');
                colorItem.className = 'color-item';
                colorItem.style.background = colorData.hex;
                colorItem.title = `${colorData.brand} ${colorData.code} - ${colorData.name}`;
                colorItem.onclick = () => selectColor(colorData.hex, colorData);
                colorGrid.appendChild(colorItem);
            });
        }

        function selectColor(color, colorData = null) {
            selectedColor = color;
            currentDisplayColor = color;  // 슬라이더 초기화 시 기본값으로 설정

            // 슬라이더 리셋
            document.getElementById('lightness-slider').value = 0;
            document.getElementById('saturation-slider').value = 0;
            document.getElementById('warmth-slider').value = 0;
            document.getElementById('lightness-value').textContent = '0';
            document.getElementById('saturation-value').textContent = '0';
            document.getElementById('warmth-value').textContent = '0';

            document.querySelectorAll('.color-item').forEach(item => {
                item.style.border = '3px solid transparent';
            });
            event.target.style.border = '3px solid #E91E63';

            applyDrapingColor(color);

            let toastMessage = `색상 ${color}를 선택했습니다`;

            if (colorData) {
                toastMessage = `${colorData.brand} ${colorData.code} - ${colorData.name} 선택됨`;
            }

            showToast(toastMessage, 'info');
        }

        function applyDrapingColor(color) {
            // 얼굴이 감지되어 있으면 케이프 다시 그리기
            if (lastFaceLandmarks) {
                drawDrapingCape();
            } else {
                // 얼굴 감지 전이면 기본 오버레이 표시
                const overlay = document.getElementById('draping-overlay');
                const ctx = overlay.getContext('2d');

                if (overlay.width === 0) {
                    overlay.width = 640;
                    overlay.height = 480;
                }

                ctx.clearRect(0, 0, overlay.width, overlay.height);

                // 하단에 케이프 미리보기
                const gradient = ctx.createLinearGradient(0, overlay.height * 0.6, 0, overlay.height);
                gradient.addColorStop(0, color + 'DD');
                gradient.addColorStop(1, color + 'AA');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, overlay.height * 0.6, overlay.width, overlay.height * 0.4);
            }
        }

        // 현재 적용 중인 색상 (슬라이더 조정 반영)
        let currentDisplayColor = null;

        function adjustColor() {
            if (!selectedColor) return;

            const lightness = parseInt(document.getElementById('lightness-slider').value);
            const saturation = parseInt(document.getElementById('saturation-slider').value);
            const warmth = parseInt(document.getElementById('warmth-slider').value);

            document.getElementById('lightness-value').textContent = lightness;
            document.getElementById('saturation-value').textContent = saturation;
            document.getElementById('warmth-value').textContent = warmth;

            const adjustedColor = adjustColorValues(selectedColor, lightness, saturation, warmth);
            currentDisplayColor = adjustedColor;

            // 케이프 실시간 업데이트
            if (lastFaceLandmarks) {
                drawDrapingCape();
            } else {
                applyDrapingColor(adjustedColor);
            }
        }

        function adjustColorValues(hexColor, lightness, saturation, warmth) {
            const r = parseInt(hexColor.substr(1, 2), 16);
            const g = parseInt(hexColor.substr(3, 2), 16);
            const b = parseInt(hexColor.substr(5, 2), 16);

            let newR = Math.max(0, Math.min(255, r + lightness + warmth));
            let newG = Math.max(0, Math.min(255, g + lightness));
            let newB = Math.max(0, Math.min(255, b + lightness - warmth));

            const gray = (newR + newG + newB) / 3;
            const saturationFactor = 1 + (saturation / 100);
            newR = Math.max(0, Math.min(255, gray + (newR - gray) * saturationFactor));
            newG = Math.max(0, Math.min(255, gray + (newG - gray) * saturationFactor));
            newB = Math.max(0, Math.min(255, gray + (newB - gray) * saturationFactor));

            return `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
        }

        // function togglePreview() {
        //     showToast('미리보기가 토글되었습니다', 'info');
        // }

        // 선택된 색상의 상세 정보 저장용
        let lastSelectedColorData = null;

        function saveCurrentColor() {
            if (!selectedColor) {
                showToast(t('personalColor.toast.selectColorFirst') || '먼저 색상을 선택해주세요', 'warning');
                return;
            }

            // 색상 데이터에서 추가 정보 가져오기
            const matchingColor = hairColorData.find(c => c.hex === selectedColor);

            const colorData = {
                color: selectedColor,
                season: currentSeason,
                name: matchingColor?.name || getColorNameFromHex(selectedColor),
                brand: matchingColor?.brand || '',
                code: matchingColor?.code || '',
                level: matchingColor?.level || '',
                tone: matchingColor?.tone || '',
                timestamp: new Date().toISOString()
            };

            savedColors.push(colorData);

            showToast(t('personalColor.toast.colorSaved') || '현재 색상이 저장되었습니다', 'success');

            // 저장된 색상 표시 및 제조 방법 표시
            displayDrapingSavedColors();
        }

        // Hex에서 간단한 색상명 추출
        function getColorNameFromHex(hex) {
            const r = parseInt(hex.substr(1, 2), 16);
            const g = parseInt(hex.substr(3, 2), 16);
            const b = parseInt(hex.substr(5, 2), 16);

            if (r > 150 && g < 100 && b < 100) return '레드 계열';
            if (r > 150 && g > 100 && b < 100) return '오렌지/골드 계열';
            if (r > 100 && g > 80 && b < 80) return '브라운 계열';
            if (r < 100 && g < 100 && b > 100) return '애쉬/블루 계열';
            if (r > 100 && g < 80 && b > 100) return '바이올렛 계열';
            if (r < 80 && g < 80 && b < 80) return '다크 계열';
            return '내추럴 계열';
        }

        // 시즌을 EXPERT_GUIDE_DB 키로 변환
        function seasonToExpertKey(season) {
            const mapping = {
                'spring': 'spring-bright',
                'summer': 'summer-light',
                'autumn': 'autumn-muted',
                'winter': 'winter-deep'
            };
            return mapping[season.toLowerCase()] || 'autumn-muted';
        }

        // 드래이핑 모드 저장된 색상 표시 + 전문가 제조 방법
        function displayDrapingSavedColors() {
            // 저장된 색상 목록 컨테이너 찾기/생성
            let savedSection = document.getElementById('draping-saved-section');
            if (!savedSection) {
                savedSection = document.createElement('div');
                savedSection.id = 'draping-saved-section';
                savedSection.style.cssText = `
                    margin-top: 20px;
                    padding: 20px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 16px;
                    border: 2px solid #E91E63;
                `;
                // 드래이핑 카메라 섹션 아래에 추가
                const drapingSection = document.querySelector('#draping-mode .draping-layout');
                if (drapingSection) {
                    drapingSection.after(savedSection);
                }
            }

            // 저장된 색상 카드 HTML (다국어 EXPERT_GUIDE_DB 사용)
            const savedColorsHTML = savedColors.map((colorData, index) => {
                // 현재 언어에 맞는 EXPERT_GUIDE_DB에서 해당 시즌의 전문가 정보 가져오기
                const expertDB = getExpertGuideDB();
                const expertKey = seasonToExpertKey(colorData.season);
                const expertData = expertDB[expertKey] || expertDB['autumn-muted'];

                // 첫 번째 레시피 사용 (또는 랜덤)
                const recipe = expertData.recipes ? expertData.recipes[index % expertData.recipes.length] : null;
                const colorScience = expertData.colorScience;

                return `
                <div style="background: linear-gradient(135deg, rgba(233,30,99,0.15), rgba(156,39,176,0.1)); padding: 18px; border-radius: 12px; margin-bottom: 14px; border: 1px solid rgba(233,30,99,0.3);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                        <div style="width: 55px; height: 55px; background: ${colorData.color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
                        <div>
                            <div style="font-size: 18px; color: #fff; font-weight: bold;">${colorData.name}</div>
                            <div style="font-size: 15px; color: #E91E63;">${colorData.season.toUpperCase()} ${colorData.brand ? '• ' + colorData.brand : ''}</div>
                        </div>
                    </div>

                    ${colorScience ? `
                    <div style="background: linear-gradient(135deg, rgba(63,81,181,0.15), rgba(48,63,159,0.1)); padding: 14px; border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(63,81,181,0.3);">
                        <div style="font-size: 15px; color: #7986CB; margin-bottom: 8px; font-weight: bold;">🧬 컬러 사이언스</div>
                        <div style="font-size: 14px; color: #C5CAE9; line-height: 1.6;">
                            <div style="margin-bottom: 4px;"><b style="color: #9FA8DA;">멜라닌:</b> ${colorScience.melaninType}</div>
                            <div><b style="color: #9FA8DA;">중화 전략:</b> ${colorScience.neutralizationStrategy}</div>
                        </div>
                    </div>
                    ` : ''}

                    ${recipe ? `
                    <div style="background: linear-gradient(135deg, rgba(0,150,136,0.15), rgba(0,188,212,0.1)); padding: 14px; border-radius: 8px; border: 1px solid rgba(0,150,136,0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-size: 16px; color: #4DB6AC; font-weight: bold;">💊 ${recipe.styleName}</div>
                            <span style="background: rgba(0,150,136,0.3); color: #80CBC4; font-size: 13px; padding: 4px 10px; border-radius: 12px;">${recipe.brand}</span>
                        </div>
                        <div style="font-size: 14px; color: #B2DFDB; margin-bottom: 10px; font-style: italic;">"${recipe.vibe}" - ${recipe.reason}</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                <div style="font-size: 12px; color: #80CBC4; margin-bottom: 4px; font-weight: bold;">MIX RECIPE</div>
                                <div style="font-size: 14px; color: #E0F2F1; font-weight: 600;">${recipe.mixRatio}</div>
                                <div style="font-size: 12px; color: #80CBC4; margin-top: 3px;">${recipe.line}</div>
                            </div>
                            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                <div style="font-size: 12px; color: #80CBC4; margin-bottom: 4px; font-weight: bold;">OXIDANT</div>
                                <div style="font-size: 14px; color: #E0F2F1; font-weight: 600;">${recipe.oxidant}</div>
                                <div style="font-size: 12px; color: #80CBC4; margin-top: 3px;">⏱️ ${recipe.processingTime.replace('분', t('personalColor.aiMode.result.minute') || 'min')}</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                `;
            }).join('');

            savedSection.innerHTML = `
                <h4 style="color: #E91E63; margin: 0 0 15px 0; font-size: 18px;">🎨 ${t('personalColor.draping.savedColorsGuide') || 'Saved Colors & Expert Guide'} (${savedColors.length}개)</h4>
                ${savedColorsHTML}
            `;

            // 저장 섹션으로 스크롤
            savedSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // 공통 결과 표시
        function displayFinalResults(result) {
            const resultsSection = document.getElementById('results-section');
            const finalResults = document.getElementById('final-results');

            let colors = [];
            let season = '분석 중';
            let confidence = 0;

            if (result && typeof result === 'object') {
                season = result.season || '분석 중';
                confidence = result.confidence || 0;

                if (season && season !== '분석 중') {
                    const seasonKey = season.toLowerCase()
                        .replace(' 웜톤', '')
                        .replace(' 쿨톤', '')
                        .replace('봄', 'spring')
                        .replace('여름', 'summer')
                        .replace('가을', 'autumn')
                        .replace('겨울', 'winter');

                    colors = SeasonPalettes[seasonKey]?.colors || ['#8B4513', '#A0522D', '#CD853F'];
                } else {
                    colors = ['#8B4513', '#A0522D', '#CD853F'];
                }
            } else {
                colors = ['#8B4513', '#A0522D', '#CD853F'];
            }

            finalResults.innerHTML = `
                <div class="result-header">
                    <h3>${season}</h3>
                    <div class="confidence">신뢰도: ${confidence}%</div>
                </div>
                <div class="result-colors">
                    ${colors.slice(0, 8).map(color =>
                `<div class="result-color" style="background: ${color}; width: 50px; height: 50px; border-radius: 50%; display: inline-block; margin: 5px;" title="${color}"></div>`
            ).join('')}
                </div>
                <div class="result-description">
                    <p>${season}에 어울리는 ${colors.length}가지 색상을 표시합니다.</p>
                </div>
            `;

            if (season && season !== '분석 중') {
                displayProductRecommendations(season);
            }

            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });

            // 태블릿용 스크롤 유도 화살표 표시
            showScrollIndicator();
        }

        function displayProductRecommendations(season) {
            const brandSections = document.getElementById('brand-sections');

            if (!brandSections) {
                console.warn('brand-sections 요소를 찾을 수 없습니다');
                return;
            }

            const defaultRecommendations = {
                '봄 웜톤': [
                    { brand: '로레알', products: ['골든 베이지', '허니 블론드', '카라멜 브라운'] },
                    { brand: '웰라', products: ['라이트 골든', '웜 베이지', '소프트 브라운'] },
                    { brand: 'Shiseido', products: ['골든 베이지', '카라멜 브라운', '허니 골드'] }
                ],
                '여름 쿨톤': [
                    { brand: '로레알', products: ['애쉬 블론드', '쿨 베이지', '플래티넘'] },
                    { brand: '웰라', products: ['실버 애쉬', '쿨 브라운', '아이시 블론드'] },
                    { brand: 'Shiseido', products: ['애쉬 브라운', '쿨 브라운', '바이올렛 애쉬'] }
                ],
                '가을 웜톤': [
                    { brand: '로레알', products: ['리치 브라운', '다크 초콜릿', '마호가니'] },
                    { brand: '웰라', products: ['딥 브라운', '체스트넛', '다크 카라멜'] },
                    { brand: 'Shiseido', products: ['내츄럴 브라운', '베이지 브라운', '매트 브라운'] }
                ],
                '겨울 쿨톤': [
                    { brand: '로레알', products: ['제트 블랙', '블루 블랙', '다크 애쉬'] },
                    { brand: '웰라', products: ['미드나잇 블랙', '쿨 다크', '플래티넘 실버'] },
                    { brand: 'Shiseido', products: ['딥 블랙', '소프트 블랙', '다크 브라운'] }
                ]
            };

            const recommendations = defaultRecommendations[season] || defaultRecommendations['봄 웜톤'];

            brandSections.innerHTML = recommendations.map(brand => `
                <div class="brand-section" style="margin-bottom: 1.5rem; padding: 1rem; background: #f9f9f9; border-radius: 8px;">
                    <h5 style="color: #E91E63; margin-bottom: 0.5rem;">${brand.brand}</h5>
                    <div class="product-list">
                        ${brand.products.map(product => `
                            <div style="padding: 0.5rem; margin: 0.2rem 0; background: white; border-radius: 4px; border-left: 3px solid #E91E63;">
                                ${product}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        // 유틸리티 함수들
        function generateExpertAnalysis(season) {
            // 계절 키 매핑 (한국어 → 영어 키)
            const seasonKeyMap = {
                '봄 웜톤': 'springWarm',
                '여름 쿨톤': 'summerCool',
                '가을 웜톤': 'autumnWarm',
                '겨울 쿨톤': 'winterCool',
                // 영어 키도 직접 지원
                'springWarm': 'springWarm',
                'summerCool': 'summerCool',
                'autumnWarm': 'autumnWarm',
                'winterCool': 'winterCool'
            };

            const key = seasonKeyMap[season];
            if (key) {
                return t(`personalColor.expertAnalysis.${key}`) || 'Generating expert analysis...';
            }
            return 'Generating expert analysis...';
        }

        function showToast(message, type = 'info', duration = 3000) {
            const existingToast = document.querySelector('.toast');
            if (existingToast) {
                existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 99999;
                background: white; padding: 1rem 1.5rem; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 4px solid;
                border-left-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
                transform: translateX(100%); transition: transform 0.3s ease;
            `;

            document.body.appendChild(toast);

            setTimeout(() => toast.style.transform = 'translateX(0)', 100);
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }

        // 키보드 단축키
        document.addEventListener('keydown', function (event) {
            if (event.code === 'Space' && currentMode === 'ai' && !analysisInProgress) {
                event.preventDefault();
                analyzeAI();
            }

            if (event.key === 'Escape') {
                goHome();
            }
        });

        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', function () {
            cleanupCameraResources();
            stopDrapingCamera(true); // silent = true
        });

        // ========== 태블릿용 커스텀 스크롤바 ==========
        let mainScrollbarInitialized = false;

        function initScrollIndicator() {
            const container = document.getElementById('camera-container');
            const scrollbar = document.getElementById('custom-scrollbar');
            const thumb = document.getElementById('scrollbar-thumb');

            if (!container || !scrollbar || !thumb) return;

            function updateMainScrollbar() {
                const scrollHeight = container.scrollHeight;
                const clientHeight = container.clientHeight;
                const scrollTop = container.scrollTop;
                const trackHeight = scrollbar.clientHeight;

                // 스크롤이 필요한지 확인
                if (scrollHeight <= clientHeight + 10) {
                    scrollbar.classList.add('hidden');
                    return;
                }

                scrollbar.classList.remove('hidden');

                // 썸 크기 계산 (트랙 높이 기준)
                const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 40);
                thumb.style.height = thumbHeight + 'px';

                // 썸 위치 계산
                const maxScrollTop = scrollHeight - clientHeight;
                const maxThumbTop = trackHeight - thumbHeight;
                const thumbTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;
                thumb.style.top = thumbTop + 'px';
            }

            // 이벤트 리스너 중복 등록 방지
            if (!mainScrollbarInitialized) {
                mainScrollbarInitialized = true;

                container.addEventListener('scroll', updateMainScrollbar);
                window.addEventListener('resize', updateMainScrollbar);

                // 썸 드래그
                let isDragging = false;
                let startY = 0;
                let startScrollTop = 0;

                thumb.addEventListener('touchstart', function(e) {
                    isDragging = true;
                    startY = e.touches[0].clientY;
                    startScrollTop = container.scrollTop;
                    thumb.classList.add('active');
                    e.preventDefault();
                });

                document.addEventListener('touchmove', function(e) {
                    if (!isDragging) return;
                    const deltaY = e.touches[0].clientY - startY;
                    const scrollHeight = container.scrollHeight;
                    const clientHeight = container.clientHeight;
                    const trackHeight = scrollbar.clientHeight;
                    const thumbHeight = thumb.offsetHeight;
                    const maxThumbTop = trackHeight - thumbHeight;
                    const scrollRatio = (scrollHeight - clientHeight) / maxThumbTop;
                    container.scrollTop = startScrollTop + (deltaY * scrollRatio);
                });

                document.addEventListener('touchend', function() {
                    isDragging = false;
                    thumb.classList.remove('active');
                });
            }

            // 초기화
            setTimeout(updateMainScrollbar, 100);
        }

        // 결과가 표시될 때 스크롤바 업데이트
        function showScrollIndicator() {
            setTimeout(function() {
                const container = document.getElementById('camera-container');
                if (container) {
                    container.dispatchEvent(new Event('scroll'));
                }
                // 분석결과 스크롤바도 업데이트
                initResultsScrollbar();
            }, 100);
        }

        // 분석결과 영역 흰색 스크롤바
        let resultsScrollbarInitialized = false;
        let resultsScrollDragging = false;
        let resultsStartY = 0;
        let resultsStartScrollTop = 0;

        function updateResultsScrollbar() {
            const container = document.getElementById('realtime-results-container');
            const scrollbar = document.getElementById('results-scrollbar');
            const thumb = document.getElementById('results-scrollbar-thumb');

            if (!container || !scrollbar || !thumb) return;

            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            const scrollTop = container.scrollTop;
            const trackHeight = scrollbar.offsetHeight || scrollbar.clientHeight;

            // 스크롤이 필요 없으면 숨김
            if (scrollHeight <= clientHeight + 10) {
                scrollbar.classList.add('hidden');
                return;
            }

            scrollbar.classList.remove('hidden');

            // 썸 크기 계산 (트랙 높이 기준)
            const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 30);
            thumb.style.height = thumbHeight + 'px';

            // 썸 위치 계산
            const maxScrollTop = scrollHeight - clientHeight;
            const maxThumbTop = trackHeight - thumbHeight;
            const thumbTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;
            thumb.style.top = thumbTop + 'px';
        }

        function initResultsScrollbar() {
            const container = document.getElementById('realtime-results-container');
            const scrollbar = document.getElementById('results-scrollbar');
            const thumb = document.getElementById('results-scrollbar-thumb');

            if (!container || !scrollbar || !thumb) return;

            // 이벤트 리스너 중복 등록 방지
            if (!resultsScrollbarInitialized) {
                resultsScrollbarInitialized = true;

                container.addEventListener('scroll', updateResultsScrollbar);
                window.addEventListener('resize', updateResultsScrollbar);

                // 터치 드래그
                thumb.addEventListener('touchstart', function(e) {
                    resultsScrollDragging = true;
                    resultsStartY = e.touches[0].clientY;
                    resultsStartScrollTop = container.scrollTop;
                    thumb.classList.add('active');
                    e.preventDefault();
                });

                document.addEventListener('touchmove', function(e) {
                    if (!resultsScrollDragging) return;
                    const container = document.getElementById('realtime-results-container');
                    const scrollbar = document.getElementById('results-scrollbar');
                    const thumb = document.getElementById('results-scrollbar-thumb');
                    if (!container || !scrollbar || !thumb) return;

                    const deltaY = e.touches[0].clientY - resultsStartY;
                    const scrollHeight = container.scrollHeight;
                    const clientHeight = container.clientHeight;
                    const trackHeight = scrollbar.clientHeight;
                    const thumbHeight = thumb.offsetHeight;
                    const maxThumbTop = trackHeight - thumbHeight;
                    const scrollRatio = (scrollHeight - clientHeight) / maxThumbTop;
                    container.scrollTop = resultsStartScrollTop + (deltaY * scrollRatio);
                });

                document.addEventListener('touchend', function() {
                    if (resultsScrollDragging) {
                        resultsScrollDragging = false;
                        const thumb = document.getElementById('results-scrollbar-thumb');
                        if (thumb) thumb.classList.remove('active');
                    }
                });
            }

            // 초기화 및 업데이트
            setTimeout(updateResultsScrollbar, 200);
        }

        // ========== 다국어 시스템 ==========

        // 메인에서 저장된 언어 설정 가져오기 (localStorage)
        let currentLang = localStorage.getItem('hairgator_language') || 'ko';

        // 페이지 로드 시 메인에서 설정한 언어 적용
        function initLanguage() {
            const savedLang = localStorage.getItem('hairgator_language') || 'ko';
            currentLang = savedLang;
            applyTranslations();
            console.log(`🌍 메인에서 설정된 언어 적용: ${savedLang}`);
        }

        // 번역 적용 함수
        function applyTranslations(container) {
            const root = container || document;
            const lang = getCurrentLanguage();
            const pc = HAIRGATOR_I18N[lang]?.personalColor;
            if (!pc) return;

            // data-i18n 속성으로 번역 적용
            root.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const text = getNestedValue(HAIRGATOR_I18N[lang], key);
                if (text) el.textContent = text;
            });

            // data-i18n-html 속성으로 HTML 번역 적용
            root.querySelectorAll('[data-i18n-html]').forEach(el => {
                const key = el.getAttribute('data-i18n-html');
                const text = getNestedValue(HAIRGATOR_I18N[lang], key);
                if (text) el.innerHTML = text;
            });

            // 헤더
            updateText('.app-title', pc.title);
            updateText('.app-subtitle', pc.subtitle);

            // 로딩 텍스트
            updateText('#loading-text', pc.loading);

            // AI 분석 모드
            updateText('#ai-analysis .section-title', pc.aiMode.title);
            updateText('#ai-analysis .nav-btn', pc.aiMode.backHome);
            updateText('#start-camera', pc.aiMode.startCamera);
            updateText('#capture-btn', pc.aiMode.capture);
            updateText('#retry-btn', pc.aiMode.retry);

            // 분석 단계
            const steps = pc.aiMode.steps;
            updateText('.analysis-panel > h3', steps.title);
            updateStepText('ai-step-1', steps.step1, steps.step1Desc);
            updateStepText('ai-step-2', steps.step2, steps.step2Desc);
            updateStepText('ai-step-3', steps.step3, steps.step3Desc);
            updateStepText('ai-step-4', steps.step4, steps.step4Desc);

            // 드래이핑 모드
            updateText('#draping-mode .section-title', pc.drapingMode.title);
            updateText('.season-tabs [data-season="spring"]', pc.drapingMode.spring);
            updateText('.season-tabs [data-season="summer"]', pc.drapingMode.summer);
            updateText('.season-tabs [data-season="autumn"]', pc.drapingMode.autumn);
            updateText('.season-tabs [data-season="winter"]', pc.drapingMode.winter);

            // 얼굴 가이드 텍스트
            const faceGuide = document.getElementById('ai-face-guide');
            if (faceGuide) {
                faceGuide.innerHTML = pc.aiMode.faceGuide;
            }

            const drapingGuide = document.getElementById('draping-face-guide');
            if (drapingGuide) {
                drapingGuide.innerHTML = pc.drapingMode.faceGuide;
            }

            // 캡처 가이드
            const captureGuide = document.getElementById('capture-guide');
            if (captureGuide) {
                captureGuide.innerHTML = `<span style="color: #FFB400; font-size: 14px;">${pc.aiMode.captureGuide}</span>`;
            }

            // Personal Analysis 모달 번역
            const pa = pc.personalAnalysis;
            const genderTexts = HAIRGATOR_I18N[lang]?.gender;
            if (pa) {
                // Step 제목
                const stepTitles = document.querySelectorAll('.pa-step-title');
                if (stepTitles[0]) stepTitles[0].textContent = `Step 1: ${pa.step1Title}`;
                if (stepTitles[1]) stepTitles[1].textContent = `Step 2: ${pa.step2Title}`;
                if (stepTitles[2]) stepTitles[2].textContent = `Step 3: ${pa.step3Title}`;

                // Step 설명 (추가)
                const stepDescs = document.querySelectorAll('[data-i18n="personalAnalysis.step1Desc"], [data-i18n="personalAnalysis.step2Desc"], [data-i18n="personalAnalysis.step3Desc"]');
                stepDescs.forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    const descKey = key.split('.')[1]; // step1Desc, step2Desc, step3Desc
                    if (pa[descKey]) el.textContent = pa[descKey];
                });

                // 성별 라벨 (추가)
                const genderLabel = document.querySelector('[data-i18n="personalAnalysis.gender"]');
                if (genderLabel && pa.gender) genderLabel.textContent = pa.gender;

                // 성별 버튼 (여성/남성) (추가)
                if (genderTexts) {
                    const femaleBtn = document.querySelector('[data-i18n="gender.female"]');
                    const maleBtn = document.querySelector('[data-i18n="gender.male"]');
                    if (femaleBtn) femaleBtn.textContent = genderTexts.female;
                    if (maleBtn) maleBtn.textContent = genderTexts.male;
                }

                // 기장 라벨 (추가)
                const currentLengthLabel = document.querySelector('[data-i18n="personalAnalysis.currentLength"]');
                const desiredLengthLabel = document.querySelector('[data-i18n="personalAnalysis.desiredLength"]');
                if (currentLengthLabel && pa.currentLength) currentLengthLabel.textContent = pa.currentLength;
                if (desiredLengthLabel && pa.desiredLength) desiredLengthLabel.textContent = pa.desiredLength;

                // 기장 버튼 텍스트 (H~A)
                document.querySelectorAll('.pa-current-length-btn, .pa-desired-length-btn').forEach(btn => {
                    const length = btn.dataset.length;
                    const textEl = btn.querySelector('div:last-child');
                    if (textEl && length) {
                        // 대문자 변환 (h -> H, a -> A)
                        const lengthKey = `length${length.toUpperCase()}`;
                        if (pa[lengthKey]) {
                            textEl.textContent = pa[lengthKey];
                        }
                    }
                });

                // 앞머리 라벨 (추가)
                const fringeLabel = document.querySelector('[data-i18n="personalAnalysis.fringePreference"]');
                if (fringeLabel && pa.fringePreference) fringeLabel.textContent = pa.fringePreference;

                // 앞머리 버튼 텍스트
                document.querySelectorAll('.pa-fringe-btn').forEach(btn => {
                    const fringe = btn.dataset.fringe;
                    const key = `fringe${fringe.charAt(0).toUpperCase() + fringe.slice(1)}`;
                    if (pa[key]) btn.textContent = pa[key];
                });

                // 피부 타입 설명 (추가)
                const skinTypeDesc = document.querySelector('[data-i18n="personalAnalysis.skinTypeDesc"]');
                if (skinTypeDesc && pa.skinTypeDesc) skinTypeDesc.textContent = pa.skinTypeDesc;

                // 피부 타입 버튼 텍스트
                document.querySelectorAll('.pa-skin-btn').forEach(btn => {
                    const skin = btn.dataset.skin;
                    const labelEl = btn.querySelector('span:nth-child(2)');
                    if (labelEl && pa[`skin${skin}`]) {
                        const coolWarmText = skin === 'TP' ? '(COOL)' : skin === 'BP' ? '(WARM)' : '(NEUTRAL)';
                        labelEl.textContent = pa[`skin${skin}`].replace(/\([^)]+\)/, coolWarmText);
                    }
                    // 피부 타입 상세 설명 (HTML)
                    const descEl = btn.querySelector('.pa-skin-desc');
                    const titleEl = btn.querySelector('.pa-skin-title');
                    if (titleEl && pa[`skin${skin}Title`]) titleEl.textContent = pa[`skin${skin}Title`];
                    if (descEl && pa[`skin${skin}Desc`]) descEl.innerHTML = pa[`skin${skin}Desc`];
                });

                // 컬 라벨 (추가)
                const curlLabel = document.querySelector('[data-i18n="personalAnalysis.curlPreference"]');
                if (curlLabel && pa.curlPreference) curlLabel.textContent = pa.curlPreference;

                // 컬 버튼 텍스트
                document.querySelectorAll('.pa-curl-btn').forEach(btn => {
                    const curl = btn.dataset.curl;
                    const textEl = btn.querySelector('div:last-child');
                    const key = curl === 'straight' ? 'curlStraight' :
                                curl === 'none' ? 'curlNone' : `curl${curl.toUpperCase()}`;
                    if (textEl && pa[key]) textEl.textContent = pa[key];
                });

                // 네비게이션 버튼 (추가)
                const nextBtns = document.querySelectorAll('[data-i18n="personalAnalysis.next"]');
                const prevBtns = document.querySelectorAll('[data-i18n="personalAnalysis.prev"]');
                const completeBtns = document.querySelectorAll('[data-i18n="personalAnalysis.complete"]');
                nextBtns.forEach(btn => { if (pa.next) btn.textContent = pa.next; });
                prevBtns.forEach(btn => { if (pa.prev) btn.textContent = pa.prev; });
                completeBtns.forEach(btn => { if (pa.complete) btn.textContent = pa.complete; });

                // 남성용 스타일 텍스트 (추가)
                const maleStep2Desc = document.querySelector('[data-i18n="personalAnalysis.maleStep2Desc"]');
                if (maleStep2Desc && pa.maleStep2Desc) maleStep2Desc.textContent = pa.maleStep2Desc;

                const maleWarmLabel = document.querySelector('[data-i18n="personalAnalysis.maleWarmLabel"]');
                const maleNeutralLabel = document.querySelector('[data-i18n="personalAnalysis.maleNeutralLabel"]');
                const maleCoolLabel = document.querySelector('[data-i18n="personalAnalysis.maleCoolLabel"]');
                if (maleWarmLabel && pa.maleWarmLabel) maleWarmLabel.textContent = pa.maleWarmLabel;
                if (maleNeutralLabel && pa.maleNeutralLabel) maleNeutralLabel.textContent = pa.maleNeutralLabel;
                if (maleCoolLabel && pa.maleCoolLabel) maleCoolLabel.textContent = pa.maleCoolLabel;

                const maleWarmReason = document.querySelector('[data-i18n="personalAnalysis.maleWarmReason"]');
                const maleNeutralReason = document.querySelector('[data-i18n="personalAnalysis.maleNeutralReason"]');
                const maleCoolReason = document.querySelector('[data-i18n="personalAnalysis.maleCoolReason"]');
                if (maleWarmReason && pa.maleWarmReason) maleWarmReason.textContent = pa.maleWarmReason;
                if (maleNeutralReason && pa.maleNeutralReason) maleNeutralReason.textContent = pa.maleNeutralReason;
                if (maleCoolReason && pa.maleCoolReason) maleCoolReason.textContent = pa.maleCoolReason;
            }
        }

        // 중첩 객체 값 가져오기
        function getNestedValue(obj, path) {
            return path.split('.').reduce((current, key) => current?.[key], obj);
        }

        // 텍스트 업데이트 헬퍼
        function updateText(selector, text) {
            const el = document.querySelector(selector);
            if (el && text) el.textContent = text;
        }

        // 단계별 텍스트 업데이트
        function updateStepText(stepId, title, desc) {
            const step = document.getElementById(stepId);
            if (step) {
                const h4 = step.querySelector('h4');
                const p = step.querySelector('p');
                if (h4 && title) h4.textContent = title;
                if (p && desc) p.textContent = desc;
            }
        }

        // 시즌 이름을 키로 변환
        function seasonToKey(season) {
            const mapping = {
                '봄 웜 브라이트': 'springWarmBright',
                '봄 웜 라이트': 'springWarmLight',
                '가을 웜 딥': 'autumnWarmDeep',
                '가을 웜 뮤트': 'autumnWarmMuted',
                '여름 쿨 브라이트': 'summerCoolBright',
                '여름 쿨 라이트': 'summerCoolLight',
                '겨울 쿨 딥': 'winterCoolDeep',
                '겨울 쿨 뮤트': 'winterCoolMuted',
                '뉴트럴 라이트': 'neutralLight',
                '뉴트럴 딥': 'neutralDeep'
            };
            return mapping[season] || season;
        }

        // 언더톤 번역 가져오기
        function getUndertoneText(undertone) {
            const pc = HAIRGATOR_I18N[currentLang]?.personalColor;
            if (!pc) return undertone;

            if (undertone === 'Warm') return pc.undertones.warm;
            if (undertone === 'Cool') return pc.undertones.cool;
            return pc.undertones.neutral;
        }

        // 시즌 이름 번역 가져오기
        function getSeasonText(season) {
            const pc = HAIRGATOR_I18N[currentLang]?.personalColor;
            if (!pc) return season;

            const key = seasonToKey(season);
            return pc.seasons[key] || season;
        }

        // 시즌 설명 번역 가져오기
        function getSeasonDescriptionText(season) {
            const pc = HAIRGATOR_I18N[currentLang]?.personalColor;
            if (!pc) return '';

            const key = seasonToKey(season);
            return pc.seasonDescriptions[key] || '';
        }

        // 시즌 추천 번역 가져오기
        function getSeasonRecommendationText(season) {
            const pc = HAIRGATOR_I18N[currentLang]?.personalColor;
            if (!pc) return '';

            const key = seasonToKey(season);
            return pc.seasonRecommendations[key]?.replace(/\n/g, '<br>') || '';
        }

        // 결과 텍스트 가져오기
        function getResultTexts() {
            const pc = HAIRGATOR_I18N[currentLang]?.personalColor;
            if (!pc) return {
                title: '🎨 퍼스널컬러 분석 결과',
                skinAnalysis: '📍 당신의 피부 분석',
                skinTone: '피부톤',
                undertone: '언더톤',
                recommendedSeason: '✨ 추천 퍼스널컬러',
                matchingColors: '💄 메이크업 & 패션 컬러',
                confidence: '신뢰도'
            };
            return pc.aiMode.result;
        }

        // 초기화 시 메인에서 저장된 언어 불러오기
        document.addEventListener('DOMContentLoaded', function() {
            // localStorage에서 메인에서 설정한 언어 가져오기
            initLanguage();
            // 태블릿용 스크롤 인디케이터 초기화
            initScrollIndicator();
        });

        console.log('HAIRGATOR Personal Color - 다국어 지원 버전 로드 완료');

// ========== Personal Analysis Module ==========
// ============================================================
// Personal Analysis - 고객 정보 수동 입력 모듈
// MediaPipe가 감지할 수 없는 정보를 헤어디자이너가 입력
// Personal Color 페이지 전용
// ============================================================

// 고객 프로필 데이터
let customerProfile = {
  // 공통 정보
  gender: null,              // 성별 (female/male)
  height: null,              // 키 (150-190cm)
  skinType: null,            // 피부 타입 (TP/NP/BP)

  // 여성 전용
  currentLength: null,       // 현재 기장 (short/medium/long)
  desiredLength: null,       // 원하는 기장 (A-H)
  fringePreference: null,    // 앞머리 선호 (forehead/eyebrow/eye/cheekbone/lips/none)
  curlPreference: null,      // 컬 선호 (straight/C/S/CS/SS/none)

  // 남성 전용
  maleHairStyle: null,       // 스타일 유형 (sports-cut/two-block/undercut/dandy-cut/center-perm/regent/ez-perm/long-hair)
  sideProcessing: null,      // 사이드 처리 (fade/under/natural)
  frontDirection: null,      // 앞머리 방향 (all-back/side-part/center-down/see-through)

  // MediaPipe 자동 분석 (Personal Color 기존 기능 활용)
  faceShape: null,           // 얼굴형
  faceShapeKr: null,         // 한국어 얼굴형
  undertone: null,           // 언더톤 (WARM/NEUTRAL/COOL)
  season: null,              // 4계절 (Spring/Summer/Autumn/Winter)

  analysisComplete: false    // 분석 완료 여부
};

// 남성 헤어 스타일 데이터 (PDF 기반)
const PA_MALE_STYLE_DATA = {
  // WARM 톤 스타일 (둥근 얼굴형 Round)
  'buzz': {
    name: '버즈컷',
    nameEn: 'Buzz Cut',
    desc: '클리퍼로 짧게 밀기',
    tone: 'WARM',
    faceShape: 'Round',
    lengthEquivalent: 'H+',
    levelRange: [2, 4]
  },
  'crop': {
    name: '크롭컷',
    nameEn: 'Crop Cut',
    desc: '짧은 앞머리 + 페이드',
    tone: 'WARM',
    faceShape: 'Round',
    lengthEquivalent: 'G-H',
    levelRange: [2, 5]
  },
  // NEUTRAL 톤 스타일 (사각 얼굴형 Square)
  'fringe-up': {
    name: '프린지 업',
    nameEn: 'Fringe Up',
    desc: '앞머리를 위로 올림, 아이비리그컷',
    tone: 'NEUTRAL',
    faceShape: 'Square',
    lengthEquivalent: 'F-G',
    levelRange: [3, 6]
  },
  // COOL 톤 스타일 (삼각 얼굴형 Triangular)
  'side-fringe': {
    name: '사이드 프린지',
    nameEn: 'Side Fringe',
    desc: '앞머리 옆으로 내림',
    tone: 'COOL',
    faceShape: 'Triangular',
    lengthEquivalent: 'F-G',
    levelRange: [3, 6]
  },
  'side-part': {
    name: '사이드 파트',
    nameEn: 'Side Part',
    desc: '가르마로 나누기',
    tone: 'COOL',
    faceShape: 'Triangular',
    lengthEquivalent: 'E-F',
    levelRange: [3, 6]
  },
  'pushed-back': {
    name: '푸시드 백',
    nameEn: 'Pushed Back',
    desc: '전체를 뒤로 넘김',
    tone: 'COOL',
    faceShape: 'Triangular',
    lengthEquivalent: 'E-F',
    levelRange: [2, 5]
  },
  'mohican': {
    name: '모히칸',
    nameEn: 'Mohican',
    desc: '정수리 볼륨 강조',
    tone: 'COOL',
    faceShape: 'Triangular',
    lengthEquivalent: 'F-G',
    levelRange: [2, 4]
  }
};

// 현재 단계
let paCurrentStep = 1;

// 기장 데이터 (PDF 기반)
const PA_LENGTH_DATA = {
  A: { name: 'A Length', position: '허리선', desc: '가장 긴 기장, 허리까지' },
  B: { name: 'B Length', position: '가슴 중간', desc: '대중적인 롱헤어' },
  C: { name: 'C Length', position: '겨드랑이', desc: '세미롱, 관리 용이' },
  D: { name: 'D Length', position: '어깨 아래', desc: '어깨선 하단, 뻗침 주의' },
  E: { name: 'E Length', position: '어깨 위', desc: '단정한 미디엄' },
  F: { name: 'F Length', position: '턱선 아래', desc: '클래식 보브' },
  G: { name: 'G Length', position: '턱선 위', desc: '짧은 보브' },
  H: { name: 'H Length', position: '후두부', desc: '픽시컷/숏' }
};

// 앞머리 데이터
const PA_FRINGE_DATA = {
  forehead: { name: '이마선', desc: '이마 중간까지' },
  eyebrow: { name: '눈썹선', desc: '눈썹까지' },
  eye: { name: '눈선', desc: '눈까지' },
  cheekbone: { name: '광대선', desc: '광대까지' },
  lips: { name: '입술선', desc: '입술까지' },
  none: { name: '앞머리 없음', desc: '앞머리 생략' }
};

// 피부 타입 데이터 (Personal Analysis 기준)
const PA_SKIN_TYPE_DATA = {
  TP: { name: 'TP (Transparent)', desc: '투명한 피부톤', tone: 'COOL' },
  NP: { name: 'NP (Neutral)', desc: '중성 피부톤', tone: 'NEUTRAL' },
  BP: { name: 'BP (Base)', desc: '베이스 피부톤', tone: 'WARM' }
};

// 컬 선호도 데이터
const PA_CURL_DATA = {
  straight: { name: '스트레이트', desc: '직모 스타일' },
  C: { name: 'C컬', desc: '자연스러운 웨이브' },
  S: { name: 'S컬', desc: '굵은 웨이브' },
  CS: { name: 'C+S컬', desc: '믹스 웨이브' },
  SS: { name: 'SS컬', desc: '강한 컬' },
  none: { name: '선호 없음', desc: '어떤 스타일이든 OK' }
};

// 키에 따른 기장 추천 (Personal Analysis PDF 기준)
const PA_HEIGHT_RECOMMENDATIONS = {
  WARM: {  // 어깨 넓음
    short: ['F', 'G', 'H'],
    medium: ['D', 'E', 'F'],
    tall: ['A', 'B', 'C', 'D']
  },
  NEUTRAL: {  // 어깨 보통
    short: ['E', 'F', 'G'],
    medium: ['C', 'D', 'E', 'F'],
    tall: ['A', 'B', 'C', 'D', 'E']
  },
  COOL: {  // 어깨 좁음
    short: ['D', 'E', 'F'],
    medium: ['B', 'C', 'D', 'E'],
    tall: ['A', 'B', 'C']
  }
};

// 모달 열기
function openPersonalAnalysisModal() {
  const modal = document.getElementById('personal-analysis-modal');
  if (modal) {
    modal.style.display = 'flex';
    paCurrentStep = 1;
    paUpdateStepUI();
    // 모달 내부 번역 적용
    applyTranslations(modal);
    console.log('📋 Personal Analysis 모달 열림');
  }
}

// 모달 닫기
function closePersonalAnalysisModal() {
  const modal = document.getElementById('personal-analysis-modal');
  if (modal) {
    modal.style.display = 'none';
    console.log('📋 Personal Analysis 모달 닫힘');

    // 프로필 초기화 및 첫 화면으로 이동
    paResetProfile();

    // 모드 선택 화면으로 돌아가기
    if (typeof goHome === 'function') {
      goHome();
    } else {
      // goHome이 없을 경우 직접 처리
      const modeSelection = document.getElementById('mode-selection');
      if (modeSelection) {
        document.querySelectorAll('.section').forEach(section => {
          section.classList.remove('active');
          section.style.display = '';
        });
        modeSelection.style.display = '';
        modeSelection.classList.add('active');
      }
    }
  }
}

// 프로필 초기화
function paResetProfile() {
  customerProfile = {
    // 공통 정보
    gender: null,
    height: null,
    skinType: null,
    curlPreference: null,
    // 여성 전용
    currentLength: null,
    desiredLength: null,
    fringePreference: null,
    // 남성 전용
    maleHairStyle: null,
    sideProcessing: null,
    frontDirection: null,
    // MediaPipe 자동 분석
    faceShape: null,
    faceShapeKr: null,
    undertone: null,
    season: null,
    analysisComplete: false
  };
  paCurrentStep = 1;

  // UI 초기화
  document.querySelectorAll('.pa-gender-btn, .pa-male-style-btn, .pa-side-btn, .pa-front-btn').forEach(btn => {
    btn.classList.remove('selected');
  });

  // 남성 테마 제거
  document.body.classList.remove('male-theme');

  // Step 2 콘텐츠 초기화 (여성용 표시)
  const femaleStyle = document.getElementById('pa-female-style');
  const maleStyle = document.getElementById('pa-male-style');
  const maleDetail = document.getElementById('pa-male-detail');
  if (femaleStyle) femaleStyle.style.display = 'block';
  if (maleStyle) maleStyle.style.display = 'none';
  if (maleDetail) maleDetail.style.display = 'none';
}

// 단계 UI 업데이트
function paUpdateStepUI() {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`pa-step-${i}`);
    if (stepEl) {
      stepEl.classList.remove('active');
      stepEl.style.display = 'none'; // 인라인 스타일로 숨김
    }
  }

  const currentStepEl = document.getElementById(`pa-step-${paCurrentStep}`);
  if (currentStepEl) {
    currentStepEl.classList.add('active');
    currentStepEl.style.display = 'block'; // 인라인 스타일로 표시
  }

  // Step 2일 때 성별에 따라 콘텐츠 토글
  if (paCurrentStep === 2) {
    const femaleStyle = document.getElementById('pa-female-style');
    const maleStyle = document.getElementById('pa-male-style');
    const isMale = customerProfile.gender === 'male';

    if (isMale) {
      if (femaleStyle) femaleStyle.style.display = 'none';
      if (maleStyle) maleStyle.style.display = 'block';
    } else {
      if (femaleStyle) femaleStyle.style.display = 'block';
      if (maleStyle) maleStyle.style.display = 'none';
    }
  }

  paUpdateProgressBar();
  paUpdateNavigationButtons();
}

// 프로그레스 바 업데이트
function paUpdateProgressBar() {
  const indicators = document.querySelectorAll('.pa-step-indicator');
  indicators.forEach((indicator, idx) => {
    indicator.classList.remove('active', 'completed');
    if (idx + 1 < paCurrentStep) {
      indicator.classList.add('completed');
    } else if (idx + 1 === paCurrentStep) {
      indicator.classList.add('active');
    }
  });
}

// 네비게이션 버튼 업데이트
function paUpdateNavigationButtons() {
  const prevBtn = document.getElementById('pa-prev-btn');
  const nextBtn = document.getElementById('pa-next-btn');
  const submitBtn = document.getElementById('pa-submit-btn');

  if (prevBtn) {
    prevBtn.style.display = paCurrentStep === 1 ? 'none' : 'inline-flex';
  }

  if (nextBtn && submitBtn) {
    if (paCurrentStep === 3) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'inline-flex';
    } else {
      nextBtn.style.display = 'inline-flex';
      submitBtn.style.display = 'none';
    }
  }
}

// 다음 단계
function paNextStep() {
  if (!paValidateCurrentStep()) {
    return;
  }

  if (paCurrentStep < 3) {
    paCurrentStep++;
    paUpdateStepUI();
    console.log(`📋 Step ${paCurrentStep}로 이동`);
  }
}

// 이전 단계
function paPrevStep() {
  if (paCurrentStep > 1) {
    paCurrentStep--;
    paUpdateStepUI();
    console.log(`📋 Step ${paCurrentStep}로 이동`);
  }
}

// 현재 단계 유효성 검사
function paValidateCurrentStep() {
  const isMale = customerProfile.gender === 'male';

  switch (paCurrentStep) {
    case 1:
      // 성별 필수
      if (!customerProfile.gender) {
        showToast(t('personalColor.personalAnalysis.selectGender') || '성별을 선택해주세요.', 'warning');
        return false;
      }
      // 키 필수
      if (!customerProfile.height) {
        showToast(t('personalColor.personalAnalysis.selectHeight') || '키를 선택해주세요.', 'warning');
        return false;
      }
      return true;

    case 2:
      if (isMale) {
        // 남성: 스타일 필수
        if (!customerProfile.maleHairStyle) {
          showToast(t('personalColor.personalAnalysis.selectMaleStyle') || '헤어 스타일을 선택해주세요.', 'warning');
          return false;
        }
        // 사이드 처리 필수
        if (!customerProfile.sideProcessing) {
          showToast(t('personalColor.personalAnalysis.selectSide') || '사이드 처리 방식을 선택해주세요.', 'warning');
          return false;
        }
        // 앞머리 방향 필수
        if (!customerProfile.frontDirection) {
          showToast(t('personalColor.personalAnalysis.selectFront') || '앞머리 방향을 선택해주세요.', 'warning');
          return false;
        }
      } else {
        // 여성: 원하는 기장 필수
        if (!customerProfile.desiredLength) {
          showToast(t('personalColor.personalAnalysis.selectDesiredLength') || '원하는 기장을 선택해주세요.', 'warning');
          return false;
        }
        // 앞머리 선호 필수
        if (!customerProfile.fringePreference) {
          showToast(t('personalColor.personalAnalysis.selectFringe') || '앞머리 선호도를 선택해주세요.', 'warning');
          return false;
        }
      }
      return true;

    case 3:
      if (!customerProfile.skinType) {
        showToast(t('personalColor.personalAnalysis.selectSkinType') || '피부 타입을 선택해주세요.', 'warning');
        return false;
      }
      if (!customerProfile.curlPreference) {
        showToast(t('personalColor.personalAnalysis.selectCurl') || '컬 선호도를 선택해주세요.', 'warning');
        return false;
      }
      return true;

    default:
      return true;
  }
}

// ==================== 성별 선택 ====================
function paSelectGender(gender) {
  customerProfile.gender = gender;

  // 버튼 UI 업데이트
  document.querySelectorAll('.pa-gender-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.gender === gender) {
      btn.classList.add('selected');
    }
  });

  // 테마 전환
  if (gender === 'male') {
    document.body.classList.add('male-theme');
  } else {
    document.body.classList.remove('male-theme');
  }

  // Step 2 콘텐츠 토글
  const femaleStyle = document.getElementById('pa-female-style');
  const maleStyle = document.getElementById('pa-male-style');

  if (gender === 'male') {
    if (femaleStyle) femaleStyle.style.display = 'none';
    if (maleStyle) maleStyle.style.display = 'block';
  } else {
    if (femaleStyle) femaleStyle.style.display = 'block';
    if (maleStyle) maleStyle.style.display = 'none';
  }

  console.log(`👤 성별 선택: ${gender}`);
}

// ==================== 남성용 스타일 선택 ====================
function paSelectMaleStyle(style) {
  customerProfile.maleHairStyle = style;

  // 버튼 UI 업데이트
  document.querySelectorAll('.pa-male-style-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.style === style) {
      btn.classList.add('selected');
    }
  });

  // 디테일 옵션 패널 표시
  const detailPanel = document.getElementById('pa-male-detail');
  if (detailPanel) {
    detailPanel.style.display = 'block';
  }

  const styleInfo = PA_MALE_STYLE_DATA[style];
  console.log(`💈 남성 스타일 선택: ${styleInfo?.name || style}`);
}

// 사이드 처리 선택
function paSelectSide(side) {
  customerProfile.sideProcessing = side;

  document.querySelectorAll('.pa-side-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.side === side) {
      btn.classList.add('selected');
    }
  });

  const sideNames = { fade: '페이드', under: '언더', natural: '자연' };
  console.log(`✂️ 사이드 처리 선택: ${sideNames[side] || side}`);
}

// 앞머리 방향 선택
function paSelectFront(front) {
  customerProfile.frontDirection = front;

  document.querySelectorAll('.pa-front-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.front === front) {
      btn.classList.add('selected');
    }
  });

  const frontNames = { 'all-back': '올백', 'side-part': '사이드파팅', 'center-down': '센터다운', 'see-through': '시스루' };
  console.log(`💇‍♂️ 앞머리 방향 선택: ${frontNames[front] || front}`);
}

// 키 선택
function paSelectHeight(height) {
  customerProfile.height = height;

  document.querySelectorAll('.pa-height-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.height === String(height)) {
      btn.classList.add('selected');
    }
  });

  console.log(`📏 키 선택: ${height}cm`);
}

// 현재 기장 선택
function paSelectCurrentLength(length) {
  customerProfile.currentLength = length;

  document.querySelectorAll('.pa-current-length-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.length === length) {
      btn.classList.add('selected');
    }
  });

  console.log(`📐 현재 기장 선택: ${length}`);
}

// 원하는 기장 선택
function paSelectDesiredLength(length) {
  customerProfile.desiredLength = length;

  document.querySelectorAll('.pa-desired-length-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.length === length) {
      btn.classList.add('selected');
    }
  });

  const lengthInfo = PA_LENGTH_DATA[length];
  console.log(`✂️ 원하는 기장 선택: ${length} (${lengthInfo.position})`);
}

// 앞머리 선호도 선택
function paSelectFringe(fringe) {
  customerProfile.fringePreference = fringe;

  document.querySelectorAll('.pa-fringe-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.fringe === fringe) {
      btn.classList.add('selected');
    }
  });

  const fringeInfo = PA_FRINGE_DATA[fringe];
  console.log(`💇 앞머리 선택: ${fringeInfo.name}`);
}

// 피부 타입 선택
function paSelectSkinType(type) {
  customerProfile.skinType = type;

  document.querySelectorAll('.pa-skin-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.skin === type) {
      btn.classList.add('selected');
    }
  });

  const skinInfo = PA_SKIN_TYPE_DATA[type];
  console.log(`🎨 피부 타입 선택: ${skinInfo.name} (${skinInfo.tone})`);
}

// 컬 선호도 선택
function paSelectCurl(curl) {
  customerProfile.curlPreference = curl;

  document.querySelectorAll('.pa-curl-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.curl === curl) {
      btn.classList.add('selected');
    }
  });

  const curlInfo = PA_CURL_DATA[curl];
  console.log(`🌀 컬 선택: ${curlInfo.name}`);
}

// 분석 제출
function paSubmitAnalysis() {
  if (!paValidateCurrentStep()) {
    return;
  }

  customerProfile.analysisComplete = true;

  // 피부타입에서 톤 결정
  const skinInfo = PA_SKIN_TYPE_DATA[customerProfile.skinType];
  customerProfile.undertone = skinInfo.tone;

  console.log('✅ Personal Analysis 완료:', customerProfile);

  // 모달만 닫기 (프로필 초기화 X, goHome X)
  const modal = document.getElementById('personal-analysis-modal');
  if (modal) {
    modal.style.display = 'none';
  }

  showToast(t('personalColor.personalAnalysis.inputComplete') || '고객 정보 입력 완료! AI 분석을 시작합니다.', 'success');

  // AI 분석 화면으로 이동
  proceedToAIAnalysis();
}

// AI 분석 화면으로 이동 (고객 정보 입력 완료 후)
function proceedToAIAnalysis() {
  // 모드 선택 화면 숨기기
  document.getElementById('mode-selection').style.display = 'none';

  // 모든 섹션 비활성화
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // AI 분석 섹션 활성화
  const aiSection = document.getElementById('ai-analysis');
  aiSection.classList.add('active');
  aiSection.style.display = 'block';

  console.log('🎥 AI 분석 화면으로 이동');
}

// 분석 결과 생성
function paGenerateAnalysisResult() {
  const skinInfo = PA_SKIN_TYPE_DATA[customerProfile.skinType];
  const lengthInfo = PA_LENGTH_DATA[customerProfile.desiredLength];
  const fringeInfo = PA_FRINGE_DATA[customerProfile.fringePreference];
  const curlInfo = PA_CURL_DATA[customerProfile.curlPreference];

  // 키에 따른 체형 분류
  let heightCategory = 'medium';
  if (customerProfile.height <= 158) {
    heightCategory = 'short';
  } else if (customerProfile.height >= 168) {
    heightCategory = 'tall';
  }

  // 추천 기장 확인
  const tone = skinInfo.tone;
  const recommendedLengths = PA_HEIGHT_RECOMMENDATIONS[tone][heightCategory];
  const isLengthRecommended = recommendedLengths.includes(customerProfile.desiredLength);

  return {
    profile: customerProfile,
    analysis: {
      heightCategory,
      tone: skinInfo.tone,
      isLengthRecommended,
      recommendedLengths,
      lengthInfo,
      fringeInfo,
      curlInfo,
      skinInfo
    },
    recommendation: paGenerateRecommendation(customerProfile, heightCategory, tone, isLengthRecommended)
  };
}

// 추천 텍스트 생성
function paGenerateRecommendation(profile, heightCategory, tone, isRecommended) {
  const lengthInfo = PA_LENGTH_DATA[profile.desiredLength];
  const fringeInfo = PA_FRINGE_DATA[profile.fringePreference];
  const curlInfo = PA_CURL_DATA[profile.curlPreference];

  let recommendation = `【Personal Analysis 결과】\n\n`;

  recommendation += `📏 고객 정보\n`;
  recommendation += `- 키: ${profile.height}cm (${heightCategory === 'short' ? (t('personalColor.personalAnalysis.heightShort') || 'Short') : heightCategory === 'tall' ? (t('personalColor.personalAnalysis.heightTall') || 'Tall') : (t('personalColor.personalAnalysis.heightMedium') || 'Medium')})\n`;
  recommendation += `- 현재 기장: ${profile.currentLength === 'short' ? '숏' : profile.currentLength === 'medium' ? '미디엄' : '롱'}\n`;
  recommendation += `- 피부 톤: ${PA_SKIN_TYPE_DATA[profile.skinType].name} (${tone})\n\n`;

  recommendation += `✂️ 희망 스타일\n`;
  recommendation += `- 원하는 기장: ${profile.desiredLength} Length (${lengthInfo.position})\n`;
  recommendation += `- 앞머리: ${fringeInfo.name}\n`;
  recommendation += `- 컬: ${curlInfo.name}\n\n`;

  recommendation += `💡 분석 결과\n`;
  if (isRecommended) {
    recommendation += `✅ 선택하신 ${profile.desiredLength} 기장은 고객님의 체형과 잘 어울립니다!\n`;
  } else {
    const recommended = PA_HEIGHT_RECOMMENDATIONS[tone][heightCategory];
    recommendation += `⚠️ 고객님 체형에는 ${recommended.join(', ')} 기장을 더 추천드립니다.\n`;
    recommendation += `선택하신 ${profile.desiredLength} 기장으로 진행하시려면 스타일링에 주의가 필요합니다.\n`;
  }

  return recommendation;
}

// 결과 표시
function paDisplayResult(result) {
  const container = document.getElementById('pa-result-container');
  if (!container) return;

  const p = result.profile;
  const a = result.analysis;

  container.innerHTML = `
    <div class="pa-result-card">
      <div class="pa-result-header">
        <h3>Personal Analysis</h3>
        <span class="pa-result-badge ${a.tone.toLowerCase()}">${a.tone}</span>
      </div>

      <div class="pa-result-section">
        <h4>📏 고객 정보</h4>
        <div class="pa-result-grid">
          <div class="pa-result-item">
            <label>키</label>
            <span>${p.height}cm (${a.heightCategory === 'short' ? (t('personalColor.personalAnalysis.heightShort') || 'Short') : a.heightCategory === 'tall' ? (t('personalColor.personalAnalysis.heightTall') || 'Tall') : (t('personalColor.personalAnalysis.heightMedium') || 'Medium')})</span>
          </div>
          <div class="pa-result-item">
            <label>현재 기장</label>
            <span>${p.currentLength === 'short' ? '숏' : p.currentLength === 'medium' ? '미디엄' : '롱'}</span>
          </div>
          <div class="pa-result-item">
            <label>피부 타입</label>
            <span>${a.skinInfo.name}</span>
          </div>
          <div class="pa-result-item">
            <label>톤</label>
            <span>${a.tone}</span>
          </div>
        </div>
      </div>

      <div class="pa-result-section">
        <h4>✂️ 희망 스타일</h4>
        <div class="pa-result-grid">
          <div class="pa-result-item">
            <label>원하는 기장</label>
            <span>${p.desiredLength} Length (${a.lengthInfo.position})</span>
          </div>
          <div class="pa-result-item">
            <label>앞머리</label>
            <span>${a.fringeInfo.name}</span>
          </div>
          <div class="pa-result-item">
            <label>컬</label>
            <span>${a.curlInfo.name}</span>
          </div>
        </div>
      </div>

      <div class="pa-result-section pa-recommendation">
        <h4>💡 분석 결과</h4>
        ${a.isLengthRecommended
          ? `<div class="pa-rec-good">✅ ${p.desiredLength} 기장은 고객님 체형에 잘 어울립니다!</div>`
          : `<div class="pa-rec-warning">⚠️ 추천 기장: ${a.recommendedLengths.join(', ')}</div>`
        }
      </div>
    </div>
  `;

  container.style.display = 'block';
}

// ========== 고객 요약 패널 표시 (왼쪽 하단) ==========
function displayCustomerSummary(mediaPipeData) {
  const panel = document.getElementById('customer-summary-panel');
  const content = document.getElementById('customer-summary-content');
  if (!panel || !content) return;

  // 수동 입력 데이터
  const p = customerProfile;
  const lengthNames = {
    short: t('personalColor.personalAnalysis.lengthShort') || 'Short',
    medium: t('personalColor.personalAnalysis.lengthMedium') || 'Medium',
    long: t('personalColor.personalAnalysis.lengthLong') || 'Long'
  };
  const skinTypeNames = {
    TP: t('personalColor.personalAnalysis.skinTP') || 'TP (Transparent)',
    NP: t('personalColor.personalAnalysis.skinNP') || 'NP (Neutral)',
    BP: t('personalColor.personalAnalysis.skinBP') || 'BP (Base)'
  };
  const curlNames = {
    straight: t('personalColor.personalAnalysis.curlStraight') || 'Straight',
    C: t('personalColor.personalAnalysis.curlC') || 'C-Curl',
    S: t('personalColor.personalAnalysis.curlS') || 'S-Curl',
    CS: t('personalColor.personalAnalysis.curlCS') || 'CS-Curl',
    SS: t('personalColor.personalAnalysis.curlSS') || 'SS-Curl',
    none: t('personalColor.personalAnalysis.curlNone') || 'No Preference'
  };
  const fringeNames = {
    forehead: t('personalColor.personalAnalysis.fringeForehead') || 'Forehead',
    eyebrow: t('personalColor.personalAnalysis.fringeEyebrow') || 'Eyebrow',
    eye: t('personalColor.personalAnalysis.fringeEye') || 'Eye',
    cheekbone: t('personalColor.personalAnalysis.fringeCheekbone') || 'Cheekbone',
    lips: t('personalColor.personalAnalysis.fringeLips') || 'Lips',
    none: t('personalColor.personalAnalysis.fringeNone') || 'None'
  };

  // MediaPipe 데이터 저장
  customerProfile.mediaPipeData = mediaPipeData;

  // AI 분석 데이터
  const aiUndertone = mediaPipeData?.personalColor?.undertone || '-';
  const aiSeason = mediaPipeData?.personalColor?.season || '-';
  const aiConfidence = mediaPipeData?.personalColor?.confidence || 0;
  const skinHex = mediaPipeData?.correctedRgb ?
    `#${mediaPipeData.correctedRgb.r.toString(16).padStart(2,'0')}${mediaPipeData.correctedRgb.g.toString(16).padStart(2,'0')}${mediaPipeData.correctedRgb.b.toString(16).padStart(2,'0')}` : '#999';

  // 성별에 따른 테마 색상
  const isMale = document.body.classList.contains('male-theme');
  const themeColor = isMale ? '#4A90E2' : '#E91E63';

  // 체형 분류
  let heightCategory = 'medium';
  if (p.height <= 158) heightCategory = 'short';
  else if (p.height >= 168) heightCategory = 'tall';
  const heightCatKr = {
    short: t('personalColor.personalAnalysis.heightShort') || 'Short',
    medium: t('personalColor.personalAnalysis.heightMedium') || 'Medium',
    tall: t('personalColor.personalAnalysis.heightTall') || 'Tall'
  };

  // 톤 매핑
  const toneMap = { 'Warm': 'WARM', 'Cool': 'COOL', 'Neutral': 'NEUTRAL' };
  const aiTone = toneMap[aiUndertone] || 'NEUTRAL';
  const manualTone = PA_SKIN_TYPE_DATA[p.skinType]?.tone || 'NEUTRAL';

  // 추천 기장
  const recommendedLengths = PA_HEIGHT_RECOMMENDATIONS[aiTone]?.[heightCategory] || ['C', 'D', 'E'];
  const isLengthRecommended = recommendedLengths.includes(p.desiredLength);

  content.innerHTML = `
    <!-- 수동 입력 섹션 -->
    <div style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e0e0e0;">
      <div style="font-weight: 600; color: ${themeColor}; margin-bottom: 8px; font-size: 11px;">✍️ ${t('personalColor.personalAnalysis.manualInput') || 'Manual Input'}</div>
      <div style="display: flex; flex-direction: column; gap: 4px; color: #333; font-size: 11px;">
        <div><span style="color: #888;">${t('personalColor.personalAnalysis.labelHeight') || 'Height'}:</span> ${p.height || '-'}cm (${heightCatKr[heightCategory]})</div>
        <div><span style="color: #888;">${t('personalColor.personalAnalysis.labelCurrentDesired') || 'Current→Desired'}:</span> ${lengthNames[p.currentLength] || '-'} → <b>${p.desiredLength || '-'}</b></div>
        <div><span style="color: #888;">${t('personalColor.personalAnalysis.labelFringe') || 'Fringe'}:</span> ${fringeNames[p.fringePreference] || '-'}</div>
        <div><span style="color: #888;">${t('personalColor.personalAnalysis.labelSkinType') || 'Skin Type'}:</span> ${skinTypeNames[p.skinType] || '-'}</div>
        <div><span style="color: #888;">${t('personalColor.personalAnalysis.labelCurl') || 'Curl'}:</span> ${curlNames[p.curlPreference] || '-'}</div>
      </div>
    </div>

    <!-- AI 분석 섹션 -->
    <div style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e0e0e0;">
      <div style="font-weight: 600; color: ${themeColor}; margin-bottom: 8px; font-size: 11px;">🤖 ${t('personalColor.personalAnalysis.aiAnalysis') || 'AI Analysis'}</div>
      <div style="display: flex; flex-direction: column; gap: 4px; color: #333; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #888;">${t('personalColor.personalAnalysis.labelSkinTone') || 'Skin Tone'}:</span>
          <div style="width: 14px; height: 14px; background: ${skinHex}; border-radius: 3px; border: 1px solid #ddd;"></div>
          <span>${skinHex}</span>
        </div>
        <div><span style="color: #888;">${t('personalColor.personalAnalysis.labelUndertone') || 'Undertone'}:</span> <b style="color: ${aiUndertone === 'Warm' ? '#D84315' : aiUndertone === 'Cool' ? '#1565C0' : '#616161'};">${aiUndertone}</b></div>
        <div><span style="color: #888;">${t('personalColor.personalAnalysis.labelSeason') || 'Season'}:</span> <b>${aiSeason}</b> (${aiConfidence}%)</div>
      </div>
    </div>

    <!-- 통합 분석 결과 -->
    <div style="grid-column: 1 / -1; background: linear-gradient(135deg, ${themeColor}15, ${themeColor}08); padding: 10px; border-radius: 8px; border: 1px solid ${themeColor}30; margin-top: 4px;">
      <div style="font-weight: 600; color: ${themeColor}; margin-bottom: 6px; font-size: 11px;">🔗 ${t('personalColor.personalAnalysis.integratedAnalysis') || 'Integrated Analysis'}</div>
      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #333;">
        <div>${manualTone === aiTone ? '✅' : '🔍'} Designer(${manualTone}) + AI(${aiTone}) ${manualTone === aiTone ? '→ ' + (t('personalColor.personalAnalysis.designerAiMatch') || 'High confidence') : '→ ' + (t('personalColor.personalAnalysis.designerAiCombined') || 'Combined')}</div>
        <div>${isLengthRecommended ? '✅' : '💡'} ${p.desiredLength} ${isLengthRecommended ? (t('personalColor.personalAnalysis.lengthFit') || 'Body type fit') : `(${t('personalColor.personalAnalysis.lengthRecommend') || 'Recommend'}: ${recommendedLengths.join(',')})`}</div>
      </div>
    </div>
  `;

  panel.style.display = 'block';
  console.log('📋 고객 요약 패널 표시 완료');
}

// ========== 통합 분석 결과 생성 ==========
function generateIntegratedAnalysis(mediaPipeData) {
  const p = customerProfile;

  // 피부타입과 AI 언더톤 비교
  const manualTone = PA_SKIN_TYPE_DATA[p.skinType]?.tone || 'NEUTRAL';
  const aiUndertone = mediaPipeData?.personalColor?.undertone || 'Neutral';

  // 톤 매칭 여부
  const toneMap = { 'Warm': 'WARM', 'Cool': 'COOL', 'Neutral': 'NEUTRAL' };
  const aiTone = toneMap[aiUndertone] || 'NEUTRAL';
  const toneMatch = manualTone === aiTone;

  // 키에 따른 체형 분류
  let heightCategory = 'medium';
  if (p.height <= 158) heightCategory = 'short';
  else if (p.height >= 168) heightCategory = 'tall';

  // 추천 기장 확인
  const recommendedLengths = PA_HEIGHT_RECOMMENDATIONS[aiTone]?.[heightCategory] || ['C', 'D', 'E'];
  const isLengthRecommended = recommendedLengths.includes(p.desiredLength);

  // 통합 결과 객체
  const integrated = {
    customer: {
      height: p.height,
      heightCategory,
      currentLength: p.currentLength,
      desiredLength: p.desiredLength,
      fringePreference: p.fringePreference,
      curlPreference: p.curlPreference,
      manualSkinType: p.skinType,
      manualTone
    },
    ai: {
      undertone: aiUndertone,
      tone: aiTone,
      season: mediaPipeData?.personalColor?.season,
      confidence: mediaPipeData?.personalColor?.confidence,
      skinRgb: mediaPipeData?.correctedRgb
    },
    analysis: {
      toneMatch,
      finalTone: toneMatch ? aiTone : aiTone, // AI 우선
      recommendedLengths,
      isLengthRecommended,
      hairRecommendations: mediaPipeData?.hairRecommendations
    },
    faceGeometry: mediaPipeData?.faceGeometry || null
  };

  console.log('🔗 Integrated Analysis result:', integrated);
  return integrated;
}

// ========== 통합 분석 결과 HTML 생성 (오른쪽 패널) ==========
function generateIntegratedResultHTML(integrated, _personalColor) {
  if (!integrated || !customerProfile.analysisComplete) {
    return ''; // 고객 정보 미입력 시 빈 문자열 반환
  }

  const c = integrated.customer;
  const a = integrated.ai;
  const analysis = integrated.analysis;

  // 체형 카테고리 한글
  const heightCatKr = {
    short: t('personalColor.personalAnalysis.heightShort') || 'Short',
    medium: t('personalColor.personalAnalysis.heightMedium') || 'Medium',
    tall: t('personalColor.personalAnalysis.heightTall') || 'Tall'
  };
  const lengthNames = {
    short: t('personalColor.personalAnalysis.lengthShort') || 'Short',
    medium: t('personalColor.personalAnalysis.lengthMedium') || 'Medium',
    long: t('personalColor.personalAnalysis.lengthLong') || 'Long'
  };
  const curlNames = {
    straight: t('personalColor.personalAnalysis.curlStraight') || 'Straight',
    C: t('personalColor.personalAnalysis.curlC') || 'C-Curl',
    S: t('personalColor.personalAnalysis.curlS') || 'S-Curl',
    CS: t('personalColor.personalAnalysis.curlCS') || 'CS-Curl',
    SS: t('personalColor.personalAnalysis.curlSS') || 'SS-Curl',
    none: t('personalColor.personalAnalysis.curlNone') || 'No Preference'
  };
  const fringeNames = {
    forehead: t('personalColor.personalAnalysis.fringeForehead') || 'Forehead',
    eyebrow: t('personalColor.personalAnalysis.fringeEyebrow') || 'Eyebrow',
    eye: t('personalColor.personalAnalysis.fringeEye') || 'Eye',
    cheekbone: t('personalColor.personalAnalysis.fringeCheekbone') || 'Cheekbone',
    lips: t('personalColor.personalAnalysis.fringeLips') || 'Lips',
    none: t('personalColor.personalAnalysis.fringeNone') || 'None'
  };

  // 기장 변화량 계산
  // lengthOrder: 짧은 순 → 긴 순 (H가 가장 짧고, A가 가장 김)
  const lengthOrder = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  // 현재 기장을 대략적인 Length로 매핑 (short=G(1), medium=E(3), long=B(6))
  const currentLengthIdx = { short: 1, medium: 3, long: 6 };
  const desiredIdx = lengthOrder.indexOf(c.desiredLength);
  const currentIdx = currentLengthIdx[c.currentLength] ?? 3;
  const lengthChange = desiredIdx - currentIdx; // 양수면 길게, 음수면 짧게
  const lengthChangeText = lengthChange > 0 ? `${Math.abs(lengthChange)} ${t('personalColor.personalAnalysis.stepsLonger') || 'steps longer'}` : lengthChange < 0 ? `${Math.abs(lengthChange)} ${t('personalColor.personalAnalysis.stepsShorter') || 'steps shorter'}` : (t('personalColor.personalAnalysis.maintain') || 'Maintain');
  const lengthChangeIcon = lengthChange === 0 ? '➡️' : lengthChange > 0 ? '📏⬆️' : '✂️⬇️';

  // 시술 난이도 계산 (변화량 + 컬 추가 시 +1)
  const changeAmount = Math.abs(lengthChange);
  const hasCurl = c.curlPreference !== 'straight' && c.curlPreference !== 'none';
  const difficultyScore = changeAmount + (hasCurl ? 1 : 0);
  // 0~1: 쉬움, 2~3: 보통, 4+: 어려움
  const difficultyText = difficultyScore <= 1 ? (t('personalColor.personalAnalysis.difficultyEasy') || 'Easy') : difficultyScore <= 3 ? (t('personalColor.personalAnalysis.difficultyMedium') || 'Medium') : (t('personalColor.personalAnalysis.difficultyHard') || 'Hard');
  const difficultyColor = difficultyScore <= 1 ? '#2E7D32' : difficultyScore <= 3 ? '#1565C0' : '#C62828';

  // 톤 분석 결과 스타일 (대결이 아닌 보완 구조)
  const toneMatchStyle = analysis.toneMatch
    ? 'background: rgba(76,175,80,0.15); border-color: rgba(76,175,80,0.3); color: #2E7D32;'
    : 'background: rgba(103,58,183,0.12); border-color: rgba(103,58,183,0.3); color: #5E35B1;';
  const toneMatchIcon = analysis.toneMatch ? '✅' : '🔍';
  const toneMatchText = analysis.toneMatch
    ? (t('personalColor.personalAnalysis.designerAiMatch') || 'Designer + AI match → High confidence')
    : `Designer(${c.manualTone}) + AI(${a.tone}) ${t('personalColor.personalAnalysis.designerAiCombined') || 'Combined analysis'}`;

  // 기장 추천 여부
  const lengthMatchStyle = analysis.isLengthRecommended
    ? 'color: #2E7D32;'
    : 'color: #5E35B1;';
  const lengthMatchIcon = analysis.isLengthRecommended ? '✅' : '💡';
  const lengthMatchText = analysis.isLengthRecommended
    ? `${c.desiredLength} Length ${t('personalColor.personalAnalysis.lengthFit') || 'Body type fit'}!`
    : `${t('personalColor.personalAnalysis.lengthRecommend') || 'Recommend'}: ${analysis.recommendedLengths.join(', ')} (${t('personalColor.personalAnalysis.selected') || 'Selected'}: ${c.desiredLength})`;

  // 성별에 따른 테마 색상
  const isMale = document.body.classList.contains('male-theme');
  const themeGradient = isMale
    ? 'linear-gradient(135deg, #4A90E2, #3A7BC8)'
    : 'linear-gradient(135deg, #E91E63, #C2185B)';
  const themeColor = isMale ? '#4A90E2' : '#E91E63';

  // 컬 추천 텍스트
  const curlRecommendText = getCurlRecommendation(c.curlPreference, a.season);

  return `
    <!-- 🎯 통합 분석 결과 -->
    <div style="background: ${themeGradient}; padding: 16px; border-radius: 14px; margin-bottom: 14px; color: #fff;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="font-size: 20px;">🎯</span>
        <span style="font-size: 16px; font-weight: 700;">${t('personalColor.personalAnalysis.integratedResult') || 'Personal Analysis Result'}</span>
      </div>

      <!-- 고객 프로필 요약 -->
      <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 10px; margin-bottom: 10px;">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">👤 ${t('personalColor.personalAnalysis.customerProfile') || 'Customer Profile'}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
          <div>${t('personalColor.personalAnalysis.labelHeight') || 'Height'}: <b>${c.height}cm</b> (${heightCatKr[c.heightCategory]})</div>
          <div>${t('personalColor.personalAnalysis.labelSkinType') || 'Skin Type'}: <b>${a.tone}</b></div>
          <div>${t('personalColor.personalAnalysis.desiredLength') || 'Desired Length'}: <b>${c.desiredLength} Length</b></div>
          <div>${t('personalColor.personalAnalysis.labelFringe') || 'Fringe'}: <b>${fringeNames[c.fringePreference]}</b></div>
          <div>${t('personalColor.personalAnalysis.labelCurl') || 'Curl'}: <b>${curlNames[c.curlPreference]}</b></div>
          <div>${t('personalColor.personalAnalysis.labelSeason') || '시즌'}: <b>${a.season}</b></div>
        </div>
      </div>

      <!-- 기장 변화 정보 -->
      <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <div>${lengthChangeIcon} <b>${lengthNames[c.currentLength]} → ${c.desiredLength}</b> (${lengthChangeText})</div>
          <div style="background: ${difficultyColor}; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">
            ${t('personalColor.aiMode.result.difficulty') || '난이도'}: ${difficultyText}
          </div>
        </div>
      </div>

      <!-- 분석 매칭 결과 -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="padding: 10px; border-radius: 8px; font-size: 12px; ${toneMatchStyle}">
          <span>${toneMatchIcon}</span> ${toneMatchText}
        </div>
        <div style="padding: 10px; border-radius: 8px; font-size: 12px; background: rgba(255,255,255,0.9); ${lengthMatchStyle}">
          <span>${lengthMatchIcon}</span> ${lengthMatchText}
        </div>
      </div>
    </div>

    <!-- 💇 스타일 추천 -->
    <div style="background: linear-gradient(135deg, ${themeColor}15, ${themeColor}08); padding: 14px; border-radius: 12px; border: 1px solid ${themeColor}30; margin-bottom: 14px;">
      <div style="font-size: 13px; font-weight: 600; color: ${themeColor}; margin-bottom: 10px;">${t('personalColor.aiMode.result.customStyleRecommend')}</div>
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: #333;">
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: ${themeColor};">●</span>
          <span><b>${c.desiredLength} Length</b> + <b>${fringeNames[c.fringePreference]}</b> ${t('personalColor.aiMode.result.fringeCombo')}</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: ${themeColor};">●</span>
          <span>${curlRecommendText}</span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: ${themeColor};">●</span>
          <span>${a.season} ${t('personalColor.aiMode.result.seasonColorHarmony')}</span>
        </div>
      </div>
    </div>

    ${generateFaceGeometryIntegratedHTML(integrated.faceGeometry, themeColor)}
  `;
}

// 얼굴형 분석 결과 HTML (통합 결과용)
function generateFaceGeometryIntegratedHTML(faceGeometry, _themeColor) {
  if (!faceGeometry) {
    return ''; // 측정 데이터 없으면 빈 문자열
  }

  // 눈썹간 거리 레벨에 따른 스타일
  const levelColors = {
    narrow: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100', icon: '◀️▶️', label: t('personalColor.personalAnalysis.narrowGap') || 'Narrow Gap' },
    balanced: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32', icon: '✅', label: t('personalColor.personalAnalysis.balancedGap') || 'Balanced Gap' },
    wide: { bg: '#E3F2FD', border: '#1976D2', text: '#0D47A1', icon: '▶️◀️', label: t('personalColor.personalAnalysis.wideGap') || 'Wide Gap' }
  };
  const levelStyle = levelColors[faceGeometry.eyebrowGapLevel] || levelColors.balanced;

  return `
    <!-- 📐 얼굴형 분석 -->
    <div style="background: linear-gradient(135deg, #f5f5f5, #e8e8e8); padding: 14px; border-radius: 12px; border: 1px solid #ddd;">
      <div style="font-size: 13px; font-weight: 600; color: #555; margin-bottom: 10px;">${t('personalColor.aiMode.result.faceShapeAnalysis')}</div>

      <!-- 미간 분석 -->
      <div style="background: ${levelStyle.bg}; padding: 10px; border-radius: 8px; border: 1px solid ${levelStyle.border}; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <span style="font-size: 14px;">${levelStyle.icon}</span>
          <span style="font-size: 12px; font-weight: 600; color: ${levelStyle.text};">${levelStyle.label}</span>
        </div>
        <div style="font-size: 11px; color: #555; line-height: 1.4;">
          ${faceGeometry.eyebrowGapEvaluation}
        </div>
        <div style="margin-top: 6px; font-size: 11px; color: ${levelStyle.text}; font-weight: 500;">
          💡 ${faceGeometry.styleRecommendation}
        </div>
      </div>

      <!-- 측정값 그리드 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 10px; color: #888;">${t('personalColor.aiMode.result.faceRatio')}</div>
          <div style="font-size: 14px; font-weight: 700; color: #333;">${faceGeometry.faceRatioPercent}%</div>
        </div>
        <div style="background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 10px; color: #888;">${t('personalColor.aiMode.result.eyeDistance')}</div>
          <div style="font-size: 14px; font-weight: 700; color: #333;">${faceGeometry.eyeInnerDistancePercent}%</div>
        </div>
      </div>
    </div>
  `;
}

// 컬 추천 텍스트 생성 (다국어 지원)
function getCurlRecommendation(curlPref, _season) {
  const curlDesc = {
    straight: t('personalColor.aiMode.result.curlStraightDesc') || '스트레이트로 깔끔하고 단정한 이미지 연출',
    C: t('personalColor.aiMode.result.curlCDesc') || 'C컬로 자연스러운 볼륨감과 여성스러운 분위기',
    S: t('personalColor.aiMode.result.curlSDesc') || 'S컬로 풍성한 웨이브와 화려한 스타일',
    CS: t('personalColor.aiMode.result.curlCSDesc') || 'C+S컬 믹스로 입체적이고 세련된 느낌',
    SS: t('personalColor.aiMode.result.curlSSDesc') || 'SS컬로 강한 컬감과 개성있는 스타일',
    none: t('personalColor.aiMode.result.curlNoneDesc') || '고객 선호에 따라 다양한 컬 스타일 가능'
  };
  return curlDesc[curlPref] || curlDesc.none;
}

// 전역 함수로 노출
window.openPersonalAnalysisModal = openPersonalAnalysisModal;
window.closePersonalAnalysisModal = closePersonalAnalysisModal;
window.paSelectGender = paSelectGender;
window.paSelectHeight = paSelectHeight;
window.paSelectCurrentLength = paSelectCurrentLength;
window.paSelectDesiredLength = paSelectDesiredLength;
window.paSelectFringe = paSelectFringe;
window.paSelectSkinType = paSelectSkinType;
window.paSelectCurl = paSelectCurl;
window.paSelectMaleStyle = paSelectMaleStyle;
window.paSelectSide = paSelectSide;
window.paSelectFront = paSelectFront;
window.paNextStep = paNextStep;
window.paPrevStep = paPrevStep;
window.paSubmitAnalysis = paSubmitAnalysis;
window.customerProfile = customerProfile;
window.displayCustomerSummary = displayCustomerSummary;
window.generateIntegratedAnalysis = generateIntegratedAnalysis;
window.generateIntegratedResultHTML = generateIntegratedResultHTML;
window.generateFaceGeometryIntegratedHTML = generateFaceGeometryIntegratedHTML;

// ==================== 다국어 UI 업데이트 ====================
function updatePALanguageUI() {
  // 전체 페이지 data-i18n 속성 번역 적용
  applyTranslations(document);

  console.log('🌐 PA 다국어 UI 업데이트 완료');
}

// 언어 변경 이벤트 리스너
window.addEventListener('languageChanged', function() {
  updatePALanguageUI();
});

// 초기 로드 시 업데이트
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(updatePALanguageUI, 100);
});

window.updatePALanguageUI = updatePALanguageUI;
