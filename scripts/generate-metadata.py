# -*- coding: utf-8 -*-
"""
명령 1-3: 메타데이터 JSON 생성 스크립트
- 각 스타일별 통합 메타데이터 생성
- GCS 업로드 및 Firestore 저장용 JSON 생성
"""

import os
import sys
import json
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# 데이터셋 경로
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\women_cut_recipe"
SERIES = ["FAL", "FBL", "FCL", "FDL", "FEL", "FFL", "FGL", "FHL"]

# 기장 코드 매핑
LENGTH_MAP = {
    'A': {'ko': '숏', 'en': 'SHORT', 'order': 1},
    'B': {'ko': '미디엄 숏', 'en': 'MEDIUM_SHORT', 'order': 2},
    'C': {'ko': '미디엄', 'en': 'MEDIUM', 'order': 3},
    'D': {'ko': '미디엄 롱', 'en': 'MEDIUM_LONG', 'order': 4},
    'E': {'ko': '롱', 'en': 'LONG', 'order': 5},
    'F': {'ko': '세미롱', 'en': 'SEMI_LONG', 'order': 6},
    'G': {'ko': '롱', 'en': 'LONG', 'order': 7},
    'H': {'ko': '엑스트라 롱', 'en': 'EXTRA_LONG', 'order': 8}
}

def detect_shape_from_text(text):
    """자막 텍스트에서 형태 키워드 추출"""
    shape_keywords = [
        ("스퀘어 레이어", "SQUARE_LAYER", "스퀘어 레이어"),
        ("스퀘어레이어", "SQUARE_LAYER", "스퀘어 레이어"),
        ("스퀘어 커트", "SQUARE_CUT", "스퀘어 커트"),
        ("스퀘어커트", "SQUARE_CUT", "스퀘어 커트"),
        ("원랭스", "ONE_LENGTH", "원랭스"),
        ("그래쥬에이션", "GRADUATION", "그래쥬에이션"),
        ("그레쥬에이션", "GRADUATION", "그래쥬에이션"),
        ("디스커넥션", "DISCONNECTION", "디스커넥션"),
        ("레이어", "LAYER", "레이어"),
    ]

    for keyword, en_code, ko_name in shape_keywords:
        if keyword in text:
            return {'ko': ko_name, 'en': en_code}

    return None

def generate_metadata():
    print("=" * 70)
    print("메타데이터 JSON 생성")
    print("=" * 70)

    all_metadata = []
    stats = {
        "total": 0,
        "with_caption": 0,
        "with_result": 0,
        "with_diagrams": 0
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

            # 기본 메타데이터
            length_code = style_id[1] if len(style_id) >= 2 else None
            length_info = LENGTH_MAP.get(length_code, {})

            metadata = {
                "styleId": style_id,
                "series": series,
                "length": {
                    "code": length_code,
                    "ko": length_info.get('ko'),
                    "en": length_info.get('en'),
                    "order": length_info.get('order')
                },
                "shape": None,
                "texture": None,
                "bangs": None,
                "difficulty": None,
                "caption": None,
                "files": {
                    "result": None,
                    "diagrams": [],
                    "caption": None
                },
                "gcsUrls": {
                    "result": None,
                    "diagrams": []
                },
                "createdAt": datetime.now().isoformat(),
                "embedding": None  # Gemini 임베딩용
            }

            files = os.listdir(style_path)

            # 1. 자막 파일
            caption_patterns = [f"{style_id}(자막).txt", f"{style_id}-jamag.txt",
                               f"{style_id}_자막.txt", f"{style_id}.txt"]
            for pattern in caption_patterns:
                if pattern in files:
                    caption_path = os.path.join(style_path, pattern)
                    try:
                        with open(caption_path, 'r', encoding='utf-8') as f:
                            caption_text = f.read().strip()
                        metadata["caption"] = caption_text
                        metadata["files"]["caption"] = pattern
                        stats["with_caption"] += 1

                        # 형태 추출
                        shape_info = detect_shape_from_text(caption_text)
                        if shape_info:
                            metadata["shape"] = shape_info
                    except:
                        pass
                    break

            # 2. 결과 이미지
            result_patterns = ["result.jpg", "result.png", "1.png", "1.jpg",
                             f"{style_id}.jpg", f"{style_id}.png"]
            for pattern in result_patterns:
                if pattern in files:
                    metadata["files"]["result"] = pattern
                    stats["with_result"] += 1
                    break

            # 아트보드 패턴
            if not metadata["files"]["result"]:
                for f in files:
                    if f.startswith("아트보드"):
                        metadata["files"]["result"] = f
                        stats["with_result"] += 1
                        break

            # 3. 도해도 이미지들
            diagrams = sorted([f for f in files if f.startswith("SR_") and f.endswith(".png")])
            metadata["files"]["diagrams"] = diagrams
            if diagrams:
                stats["with_diagrams"] += 1

            # GCS URL 미리 설정 (버킷명은 나중에 변경)
            bucket_name = "hairgator-styles"
            if metadata["files"]["result"]:
                metadata["gcsUrls"]["result"] = f"gs://{bucket_name}/{series}/{style_id}/{metadata['files']['result']}"
            for diag in diagrams:
                metadata["gcsUrls"]["diagrams"].append(f"gs://{bucket_name}/{series}/{style_id}/{diag}")

            all_metadata.append(metadata)

            # 상태 출력
            caption_ok = "📄" if metadata["caption"] else "❌"
            result_ok = "🖼️" if metadata["files"]["result"] else "❌"
            diag_cnt = len(diagrams)
            shape_str = metadata["shape"]["ko"] if metadata["shape"] else "-"

            print(f"  ✅ {style_id}: {caption_ok} | {result_ok} | 📊{diag_cnt}장 | {metadata['length']['ko']} | {shape_str}")

    # 통계 출력
    print("\n" + "=" * 70)
    print("📊 메타데이터 생성 완료")
    print("=" * 70)
    print(f"총 스타일: {stats['total']}개")
    print(f"자막 있음: {stats['with_caption']}개")
    print(f"결과 이미지: {stats['with_result']}개")
    print(f"도해도 있음: {stats['with_diagrams']}개")

    # JSON 저장
    output_path = os.path.join(os.path.dirname(__file__), "styles-metadata.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "generatedAt": datetime.now().isoformat(),
            "totalStyles": stats["total"],
            "stats": stats,
            "styles": all_metadata
        }, f, ensure_ascii=False, indent=2)

    print(f"\n💾 메타데이터 저장: {output_path}")

    # Firestore 업로드용 개별 JSON도 생성
    firestore_dir = os.path.join(os.path.dirname(__file__), "firestore-data")
    os.makedirs(firestore_dir, exist_ok=True)

    for meta in all_metadata:
        style_file = os.path.join(firestore_dir, f"{meta['styleId']}.json")
        with open(style_file, 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"💾 Firestore용 개별 JSON: {firestore_dir}/ ({len(all_metadata)}개 파일)")

    return all_metadata

if __name__ == "__main__":
    generate_metadata()
