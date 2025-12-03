# -*- coding: utf-8 -*-
"""
남자 커트 Firestore 메타데이터 업로드
- upload-men-result.json을 읽어서 Firestore에 저장
- men_styles 컬렉션에 각 스타일 문서 생성
"""

import os
import sys
import json
import firebase_admin
from firebase_admin import credentials, firestore
import re
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.stdout.flush()

import functools
print = functools.partial(print, flush=True)

# ==================== 설정 ====================

SERVICE_ACCOUNT_KEY = r"C:\Users\김민재\Desktop\Hairgator_chatbot\hairgatormenu-4a43e-firebase-adminsdk-fbsvc-0d9a088b16.json"
UPLOAD_RESULT_PATH = os.path.join(os.path.dirname(__file__), "upload-men-result.json")
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\men_cut_recipe"

# 7개 스타일 카테고리 정보
SERIES_INFO = {
    "SF": {
        "folder": "1. SIDE FRINGE",
        "name": "Side Fringe",
        "description": "앞머리를 앞으로 내려 자연스럽게 흐르는 스타일"
    },
    "SP": {
        "folder": "2. SIDE PART",
        "name": "Side Part",
        "description": "가르마를 기준으로 나누는 스타일"
    },
    "FU": {
        "folder": "3. FRINGE UP",
        "name": "Fringe Up",
        "description": "앞머리 끝만 위로 올린 스타일"
    },
    "PB": {
        "folder": "4. PUSHED BACK",
        "name": "Pushed Back",
        "description": "모발이 뒤쪽으로 넘어가는 스타일"
    },
    "BZ": {
        "folder": "5. BUZZ",
        "name": "Buzz Cut",
        "description": "가장 짧은 커트 스타일"
    },
    "CP": {
        "folder": "6. CROP",
        "name": "Crop Cut",
        "description": "버즈보다 조금 긴 스타일"
    },
    "MC": {
        "folder": "7. MOHICAN",
        "name": "Mohican",
        "description": "센터를 세워 강조하는 스타일"
    },
}

# ==================== Firebase 초기화 ====================

def init_firebase():
    """Firebase Admin SDK 초기화"""
    if not os.path.exists(SERVICE_ACCOUNT_KEY):
        print(f"❌ Firebase 서비스 계정 키가 없습니다: {SERVICE_ACCOUNT_KEY}")
        return None

    try:
        try:
            app = firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
            app = firebase_admin.initialize_app(cred)

        db = firestore.client()
        print("✅ Firebase Firestore 초기화 완료")
        return db
    except Exception as e:
        print(f"❌ Firebase 초기화 실패: {e}")
        return None

# ==================== 자막 파싱 ====================

def get_series_code(style_id):
    """스타일 ID에서 시리즈 코드 추출"""
    for prefix in SERIES_INFO.keys():
        if style_id.startswith(prefix):
            return prefix
    return None

def parse_caption_file(style_id, base_path):
    """자막 파일을 파싱하여 스텝별 설명 추출"""
    series = get_series_code(style_id)
    if not series:
        return None

    series_folder = SERIES_INFO[series]["folder"]
    style_path = os.path.join(base_path, series_folder, style_id)

    caption_patterns = [
        f"{style_id}(자막).txt",
        f"{style_id}-jamag.txt",
        f"{style_id}_자막.txt"
    ]

    for pattern in caption_patterns:
        caption_path = os.path.join(style_path, pattern)
        if os.path.exists(caption_path):
            try:
                with open(caption_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                lines = [line.strip() for line in content.split('\n') if line.strip()]
                recipe_info = extract_recipe_info(content)

                return {
                    "raw": content,
                    "lines": lines[:10],
                    "recipe": recipe_info
                }
            except Exception as e:
                print(f"  ⚠️ 자막 파싱 실패: {style_id} - {e}")
                return None

    return None

def extract_recipe_info(content):
    """자막에서 레시피 정보 추출 (남자 커트 용어 포함)"""
    recipe = {
        "angle": None,
        "lifting": None,
        "technique": None,
        "keywords": []
    }

    keywords = []
    patterns = [
        r'(\d+도)',
        r'(레이어|그래듀에이션|Layer|Graduation)',
        r'(스퀘어 커트|라운드 커트|Square Cut|Round Cut)',
        r'(클리퍼|Clipper)',
        r'(코너 제거|Corner Off)',
        r'(크로스 체킹|Cross Checking)',
        r'(파이 섹션|Pie Section)',
        r'(후대각|전대각|Diagonal)',
        r'(이동 디자인 라인|고정 디자인 라인|Mobile|Stationary)',
        r'(천체축 각도|Celestial Axis)',
        r'(다이렉션|Direction|D\d)',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        keywords.extend(matches)

    recipe["keywords"] = list(set(keywords))[:15]

    return recipe

# ==================== Firestore 업로드 ====================

def upload_style_to_firestore(db, style_data, caption_data):
    """단일 스타일을 Firestore에 업로드"""
    style_id = style_data["styleId"]
    series = style_data.get("series") or get_series_code(style_id)

    doc_data = {
        "styleId": style_id,
        "series": series,
        "seriesName": SERIES_INFO.get(series, {}).get("name", series),
        "category": "men",  # 남자 커트 표시
        "resultImage": style_data.get("resultImage"),
        "diagrams": style_data.get("diagrams", []),
        "diagramCount": len(style_data.get("diagrams", [])),
        "captionUrl": style_data.get("captionUrl"),
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }

    if caption_data:
        doc_data["caption"] = {
            "preview": caption_data.get("lines", [])[:5],
            "recipe": caption_data.get("recipe", {})
        }

    try:
        # men_styles 컬렉션에 저장 (merge=True로 기존 embedding 필드 보존)
        db.collection("men_styles").document(style_id).set(doc_data, merge=True)
        return True
    except Exception as e:
        print(f"  ❌ Firestore 저장 실패: {style_id} - {e}")
        return False

# ==================== 메인 ====================

def main():
    print("=" * 70)
    print("Firestore 메타데이터 업로드 - 남자 커트 스타일")
    print("=" * 70)

    db = init_firebase()
    if not db:
        return

    if not os.path.exists(UPLOAD_RESULT_PATH):
        print(f"❌ 업로드 결과 파일이 없습니다: {UPLOAD_RESULT_PATH}")
        print("먼저 upload-men-to-firebase-storage.py를 실행하세요.")
        return

    with open(UPLOAD_RESULT_PATH, 'r', encoding='utf-8') as f:
        upload_result = json.load(f)

    styles = upload_result.get("styles", [])
    print(f"\n📋 총 {len(styles)}개 스타일 처리 예정")
    print("-" * 50)

    stats = {
        "success": 0,
        "failed": 0,
        "with_caption": 0
    }

    for idx, style_data in enumerate(styles):
        style_id = style_data["styleId"]

        caption_data = parse_caption_file(style_id, BASE_PATH)
        if caption_data:
            stats["with_caption"] += 1

        success = upload_style_to_firestore(db, style_data, caption_data)
        if success:
            stats["success"] += 1
            diagram_count = len(style_data.get("diagrams", []))
            caption_mark = "✓" if caption_data else "✗"
            print(f"  ✅ {style_id}: 도해도 {diagram_count}장 | 자막 {caption_mark}")
        else:
            stats["failed"] += 1

        if (idx + 1) % 10 == 0:
            print(f"\n  --- {idx + 1}/{len(styles)} 완료 ---\n")

        time.sleep(0.05)

    print("\n" + "=" * 70)
    print("📊 업로드 완료 통계")
    print("=" * 70)
    print(f"  성공: {stats['success']}개")
    print(f"  실패: {stats['failed']}개")
    print(f"  자막 포함: {stats['with_caption']}개")

if __name__ == "__main__":
    main()
