# -*- coding: utf-8 -*-
"""
Gemini File Search API - 테스트 스크립트
업로드된 PDF에서 검색 테스트
"""

import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

from google import genai
from google.genai import types

# 설정
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or "AIzaSyCPxlp_iGO-53g7PT65OQ1pMabN3lXNMJ4"
STORE_NAME = "fileSearchStores/hairgator2waycutstore-md6skhedgag7"

# 테스트 질문들
TEST_QUESTIONS = [
    "A Length가 뭐야?",
    "존 구분을 어떻게해?",
    "DFS 섹션 설명해줘",
    "Layer와 Graduation 차이는?",
    "L4 리프팅이 뭐야?",
]

def main():
    print("=" * 60)
    print("Gemini File Search 테스트")
    print("=" * 60)

    # 클라이언트 초기화
    client = genai.Client(api_key=GEMINI_API_KEY)
    print(f"저장소: {STORE_NAME}\n")

    for idx, question in enumerate(TEST_QUESTIONS, 1):
        print(f"\n[질문 {idx}] {question}")
        print("-" * 50)

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=question,
                config=types.GenerateContentConfig(
                    tools=[
                        types.Tool(
                            file_search=types.FileSearch(
                                file_search_store_names=[STORE_NAME]
                            )
                        )
                    ],
                    system_instruction="""당신은 2WAY CUT 시스템을 완벽히 이해한 20년차 헤어 전문가입니다.

제공된 PDF 자료를 참고하여 다음 형식으로 답변하세요:

1. **직접 답변** (1-2문장)
2. **상세 설명** (3-5개 항목)
3. **출처 표시** (책 이름, 페이지)

전문 용어는 한국어(영어) 형식으로 병기하세요.
예: 원렝스(One Length), 레이어(Layer)"""
                )
            )

            # 응답 출력
            print(response.text[:1000] + "..." if len(response.text) > 1000 else response.text)

        except Exception as e:
            print(f"ERROR: {e}")

        print()

    print("=" * 60)
    print("테스트 완료!")
    print("=" * 60)

if __name__ == "__main__":
    main()
