# -*- coding: utf-8 -*-
"""
명령 1-2: 자막 파싱 및 용어 추출 스크립트
- 자막 파일에서 기장, 형태, 질감, 앞머리, 난이도 추출
- 정규화된 용어 매핑
"""

import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

# 데이터셋 경로
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\women_cut_recipe"
SERIES = ["FAL", "FBL", "FCL", "FDL", "FEL", "FFL", "FGL", "FHL"]

# 용어 정규화 매핑
NORMALIZATION = {
    "length": {
        "숏": "SHORT",
        "쇼트": "SHORT",
        "미디엄": "MEDIUM",
        "미디엄 숏": "MEDIUM_SHORT",
        "미디엄 롱": "MEDIUM_LONG",
        "롱": "LONG",
        "세미롱": "SEMI_LONG"
    },
    "shape": {
        "원랭스": "ONE_LENGTH",
        "그레쥬에이션": "GRADUATION",
        "그라데이션": "GRADUATION",
        "레이어": "LAYER",
        "스퀘어 레이어": "SQUARE_LAYER",
        "라운드 레이어": "ROUND_LAYER",
        "유니폼 레이어": "UNIFORM_LAYER",
        "인크리스 레이어": "INCREASE_LAYER",
        "디스커넥션": "DISCONNECTION",
        "복합형": "COMBINED",
        "아이롱 스타일": "IRON_STYLE"
    },
    "texture": {
        "블런트": "BLUNT",
        "위빙": "WEAVING",
        "슬라이싱": "SLICING",
        "포인트 컷": "POINT_CUT",
        "포인트컷": "POINT_CUT",
        "스트록 커트": "STROKE_CUT",
        "세니컷": "THINNING",
        "세니 컷": "THINNING",
        "틴닝": "THINNING",
        "레이저": "RAZOR",
        "레이저 컷": "RAZOR",
        "챱 컷": "CHOP_CUT",
        "트위스트": "TWIST",
        "텍스쳐": "TEXTURE"
    },
    "bangs": {
        "없음": "NONE",
        "풀뱅": "FULL_BANG",
        "시스루뱅": "SEE_THROUGH",
        "시스루 뱅": "SEE_THROUGH",
        "사이드뱅": "SIDE_BANG",
        "사이드 뱅": "SIDE_BANG",
        "커튼뱅": "CURTAIN_BANG",
        "커튼 뱅": "CURTAIN_BANG",
        "페이스 프레이밍": "FACE_FRAMING",
        "페이스프레이밍": "FACE_FRAMING",
        "긴 앞머리": "LONG_BANG",
        "짧은 앞머리": "SHORT_BANG",
        "베이비뱅": "BABY_BANG",
        "M자뱅": "M_BANG"
    },
    "difficulty": {
        "쉬움": "EASY",
        "보통": "MEDIUM",
        "어려움": "HARD",
        "매우 어려움": "VERY_HARD"
    }
}

def parse_caption(text, style_id):
    """자막 텍스트를 파싱하여 구조화된 데이터로 변환

    자막 내용이 기술적 설명인 경우:
    - 스타일 코드에서 기장 추론 (A=숏, B=미디엄숏, C=미디엄, D=미디엄롱, E=롱, F=세미롱, G=롱, H=엑스트라롱)
    - 텍스트에서 형태 키워드 추출 (원랭스, 그래쥬에이션, 레이어 등)
    """
    result = {
        "raw": text.strip(),
        "length": None,
        "length_normalized": None,
        "shape": None,
        "shape_normalized": None,
        "texture": None,
        "texture_normalized": None,
        "bangs": None,
        "bangs_normalized": None,
        "difficulty": None,
        "difficulty_normalized": None,
        "techniques": []
    }

    # 1. 먼저 구조화된 형식 체크 (기장:, 형태: 등)
    patterns = {
        "length": r"기장\s*[:：]\s*([^,，]+)",
        "shape": r"형태\s*[:：]\s*([^,，]+)",
        "texture": r"질감\s*[:：]\s*([^,，]+)",
        "bangs": r"앞머리\s*[:：]\s*([^,，]+)",
        "difficulty": r"(?:컷\s*)?난이도\s*[:：]\s*([^,，]+)"
    }

    has_structured = False
    for field, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            has_structured = True
            value = match.group(1).strip()
            result[field] = value
            norm_map = NORMALIZATION.get(field, {})
            for kr_term, en_code in norm_map.items():
                if kr_term in value:
                    result[f"{field}_normalized"] = en_code
                    break

    # 2. 구조화된 형식이 없으면 기술적 자막에서 추출
    if not has_structured:
        # 스타일 코드에서 기장 추론 (F + 두번째 글자)
        # FAL = A(숏), FBL = B(미디엄숏), FCL = C(미디엄), FDL = D(미디엄롱)
        # FEL = E(롱), FFL = F(세미롱), FGL = G(롱), FHL = H(엑스트라롱)
        length_map = {
            'A': ('숏', 'SHORT'),
            'B': ('미디엄 숏', 'MEDIUM_SHORT'),
            'C': ('미디엄', 'MEDIUM'),
            'D': ('미디엄 롱', 'MEDIUM_LONG'),
            'E': ('롱', 'LONG'),
            'F': ('세미롱', 'SEMI_LONG'),
            'G': ('롱', 'LONG'),
            'H': ('엑스트라 롱', 'EXTRA_LONG')
        }

        if len(style_id) >= 2:
            length_code = style_id[1]  # F'A'L0001 -> 'A'
            if length_code in length_map:
                result["length"], result["length_normalized"] = length_map[length_code]

        # 텍스트에서 형태 키워드 추출
        shape_keywords = [
            ("원랭스", "ONE_LENGTH"),
            ("그래쥬에이션", "GRADUATION"),
            ("그레쥬에이션", "GRADUATION"),
            ("스퀘어 레이어", "SQUARE_LAYER"),
            ("스퀘어레이어", "SQUARE_LAYER"),
            ("스퀘어 커트", "SQUARE_CUT"),
            ("스퀘어커트", "SQUARE_CUT"),
            ("레이어", "LAYER"),
            ("디스커넥션", "DISCONNECTION"),
        ]

        detected_shapes = []
        for kr, en in shape_keywords:
            if kr in text:
                detected_shapes.append((kr, en))

        if detected_shapes:
            # 가장 구체적인 것 선택 (글자수가 긴 것)
            detected_shapes.sort(key=lambda x: -len(x[0]))
            result["shape"], result["shape_normalized"] = detected_shapes[0]

        # 기술 키워드 추출 (89용어 기반)
        tech_keywords = {
            # 섹션 (70번 용어)
            "가로섹션": "HS",
            "세로섹션": "VS",
            "후대각 섹션": "DBS",
            "후대각섹션": "DBS",
            "전대각 섹션": "DFS",
            "전대각섹션": "DFS",
            "파이섹션": "PIE",

            # 디자인라인 (31번 용어)
            "고정 디자인라인": "STATIONARY_DL",
            "고정디자인라인": "STATIONARY_DL",
            "고정 디자인 라인": "STATIONARY_DL",
            "이동 디자인라인": "MOBILE_DL",
            "이동디자인라인": "MOBILE_DL",
            "이동 디자인 라인": "MOBILE_DL",
            "혼합 디자인라인": "COMBINATION_DL",
            "혼합디자인라인": "COMBINATION_DL",
            "혼합 디자인 라인": "COMBINATION_DL",

            # 각도 (54번, 33번 용어)
            "천체축": "CELESTIAL_AXIS",
            "천체축각도": "CELESTIAL_AXIS",
            "천체축 각도": "CELESTIAL_AXIS",
            "다이렉션": "DIRECTION",
            "리프트": "LIFTING",

            # 분배 (35번 용어)
            "변이분배": "SHIFTED_DIST",
            "변이 분배": "SHIFTED_DIST",

            # 커팅 기법 (19, 81번 등)
            "포인트컷": "POINT_CUT",
            "포인트 컷": "POINT_CUT",
            "블런트": "BLUNT",
            "블런트컷": "BLUNT_CUT",
            "위빙": "WEAVING",
            "슬라이싱": "SLICING",
            "스퀘어커트": "SQUARE_CUT",
            "스퀘어 커트": "SQUARE_CUT",
        }

        for kw, code in tech_keywords.items():
            if kw in text:
                if code not in result["techniques"]:
                    result["techniques"].append(code)

    return result

def main():
    print("=" * 70)
    print("자막 파싱 및 용어 추출")
    print("=" * 70)

    all_parsed = []
    stats = {
        "total": 0,
        "parsed": 0,
        "length": {},
        "shape": {},
        "texture": {},
        "bangs": {},
        "difficulty": {}
    }

    for series in SERIES:
        series_path = os.path.join(BASE_PATH, series)
        if not os.path.exists(series_path):
            continue

        style_folders = sorted([d for d in os.listdir(series_path)
                               if os.path.isdir(os.path.join(series_path, d))])

        print(f"\n📁 {series} 시리즈: {len(style_folders)}개")
        print("-" * 50)

        for style_id in style_folders:
            style_path = os.path.join(series_path, style_id)
            stats["total"] += 1

            # 자막 파일 찾기
            caption_file = None
            for pattern in [f"{style_id}(자막).txt", f"{style_id}-jamag.txt",
                           f"{style_id}_자막.txt", f"{style_id}.txt"]:
                fp = os.path.join(style_path, pattern)
                if os.path.exists(fp):
                    caption_file = fp
                    break

            if not caption_file:
                print(f"  ❌ {style_id}: 자막 없음")
                continue

            # 파싱
            try:
                with open(caption_file, 'r', encoding='utf-8') as f:
                    text = f.read()

                parsed = parse_caption(text, style_id)
                parsed["styleId"] = style_id
                parsed["series"] = series
                all_parsed.append(parsed)
                stats["parsed"] += 1

                # 통계 수집
                for field in ["length", "shape", "texture", "bangs", "difficulty"]:
                    val = parsed.get(f"{field}_normalized") or parsed.get(field) or "UNKNOWN"
                    stats[field][val] = stats[field].get(val, 0) + 1

                print(f"  ✅ {style_id}: {parsed['length']} | {parsed['shape']} | {parsed['texture']}")

            except Exception as e:
                print(f"  ❌ {style_id}: 파싱 오류 - {e}")

    # 통계 출력
    print("\n" + "=" * 70)
    print("📊 용어 분포 통계")
    print("=" * 70)

    for field in ["length", "shape", "texture", "bangs", "difficulty"]:
        print(f"\n■ {field.upper()}:")
        for val, cnt in sorted(stats[field].items(), key=lambda x: -x[1]):
            print(f"   {val}: {cnt}개")

    # JSON 저장
    output_path = os.path.join(os.path.dirname(__file__), "parsed-captions.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "total": stats["total"],
            "parsed": stats["parsed"],
            "distribution": {
                "length": stats["length"],
                "shape": stats["shape"],
                "texture": stats["texture"],
                "bangs": stats["bangs"],
                "difficulty": stats["difficulty"]
            },
            "styles": all_parsed
        }, f, ensure_ascii=False, indent=2)

    print(f"\n💾 파싱 결과 저장: {output_path}")
    print(f"\n✅ 완료: {stats['parsed']}/{stats['total']}개 스타일 파싱됨")

if __name__ == "__main__":
    main()
