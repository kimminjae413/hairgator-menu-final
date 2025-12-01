# -*- coding: utf-8 -*-
# PDF Split Script - Part 1만 추가 분할

from PyPDF2 import PdfReader, PdfWriter
import os
import sys

# Fix encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

# Source PDF path
source_pdf = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\4.2way cut books\A. 2way cutting system\A.2way cutting system.pdf"

# Output folder
output_dir = r"C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\4.2way cut books\A. 2way cutting system"

print(f"[INFO] Reading PDF: {source_pdf}")
reader = PdfReader(source_pdf)
total_pages = len(reader.pages)
print(f"[INFO] Total pages: {total_pages}")

# 기존 분할 파일 모두 삭제
for i in range(1, 10):
    old_path = os.path.join(output_dir, f"A{i}.2way_cutting_system_part{i}.pdf")
    if os.path.exists(old_path):
        os.remove(old_path)
        print(f"[DEL] Removed: A{i}.2way_cutting_system_part{i}.pdf")

# 커스텀 분할: Part 1 (1-37)이 179MB이므로 더 세분화
# 앞부분(1-37)에 이미지가 집중되어 있음
parts = [
    (0, 10, "A1a.2way_cutting_system.pdf"),   # pages 1-10
    (10, 20, "A1b.2way_cutting_system.pdf"),  # pages 11-20
    (20, 37, "A1c.2way_cutting_system.pdf"),  # pages 21-37
    (37, 74, "A2.2way_cutting_system.pdf"),   # pages 38-74
    (74, 111, "A3.2way_cutting_system.pdf"),  # pages 75-111
    (111, 148, "A4.2way_cutting_system.pdf"), # pages 112-148
    (148, 185, "A5.2way_cutting_system.pdf"), # pages 149-185
    (185, 224, "A6.2way_cutting_system.pdf"), # pages 186-224
]

for start, end, filename in parts:
    writer = PdfWriter()

    for i in range(start, end):
        writer.add_page(reader.pages[i])

    output_path = os.path.join(output_dir, filename)

    with open(output_path, 'wb') as output_file:
        writer.write(output_file)

    # Check file size
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    status = "OK" if size_mb < 100 else "WARNING!"
    print(f"[{status}] {filename} (pages {start+1}-{end}, {size_mb:.1f}MB)")

print("\n[DONE] PDF split complete!")
