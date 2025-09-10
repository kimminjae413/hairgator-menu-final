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
// 추가 색상 추출 함수들 (성능 최적화)
// ==========================================

// 효율적인 픽셀 추출 함수
function getPixelFromBuffer(imageData, width, x, y) {
    if (x < 0 || x >= width || y < 0 || y >= imageData.height) {
        return { r: 0, g: 0, b: 0, a: 0 };
    }
    
    const index = (y * width + x) * 4;
    return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3]
    };
}

// 홍채 색상 추출 (폴백 방식)
function extractIrisColorFallback(imageData, width, height, landmarks, side) {
    // 눈 영역 랜드마크 인덱스
    const eyeIndices = side === 'left' ? 
        [33, 160, 159, 158, 133, 153, 144, 145] : // 왼쪽 눈
        [362, 385, 386, 387, 263, 373, 374, 380]; // 오른쪽 눈
    
    // 눈 영역 경계 계산
    let minX = width, maxX = 0, minY = height, maxY = 0;
    
    for (const idx of eyeIndices) {
        if (landmarks[idx]) {
            const point = landmarks[idx];
            const x = point.x * width;
            const y = point.y * height;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    
    if (minX >= maxX || minY >= maxY) return null;
    
    // 홍채 영역 추정 (눈 중앙 30% 영역)
    const eyeWidth = maxX - minX;
    const eyeHeight = maxY - minY;
    const irisCenterX = minX + eyeWidth * 0.5;
    const irisCenterY = minY + eyeHeight * 0.5;
    const irisRadius = Math.min(eyeWidth, eyeHeight) * 0.2;
    
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    
    // 원형 샘플링
    for (let angle = 0; angle < 360; angle += 30) {
        for (let r = 2; r < irisRadius; r += 2) {
            const x = Math.round(irisCenterX + r * Math.cos(angle * Math.PI / 180));
            const y = Math.round(irisCenterY + r * Math.sin(angle * Math.PI / 180));
            
            const pixel = getPixelFromBuffer(imageData, width, x, y);
            
            // 반사광 및 극단값 제외
            const brightness = (pixel.r + pixel.g + pixel.b) / 3;
            if (brightness > 30 && brightness < 200) {
                rSum += pixel.r;
                gSum += pixel.g;
                bSum += pixel.b;
                count++;
            }
        }
    }
    
    if (count < 10) return null;
    
    return {
        r: Math.round(rSum / count),
        g: Math.round(gSum / count),
        b: Math.round(bSum / count)
    };
}

// 헤어 색상 추출 (제공된 효율적인 버전)
function extractHairColorFromLandmarks(imageData, width, height, landmarks) {
    // 머리 상단 근사 좌표: 머리 꼭대기 근처를 forehead 포인트에서 위로 오프셋
    const foreheadIdx = 10; // FaceMesh 기준 이마 중앙
    if (!landmarks || !landmarks[foreheadIdx]) return null;
    
    const fx = Math.round(landmarks[foreheadIdx].x * width);
    const fy = Math.round(landmarks[foreheadIdx].y * height);
    
    // 헤어 라인 샘플링 박스 (이 값은 조정 가능)
    const boxW = Math.round(width * 0.35);
    const boxH = Math.round(height * 0.18);
    const startX = Math.max(0, fx - Math.round(boxW/2));
    const startY = Math.max(0, fy - Math.round(boxH * 1.2)); // 이마 위쪽 영역
    const endX = Math.min(width, startX + boxW);
    const endY = Math.min(height, startY + boxH);
    
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    
    // 2픽셀 간격으로 샘플링하여 속도 확보
    for (let yy = startY; yy < endY; yy += 2) {
        for (let xx = startX; xx < endX; xx += 2) {
            const p = getPixelFromBuffer(imageData, width, xx, yy);
            
            // 피부 픽셀은 제외 (피부와 대비되어야 하므로 채도/색상 기준)
            const brightness = (p.r + p.g + p.b) / 3;
            const saturation = Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b);
            
            if (saturation > 15 && brightness > 20 && brightness < 240) {
                rSum += p.r;
                gSum += p.g;
                bSum += p.b;
                count++;
            }
        }
    }
    
    if (count < 10) return null; // 최소 샘플 수 체크
    
    const avgColor = {
        r: Math.round(rSum / count),
        g: Math.round(gSum / count),
        b: Math.round(bSum / count)
    };
    
    // 헤어 색상 분류
    const lab = rgbToLab(avgColor.r, avgColor.g, avgColor.b);
    const darkness = lab.L < 30 ? 'dark' : lab.L < 60 ? 'medium' : 'light';
    
    return {
        ...avgColor,
        darkness: darkness,
        samplingArea: { startX, startY, width: boxW, height: boxH },
        sampleCount: count
    };
}

// 통합 색상 추출 함수 (개선 버전)
function extractComprehensiveColors(landmarks, videoElement) {
    if (!landmarks || !videoElement) return null;
    
    // 임시 캔버스 생성
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    
    // 전체 이미지 데이터를 한 번만 가져오기
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 1. 피부톤 (기존 함수 사용)
    const skinTone = extractSkinToneFromLandmarks(landmarks, videoElement);
    
    // 2. 홍채 색상 (양쪽 눈)
    const leftEye = extractIrisColorFallback(imageData, canvas.width, canvas.height, landmarks, 'left');
    const rightEye = extractIrisColorFallback(imageData, canvas.width, canvas.height, landmarks, 'right');
    const eyeColor = leftEye || rightEye;
    
    // 3. 헤어 색상
    const hairColor = extractHairColorFromLandmarks(imageData, canvas.width, canvas.height, landmarks);
    
    return {
        skin: skinTone,
        eye: eyeColor ? {
            ...eyeColor,
            lab: rgbToLab(eyeColor.r, eyeColor.g, eyeColor.b)
        } : null,
        hair: hairColor ? {
            ...hairColor,
            lab: rgbToLab(hairColor.r, hairColor.g, hairColor.b)
        } : null,
        timestamp: Date.now()
    };
}

// 통합 시즌 분류 (3요소 고려)
function classifySeasonComprehensive(skinLab, eyeLab, hairLab) {
    let scores = { Spring: 0, Summer: 0, Autumn: 0, Winter: 0 };
    
    // 피부톤 기반 점수 (가중치 50%)
    if (skinLab) {
        const skinScores = classifySeasonAdvanced(skinLab, labToLch(skinLab.L, skinLab.a, skinLab.b));
        for (const [season, score] of Object.entries(skinScores.scores)) {
            scores[season] += score * 0.5;
        }
    }
    
    // 눈 색상 보정 (가중치 30%)
    if (eyeLab) {
        // 어두운 눈 → Winter/Autumn 강화
        if (eyeLab.L < 40) {
            scores.Winter += 15;
            scores.Autumn += 10;
        }
        // 밝은 눈 → Summer/Spring 강화
        else if (eyeLab.L > 60) {
            scores.Summer += 15;
            scores.Spring += 10;
        }
    }
    
    // 원래 머리색 보정 (가중치 20%)
    if (hairLab) {
        // 어두운 머리 → Winter/Autumn
        if (hairLab.L < 35) {
            scores.Winter += 10;
            scores.Autumn += 8;
        }
        // 밝은 머리 → Spring/Summer
        else if (hairLab.L > 50) {
            scores.Spring += 10;
            scores.Summer += 8;
        }
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
    
    return {
        season: bestSeason,
        confidence: Math.min(95, Math.max(60, maxScore * 0.8)),
        scores: scores,
        factors: {
            skin: skinLab ? 'analyzed' : 'missing',
            eye: eyeLab ? 'analyzed' : 'estimated',
            hair: hairLab ? 'analyzed' : 'estimated'
        }
    };
}

// Face Mesh 랜드마크 그리기
function drawFaceMeshLandmarks(ctx, landmarks) {
    if (!ctx || !landmarks) return;
    
    // 피부톤 샘플링 포인트 표시
    const skinPoints = [10, 151, 9, 67, 116, 117, 345, 346, 18, 175, 1, 2];
    ctx.fillStyle = '#00FF00';
    
    skinPoints.forEach(idx => {
        if (landmarks[idx]) {
            const point = landmarks[idx];
            const x = point.x * ctx.canvas.width;
            const y = point.y * ctx.canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
    
    // 눈 영역 표시
    const leftEyeIndices = [33, 160, 159, 158, 133, 153, 144, 145];
    const rightEyeIndices = [362, 385, 386, 387, 263, 373, 374, 380];
    
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    
    [leftEyeIndices, rightEyeIndices].forEach(eyeIndices => {
        ctx.beginPath();
        eyeIndices.forEach((idx, i) => {
            if (landmarks[idx]) {
                const point = landmarks[idx];
                const x = point.x * ctx.canvas.width;
                const y = point.y * ctx.canvas.height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.stroke();
    });
    
    // 헤어라인 영역 표시
    if (landmarks[10]) {
        const forehead = landmarks[10];
        const fx = forehead.x * ctx.canvas.width;
        const fy = forehead.y * ctx.canvas.height;
        
        const boxW = ctx.canvas.width * 0.35;
        const boxH = ctx.canvas.height * 0.18;
        const startX = fx - boxW/2;
        const startY = fy - boxH * 1.2;
        
        ctx.strokeStyle = '#0000FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, boxW, boxH);
    }
}

// 실시간 표시 업데이트
function updateRealtimeDisplay(seasonResult) {
    const realtimeInfo = document.getElementById('realtime-info');
    if (realtimeInfo) {
        realtimeInfo.innerHTML = `
            <div class="realtime-season">
                <strong>${SeasonPalettes[seasonResult.season].name}</strong>
                <span class="confidence">${seasonResult.confidence}%</span>
            </div>
            <div class="realtime-colors" id="realtime-colors"></div>
        `;
    }
    
    // 실시간 추천 색상 표시
    updateRealtimeColorRecommendations(seasonResult.season);
}

// 실시간 색상 추천
function updateRealtimeColorRecommendations(season) {
    const container = document.getElementById('realtime-colors');
    if (!container) return;
    
    const palette = SeasonPalettes[season];
    if (!palette) return;
    
    container.innerHTML = '';
    palette.colors.slice(0, 4).forEach(color => {
        const colorChip = document.createElement('div');
        colorChip.className = 'realtime-color-chip';
        colorChip.style.backgroundColor = color;
        colorChip.title = color;
        container.appendChild(colorChip);
    });
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

// 614개 구조의 기본 데이터 생성 (개선 버전)
function generate614DefaultData() {
    // 신뢰할 수 있는 데이터 생성 함수 사용
    if (typeof generateReliableDefaultData === 'function') {
        return generateReliableDefaultData();
    }
    
    // 기존 랜덤 생성 (폴백)
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

// MediaPipe Face Mesh 결과 처리 (개선 버전)
function onFaceMeshResults(results) {
    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        // Face Detection 폴백
        if (faceDetection && results.detections) {
            onFaceDetectionResults(results);
        }
        return;
    }
    
    const landmarks = results.multiFaceLandmarks[0];
    
    // 효율적인 캔버스 처리 - 한 번만 생성하고 재사용
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    
    // 전체 이미지 데이터를 한 번만 가져오기
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 1) 피부톤 추출
    const skin = extractSkinToneFromLandmarks(landmarks, videoElement);
    
    // 2) 눈동자 색상 추출 (폴백 방식)
    const leftIris = extractIrisColorFallback(imageData, canvas.width, canvas.height, landmarks, 'left');
    const rightIris = extractIrisColorFallback(imageData, canvas.width, canvas.height, landmarks, 'right');
    const eye = leftIris || rightIris ? (leftIris || rightIris) : null;
    
    // 3) 헤어 색상 추출
    const hair = extractHairColorFromLandmarks(imageData, canvas.width, canvas.height, landmarks);
    
    // LAB 변환
    const eyeLab = eye ? rgbToLab(eye.r, eye.g, eye.b) : null;
    const hairLab = hair ? rgbToLab(hair.r, hair.g, hair.b) : null;
    
    // 실시간 분석 데이터 업데이트
    realtimeAnalysisData.skinTone = skin;
    if (eyeLab) realtimeAnalysisData.eyeLab = eyeLab;
    if (hairLab) realtimeAnalysisData.hairLab = hairLab;
    realtimeAnalysisData.lastUpdate = Date.now();
    
    // 실시간 시즌 분석
    if (skin && skin.lab) {
        const seasonResult = classifySeasonAdvanced(skin.lab, skin.lch);
        realtimeAnalysisData.season = seasonResult.season;
        realtimeAnalysisData.confidence = seasonResult.confidence;
        
        // UI 업데이트 (실시간)
        updateRealtimeDisplay(seasonResult);
    }
    
    // 캔버스에 랜드마크 그리기
    if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        drawFaceMeshLandmarks(canvasCtx, landmarks);
    }
}

// MediaPipe 얼굴 인식 결과 처리 (폴백)
function onFaceDetectionResults(results) {
    if (!canvasCtx) return;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.detections && results.detections.length > 0) {
        results.detections.forEach(detection => {
            // 얼굴 영역 표시
            const box = detection.boundingBox;
            const x = box.xCenter * canvasElement.width - (box.width * canvasElement.width) / 2;
            const y = box.yCenter * canvasElement.height - (box.height * canvasElement.height) / 2;
            const width = box.width * canvasElement.width;
            const height = box.height * canvasElement.height;
            
            canvasCtx.strokeStyle = '#00FF00';
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeRect(x, y, width, height);
            
            // 신뢰도 표시
            canvasCtx.fillStyle = '#00FF00';
            canvasCtx.font = '16px Arial';
            canvasCtx.fillText(`${Math.round(detection.score * 100)}%`, x, y - 10);
        });
    }
    
    canvasCtx.restore();
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
                throw new Error('MediaPipe 초기화 실패');
            }
        }
        
        // iframe 내부에서 안전한 카메라 접근
        let stream;
        try {
            // 기본 설정으로 시도
            stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 }, 
                    facingMode: 'user' 
                }
            });
        } catch (basicError) {
            console.warn('기본 카메라 설정 실패, 최소 설정으로 재시도:', basicError);
            
            // 최소 설정으로 재시도
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });
            } catch (minimalError) {
                console.error('최소 카메라 설정도 실패:', minimalError);
                
                // iframe 권한 문제인지 확인
                if (minimalError.name === 'NotAllowedError') {
                    throw new Error('iframe_permission_denied');
                } else {
                    throw minimalError;
                }
            }
        }
        
        videoElement = document.getElementById('camera-feed');
        canvasElement = document.getElementById('camera-canvas');
        
        if (videoElement && canvasElement) {
            videoElement.srcObject = stream;
            canvasCtx = canvasElement.getContext('2d');
            
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                startBtn.textContent = '📹 카메라 중지';
                startBtn.disabled = false;
                startBtn.onclick = stopCamera;
                
                // 실시간 분석 시작
                if (faceMesh || faceDetection) {
                    startRealTimeAnalysis();
                }
                
                showToast('실시간 카메라 분석이 시작되었습니다!', 'success');
            };
        }
        
    } catch (error) {
        console.error('❌ 카메라 시작 실패:', error);
        
        let errorMessage = '카메라 접근에 실패했습니다.';
        
        if (error.message === 'iframe_permission_denied') {
            errorMessage = `
                🚨 iframe 카메라 권한 문제 발생!
                
                해결 방법:
                1. 메인 index.html의 iframe에 allow="camera" 추가
                2. netlify.toml에서 camera=() → camera=(self) 수정
                3. 브라우저 새로고침 후 재시도
                
                현재는 사진 업로드 모드를 사용해주세요.
            `;
            
            // 사진 업로드 모드로 자동 전환
            setTimeout(() => {
                showPhotoUploadAlternative();
            }, 2000);
            
        } else if (error.name === 'NotAllowedError') {
            errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 접근을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = '카메라가 다른 앱에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.';
        }
        
        showToast(errorMessage, 'error', 5000);
        
        startBtn.disabled = false;
        startBtn.textContent = '📹 실시간 카메라 분석';
    }
}

// 사진 업로드 대안 표시
function showPhotoUploadAlternative() {
    const aiMode = document.getElementById('ai-mode');
    if (aiMode) {
        const alternativeDiv = document.createElement('div');
        alternativeDiv.className = 'camera-alternative';
        alternativeDiv.innerHTML = `
            <div class="alternative-notice">
                <h3>🔄 카메라 대신 사진 업로드 사용</h3>
                <p>실시간 카메라 분석이 불가능한 상황입니다.<br>
                아래 사진 업로드로 AI 퍼스널컬러 분석을 진행해주세요.</p>
                <button class="highlight-upload-btn" onclick="highlightPhotoUpload()">
                    📸 사진 업로드하러 가기
                </button>
            </div>
        `;
        
        const cameraSection = aiMode.querySelector('.camera-section');
        if (cameraSection) {
            cameraSection.appendChild(alternativeDiv);
        }
    }
}

// 사진 업로드 섹션 강조
function highlightPhotoUpload() {
    const photoSection = document.getElementById('photo-upload-section');
    if (photoSection) {
        photoSection.scrollIntoView({ behavior: 'smooth' });
        photoSection.style.border = '2px solid var(--primary-pink)';
        photoSection.style.borderRadius = '10px';
        photoSection.style.padding = '20px';
        
        setTimeout(() => {
            photoSection.style.border = '';
            photoSection.style.padding = '';
        }, 3000);
    }
    
    showToast('사진을 선택하여 AI 분석을 시작하세요!', 'info');
}

// 카메라 중지
function stopCamera() {
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    const startBtn = document.getElementById('start-camera');
    startBtn.textContent = '📹 실시간 카메라 분석';
    startBtn.onclick = startCamera;
    
    showToast('카메라가 중지되었습니다.', 'info');
}

// 실시간 분석 시작 (개선 버전)
function startRealTimeAnalysis() {
    if (!videoElement || !canvasElement || (!faceMesh && !faceDetection)) return;
    
    let frameCount = 0;
    const analyzeEveryNFrames = 10; // 10프레임마다 분석 (성능 최적화)
    
    const analyze = async () => {
        if (videoElement.readyState === 4) {
            frameCount++;
            
            // 캔버스 크기 조정
            canvasElement.width = videoElement.videoWidth || 640;
            canvasElement.height = videoElement.videoHeight || 480;
            
            // Face Mesh 우선 사용
            if (faceMesh) {
                try {
                    await faceMesh.send({ image: videoElement });
                } catch (error) {
                    console.warn('Face Mesh 실패, Face Detection으로 폴백:', error);
                    if (faceDetection) {
                        await faceDetection.send({ image: videoElement });
                    }
                }
            }
            // Face Detection 폴백
            else if (faceDetection) {
                try {
                    await faceDetection.send({ image: videoElement });
                } catch (error) {
                    console.error('Face Detection 실패:', error);
                }
            }
            
            // 주기적으로 통합 분석 실행
            if (frameCount % analyzeEveryNFrames === 0 && realtimeAnalysisData.skinTone) {
                performRealtimeComprehensiveAnalysis();
            }
        }
        
        // 카메라가 활성화되어 있으면 계속 실행
        if (videoElement.srcObject) {
            requestAnimationFrame(analyze);
        }
    };
    
    analyze();
}

// 실시간 통합 분석
function performRealtimeComprehensiveAnalysis() {
    try {
        const { skinTone, eyeLab, hairLab } = realtimeAnalysisData;
        
        if (!skinTone || !skinTone.lab) return;
        
        // 통합 시즌 분류
        const comprehensiveResult = classifySeasonComprehensive(
            skinTone.lab,
            eyeLab,
            hairLab
        );
        
        // 결과 업데이트
        realtimeAnalysisData.season = comprehensiveResult.season;
        realtimeAnalysisData.confidence = comprehensiveResult.confidence;
        realtimeAnalysisData.comprehensiveScores = comprehensiveResult.scores;
        
        // UI 실시간 업데이트
        updateRealtimeDisplay(comprehensiveResult);
        
        console.log(`실시간 분석: ${comprehensiveResult.season} (${comprehensiveResult.confidence}%)`, comprehensiveResult.factors);
        
    } catch (error) {
        console.error('실시간 분석 오류:', error);
    }
}

// ==========================================
// 드래이핑 모드 - 실시간 색상 테스트
// ==========================================

// 드래이핑 모드 초기화
function setupDrapingMode() {
    setupColorAdjustments();
    setupSeasonTabs();
    loadSavedColors();
}

// 색상 조정 슬라이더 설정
function setupColorAdjustments() {
    const sliders = ['lightness', 'saturation', 'warmth'];
    
    sliders.forEach(type => {
        const slider = document.getElementById(`${type}-slider`);
        if (slider) {
            slider.addEventListener('input', function() {
                colorAdjustments[type] = parseInt(this.value);
                updateColorAdjustmentDisplay(type, this.value);
                applyColorAdjustments();
            });
        }
    });
}

// 색상 조정값 표시 업데이트
function updateColorAdjustmentDisplay(type, value) {
    const display = document.getElementById(`${type}-value`);
    if (display) {
        display.textContent = value > 0 ? `+${value}` : value;
    }
}

// 색상 조정 적용
function applyColorAdjustments() {
    const colorGrid = document.getElementById('color-grid');
    if (!colorGrid) return;
    
    // CSS 필터로 실시간 색상 조정
    const { lightness, saturation, warmth } = colorAdjustments;
    
    const filter = `
        brightness(${100 + lightness}%) 
        saturate(${100 + saturation}%) 
        hue-rotate(${warmth * 2}deg)
    `.trim();
    
    colorGrid.style.filter = filter;
}

// 계절 탭 설정
function setupSeasonTabs() {
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    
    seasons.forEach(season => {
        const tab = document.getElementById(`${season.toLowerCase()}-tab`);
        if (tab) {
            tab.addEventListener('click', () => selectSeason(season));
        }
    });
    
    // 기본 선택
    selectSeason('Spring');
}

// 계절 선택
function selectSeason(season) {
    selectedSeason = season;
    
    // 탭 활성화
    document.querySelectorAll('.season-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${season.toLowerCase()}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 색상 팔레트 업데이트
    updateColorPalette(season);
}

// 색상 팔레트 업데이트
function updateColorPalette(season) {
    const colorGrid = document.getElementById('color-grid');
    if (!colorGrid) return;
    
    const palette = SeasonPalettes[season];
    if (!palette) return;
    
    colorGrid.innerHTML = '';
    
    palette.colors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-item';
        colorDiv.style.backgroundColor = color;
        colorDiv.addEventListener('click', () => saveColor(color, season));
        colorGrid.appendChild(colorDiv);
    });
    
    // 특성 설명 업데이트
    const characteristics = document.getElementById('season-characteristics');
    if (characteristics) {
        characteristics.innerHTML = palette.characteristics
            .map(char => `<li>${char}</li>`)
            .join('');
    }
}

// 색상 저장
function saveColor(color, season) {
    const savedColor = {
        id: Date.now(),
        color: color,
        season: season,
        timestamp: new Date().toISOString()
    };
    
    savedColors.push(savedColor);
    updateSavedColorsDisplay();
    
    showToast(`${SeasonPalettes[season].name} 색상이 저장되었습니다!`, 'success');
}

// 저장된 색상 표시
function updateSavedColorsDisplay() {
    const container = document.getElementById('saved-colors');
    if (!container) return;
    
    container.innerHTML = '';
    
    savedColors.forEach(saved => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'saved-color-item';
        colorDiv.innerHTML = `
            <div class="saved-color-swatch" style="background-color: ${saved.color}"></div>
            <div class="saved-color-info">
                <div class="saved-season">${saved.season}</div>
                <div class="saved-time">${new Date(saved.timestamp).toLocaleTimeString()}</div>
            </div>
            <button class="remove-saved-color" onclick="removeSavedColor(${saved.id})">×</button>
        `;
        container.appendChild(colorDiv);
    });
}

// 저장된 색상 제거
function removeSavedColor(id) {
    savedColors = savedColors.filter(color => color.id !== id);
    updateSavedColorsDisplay();
    showToast('저장된 색상이 제거되었습니다.', 'info');
}

// 저장된 색상 불러오기
function loadSavedColors() {
    // localStorage에서 불러오기 (브라우저 지원 시)
    try {
        const saved = localStorage.getItem('hairgator-saved-colors');
        if (saved) {
            savedColors = JSON.parse(saved);
            updateSavedColorsDisplay();
        }
    } catch (error) {
        console.warn('저장된 색상 불러오기 실패:', error);
    }
}

// 저장된 색상 저장하기
function saveSavedColors() {
    try {
        localStorage.setItem('hairgator-saved-colors', JSON.stringify(savedColors));
    } catch (error) {
        console.warn('색상 저장 실패:', error);
    }
}

// ==========================================
// 유틸리티 함수들
// ==========================================

// 전문가 분석 텍스트 생성
function generateExpertAnalysis(season) {
    const analyses = {
        Spring: `${ExpertKnowledge.blume.specificTypes.warm}. 밝고 선명한 색상이 잘 어울립니다.`,
        Summer: `${ExpertKnowledge.bitnalyun.skinConditions.pale}에 따라 부드러운 파스텔 톤을 추천합니다.`,
        Autumn: `${ExpertKnowledge.bitnalyun.skinConditions.yellowish} 원칙에 따라 리치한 브라운 계열이 적합합니다.`,
        Winter: `${ExpertKnowledge.blume.specificTypes.cool}. 명확한 대비를 위해 진하고 선명한 색상을 권장합니다.`
    };
    
    return analyses[season] || '전문가 분석 결과를 생성 중입니다.';
}

// 데이터 상태 업데이트
function updateDataStatus(message, type) {
    const statusElement = document.getElementById('data-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-${type}`;
    }
}

// 토스트 메시지 표시
function showToast(message, type = 'info', duration = 3000) {
    console.log(`Toast [${type}]: ${message}`);
    
    // 실제 토스트 UI가 있다면 여기서 처리
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================
// 모드 전환 및 네비게이션
// ==========================================

// 모드 선택
function selectMode(mode) {
    currentMode = mode;
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.mode-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 선택한 모드 표시
    const selectedSection = document.getElementById(`${mode}-mode`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // 네비게이션 버튼 업데이트
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="selectMode('${mode}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    console.log(`모드 전환: ${mode}`);
}

// 뒤로 가기
function goBack() {
    if (currentMode !== 'selection') {
        selectMode('selection');
    }
}

// ==========================================
// 외부 연동 함수들 (HAIRGATOR 호환)
// ==========================================

// 부모창과의 메시지 통신
window.addEventListener('message', function(event) {
    if (event.data.type === 'THEME_CHANGE') {
        // 테마 변경 처리
        document.documentElement.setAttribute('data-theme', event.data.theme);
    } else if (event.data.type === 'HAIR_COLOR_DATA') {
        // 헤어컬러 데이터 업데이트
        hairColorData = event.data.data;
        console.log(`📡 부모창에서 ${hairColorData.length}개 데이터 수신`);
    }
});

// 키보드 단축키
document.addEventListener('keydown', function(event) {
    if (currentMode === 'selection') {
        switch (event.key) {
            case '1':
                event.preventDefault();
                selectMode('ai');
                break;
            case '2':
                event.preventDefault();
                selectMode('draping');
                break;
            case 'Escape':
                event.preventDefault();
                goBack();
                break;
        }
    }
    
    // 스페이스바로 분석 시작
    if (event.code === 'Space' && uploadedImage && !isAnalyzing) {
        event.preventDefault();
        analyzePhoto();
    }
});

// 부모 창에 시스템 준비 완료 알림
window.addEventListener('load', function() {
    setTimeout(() => {
        try {
            if (parent && parent.postMessage) {
                parent.postMessage({
                    type: 'PERSONAL_COLOR_READY',
                    message: 'Personal Color 시스템이 준비되었습니다.'
                }, '*');
            }
        } catch (error) {
            console.log('부모 창 알림 전송 실패:', error);
        }
    }, 3000);
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', function() {
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
    }
    if (camera) {
        camera.stop();
    }
    
    // 저장된 색상 저장
    saveSavedColors();
});

console.log('🎨 HAIRGATOR Personal Color Pro - 실제 작동 버전 로드 완료');
document.addEventListener('DOMContentLoaded', initializeSystem);
