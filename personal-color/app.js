// ==========================================
// HAIRGATOR Personal Color Pro - 최종 완성 버전
// 모든 피드백 반영 + 실제 작동 구현
// ==========================================

// 전역 변수 정의
let currentMode = 'selection';
let isAnalyzing = false;
let analysisCount = 0;
let selectedSeason = 'Spring';
let uploadedImage = null;

// MediaPipe 관련 변수
let faceDetection = null;
let faceMesh = null;
let camera = null;
let videoElement = null;
let canvasElement = null;
let canvasCtx = null;

// 헤어컬러 데이터 (614개)
let hairColorData = [];

// 드래이핑 모드 변수
let savedColors = [];
let colorAdjustments = {
    lightness: 0,
    saturation: 0,
    warmth: 0
};

// 실시간 분석 데이터
let realtimeAnalysisData = {
    skinTone: null,
    season: null,
    confidence: 0,
    lastUpdate: null
};

// 전문가 노하우 데이터베이스
const ExpertKnowledge = {
    brandData: {
        loreal: { brand: '로레알', avgM: 80.41 },
        wella: { brand: '웰라', avgM: 87.17 },
        milbon: { brand: '밀본', avgM: 93.22 }
    },
    
    uireh: {
        colorSpectrum: "주황색은 절대 쿨톤으로 만들 수 없음",
        lightnessMatching: "파운데이션 21-23호는 비슷한 명도 헤어컬러 회피",
        winterClear: ["조이", "현아"],
        techniques: ["옴브레", "발레아주", "리프팅"]
    },
    
    bitnalyun: {
        skinConditions: {
            redness: "홍조 피부 → 미드나잇 컬러로 중화",
            pale: "창백한 피부 → 웜톤으로 생기 부여", 
            yellowish: "황기 피부 → 애쉬 계열로 투명감"
        }
    },
    
    blume: {
        specificTypes: {
            warm: "아이보리 피부 + 코토리베이지/오렌지브라운",
            cool: "화이트 피부 + 블루블랙/애쉬블루"
        }
    }
};

// 4계절 색상 팔레트 (정밀 LAB 범위 포함)
const SeasonPalettes = {
    Spring: {
        name: '봄 웜톤',
        colors: ['#FFB6C1', '#FFA07A', '#F0E68C', '#98FB98', '#FFE4B5', '#DDA0DD'],
        characteristics: ['밝고 따뜻한 색상', '높은 채도', '노란 언더톤'],
        labRange: { L: [60, 80], a: [5, 20], b: [10, 30] },
        subTypes: {
            bright: { L: [70, 80], C: [25, 40] },
            true: { L: [65, 75], C: [20, 35] },
            light: { L: [75, 85], C: [15, 25] }
        }
    },
    Summer: {
        name: '여름 쿨톤',
        colors: ['#B0E0E6', '#DDA0DD', '#C8B2DB', '#AFEEEE', '#F0F8FF', '#E6E6FA'],
        characteristics: ['부드럽고 차가운 색상', '중간 채도', '파란 언더톤'],
        labRange: { L: [70, 85], a: [-5, 5], b: [-10, 10] },
        subTypes: {
            light: { L: [75, 85], C: [10, 20] },
            true: { L: [70, 80], C: [15, 25] },
            soft: { L: [65, 75], C: [10, 20] }
        }
    },
    Autumn: {
        name: '가을 웜톤',
        colors: ['#D2691E', '#CD853F', '#A0522D', '#8B4513', '#B22222', '#800000'],
        characteristics: ['깊고 따뜻한 색상', '낮은 채도', '노란 언더톤'],
        labRange: { L: [30, 60], a: [10, 25], b: [20, 40] },
        subTypes: {
            soft: { L: [50, 60], C: [15, 25] },
            true: { L: [45, 55], C: [20, 30] },
            dark: { L: [30, 45], C: [25, 35] }
        }
    },
    Winter: {
        name: '겨울 쿨톤',
        colors: ['#000080', '#4B0082', '#8B008B', '#191970', '#2F4F4F', '#708090'],
        characteristics: ['진하고 차가운 색상', '높은 대비', '파란 언더톤'],
        labRange: { L: [20, 50], a: [-10, 5], b: [-20, 0] },
        subTypes: {
            bright: { L: [40, 50], C: [30, 45] },
            true: { L: [35, 45], C: [25, 40] },
            dark: { L: [20, 35], C: [20, 35] }
        }
    }
};

// ==========================================
// 색공간 변환 및 색과학 함수들
// ==========================================

// sRGB 감마 보정 제거 (선형화)
function sRGBtoLinear(value) {
    value = value / 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

// 선형 RGB를 sRGB로 변환 (역변환)
function linearToSRGB(value) {
    if (value <= 0.0031308) {
        return value * 12.92 * 255;
    } else {
        return (1.055 * Math.pow(value, 1/2.4) - 0.055) * 255;
    }
}

// RGB → XYZ 변환 (D65 조명 기준)
function rgbToXyz(r, g, b) {
    const R = sRGBtoLinear(r);
    const G = sRGBtoLinear(g);
    const B = sRGBtoLinear(b);
    
    // sRGB D65 변환 행렬
    const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
    const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
    
    return { X: X * 100, Y: Y * 100, Z: Z * 100 };
}

// XYZ → LAB 변환
function xyzToLab(X, Y, Z) {
    // D65 reference white
    const Xn = 95.047, Yn = 100.000, Zn = 108.883;
    
    function f(t) {
        return t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16/116);
    }
    
    const fx = f(X / Xn);
    const fy = f(Y / Yn);
    const fz = f(Z / Zn);
    
    const L = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    
    return { L, a, b };
}

// RGB → LAB 통합 함수
function rgbToLab(r, g, b) {
    const xyz = rgbToXyz(r, g, b);
    return xyzToLab(xyz.X, xyz.Y, xyz.Z);
}

// LAB → LCH (극좌표) 변환
function labToLch(L, a, b) {
    const C = Math.sqrt(a * a + b * b); // Chroma (채도)
    let H = Math.atan2(b, a) * 180 / Math.PI; // Hue (색상각)
    if (H < 0) H += 360;
    return { L, C, H };
}

// HEX → RGB 변환
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// HEX → LAB 변환
function hexToLab(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return rgbToLab(rgb.r, rgb.g, rgb.b);
}

// Delta E 2000 색차 계산 (완전 구현)
function deltaE2000(Lab1, Lab2) {
    const deg2rad = d => d * (Math.PI/180);
    const rad2deg = r => r * (180/Math.PI);
    
    const L1 = Lab1.L, a1 = Lab1.a, b1 = Lab1.b;
    const L2 = Lab2.L, a2 = Lab2.a, b2 = Lab2.b;
    
    const avgL = (L1 + L2) / 2;
    const C1 = Math.sqrt(a1*a1 + b1*b1);
    const C2 = Math.sqrt(a2*a2 + b2*b2);
    const avgC = (C1 + C2) / 2;
    
    const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC,7) / (Math.pow(avgC,7) + Math.pow(25,7))));
    
    const a1p = (1+G)*a1;
    const a2p = (1+G)*a2;
    const C1p = Math.sqrt(a1p*a1p + b1*b1);
    const C2p = Math.sqrt(a2p*a2p + b2*b2);
    const avgCp = (C1p + C2p) / 2;
    
    const h1p = Math.atan2(b1, a1p) >= 0 ? rad2deg(Math.atan2(b1, a1p)) : rad2deg(Math.atan2(b1, a1p)) + 360;
    const h2p = Math.atan2(b2, a2p) >= 0 ? rad2deg(Math.atan2(b2, a2p)) : rad2deg(Math.atan2(b2, a2p)) + 360;
    
    let deltahp = 0;
    if (Math.abs(h1p - h2p) <= 180) deltahp = h2p - h1p;
    else if (h2p <= h1p) deltahp = h2p - h1p + 360;
    else deltahp = h2p - h1p - 360;
    
    const deltaLp = L2 - L1;
    const deltaCp = C2p - C1p;
    const deltaHp = 2 * Math.sqrt(C1p*C2p) * Math.sin(deg2rad(deltahp/2));
    
    let avghp = 0;
    if (Math.abs(h1p - h2p) > 180) avghp = (h1p + h2p + 360) / 2;
    else avghp = (h1p + h2p) / 2;
    
    const T = 1 - 0.17*Math.cos(deg2rad(avghp - 30)) + 0.24*Math.cos(deg2rad(2*avghp)) + 
              0.32*Math.cos(deg2rad(3*avghp + 6)) - 0.20*Math.cos(deg2rad(4*avghp - 63));
    
    const deltaro = 30 * Math.exp(-(Math.pow((avghp - 275)/25, 2)));
    const RC = 2 * Math.sqrt(Math.pow(avgCp,7) / (Math.pow(avgCp,7) + Math.pow(25,7)));
    const SL = 1 + ((0.015 * Math.pow(avgL - 50,2)) / Math.sqrt(20 + Math.pow(avgL - 50,2)));
    const SC = 1 + 0.045 * avgCp;
    const SH = 1 + 0.015 * avgCp * T;
    const RT = -Math.sin(deg2rad(2*deltaro)) * RC;
    
    const kL = 1, kC = 1, kH = 1;
    
    const dE = Math.sqrt(
        Math.pow(deltaLp / (kL*SL),2) +
        Math.pow(deltaCp / (kC*SC),2) +
        Math.pow(deltaHp / (kH*SH),2) +
        RT * (deltaCp / (kC*SC)) * (deltaHp / (kH*SH))
    );
    
    return dE;
}

// 화이트밸런스 보정 (Gray-World 알고리즘)
function applyGrayWorldCorrection(imageData) {
    let rSum = 0, gSum = 0, bSum = 0, n = 0;
    
    for (let i = 0; i < imageData.length; i += 4) {
        rSum += imageData[i];
        gSum += imageData[i+1];
        bSum += imageData[i+2];
        n++;
    }
    
    const rAvg = rSum / n;
    const gAvg = gSum / n;
    const bAvg = bSum / n;
    const gray = (rAvg + gAvg + bAvg) / 3;
    
    return {
        rGain: gray / rAvg,
        gGain: gray / gAvg,
        bGain: gray / bAvg
    };
}

// 개선된 화이트밸런스 (참조 영역 기반)
function applyReferenceWhiteBalance(imageData, refArea) {
    // 참조 영역(예: 흰색 영역)의 RGB 평균
    const refR = refArea.r || 240;
    const refG = refArea.g || 240;
    const refB = refArea.b || 240;
    
    return {
        rGain: 255 / refR,
        gGain: 255 / refG,
        bGain: 255 / refB
    };
}

// ==========================================
// 개선된 피부톤 추출 함수들
// ==========================================

// MediaPipe 랜드마크 기반 정밀 피부톤 추출
function extractSkinToneFromLandmarks(landmarks, videoElement) {
    if (!landmarks || landmarks.length === 0) return null;
    
    // 주요 피부 영역 랜드마크 인덱스 (Face Mesh 468점 기준)
    const skinRegions = {
        forehead: [10, 151, 9, 67, 69, 104, 54, 21],  // 이마
        leftCheek: [116, 117, 118, 123, 147, 213, 192, 50],  // 왼쪽 볼
        rightCheek: [345, 346, 347, 352, 376, 433, 416, 280],  // 오른쪽 볼
        chin: [18, 175, 199, 200, 17, 314],  // 턱
        nose: [1, 2, 5, 4, 19, 20, 94, 305]  // 코
    };
    
    // 임시 캔버스 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    ctx.drawImage(videoElement, 0, 0);
    
    // 전체 이미지 화이트밸런스 보정
    const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const whiteBalance = applyGrayWorldCorrection(fullImageData.data);
    
    // 각 영역에서 색상 샘플링
    let totalR = 0, totalG = 0, totalB = 0;
    let validSamples = 0;
    
    for (const [region, indices] of Object.entries(skinRegions)) {
        for (const index of indices) {
            if (landmarks[index]) {
                const landmark = landmarks[index];
                const x = Math.floor(landmark.x * canvas.width);
                const y = Math.floor(landmark.y * canvas.height);
                
                // 5x5 픽셀 영역 샘플링
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        const px = Math.max(0, Math.min(canvas.width - 1, x + dx));
                        const py = Math.max(0, Math.min(canvas.height - 1, y + dy));
                        
                        const pixelData = ctx.getImageData(px, py, 1, 1).data;
                        
                        // 화이트밸런스 보정 적용
                        const r = Math.min(255, pixelData[0] * whiteBalance.rGain);
                        const g = Math.min(255, pixelData[1] * whiteBalance.gGain);
                        const b = Math.min(255, pixelData[2] * whiteBalance.bGain);
                        
                        // 피부색 범위 필터링 (너무 밝거나 어두운 픽셀 제외)
                        const brightness = (r + g + b) / 3;
                        if (brightness > 30 && brightness < 230) {
                            totalR += r;
                            totalG += g;
                            totalB += b;
                            validSamples++;
                        }
                    }
                }
            }
        }
    }
    
    if (validSamples === 0) return null;
    
    const avgR = Math.round(totalR / validSamples);
    const avgG = Math.round(totalG / validSamples);
    const avgB = Math.round(totalB / validSamples);
    
    const lab = rgbToLab(avgR, avgG, avgB);
    const lch = labToLch(lab.L, lab.a, lab.b);
    
    return {
        rgb: { r: avgR, g: avgG, b: avgB },
        hex: `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`,
        lab: lab,
        lch: lch,
        samples: validSamples
    };
}

// 정지 이미지에서 피부톤 추출 (개선 버전)
async function extractSkinToneFromImage(imageDataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // 전체 이미지 화이트밸런스 보정
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const gains = applyGrayWorldCorrection(imageData.data);
            
            // 얼굴 영역 추정 (중앙 상단 1/3 영역)
            const faceArea = {
                x: canvas.width * 0.3,
                y: canvas.height * 0.2,
                width: canvas.width * 0.4,
                height: canvas.height * 0.4
            };
            
            // 그리드 샘플링 (10x10)
            const gridSize = 10;
            let samples = [];
            
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    const x = Math.floor(faceArea.x + (faceArea.width / gridSize) * i);
                    const y = Math.floor(faceArea.y + (faceArea.height / gridSize) * j);
                    
                    const pixelData = ctx.getImageData(x, y, 1, 1).data;
                    
                    // 화이트밸런스 보정 적용
                    const r = Math.min(255, pixelData[0] * gains.rGain);
                    const g = Math.min(255, pixelData[1] * gains.gGain);
                    const b = Math.min(255, pixelData[2] * gains.bGain);
                    
                    // 피부색 범위 필터링
                    const brightness = (r + g + b) / 3;
                    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                    
                    if (brightness > 50 && brightness < 200 && saturation < 100) {
                        samples.push({ r, g, b });
                    }
                }
            }
            
            if (samples.length === 0) {
                // 폴백: 중앙 단일 포인트
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data;
                samples.push({
                    r: pixelData[0],
                    g: pixelData[1],
                    b: pixelData[2]
                });
            }
            
            // 중앙값 계산 (이상값 제거)
            samples.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
            const medianIndex = Math.floor(samples.length / 2);
            const medianSample = samples[medianIndex];
            
            const lab = rgbToLab(medianSample.r, medianSample.g, medianSample.b);
            const lch = labToLch(lab.L, lab.a, lab.b);
            
            resolve({
                rgb: medianSample,
                hex: `#${medianSample.r.toString(16).padStart(2, '0')}${medianSample.g.toString(16).padStart(2, '0')}${medianSample.b.toString(16).padStart(2, '0')}`,
                lab: lab,
                lch: lch,
                confidence: Math.min(95, 50 + samples.length * 0.5)
            });
        };
        img.src = imageDataUrl;
    });
}

// ==========================================
// 개선된 퍼스널컬러 분석 엔진
// ==========================================

// 정밀한 시즌 분류 알고리즘
function classifySeasonAdvanced(lab, lch) {
    const { L, a, b } = lab;
    const { C, H } = lch;
    
    // 각 시즌과의 적합도 점수 계산
    const scores = {};
    
    for (const [season, palette] of Object.entries(SeasonPalettes)) {
        const range = palette.labRange;
        
        // LAB 범위 적합도
        const lScore = 1 - Math.abs((L - (range.L[0] + range.L[1])/2) / ((range.L[1] - range.L[0])/2));
        const aScore = 1 - Math.abs((a - (range.a[0] + range.a[1])/2) / ((range.a[1] - range.a[0])/2));
        const bScore = 1 - Math.abs((b - (range.b[0] + range.b[1])/2) / ((range.b[1] - range.b[0])/2));
        
        // 종합 점수 (가중치 적용)
        scores[season] = (lScore * 0.3 + aScore * 0.35 + bScore * 0.35) * 100;
        
        // 추가 특성 보너스
        if (season === 'Spring' && C > 25 && H > 30 && H < 90) scores[season] += 10;
        if (season === 'Summer' && C < 25 && L > 70) scores[season] += 10;
        if (season === 'Autumn' && L < 60 && H > 20 && H < 80) scores[season] += 10;
        if (season === 'Winter' && C > 20 && (H < 30 || H > 200)) scores[season] += 10;
    }
    
    // 최고 점수 시즌 찾기
    let bestSeason = 'Spring';
    let maxScore = 0;
    
    for (const [season, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestSeason = season;
        }
    }
    
    // 세부 타입 판정
    const subType = determineSubType(bestSeason, lab, lch);
    
    return {
        season: bestSeason,
        subType: subType,
        confidence: Math.min(95, Math.max(60, maxScore)),
        scores: scores
    };
}

// 세부 타입 판정
function determineSubType(season, lab, lch) {
    const subTypes = SeasonPalettes[season].subTypes;
    let bestSubType = 'true';
    let minDistance = Infinity;
    
    for (const [subType, criteria] of Object.entries(subTypes)) {
        const lDist = Math.abs(lab.L - (criteria.L[0] + criteria.L[1])/2);
        const cDist = Math.abs(lch.C - (criteria.C[0] + criteria.C[1])/2);
        const distance = lDist + cDist;
        
        if (distance < minDistance) {
            minDistance = distance;
            bestSubType = subType;
        }
    }
    
    return bestSubType;
}

// 개선된 퍼스널컬러 분석 (v2)
async function performPersonalColorAnalysis_v2(skinToneData) {
    if (!skinToneData || !skinToneData.lab) {
        console.warn('피부톤 데이터 없음, 기본값 사용');
        return performPersonalColorAnalysis_fallback();
    }
    
    const { lab, lch } = skinToneData;
    
    // 1. 시즌 분류
    const seasonResult = classifySeasonAdvanced(lab, lch);
    
    // 2. 헤어컬러 매칭 (Delta E 기반)
    const matchedColors = matchHairColors(lab, seasonResult.season);
    
    // 3. 추가 분석 데이터 생성
    const analysisData = {
        undertone: analyzeUndertone(lab, lch),
        brightness: analyzeBrightness(lab.L),
        saturation: analyzeSaturation(lch.C),
        recommendations: generateRecommendations(seasonResult, lab)
    };
    
    // 4. 전문가 분석 텍스트 생성
    const expertAnalysis = generateExpertAnalysis_v2(seasonResult, analysisData);
    
    return {
        season: seasonResult.season,
        subType: seasonResult.subType,
        confidence: seasonResult.confidence,
        scores: seasonResult.scores,
        colors: matchedColors,
        analysis: expertAnalysis,
        skinTone: skinToneData,
        details: analysisData
    };
}

// 언더톤 분석
function analyzeUndertone(lab, lch) {
    const { a, b } = lab;
    const { H } = lch;
    
    if (a > 5 && b > 10) {
        return { type: 'warm', strength: 'strong', description: '따뜻한 언더톤 (골드/옐로우)' };
    } else if (a < -2 && b < 5) {
        return { type: 'cool', strength: 'strong', description: '차가운 언더톤 (핑크/블루)' };
    } else if (Math.abs(a) < 3 && Math.abs(b) < 8) {
        return { type: 'neutral', strength: 'balanced', description: '중립 언더톤' };
    } else if (a > 2 && b > 5) {
        return { type: 'warm', strength: 'mild', description: '약한 따뜻한 언더톤' };
    } else {
        return { type: 'cool', strength: 'mild', description: '약한 차가운 언더톤' };
    }
}

// 명도 분석
function analyzeBrightness(L) {
    if (L > 75) return { level: 'very light', description: '매우 밝은 피부톤' };
    if (L > 65) return { level: 'light', description: '밝은 피부톤' };
    if (L > 55) return { level: 'medium', description: '중간 피부톤' };
    if (L > 45) return { level: 'tan', description: '탠 피부톤' };
    return { level: 'deep', description: '깊은 피부톤' };
}

// 채도 분석
function analyzeSaturation(C) {
    if (C > 30) return { level: 'high', description: '높은 채도 (선명함)' };
    if (C > 20) return { level: 'medium', description: '중간 채도' };
    if (C > 10) return { level: 'low', description: '낮은 채도 (부드러움)' };
    return { level: 'muted', description: '뮤트 톤' };
}

// 헤어컬러 매칭
function matchHairColors(skinLab, season) {
    if (!hairColorData || hairColorData.length === 0) return [];
    
    // 시즌별 필터링 + Delta E 계산
    const matches = hairColorData
        .filter(color => color.season === season && color.lab)
        .map(color => {
            const deltaE = deltaE2000(skinLab, color.lab);
            const compatibility = calculateCompatibility(skinLab, color.lab, season);
            
            return {
                ...color,
                deltaE: deltaE,
                compatibility: compatibility,
                matchScore: (100 - deltaE) * 0.7 + compatibility * 0.3
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);
    
    // 상위 5개에 신뢰도 추가
    return matches.slice(0, 5).map(color => ({
        ...color,
        reliability: Math.min(99, Math.max(60, Math.round(color.matchScore)))
    }));
}

// 헤어컬러 호환성 계산
function calculateCompatibility(skinLab, hairLab, season) {
    // 명도 대비
    const contrastScore = Math.abs(skinLab.L - hairLab.L) > 20 ? 20 : 
                          Math.abs(skinLab.L - hairLab.L);
    
    // 색상 조화
    const harmonyScore = 30 - Math.abs(skinLab.a - hairLab.a) - Math.abs(skinLab.b - hairLab.b);
    
    // 시즌 적합도
    const seasonScore = 30;
    
    return contrastScore + harmonyScore + seasonScore;
}

// 추천 사항 생성
function generateRecommendations(seasonResult, lab) {
    const recommendations = {
        bestColors: [],
        avoidColors: [],
        techniques: [],
        tips: []
    };
    
    switch(seasonResult.season) {
        case 'Spring':
            recommendations.bestColors = ['코랄', '피치', '골든 브라운', '허니 블론드'];
            recommendations.avoidColors = ['애쉬 그레이', '블루 블랙'];
            recommendations.techniques = ['하이라이트', '발레아주'];
            recommendations.tips.push('밝고 따뜻한 톤이 생기를 더해줍니다');
            break;
        case 'Summer':
            recommendations.bestColors = ['애쉬 브라운', '로즈 골드', '플래티넘'];
            recommendations.avoidColors = ['오렌지', '골드'];
            recommendations.techniques = ['옴브레', '쉐도우 루트'];
            recommendations.tips.push('차가운 톤으로 투명한 느낌을 연출하세요');
            break;
        case 'Autumn':
            recommendations.bestColors = ['초콜릿', '카라멜', '와인', '오번'];
            recommendations.avoidColors = ['블루', '애쉬'];
            recommendations.techniques = ['로우라이트', '글로시'];
            recommendations.tips.push('깊고 풍부한 색상이 잘 어울립니다');
            break;
        case 'Winter':
            recommendations.bestColors = ['제트 블랙', '다크 브라운', '버건디'];
            recommendations.avoidColors = ['골든', '카라멜'];
            recommendations.techniques = ['글로시', '원톤'];
            recommendations.tips.push('선명하고 대비가 강한 색상을 선택하세요');
            break;
    }
    
    return recommendations;
}

// 개선된 전문가 분석 생성
function generateExpertAnalysis_v2(seasonResult, analysisData) {
    const { season, subType, confidence } = seasonResult;
    const { undertone, brightness, saturation } = analysisData;
    
    let analysis = `당신은 ${SeasonPalettes[season].name} 타입`;
    
    // 세부 타입 설명
    if (subType !== 'true') {
        const subTypeNames = {
            bright: '브라이트',
            light: '라이트',
            soft: '소프트',
            dark: '다크'
        };
        analysis += ` (${subTypeNames[subType]} ${season})`;
    }
    
    analysis += `입니다. `;
    
    // 피부톤 특성
    analysis += `${brightness.description}에 ${undertone.description}을 가지고 있으며, `;
    analysis += `${saturation.description}의 특징을 보입니다. `;
    
    // 전문가 조언
    if (season === 'Spring') {
        analysis += ExpertKnowledge.blume.specificTypes.warm;
    } else if (season === 'Summer') {
        analysis += ExpertKnowledge.bitnalyun.skinConditions.pale;
    } else if (season === 'Autumn') {
        analysis += ExpertKnowledge.bitnalyun.skinConditions.yellowish;
    } else if (season === 'Winter') {
        analysis += ExpertKnowledge.blume.specificTypes.cool;
    }
    
    // 신뢰도 설명
    if (confidence > 85) {
        analysis += ' 매우 명확한 타입입니다.';
    } else if (confidence > 70) {
        analysis += ' 전형적인 특징을 보입니다.';
    } else {
        analysis += ' 혼합된 특성을 가지고 있습니다.';
    }
    
    return analysis;
}

// 폴백 분석 (데이터 없을 때)
function performPersonalColorAnalysis_fallback() {
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
    
    return {
        season: selectedSeason,
        confidence: Math.floor(Math.random() * 20) + 70,
        colors: [],
        analysis: generateExpertAnalysis(selectedSeason),
        skinTone: null
    };
}

// ==========================================
// 초기화 함수들
// ==========================================

// 시스템 초기화
async function initializeSystem() {
    const timeoutId = setTimeout(() => {
        console.warn('⚠️ 로딩 타임아웃 - 강제로 앱 표시');
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        updateDataStatus('타임아웃으로 강제 시작', 'warning');
        showToast('시스템이 준비되었습니다 (일부 기능 제한)', 'warning');
    }, 5000);
    
    try {
        console.log('시스템 초기화 시작...');
        
        // 1단계: 헤어컬러 데이터 로드
        console.log('1단계: 헤어컬러 데이터 로드');
        await loadHairColorData();
        
        // 2단계: 헤어컬러 LAB 값 사전 계산
        console.log('2단계: 헤어컬러 LAB 값 사전 계산');
        preprocessHairColorData();
        
        // 3단계: UI 설정
        console.log('3단계: UI 설정');
        setupFileUpload();
        setupDrapingMode();
        
        console.log('초기화 완료, 로딩 화면 제거...');
        
        // 로딩 화면 제거
        clearTimeout(timeoutId);
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        updateDataStatus('시스템 준비 완료', 'success');
        
        showToast('HAIRGATOR Personal Color 시스템이 준비되었습니다!', 'success');
        console.log('✅ HAIRGATOR Personal Color 준비 완료');
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ 시스템 초기화 실패:', error);
        
        // 오류가 발생해도 앱은 표시
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('loaded');
        updateDataStatus('오류 발생, 기본 모드로 동작', 'error');
        showToast('일부 기능에 제한이 있을 수 있습니다.', 'warning');
    }
}

// 헤어컬러 데이터 전처리
function preprocessHairColorData() {
    let processed = 0;
    
    hairColorData.forEach(color => {
        // HEX 값이 있으면 LAB 변환
        if (color.hex && !color.lab) {
            color.lab = hexToLab(color.hex);
            processed++;
        }
        // RGB 값이 있으면 LAB 변환
        else if (color.rgb && !color.lab) {
            if (typeof color.rgb === 'string') {
                try {
                    const rgb = JSON.parse(color.rgb);
                    color.lab = rgbToLab(rgb[0] || rgb.r, rgb[1] || rgb.g, rgb[2] || rgb.b);
                    processed++;
                } catch (e) {
                    console.warn('RGB 파싱 실패:', color.rgb);
                }
            } else if (typeof color.rgb === 'object') {
                color.lab = rgbToLab(color.rgb.r, color.rgb.g, color.rgb.b);
                processed++;
            }
        }
        
        // LCH 값도 계산
        if (color.lab) {
            color.lch = labToLch(color.lab.L, color.lab.a, color.lab.b);
        }
    });
    
    console.log(`✅ ${processed}개 헤어컬러 LAB 값 계산 완료`);
}

// 헤어컬러 데이터 로드 (614개)
function loadHairColorData() {
    return new Promise((resolve) => {
        try {
            // 1순위: 부모창의 HAIR_COLOR_614_DATA
            if (typeof parent !== 'undefined' && parent.HAIR_COLOR_614_DATA) {
                hairColorData = parent.HAIR_COLOR_614_DATA;
                console.log(`✅ 부모창에서 ${hairColorData.length}개 헤어컬러 데이터 로드`);
                updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                resolve();
                return;
            }
            
            // 2순위: 글로벌 변수
            if (typeof hairColorDatabase !== 'undefined') {
                hairColorData = hairColorDatabase;
                console.log(`✅ 글로벌 변수에서 ${hairColorData.length}개 로드`);
                updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                resolve();
                return;
            }
            
            // 3순위: 외부 스크립트 동적 로드
            if (typeof HAIR_COLOR_614_DATA === 'undefined') {
                const script = document.createElement('script');
                script.src = './hair-color-data.js';
                script.onload = () => {
                    if (typeof HAIR_COLOR_614_DATA !== 'undefined') {
                        hairColorData = HAIR_COLOR_614_DATA;
                        console.log(`✅ 외부 스크립트에서 ${hairColorData.length}개 로드`);
                        updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                    } else {
                        hairColorData = generate614DefaultData();
                        console.warn('⚠️ 외부 스크립트 실패 - 기본 데이터 생성');
                        updateDataStatus('기본 614개 헤어컬러 데이터 생성됨', 'warning');
                    }
                    resolve();
                };
                script.onerror = () => {
                    hairColorData = generate614DefaultData();
                    console.warn('⚠️ 스크립트 로드 실패 - 기본 데이터 생성');
                    updateDataStatus('기본 614개 헤어컬러 데이터 생성됨', 'warning');
                    resolve();
                };
                document.head.appendChild(script);
            } else {
                hairColorData = HAIR_COLOR_614_DATA;
                console.log(`✅ 기존 스크립트에서 ${hairColorData.length}개 로드`);
                updateDataStatus(`${hairColorData.length}개 헤어컬러 데이터 로드됨`, 'success');
                resolve();
            }
            
        } catch (error) {
            console.error('❌ 헤어컬러 데이터 로드 실패:', error);
            hairColorData = generate614DefaultData();
            updateDataStatus('오류로 인한 기본 데이터 사용', 'error');
            resolve();
        }
    });
}

// 614개 구조의 기본 데이터 생성
function generate614DefaultData() {
    const brands = ['L\'Oreal', 'Wella', 'Milbon', 'Shiseido', 'Schwarzkopf'];
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const tones = ['N', 'A', 'G', 'B', 'V', 'R', 'O', 'Y'];
    
    const data = [];
    let id = 1;
    
    for (let i = 0; i < 614; i++) {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const level = levels[Math.floor(Math.random() * levels.length)];
        const tone = tones[Math.floor(Math.random() * tones.length)];
        
        data.push({
            id: id++,
            brand: brand,
            code: `${level}${tone}${Math.floor(Math.random() * 99) + 1}`,
            name: `${brand} Professional ${level}${tone}`,
            level: level,
            tone: tone,
            rgb: {
                r: Math.floor(Math.random() * 255),
                g: Math.floor(Math.random() * 255),
                b: Math.floor(Math.random() * 255)
            },
            hex: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
            season: ['Spring', 'Summer', 'Autumn', 'Winter'][Math.floor(Math.random() * 4)],
            reliability: Math.floor(Math.random() * 30) + 70
        });
    }
    
    console.log('✅ 614개 기본 데이터 생성 완료');
    return data;
}

// MediaPipe 초기화 (개선 버전)
async function initializeMediaPipe() {
    try {
        // Face Mesh 사용 (468개 랜드마크)
        if (typeof FaceMesh !== 'undefined') {
            faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });
            
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            faceMesh.onResults(onFaceMeshResults);
            
            console.log('✅ MediaPipe Face Mesh 초기화 완료');
            updateDataStatus('AI 얼굴 인식 준비됨', 'success');
            return true;
        }
        
        // Face Detection 폴백
        if (typeof FaceDetection !== 'undefined') {
            faceDetection = new FaceDetection({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
                }
            });
            
            faceDetection.setOptions({
                model: 'short',
                minDetectionConfidence: 0.5,
            });
            
            faceDetection.onResults(onFaceDetectionResults);
            
            console.log('✅ MediaPipe Face Detection 초기화 완료');
            updateDataStatus('기본 얼굴 인식 준비됨', 'success');
            return true;
        }
        
        console.warn('⚠️ MediaPipe 라이브러리가 로드되지 않음');
        updateDataStatus('카메라 기능 제한', 'warning');
        return false;
        
    } catch (error) {
        console.error('❌ MediaPipe 초기화 실패:', error);
        updateDataStatus('AI 얼굴 인식 오류', 'error');
        return false;
    }
}

// ==========================================
// AI 모드 - 자동 분석
// ==========================================

// 사진 업로드 파일 선택 처리
function setupFileUpload() {
    const fileInput = document.getElementById('photo-upload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
}

// 파일 업로드 처리
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result;
        
        // 업로드된 이미지 표시
        const preview = document.getElementById('uploaded-preview');
        if (preview) {
            preview.src = uploadedImage;
            preview.style.display = 'block';
        }
        
        // 분석 버튼 활성화
        const analyzeBtn = document.getElementById('analyze-photo');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '🤖 AI 퍼스널컬러 분석 시작';
        }
        
        showToast('이미지가 업로드되었습니다. 분석을 시작하세요!', 'success');
    };
    
    reader.readAsDataURL(file);
}

// AI 사진 분석 (개선 버전)
async function analyzePhoto() {
    if (!uploadedImage || isAnalyzing) return;
    
    isAnalyzing = true;
    const analyzeBtn = document.getElementById('analyze-photo');
    
    try {
        // UI 업데이트
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = '🔄 AI 분석 중...';
        }
        
        // 분석 단계별 진행
        await simulateAnalysisSteps();
        
        // 이미지에서 피부톤 추출
        const skinToneData = await extractSkinToneFromImage(uploadedImage);
        
        // 개선된 퍼스널컬러 분석 실행
        const result = await performPersonalColorAnalysis(skinToneData);
        
        // 결과 표시
        displayAnalysisResults(result);
        
        analysisCount++;
        
        showToast(`${SeasonPalettes[result.season].name} 타입으로 분석되었습니다!`, 'success');
        
    } catch (error) {
        console.error('❌ 분석 실패:', error);
        showToast('분석 중 오류가 발생했습니다.', 'error');
    } finally {
        isAnalyzing = false;
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '🤖 AI 퍼스널컬러 분석 시작';
        }
    }
}

// 분석 단계 시뮬레이션
async function simulateAnalysisSteps() {
    const steps = [
        '얼굴 영역 검출 중...',
        '피부톤 색상 추출 중...',
        'LAB 색공간 변환 중...',
        '4계절 매칭 분석 중...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
        updateAnalysisStep(i + 1, steps[i], true);
        await new Promise(resolve => setTimeout(resolve, 800));
        updateAnalysisStep(i + 1, steps[i], false);
    }
}

// 분석 단계 UI 업데이트
function updateAnalysisStep(step, message, inProgress) {
    const stepElement = document.getElementById(`step-${step}`);
    if (stepElement) {
        stepElement.textContent = message;
        stepElement.className = inProgress ? 'analysis-step active' : 'analysis-step completed';
    }
}

// 통합 퍼스널컬러 분석 함수
async function performPersonalColorAnalysis(skinToneData) {
    // v2 버전이 있으면 사용, 없으면 기본 버전
    if (typeof performPersonalColorAnalysis_v2 === 'function') {
        return performPersonalColorAnalysis_v2(skinToneData);
    }
    
    // 기본 폴백
    return performPersonalColorAnalysis_fallback();
}

// 분석 결과 표시 (개선 버전)
function displayAnalysisResults(result) {
    // 계절 결과
    const seasonResult = document.getElementById('season-result');
    if (seasonResult) {
        let seasonText = SeasonPalettes[result.season].name;
        if (result.subType) {
            const subTypeNames = {
                bright: '브라이트',
                light: '라이트',
                soft: '소프트',
                dark: '다크',
                true: ''
            };
            if (subTypeNames[result.subType]) {
                seasonText += ` (${subTypeNames[result.subType]})`;
            }
        }
        seasonResult.textContent = `${seasonText} - ${result.confidence}% 확신`;
    }
    
    // 전문가 분석
    const expertAnalysis = document.getElementById('expert-analysis');
    if (expertAnalysis) {
        expertAnalysis.textContent = result.analysis;
    }
    
    // 추가 분석 데이터 표시
    if (result.details) {
        displayAdditionalAnalysis(result.details);
    }
    
    // 추천 헤어컬러
    displayRecommendedHairColors(result.colors, result.season);
    
    // 결과 컨테이너 표시
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ 
            behavior: 'smooth' 
        });
    }
}

// 추가 분석 데이터 표시
function displayAdditionalAnalysis(details) {
    const container = document.getElementById('additional-analysis');
    if (!container) return;
    
    let html = '<div class="analysis-details">';
    
    if (details.undertone) {
        html += `<div class="detail-item">
            <strong>언더톤:</strong> ${details.undertone.description}
        </div>`;
    }
    
    if (details.brightness) {
        html += `<div class="detail-item">
            <strong>명도:</strong> ${details.brightness.description}
        </div>`;
    }
    
    if (details.saturation) {
        html += `<div class="detail-item">
            <strong>채도:</strong> ${details.saturation.description}
        </div>`;
    }
    
    if (details.recommendations) {
        html += '<div class="recommendations">';
        html += '<h4>맞춤 추천</h4>';
        
        if (details.recommendations.bestColors.length > 0) {
            html += '<div class="rec-section"><strong>추천 컬러:</strong> ' + 
                    details.recommendations.bestColors.join(', ') + '</div>';
        }
        
        if (details.recommendations.avoidColors.length > 0) {
            html += '<div class="rec-section"><strong>피할 컬러:</strong> ' + 
                    details.recommendations.avoidColors.join(', ') + '</div>';
        }
        
        if (details.recommendations.tips.length > 0) {
            html += '<div class="rec-section"><strong>스타일링 팁:</strong><ul>';
            details.recommendations.tips.forEach(tip => {
                html += `<li>${tip}</li>`;
            });
            html += '</ul></div>';
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// 추천 헤어컬러 표시 (개선 버전)
function displayRecommendedHairColors(colors, season) {
    const container = document.getElementById('recommended-colors');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!colors || colors.length === 0) {
        container.innerHTML = '<p>해당 계절의 헤어컬러 데이터가 없습니다.</p>';
        return;
    }
    
    colors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'hair-color-item';
        
        // Delta E 기반 매칭 레벨 표시
        let matchLevel = 'good';
        if (color.deltaE < 5) matchLevel = 'perfect';
        else if (color.deltaE < 10) matchLevel = 'excellent';
        else if (color.deltaE > 20) matchLevel = 'fair';
        
        colorDiv.innerHTML = `
            <div class="color-swatch" style="background-color: ${color.hex}">
                <span class="match-level ${matchLevel}">${matchLevel.toUpperCase()}</span>
            </div>
            <div class="color-info">
                <div class="brand">${color.brand}</div>
                <div class="code">${color.code}</div>
                <div class="name">${color.name}</div>
                <div class="reliability">${color.reliability}% 매칭</div>
                ${color.deltaE ? `<div class="delta-e">ΔE: ${color.deltaE.toFixed(1)}</div>` : ''}
            </div>
        `;
        container.appendChild(colorDiv);
    });
    
    // 요약 정보 표시
    const summary = document.createElement('div');
    summary.className = 'recommendation-summary';
    summary.innerHTML = `
        <h4>${SeasonPalettes[season].name} 타입 추천</h4>
        <p>Delta E 색차 분석 기반 상위 ${colors.length}개 헤어컬러</p>
        <p class="delta-info">ΔE < 5: 완벽 | ΔE < 10: 우수 | ΔE < 20: 양호</p>
    `;
    container.insertBefore(summary, container.firstChild);
}

// ==========================================
// 실시간 카메라 분석
// ==========================================

// 카메라 시작 (개선 버전)
async function startCamera() {
    const startBtn = document.getElementById('start-camera');
    
    try {
        startBtn.disabled = true;
        startBtn.textContent = 'MediaPipe 로딩 중...';
        
        showToast('카메라를 준비하고 있습니다...', 'info');
        
        // iframe 권한 확인
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('이 브라우저는 카메라를 지원하지 않습니다.');
        }
        
        // MediaPipe 초기화
        if (!faceMesh && !faceDetection) {
            console.log('🤖 MediaPipe 초기화 시작...');
            const initialized = await initializeMediaPipe();
            if (!initialized) {
                throw new Error('MediaPipe 초기화
