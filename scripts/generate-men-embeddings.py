# -*- coding: utf-8 -*-
"""
남자 커트 스타일 임베딩 생성
- Firestore men_styles 컬렉션에서 스타일 정보 읽기
- 자막 파일 텍스트로 임베딩 생성
- Firestore에 임베딩 벡터 저장
"""

import os
import sys
import json
import time
import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai

sys.stdout.reconfigure(encoding='utf-8')
sys.stdout.flush()

import functools
print = functools.partial(print, flush=True)

# ==================== 설정 ====================

SERVICE_ACCOUNT_KEY = r"C:\Users\김민재\Desktop\Hairgator_chatbot\hairgatormenu-4a43e-firebase-adminsdk-fbsvc-0d9a088b16.json"
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\men_cut_recipe"

# 7개 스타일 카테고리 폴더 매핑
SERIES_FOLDERS = {
    "SF": "1. SIDE FRINGE",
    "SP": "2. SIDE PART",
    "FU": "3. FRINGE UP",
    "PB": "4. PUSHED BACK",
    "BZ": "5. BUZZ",
    "CP": "6. CROP",
    "MC": "7. MOHICAN",
}

# Gemini API 키 로드
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

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

# ==================== Gemini 초기화 ====================

def init_gemini():
    """Gemini API 초기화"""
    if not GEMINI_API_KEY:
        # firebase-config.js에서 읽기 시도
        config_path = r"C:\Users\김민재\Desktop\Hairgator_chatbot\js\firebase-config.js"
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                import re
                match = re.search(r'geminiApiKey:\s*["\']([^"\']+)["\']', content)
                if match:
                    api_key = match.group(1)
                    genai.configure(api_key=api_key)
                    print("✅ Gemini API 초기화 완료 (config에서 키 읽음)")
                    return True
        print("❌ Gemini API 키가 없습니다")
        return False

    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini API 초기화 완료")
    return True

# ==================== 시리즈 코드 추출 ====================

def get_series_code(style_id):
    """스타일 ID에서 시리즈 코드 추출 (SF, SP, FU 등)"""
    for prefix in SERIES_FOLDERS.keys():
        if style_id.startswith(prefix):
            return prefix
    return None

# ==================== 자막 텍스트 읽기 ====================

def get_caption_text(style_id):
    """자막 파일에서 텍스트 읽기"""
    series = get_series_code(style_id)
    if not series:
        return None

    series_folder = SERIES_FOLDERS.get(series)
    if not series_folder:
        return None

    style_path = os.path.join(BASE_PATH, series_folder, style_id)

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
                    return f.read()
            except Exception as e:
                print(f"  ⚠️ 자막 읽기 실패: {style_id} - {e}")
                return None

    return None

# ==================== 임베딩용 텍스트 생성 ====================

def build_embedding_text(style_id, caption_text=None):
    """임베딩용 텍스트 구성 (자막이 없어도 스타일 정보로 생성)"""
    series = get_series_code(style_id)

    # 시리즈별 기본 설명
    series_descriptions = {
        "SF": "Side Fringe 사이드프린지 앞머리를 앞으로 내려 자연스럽게 흐르는 스타일 댄디컷 시스루댄디 슬릭컷",
        "SP": "Side Part 사이드파트 가르마 가르마컷 가일컷 시스루가르마 플랫컷 리프컷 포마드컷 드롭컷 하프컷 숏가일 리젠트컷 애즈컷",
        "FU": "Fringe Up 프린지업 앞머리 끝만 위로 올린 스타일 아이비리그컷 크랙컷",
        "PB": "Pushed Back 푸시드백 슬릭백 모발 전체가 뒤쪽으로 넘어가는 스타일 폼파도르컷 언더컷",
        "BZ": "Buzz Cut 버즈컷 가장 짧은 커트 스타일 클리퍼",
        "CP": "Crop Cut 크롭컷 버즈보다 조금 긴 스타일 스왓컷 숏크롭",
        "MC": "Mohican 모히칸 센터를 세워 강조하는 스타일 모히칸컷",
    }

    base_text = f"남자 헤어스타일 {style_id}"
    if series and series in series_descriptions:
        base_text += f" {series_descriptions[series]}"

    if caption_text:
        # 자막이 있으면 합치기
        combined = f"{base_text}\n\n{caption_text}"
    else:
        combined = base_text

    return combined

# ==================== 임베딩 생성 ====================

def generate_embedding(text, style_id):
    """Gemini로 텍스트 임베딩 생성"""
    try:
        # 텍스트가 너무 길면 자르기 (임베딩 모델 제한)
        max_chars = 8000
        if len(text) > max_chars:
            text = text[:max_chars]

        # 임베딩 생성 (embedding-001 모델 사용 - 여자 스타일과 동일)
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
            title=f"남자 헤어스타일 {style_id} 레시피"
        )

        embedding = result['embedding']
        return embedding

    except Exception as e:
        print(f"  ❌ 임베딩 생성 실패: {style_id} - {e}")
        return None

# ==================== 메인 ====================

def main():
    print("=" * 70)
    print("Gemini 임베딩 생성 - 남자 커트 스타일")
    print("=" * 70)

    # Firebase 초기화
    db = init_firebase()
    if not db:
        return

    # Gemini 초기화
    if not init_gemini():
        return

    # Firestore에서 남자 스타일 가져오기
    print("\n📋 Firestore men_styles에서 스타일 목록 가져오기...")
    styles_ref = db.collection("men_styles")
    styles = styles_ref.get()

    style_list = []
    for doc in styles:
        data = doc.to_dict()
        style_list.append({
            "id": doc.id,
            "data": data
        })

    print(f"  총 {len(style_list)}개 스타일")
    print("-" * 50)

    # 통계
    stats = {
        "success": 0,
        "skipped": 0,
        "failed": 0,
        "no_caption": 0
    }

    for idx, style in enumerate(style_list):
        style_id = style["id"]
        data = style["data"]

        # 이미 임베딩이 있는지 확인
        if data.get("embedding"):
            print(f"  ⏭️ {style_id}: 임베딩 이미 존재, 스킵")
            stats["skipped"] += 1
            continue

        # 자막 텍스트 가져오기
        caption_text = get_caption_text(style_id)
        if not caption_text:
            stats["no_caption"] += 1

        # 임베딩용 텍스트 생성 (자막 없어도 기본 설명으로 생성)
        embedding_text = build_embedding_text(style_id, caption_text)

        # 임베딩 생성
        embedding = generate_embedding(embedding_text, style_id)
        if not embedding:
            stats["failed"] += 1
            continue

        # Firestore에 저장
        try:
            styles_ref.document(style_id).update({
                "embedding": embedding,
                "embeddingUpdatedAt": firestore.SERVER_TIMESTAMP
            })
            caption_mark = "✓" if caption_text else "△"
            print(f"  ✅ {style_id}: 임베딩 저장 (차원: {len(embedding)}) 자막{caption_mark}")
            stats["success"] += 1
        except Exception as e:
            print(f"  ❌ {style_id}: Firestore 저장 실패 - {e}")
            stats["failed"] += 1

        # 진행 상황
        if (idx + 1) % 10 == 0:
            print(f"\n  --- {idx + 1}/{len(style_list)} 완료 ---\n")

        # Rate limiting (Gemini API 제한)
        time.sleep(0.3)

    # 최종 통계
    print("\n" + "=" * 70)
    print("📊 임베딩 생성 완료 통계")
    print("=" * 70)
    print(f"  성공: {stats['success']}개")
    print(f"  스킵 (이미 존재): {stats['skipped']}개")
    print(f"  실패: {stats['failed']}개")
    print(f"  자막 없음 (기본 설명 사용): {stats['no_caption']}개")

if __name__ == "__main__":
    main()
