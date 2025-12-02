# -*- coding: utf-8 -*-
"""
도해도 이미지 56파라미터 분석 및 Firestore 업데이트
- 각 도해도 이미지를 Gemini Vision으로 분석
- L (Lifting), D (Direction), Section 등 핵심 파라미터 추출
- Firestore styles 컬렉션의 diagrams 배열 업데이트
"""

import os
import sys
import json
import time
import base64
import requests
import firebase_admin
from firebase_admin import credentials, firestore

sys.stdout.reconfigure(encoding='utf-8')

import functools
print = functools.partial(print, flush=True)

# ==================== 설정 ====================

SERVICE_ACCOUNT_KEY = r"C:\Users\김민재\Desktop\Hairgator_chatbot\hairgatormenu-4a43e-firebase-adminsdk-fbsvc-0d9a088b16.json"

# Gemini API 키 (.env에서 읽기)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
GEMINI_API_KEY = None
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                GEMINI_API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not GEMINI_API_KEY:
    print("❌ GEMINI_API_KEY가 .env 파일에 없습니다")
    sys.exit(1)

# ==================== Firebase 초기화 ====================

def init_firebase():
    try:
        try:
            app = firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
            app = firebase_admin.initialize_app(cred)

        db = firestore.client()
        print("✅ Firebase 초기화 완료")
        return db
    except Exception as e:
        print(f"❌ Firebase 초기화 실패: {e}")
        return None

# ==================== Gemini Vision 분석 ====================

DIAGRAM_ANALYSIS_PROMPT = """이 헤어컷 도해도(diagram) 이미지를 분석하여 정확한 기술 파라미터를 JSON으로 반환하세요.

【중요】도해도는 헤어컷 기술을 설명하는 그림입니다. 다음을 정확히 읽어내세요:

【Lifting (L) - 들어올리는 각도】⭐ 가장 중요!
머리카락을 두피에서 들어올리는 각도를 정확히 판단:
- L0: 0도 (두피에 붙임, 원렝스)
- L1: 22.5도
- L2: 45도 (Low Graduation)
- L3: 67.5도
- L4: 90도 (두피에서 직각, 기본 Layer) ⭐
- L5: 112.5도
- L6: 135도 (High Layer)
- L7: 157.5도
- L8: 180도 (완전히 위로)

🎯 판단 기준:
- 화살표나 선이 두피에서 얼마나 들어올려졌는지 각도 확인
- 숫자가 표기되어 있으면 그대로 사용
- "90°", "45°" 등 각도 표기 확인

【Direction (D) - 당기는 방향】
머리카락을 당기는 방향:
- D0: 정면 (앞으로)
- D1: 전방 대각선 45도
- D2: 측면 (옆으로)
- D3: 후방 대각선 45도
- D4: 후면 (뒤로) ⭐ 가장 흔함
- D5~D8: 반대편 방향

【Section - 섹션 분할 방식】
- HS (Horizontal Section): 가로 섹션
- DBS (Diagonal Back Section): 후대각 섹션
- DFS (Diagonal Forward Section): 전대각 섹션
- VS (Vertical Section): 세로 섹션
- RS (Radial Section): 방사형 섹션

【Zone - 작업 영역】
- Crown: 정수리
- Top: 상단
- Side: 측면
- Back: 후면
- Nape: 네이프 (목덜미)
- Fringe: 앞머리
- Perimeter: 아웃라인

【Cutting Method - 커팅 기법】
- Blunt: 일자 커팅
- Point: 포인트 커팅 (가위 끝으로)
- Slide: 슬라이드 커팅
- Thinning: 숱치기
- Texturizing: 질감 커팅

【Output JSON】
{
  "lifting": "L4",
  "lifting_angle": 90,
  "direction": "D4",
  "section": "VS",
  "zone": "Back",
  "cutting_method": "Point",
  "guide_line": "이전 섹션" 또는 "고정 가이드" 또는 null,
  "over_direction": true 또는 false,
  "notes": "추가 관찰 사항"
}

⚠️ 주의:
1. 이미지에 각도 숫자가 있으면 정확히 읽어서 L 코드로 변환
2. 화살표 방향을 보고 Direction 판단
3. 섹션 라인 패턴을 보고 Section 판단
4. 확실하지 않으면 가장 가능성 높은 값 선택

JSON만 반환하세요."""

def analyze_diagram_image(image_url):
    """Firebase Storage URL의 도해도 이미지를 Gemini Vision으로 분석"""
    try:
        # 이미지 다운로드
        img_response = requests.get(image_url, timeout=30)
        if img_response.status_code != 200:
            print(f"  ⚠️ 이미지 다운로드 실패: {img_response.status_code}")
            return None

        # Base64 인코딩
        image_base64 = base64.b64encode(img_response.content).decode('utf-8')

        # Content-Type 추정
        content_type = img_response.headers.get('Content-Type', 'image/png')
        if 'jpeg' in content_type or 'jpg' in content_type:
            mime_type = 'image/jpeg'
        else:
            mime_type = 'image/png'

        # Gemini Vision API 호출
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

        payload = {
            "contents": [{
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": image_base64}},
                    {"text": DIAGRAM_ANALYSIS_PROMPT}
                ]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 500
            }
        }

        response = requests.post(api_url, json=payload, timeout=60)

        if response.status_code != 200:
            print(f"  ⚠️ Gemini API 오류: {response.status_code}")
            return None

        data = response.json()
        text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')

        # JSON 파싱
        text = text.replace('```json', '').replace('```', '').strip()
        metadata = json.loads(text)

        # 배열이 반환된 경우 첫 번째 요소 사용
        if isinstance(metadata, list):
            metadata = metadata[0] if metadata else {}

        # dict가 아니면 None 반환
        if not isinstance(metadata, dict):
            return None

        return metadata

    except json.JSONDecodeError as e:
        print(f"  ⚠️ JSON 파싱 실패: {e}")
        return None
    except Exception as e:
        print(f"  ⚠️ 분석 실패: {e}")
        return None

# ==================== Firestore 업데이트 ====================

def update_diagram_metadata(db, style_id, diagrams_with_metadata):
    """Firestore의 스타일 문서에 도해도 메타데이터 업데이트"""
    try:
        doc_ref = db.collection('styles').document(style_id)
        doc_ref.update({
            'diagrams': diagrams_with_metadata,
            'diagramsAnalyzedAt': firestore.SERVER_TIMESTAMP
        })
        return True
    except Exception as e:
        print(f"  ❌ Firestore 업데이트 실패: {e}")
        return False

# ==================== 메인 ====================

def main():
    print("=" * 70)
    print("도해도 56파라미터 분석 및 Firestore 업데이트")
    print("=" * 70)

    # Firebase 초기화
    db = init_firebase()
    if not db:
        return

    # Firestore에서 모든 스타일 가져오기
    print("\n📋 Firestore에서 스타일 목록 가져오기...")
    styles_ref = db.collection('styles')
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
        "processed": 0,
        "skipped": 0,
        "failed": 0,
        "diagrams_analyzed": 0
    }

    for idx, style in enumerate(style_list):
        style_id = style["id"]
        data = style["data"]

        # 이미 분석된 스타일 스킵
        if data.get("diagramsAnalyzedAt"):
            print(f"  ⏭️ {style_id}: 이미 분석됨, 스킵")
            stats["skipped"] += 1
            continue

        diagrams = data.get("diagrams", [])
        if not diagrams:
            print(f"  ⚠️ {style_id}: 도해도 없음, 스킵")
            stats["skipped"] += 1
            continue

        print(f"\n📊 [{idx+1}/{len(style_list)}] {style_id} 분석 중... ({len(diagrams)}개 도해도)")

        # 각 도해도 분석
        diagrams_with_metadata = []
        for i, diagram in enumerate(diagrams):
            step = diagram.get("step", i + 1)
            url = diagram.get("url", "")

            if not url:
                diagrams_with_metadata.append(diagram)
                continue

            print(f"  🔍 Step {step} 분석 중...")

            metadata = analyze_diagram_image(url)

            if metadata:
                # 기존 데이터에 메타데이터 추가
                updated_diagram = {
                    "step": step,
                    "url": url,
                    "lifting": metadata.get("lifting", "L4"),
                    "lifting_angle": metadata.get("lifting_angle", 90),
                    "direction": metadata.get("direction", "D4"),
                    "section": metadata.get("section", "VS"),
                    "zone": metadata.get("zone", "Back"),
                    "cutting_method": metadata.get("cutting_method", "Point"),
                    "over_direction": metadata.get("over_direction", False),
                    "notes": metadata.get("notes", "")
                }
                diagrams_with_metadata.append(updated_diagram)
                stats["diagrams_analyzed"] += 1
                print(f"    ✅ L={metadata.get('lifting')}, D={metadata.get('direction')}, Section={metadata.get('section')}")
            else:
                # 분석 실패 시 기존 데이터 유지
                diagrams_with_metadata.append(diagram)
                print(f"    ⚠️ 분석 실패, 기존 데이터 유지")

            # Rate limiting
            time.sleep(1)

        # Firestore 업데이트
        if update_diagram_metadata(db, style_id, diagrams_with_metadata):
            stats["processed"] += 1
            print(f"  ✅ {style_id}: Firestore 업데이트 완료")
        else:
            stats["failed"] += 1

        # 진행 상황
        if (idx + 1) % 5 == 0:
            print(f"\n  --- {idx + 1}/{len(style_list)} 완료 ---\n")

    # 최종 통계
    print("\n" + "=" * 70)
    print("📊 도해도 분석 완료 통계")
    print("=" * 70)
    print(f"  처리된 스타일: {stats['processed']}개")
    print(f"  스킵된 스타일: {stats['skipped']}개")
    print(f"  실패한 스타일: {stats['failed']}개")
    print(f"  분석된 도해도: {stats['diagrams_analyzed']}장")

if __name__ == "__main__":
    main()
