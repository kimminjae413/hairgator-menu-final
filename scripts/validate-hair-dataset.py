# -*- coding: utf-8 -*-
"""
명령 1-1: 헤어 데이터셋 파일 구조 검증 스크립트
- 70개 스타일 폴더 확인
- 자막 파일, 결과 이미지, 도해도 이미지 검증
- 누락 파일 경고 및 완성도 통계 출력
"""

import os
import sys
import glob
import json
from collections import defaultdict

# Windows 콘솔 UTF-8 출력 설정
sys.stdout.reconfigure(encoding='utf-8')

# 데이터셋 경로
BASE_PATH = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\women_cut_recipe"

# 시리즈 목록
SERIES = ["FAL", "FBL", "FCL", "FDL", "FEL", "FFL", "FGL", "FHL"]

def validate_dataset():
    print("=" * 70)
    print("헤어 데이터셋 파일 구조 검증")
    print("=" * 70)

    all_styles = []
    stats = {
        "total_styles": 0,
        "complete_styles": 0,
        "missing_caption": [],
        "missing_result": [],
        "low_diagram_count": [],
        "diagram_counts": defaultdict(int)
    }

    # 각 시리즈별로 스캔
    for series in SERIES:
        series_path = os.path.join(BASE_PATH, series)

        if not os.path.exists(series_path):
            print(f"\n⚠️  시리즈 폴더 없음: {series}")
            continue

        # 시리즈 내 스타일 폴더들
        style_folders = [d for d in os.listdir(series_path)
                        if os.path.isdir(os.path.join(series_path, d))]
        style_folders.sort()

        print(f"\n📁 {series} 시리즈: {len(style_folders)}개 스타일")
        print("-" * 50)

        for style_id in style_folders:
            style_path = os.path.join(series_path, style_id)
            stats["total_styles"] += 1

            style_info = {
                "styleId": style_id,
                "series": series,
                "path": style_path,
                "hasCaption": False,
                "hasResult": False,
                "diagramCount": 0,
                "files": {
                    "caption": None,
                    "result": None,
                    "diagrams": []
                }
            }

            # 폴더 내 파일들 스캔
            files = os.listdir(style_path)

            # 1. 자막 파일 찾기 (여러 패턴 지원)
            caption_patterns = [
                f"{style_id}(자막).txt",
                f"{style_id}-jamag.txt",
                f"{style_id}_자막.txt",
                f"{style_id}.txt"
            ]

            for pattern in caption_patterns:
                if pattern in files:
                    style_info["hasCaption"] = True
                    style_info["files"]["caption"] = pattern
                    break

            # 2. 결과 이미지 찾기
            result_patterns = ["result.jpg", "result.png", "1.png", "1.jpg",
                             f"{style_id}.jpg", f"{style_id}.png",
                             "아트보드 – 28.png", "아트보드 – 23.png"]

            for pattern in result_patterns:
                if pattern in files:
                    style_info["hasResult"] = True
                    style_info["files"]["result"] = pattern
                    break

            # 아트보드 패턴으로 한번 더 찾기
            if not style_info["hasResult"]:
                for f in files:
                    if f.startswith("아트보드"):
                        style_info["hasResult"] = True
                        style_info["files"]["result"] = f
                        break

            # 3. 도해도 이미지 찾기 (SR_로 시작하는 PNG)
            diagrams = sorted([f for f in files if f.startswith("SR_") and f.endswith(".png")])
            style_info["diagramCount"] = len(diagrams)
            style_info["files"]["diagrams"] = diagrams
            stats["diagram_counts"][len(diagrams)] += 1

            # 완성도 체크 (도해도는 스타일마다 개수가 다르므로 1개 이상이면 OK)
            is_complete = style_info["hasCaption"] and style_info["hasResult"] and style_info["diagramCount"] >= 1

            if is_complete:
                stats["complete_styles"] += 1
                status = "✅"
            else:
                status = "⚠️"

                if not style_info["hasCaption"]:
                    stats["missing_caption"].append(style_id)
                if not style_info["hasResult"]:
                    stats["missing_result"].append(style_id)
                if style_info["diagramCount"] < 1:
                    stats["low_diagram_count"].append((style_id, style_info["diagramCount"]))

            # 상태 출력
            caption_status = "📄" if style_info["hasCaption"] else "❌"
            result_status = "🖼️" if style_info["hasResult"] else "❌"

            print(f"  {status} {style_id}: {caption_status} 자막 | {result_status} 결과 | 📊 도해도 {style_info['diagramCount']}장")

            all_styles.append(style_info)

    # 최종 통계
    print("\n" + "=" * 70)
    print("📊 최종 통계")
    print("=" * 70)

    print(f"\n총 스타일 수: {stats['total_styles']}개")
    print(f"완성된 스타일: {stats['complete_styles']}개 ({stats['complete_styles']/stats['total_styles']*100:.1f}%)")

    if stats["missing_caption"]:
        print(f"\n❌ 자막 누락 ({len(stats['missing_caption'])}개):")
        for s in stats["missing_caption"][:10]:
            print(f"   - {s}")
        if len(stats["missing_caption"]) > 10:
            print(f"   ... 외 {len(stats['missing_caption'])-10}개")

    if stats["missing_result"]:
        print(f"\n❌ 결과 이미지 누락 ({len(stats['missing_result'])}개):")
        for s in stats["missing_result"][:10]:
            print(f"   - {s}")
        if len(stats["missing_result"]) > 10:
            print(f"   ... 외 {len(stats['missing_result'])-10}개")

    if stats["low_diagram_count"]:
        print(f"\n⚠️  도해도 없음 ({len(stats['low_diagram_count'])}개):")
        for s, cnt in stats["low_diagram_count"][:10]:
            print(f"   - {s}: {cnt}장")
        if len(stats["low_diagram_count"]) > 10:
            print(f"   ... 외 {len(stats['low_diagram_count'])-10}개")

    print(f"\n📈 도해도 수 분포:")
    for cnt in sorted(stats["diagram_counts"].keys()):
        print(f"   {cnt}장: {stats['diagram_counts'][cnt]}개 스타일")

    # 총 파일 수 계산
    total_diagrams = sum(s["diagramCount"] for s in all_styles)
    total_captions = sum(1 for s in all_styles if s["hasCaption"])
    total_results = sum(1 for s in all_styles if s["hasResult"])

    print(f"\n📦 총 파일 수:")
    print(f"   - 자막: {total_captions}개")
    print(f"   - 결과 이미지: {total_results}개")
    print(f"   - 도해도: {total_diagrams}장")
    print(f"   - 합계: {total_captions + total_results + total_diagrams}개 파일")

    # JSON으로 저장
    output_path = os.path.join(os.path.dirname(__file__), "dataset-validation-result.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "stats": {
                "total_styles": stats["total_styles"],
                "complete_styles": stats["complete_styles"],
                "missing_caption": stats["missing_caption"],
                "missing_result": stats["missing_result"],
                "low_diagram_count": [(s, c) for s, c in stats["low_diagram_count"]],
                "total_diagrams": total_diagrams,
                "total_captions": total_captions,
                "total_results": total_results
            },
            "styles": all_styles
        }, f, ensure_ascii=False, indent=2)

    print(f"\n💾 상세 결과 저장: {output_path}")

    return all_styles, stats

if __name__ == "__main__":
    validate_dataset()
