# -*- coding: utf-8 -*-
"""
명령 3-2: Firestore 메타데이터 업로드 스크립트
- 기존 Supabase 대신 Firebase Firestore 사용
- hairStyles 컬렉션에 69개 스타일 업로드
"""

import os
import sys
import json
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("ERROR: firebase-admin 패키지가 필요합니다")
    print("설치: pip install firebase-admin")
    sys.exit(1)

# 설정
COLLECTION_NAME = "hairStyles"

def init_firebase():
    """Firebase 초기화"""
    # 서비스 계정 키 파일 경로
    cred_path = os.getenv('FIREBASE_CREDENTIALS')

    if not cred_path:
        # 프로젝트 루트에서 찾기
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '..', 'firebase-service-account.json'),
            os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json'),
            os.path.join(os.path.dirname(__file__), 'firebase-key.json'),
        ]

        for path in possible_paths:
            if os.path.exists(path):
                cred_path = path
                break

    if not cred_path or not os.path.exists(cred_path):
        print("⚠️  Firebase 서비스 계정 키를 찾을 수 없습니다.")
        print("   다음 중 하나를 수행하세요:")
        print("   1. FIREBASE_CREDENTIALS 환경변수 설정")
        print("   2. 프로젝트 루트에 firebase-service-account.json 파일 저장")
        print("\n   Firebase Console > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성")
        return None

    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        print(f"Firebase 초기화 실패: {e}")
        return None

def upload_styles(db, styles):
    """스타일 데이터 업로드"""
    collection = db.collection(COLLECTION_NAME)
    batch = db.batch()
    batch_count = 0
    total_uploaded = 0

    for idx, style in enumerate(styles):
        style_id = style["styleId"]

        # Firestore에 저장할 데이터 준비
        doc_data = {
            "styleId": style_id,
            "series": style["series"],
            "length": style["length"],
            "shape": style.get("shape"),
            "texture": style.get("texture"),
            "bangs": style.get("bangs"),
            "difficulty": style.get("difficulty"),
            "caption": style.get("caption"),
            "files": style["files"],
            "gcsUrls": style["gcsUrls"],
            "embedding": None,  # 나중에 Gemini로 생성
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }

        doc_ref = collection.document(style_id)
        batch.set(doc_ref, doc_data)
        batch_count += 1
        total_uploaded += 1

        # 500개마다 배치 커밋 (Firestore 제한)
        if batch_count >= 400:
            print(f"   배치 커밋 중... ({total_uploaded}/{len(styles)})")
            batch.commit()
            batch = db.batch()
            batch_count = 0

        if (idx + 1) % 10 == 0:
            print(f"   진행: {idx + 1}/{len(styles)}")

    # 남은 배치 커밋
    if batch_count > 0:
        batch.commit()

    return total_uploaded

def main():
    print("=" * 70)
    print("Firestore 메타데이터 업로드")
    print("=" * 70)

    # Firebase 초기화
    print("\n[1/3] Firebase 초기화...")
    db = init_firebase()
    if not db:
        print("\n테스트 모드로 진행합니다 (실제 업로드 없음)")
        run_test_mode()
        return

    print("   ✅ Firebase 연결됨")

    # 메타데이터 로드
    print("\n[2/3] 메타데이터 로드...")

    # URL 포함 메타데이터 우선, 없으면 기본 메타데이터
    metadata_path = os.path.join(os.path.dirname(__file__), "styles-metadata-with-urls.json")
    if not os.path.exists(metadata_path):
        metadata_path = os.path.join(os.path.dirname(__file__), "styles-metadata.json")

    if not os.path.exists(metadata_path):
        print("ERROR: 메타데이터 파일이 없습니다. generate-metadata.py를 먼저 실행하세요.")
        return

    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    styles = data["styles"]
    print(f"   {len(styles)}개 스타일 로드됨")

    # 업로드
    print(f"\n[3/3] Firestore 업로드...")
    uploaded = upload_styles(db, styles)

    print("\n" + "=" * 70)
    print("📊 업로드 완료")
    print("=" * 70)
    print(f"업로드된 문서: {uploaded}개")
    print(f"컬렉션: {COLLECTION_NAME}")

def run_test_mode():
    """테스트 모드"""
    metadata_path = os.path.join(os.path.dirname(__file__), "styles-metadata.json")
    if not os.path.exists(metadata_path):
        print("ERROR: 메타데이터 파일이 없습니다.")
        return

    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    styles = data["styles"]

    print(f"\n📋 테스트 모드: {len(styles)}개 스타일 확인됨")
    print("\n샘플 데이터:")
    sample = styles[0]
    print(json.dumps({
        "styleId": sample["styleId"],
        "series": sample["series"],
        "length": sample["length"],
        "shape": sample.get("shape"),
        "caption": sample.get("caption", "")[:50] + "..." if sample.get("caption") else None
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
