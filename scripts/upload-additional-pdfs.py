# -*- coding: utf-8 -*-
"""
Gemini File Search API - 추가 PDF 업로드 스크립트
"""

import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

from google import genai

# 기존 저장소
STORE_NAME = "fileSearchStores/hairgator2waycutstore-md6skhedgag7"

# 추가할 PDF 파일
PDF_FILES = [
    (r"C:\Users\김민재\Desktop\10.color.pdf", "10 - Color (컬러 이론)"),
    (r"C:\Users\김민재\Desktop\5.cut_index_ko.pdf", "5 - Cut Index KO (커트 색인)"),
    (r"C:\Users\김민재\Desktop\6.perm_index.pdf", "6 - Perm Index (펌 색인)"),
]

def main():
    print("=" * 60)
    print("Gemini File Search - 추가 PDF 업로드")
    print("=" * 60)

    # API 키 확인
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        api_key = input("Gemini API Key를 입력하세요: ").strip()
    
    if not api_key:
        print("ERROR: API 키가 필요합니다")
        return

    # 클라이언트 초기화
    print("\n[1/2] Gemini 클라이언트 초기화...")
    client = genai.Client(api_key=api_key)
    print(f"OK - 저장소: {STORE_NAME}")

    # PDF 업로드
    print(f"\n[2/2] PDF 파일 업로드 ({len(PDF_FILES)}개)")
    print("-" * 60)

    uploaded = []
    failed = []

    for idx, (file_path, display_name) in enumerate(PDF_FILES, 1):
        print(f"\n[{idx}/{len(PDF_FILES)}] {display_name}")

        if not os.path.exists(file_path):
            print(f"  SKIP - 파일 없음")
            failed.append((display_name, "파일 없음"))
            continue

        file_size = os.path.getsize(file_path) / (1024 * 1024)
        print(f"  파일 크기: {file_size:.1f}MB")

        try:
            print(f"  업로드 중...")
            operation = client.file_search_stores.upload_to_file_search_store(
                file=file_path,
                file_search_store_name=STORE_NAME,
                config={'display_name': display_name}
            )

            # 완료 대기
            print(f"  처리 중...")
            time.sleep(5)

            uploaded.append(display_name)
            print(f"  OK - 업로드 완료!")

            time.sleep(2)

        except Exception as e:
            print(f"  ERROR - {e}")
            failed.append((display_name, str(e)))

    # 결과
    print("\n" + "=" * 60)
    print("업로드 결과")
    print("=" * 60)
    print(f"성공: {len(uploaded)}개")
    print(f"실패: {len(failed)}개")

    if uploaded:
        print("\n[성공]")
        for name in uploaded:
            print(f"  - {name}")

    if failed:
        print("\n[실패]")
        for name, reason in failed:
            print(f"  - {name}: {reason}")

if __name__ == "__main__":
    main()
