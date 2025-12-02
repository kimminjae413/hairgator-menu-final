# -*- coding: utf-8 -*-
"""
명령 2-1: GCS (Google Cloud Storage) 업로드 스크립트
- 결과 이미지 및 도해도 이미지 업로드
- 공개 URL 생성
"""

import os
import sys
import json
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Google Cloud Storage
try:
    from google.cloud import storage
except ImportError:
    print("ERROR: google-cloud-storage 패키지가 필요합니다")
    print("설치: pip install google-cloud-storage")
    sys.exit(1)

# 설정
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\women_cut_recipe"
SERIES = ["FAL", "FBL", "FCL", "FDL", "FEL", "FFL", "FGL", "FHL"]
BUCKET_NAME = "hairgator-styles"  # GCS 버킷명 (변경 필요시 수정)
PROJECT_ID = "hairgator"  # GCP 프로젝트 ID (변경 필요시 수정)

def create_bucket_if_not_exists(client, bucket_name, project_id):
    """버킷이 없으면 생성"""
    try:
        bucket = client.get_bucket(bucket_name)
        print(f"✅ 버킷 존재: {bucket_name}")
        return bucket
    except Exception:
        print(f"📦 버킷 생성 중: {bucket_name}")
        bucket = client.create_bucket(bucket_name, project=project_id, location="asia-northeast3")
        # 공개 읽기 권한 설정
        bucket.make_public(recursive=True, future=True)
        print(f"✅ 버킷 생성 완료: {bucket_name}")
        return bucket

def upload_file(bucket, local_path, gcs_path):
    """파일 업로드"""
    blob = bucket.blob(gcs_path)
    blob.upload_from_filename(local_path)
    # 공개 URL 반환
    return f"https://storage.googleapis.com/{bucket.name}/{gcs_path}"

def main():
    print("=" * 70)
    print("GCS (Google Cloud Storage) 업로드")
    print("=" * 70)

    # 인증 확인
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if not creds_path:
        print("\n⚠️  GOOGLE_APPLICATION_CREDENTIALS 환경변수가 설정되지 않았습니다.")
        print("   GCP 서비스 계정 키 JSON 파일 경로를 설정해주세요:")
        print("   예: set GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\to\\key.json")
        print("\n   또는 gcloud 인증을 사용하세요:")
        print("   gcloud auth application-default login")

        # 테스트 모드로 진행
        test_mode = input("\n테스트 모드로 URL만 생성할까요? (y/n): ").strip().lower()
        if test_mode != 'y':
            return
        print("\n📋 테스트 모드: 실제 업로드 없이 URL 생성만 진행합니다.\n")
        run_test_mode()
        return

    # GCS 클라이언트 초기화
    print("\n[1/3] GCS 클라이언트 초기화...")
    client = storage.Client()
    bucket = create_bucket_if_not_exists(client, BUCKET_NAME, PROJECT_ID)

    # 메타데이터 로드
    print("\n[2/3] 메타데이터 로드...")
    metadata_path = os.path.join(os.path.dirname(__file__), "styles-metadata.json")
    if not os.path.exists(metadata_path):
        print(f"ERROR: 메타데이터 파일이 없습니다. generate-metadata.py를 먼저 실행하세요.")
        return

    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    styles = data["styles"]
    print(f"   {len(styles)}개 스타일 로드됨")

    # 업로드
    print(f"\n[3/3] 파일 업로드 ({len(styles)}개 스타일)")
    print("-" * 60)

    uploaded_count = 0
    error_count = 0
    total_files = 0
    updated_styles = []

    for idx, style in enumerate(styles):
        style_id = style["styleId"]
        series = style["series"]
        style_path = os.path.join(BASE_PATH, series, style_id)

        print(f"\n[{idx+1}/{len(styles)}] {style_id}")

        # 결과 이미지 업로드
        if style["files"]["result"]:
            local_file = os.path.join(style_path, style["files"]["result"])
            if os.path.exists(local_file):
                gcs_path = f"{series}/{style_id}/{style['files']['result']}"
                try:
                    url = upload_file(bucket, local_file, gcs_path)
                    style["gcsUrls"]["result"] = url
                    uploaded_count += 1
                    total_files += 1
                    print(f"  ✅ 결과: {style['files']['result']}")
                except Exception as e:
                    error_count += 1
                    print(f"  ❌ 결과 업로드 실패: {e}")

        # 도해도 업로드
        for diag in style["files"]["diagrams"]:
            local_file = os.path.join(style_path, diag)
            if os.path.exists(local_file):
                gcs_path = f"{series}/{style_id}/{diag}"
                try:
                    url = upload_file(bucket, local_file, gcs_path)
                    # diagrams URL 업데이트
                    diag_idx = style["files"]["diagrams"].index(diag)
                    if diag_idx < len(style["gcsUrls"]["diagrams"]):
                        style["gcsUrls"]["diagrams"][diag_idx] = url
                    else:
                        style["gcsUrls"]["diagrams"].append(url)
                    total_files += 1
                except Exception as e:
                    error_count += 1
                    print(f"  ❌ 도해도 업로드 실패: {diag} - {e}")

        print(f"  📊 도해도 {len(style['files']['diagrams'])}장 업로드")
        updated_styles.append(style)

    # 결과 저장
    print("\n" + "=" * 70)
    print("📊 업로드 완료")
    print("=" * 70)
    print(f"업로드된 파일: {total_files}개")
    print(f"오류: {error_count}개")

    # 업데이트된 메타데이터 저장
    output_path = os.path.join(os.path.dirname(__file__), "styles-metadata-with-urls.json")
    data["styles"] = updated_styles
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n💾 URL 포함 메타데이터 저장: {output_path}")

def run_test_mode():
    """테스트 모드: 실제 업로드 없이 URL 생성"""
    metadata_path = os.path.join(os.path.dirname(__file__), "styles-metadata.json")
    if not os.path.exists(metadata_path):
        print(f"ERROR: 메타데이터 파일이 없습니다.")
        return

    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    styles = data["styles"]
    total_files = 0

    for style in styles:
        style_id = style["styleId"]
        series = style["series"]

        # 결과 이미지 URL
        if style["files"]["result"]:
            style["gcsUrls"]["result"] = f"https://storage.googleapis.com/{BUCKET_NAME}/{series}/{style_id}/{style['files']['result']}"
            total_files += 1

        # 도해도 URL
        style["gcsUrls"]["diagrams"] = []
        for diag in style["files"]["diagrams"]:
            url = f"https://storage.googleapis.com/{BUCKET_NAME}/{series}/{style_id}/{diag}"
            style["gcsUrls"]["diagrams"].append(url)
            total_files += 1

    print(f"\n총 {total_files}개 파일의 예상 URL 생성됨")

    # 저장
    output_path = os.path.join(os.path.dirname(__file__), "styles-metadata-with-urls.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"💾 URL 포함 메타데이터 저장: {output_path}")

    # 샘플 출력
    sample = styles[0]
    print(f"\n📋 샘플 URL ({sample['styleId']}):")
    print(f"   결과: {sample['gcsUrls']['result']}")
    if sample['gcsUrls']['diagrams']:
        print(f"   도해도[0]: {sample['gcsUrls']['diagrams'][0]}")

if __name__ == "__main__":
    main()
