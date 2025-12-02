# -*- coding: utf-8 -*-
"""
명령 4-1: Gemini 이미지 임베딩 생성 스크립트
- 각 스타일의 결과 이미지에서 임베딩 벡터 생성
- 코사인 유사도 기반 스타일 매칭용
"""

import os
import sys
import json
import time
import base64
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Google Generative AI
try:
    import google.generativeai as genai
except ImportError:
    print("ERROR: google-generativeai 패키지가 필요합니다")
    print("설치: pip install google-generativeai")
    sys.exit(1)

# 설정
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\women_cut_recipe"
EMBEDDING_MODEL = "models/text-embedding-004"  # 텍스트용
# 이미지 임베딩은 Gemini Vision으로 설명 추출 후 텍스트 임베딩 사용

def load_image_as_base64(image_path):
    """이미지를 base64로 인코딩"""
    with open(image_path, 'rb') as f:
        return base64.standard_b64encode(f.read()).decode('utf-8')

def get_image_description(model, image_path):
    """Gemini Vision으로 헤어스타일 이미지 설명 생성"""
    try:
        # 이미지 로드
        import PIL.Image
        image = PIL.Image.open(image_path)

        prompt = """이 헤어스타일 이미지를 분석해주세요. 다음 항목을 포함해 간결하게 설명해주세요:
1. 머리 길이 (숏/미디엄/롱)
2. 커트 형태 (원랭스/레이어/그래쥬에이션 등)
3. 실루엣 특징
4. 앞머리 유무 및 스타일
5. 전체적인 볼륨감과 질감

한국어로 2-3문장으로 답변해주세요."""

        response = model.generate_content([prompt, image])
        return response.text.strip()
    except Exception as e:
        print(f"     이미지 분석 오류: {e}")
        return None

def get_text_embedding(text, api_key):
    """텍스트 임베딩 생성"""
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"     임베딩 생성 오류: {e}")
        return None

def cosine_similarity(vec1, vec2):
    """코사인 유사도 계산"""
    import math
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0
    return dot_product / (norm1 * norm2)

def main():
    print("=" * 70)
    print("Gemini 이미지 임베딩 생성")
    print("=" * 70)

    # API 키 확인
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        # .env에서 로드 시도
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break

    if not api_key:
        print("ERROR: GEMINI_API_KEY가 필요합니다")
        print("   .env 파일에 설정하거나 환경변수로 설정하세요")
        return

    # Gemini 초기화
    print("\n[1/3] Gemini 초기화...")
    genai.configure(api_key=api_key)

    # Vision 모델 (이미지 분석용)
    vision_model = genai.GenerativeModel('gemini-1.5-flash')
    print("   ✅ Gemini 연결됨")

    # 메타데이터 로드
    print("\n[2/3] 메타데이터 로드...")
    metadata_path = os.path.join(os.path.dirname(__file__), "styles-metadata.json")
    if not os.path.exists(metadata_path):
        print("ERROR: 메타데이터 파일이 없습니다.")
        return

    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    styles = data["styles"]
    print(f"   {len(styles)}개 스타일 로드됨")

    # 임베딩 생성
    print(f"\n[3/3] 임베딩 생성 ({len(styles)}개 스타일)")
    print("-" * 60)

    embeddings_data = []
    success_count = 0
    error_count = 0

    for idx, style in enumerate(styles):
        style_id = style["styleId"]
        series = style["series"]

        print(f"\n[{idx+1}/{len(styles)}] {style_id}")

        # 결과 이미지 경로
        result_file = style["files"].get("result")
        if not result_file:
            print("   ⚠️ 결과 이미지 없음")
            error_count += 1
            continue

        image_path = os.path.join(BASE_PATH, series, style_id, result_file)
        if not os.path.exists(image_path):
            print(f"   ⚠️ 이미지 파일 없음: {result_file}")
            error_count += 1
            continue

        # 1. 이미지 설명 생성 (Vision)
        print("   📷 이미지 분석 중...")
        description = get_image_description(vision_model, image_path)

        if not description:
            # 자막 내용으로 대체
            description = style.get("caption", "")
            print("   ⚠️ 이미지 분석 실패, 자막 사용")

        # 메타데이터 추가
        meta_text = f"기장: {style['length']['ko']}"
        if style.get("shape"):
            meta_text += f", 형태: {style['shape']['ko']}"

        full_text = f"{meta_text}. {description}"

        # 2. 텍스트 임베딩 생성
        print("   🔢 임베딩 생성 중...")
        embedding = get_text_embedding(full_text, api_key)

        if embedding:
            style["embedding"] = embedding
            style["description"] = description
            embeddings_data.append({
                "styleId": style_id,
                "series": series,
                "length": style["length"]["en"],
                "shape": style.get("shape", {}).get("en") if style.get("shape") else None,
                "description": description,
                "embedding": embedding
            })
            success_count += 1
            print(f"   ✅ 완료 (벡터 차원: {len(embedding)})")
        else:
            error_count += 1
            print("   ❌ 임베딩 생성 실패")

        # Rate limit 방지
        time.sleep(0.5)

    # 결과 저장
    print("\n" + "=" * 70)
    print("📊 임베딩 생성 완료")
    print("=" * 70)
    print(f"성공: {success_count}개")
    print(f"실패: {error_count}개")

    # 임베딩 데이터 저장
    output_path = os.path.join(os.path.dirname(__file__), "styles-embeddings.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "model": EMBEDDING_MODEL,
            "dimensions": len(embeddings_data[0]["embedding"]) if embeddings_data else 0,
            "totalStyles": len(embeddings_data),
            "styles": embeddings_data
        }, f, ensure_ascii=False, indent=2)

    print(f"\n💾 임베딩 데이터 저장: {output_path}")

    # 메타데이터 업데이트
    data["styles"] = styles
    updated_path = os.path.join(os.path.dirname(__file__), "styles-metadata-with-embeddings.json")
    with open(updated_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"💾 메타데이터 업데이트: {updated_path}")

    # 유사도 테스트
    if len(embeddings_data) >= 2:
        print("\n📋 유사도 테스트 (첫 번째 스타일 기준 Top-3):")
        base_style = embeddings_data[0]
        similarities = []

        for style in embeddings_data[1:]:
            sim = cosine_similarity(base_style["embedding"], style["embedding"])
            similarities.append((style["styleId"], sim))

        similarities.sort(key=lambda x: -x[1])
        print(f"   기준: {base_style['styleId']}")
        for style_id, sim in similarities[:3]:
            print(f"   - {style_id}: {sim:.4f}")

if __name__ == "__main__":
    main()
