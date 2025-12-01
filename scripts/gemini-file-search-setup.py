# -*- coding: utf-8 -*-
"""
Gemini File Search API - PDF 업로드 스크립트
2WAY CUT 시스템 교재 14개 PDF를 Gemini에 업로드하고 검색 저장소 생성
"""

import os
import sys
import time

# Fix encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

from google import genai
from google.genai import types

# ==================== 설정 ====================

# Gemini API Key (환경변수에서 가져오거나 직접 입력)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or input("Gemini API Key를 입력하세요: ").strip()

# 저장소 이름
STORE_NAME = "hairgator-2waycut-store"

# PDF 파일 목록
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001"

PDF_FILES = [
    # A. 2way cutting system (분할됨)
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A1a.2way_cutting_system.pdf", "A1a - 2WAY Cutting System Part1"),
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A1b.2way_cutting_system.pdf", "A1b - 2WAY Cutting System Part2"),
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A1c.2way_cutting_system.pdf", "A1c - 2WAY Cutting System Part3"),
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A2.2way_cutting_system.pdf", "A2 - 2WAY Cutting System Part4"),
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A3.2way_cutting_system.pdf", "A3 - 2WAY Cutting System Part5"),
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A4.2way_cutting_system.pdf", "A4 - 2WAY Cutting System Part6"),
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A5.2way_cutting_system.pdf", "A5 - 2WAY Cutting System Part7"),
    (f"{BASE_PATH}\\4.2way cut books\\A. 2way cutting system\\A6.2way_cutting_system.pdf", "A6 - 2WAY Cutting System Part8"),

    # B~E 2way cut books
    (f"{BASE_PATH}\\4.2way cut books\\B. 1way base cut bible\\B.1waycutbible.pdf", "B - 1WAY Base Cut Bible"),
    (f"{BASE_PATH}\\4.2way cut books\\C. 2way base cut bible\\c.2waycutbible.pdf", "C - 2WAY Base Cut Bible"),
    (f"{BASE_PATH}\\4.2way cut books\\D. 2way advanced cut bible\\D.advancedcutbible.pdf", "D - 2WAY Advanced Cut Bible"),
    (f"{BASE_PATH}\\4.2way cut books\\E. Image cycle on&on\\E.imagecycleon&on.pdf", "E - Image Cycle On&On"),

    # Theory & Design
    (f"{BASE_PATH}\\2.theory-images\\2.theoty-images.pdf", "Theory Images - 도해 모음"),
    (f"{BASE_PATH}\\3.Face design\\3.face_design.pdf", "Face Design - 얼굴형 디자인"),
]

# ==================== 메인 로직 ====================

def main():
    print("=" * 60)
    print("Gemini File Search API - 2WAY CUT 교재 업로드")
    print("=" * 60)

    # 1. 클라이언트 초기화
    print("\n[1/4] Gemini 클라이언트 초기화...")
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("OK - 클라이언트 연결됨")

    # 2. 기존 저장소 확인 또는 새로 생성
    print(f"\n[2/4] 파일 검색 저장소 확인/생성: {STORE_NAME}")

    try:
        # 기존 저장소 목록 확인
        stores = client.file_search_stores.list()
        existing_store = None

        for store in stores:
            if store.display_name == STORE_NAME:
                existing_store = store
                print(f"OK - 기존 저장소 발견: {store.name}")
                break

        if not existing_store:
            # 새 저장소 생성
            file_search_store = client.file_search_stores.create(
                config={'display_name': STORE_NAME}
            )
            print(f"OK - 새 저장소 생성: {file_search_store.name}")
        else:
            file_search_store = existing_store

    except Exception as e:
        print(f"ERROR - 저장소 생성 실패: {e}")
        return

    # 3. PDF 파일 업로드
    print(f"\n[3/4] PDF 파일 업로드 ({len(PDF_FILES)}개)")
    print("-" * 60)

    uploaded_files = []
    failed_files = []

    for idx, (file_path, display_name) in enumerate(PDF_FILES, 1):
        print(f"\n[{idx}/{len(PDF_FILES)}] {display_name}")

        # 파일 존재 확인
        if not os.path.exists(file_path):
            print(f"  SKIP - 파일 없음: {file_path}")
            failed_files.append((display_name, "파일 없음"))
            continue

        # 파일 크기 확인
        file_size = os.path.getsize(file_path) / (1024 * 1024)
        print(f"  파일 크기: {file_size:.1f}MB")

        if file_size > 100:
            print(f"  SKIP - 100MB 초과")
            failed_files.append((display_name, "100MB 초과"))
            continue

        try:
            # 파일 업로드 (비동기 작업)
            print(f"  업로드 중...")
            operation = client.file_search_stores.upload_to_file_search_store(
                file=file_path,
                file_search_store_name=file_search_store.name,
                config={'display_name': display_name}
            )

            # operation 객체 확인
            print(f"  Operation: {type(operation)}")

            # 비동기 작업 완료 대기 (polling)
            print(f"  처리 중...")
            max_wait = 120  # 최대 2분 대기
            waited = 0

            # operation이 완료될 때까지 대기
            while waited < max_wait:
                try:
                    # 작업 상태 확인
                    if hasattr(operation, 'done') and operation.done:
                        break
                    if hasattr(operation, 'name'):
                        # 이미 완료된 경우
                        break
                except:
                    pass

                time.sleep(3)
                waited += 3
                print(f"  대기 중... ({waited}초)")

            uploaded_files.append(display_name)
            print(f"  OK - 업로드 완료!")

            # API 제한 방지를 위한 대기
            time.sleep(2)

        except Exception as e:
            print(f"  ERROR - {e}")
            import traceback
            traceback.print_exc()
            failed_files.append((display_name, str(e)))

    # 4. 결과 요약
    print("\n" + "=" * 60)
    print("[4/4] 업로드 결과 요약")
    print("=" * 60)

    print(f"\n저장소 이름: {file_search_store.name}")
    print(f"성공: {len(uploaded_files)}개")
    print(f"실패: {len(failed_files)}개")

    if uploaded_files:
        print("\n[성공한 파일]")
        for name in uploaded_files:
            print(f"  - {name}")

    if failed_files:
        print("\n[실패한 파일]")
        for name, reason in failed_files:
            print(f"  - {name}: {reason}")

    # 저장소 이름 저장 (나중에 API에서 사용)
    store_info = f"""
# Gemini File Search Store 정보
# 생성일: {time.strftime('%Y-%m-%d %H:%M:%S')}

GEMINI_FILE_SEARCH_STORE = "{file_search_store.name}"
"""

    config_path = os.path.join(os.path.dirname(__file__), "gemini-store-config.py")
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(store_info)

    print(f"\n저장소 정보 저장됨: {config_path}")
    print("\n" + "=" * 60)
    print("완료! 이제 chatbot-api.js에서 이 저장소를 사용할 수 있습니다.")
    print("=" * 60)

if __name__ == "__main__":
    main()
