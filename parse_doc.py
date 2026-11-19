#!/usr/bin/env python
"""Извлечение полей «название -> значение в рамке» из сканов (PDF / картинки) через PaddleOCR.

Использование:
    .venv/bin/python parse_doc.py scan.pdf photo.jpg -o result.json [--lang ru] [--dpi 200]
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

IMG_EXT = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp"}


# ---------- загрузка ----------
def load_pages(path: Path, dpi: int):
    """Возвращает список BGR-изображений (по одному на страницу)."""
    if path.suffix.lower() == ".pdf":
        import fitz  # pymupdf

        pages = []
        with fitz.open(path) as doc:
            for p in doc:
                pix = p.get_pixmap(dpi=dpi, colorspace=fitz.csRGB)
                arr = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)
                pages.append(cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))
        return pages
    img = cv2.imdecode(np.fromfile(str(path), np.uint8), cv2.IMREAD_COLOR)  # путь с юникодом
    if img is None:
        raise ValueError(f"не удалось прочитать изображение: {path}")
    return [img]


# ---------- поиск прямоугольников ----------
def find_rects(img):
    """Находит рамки полей по горизонтальным/вертикальным линиям. Возвращает [(x1,y1,x2,y2)]."""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    bw = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 25, 15)

    k = max(15, min(w, h) // 50)  # минимальная длина линии
    horiz = cv2.morphologyEx(bw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (k, 1)))
    vert = cv2.morphologyEx(bw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, k)))
    lines = cv2.dilate(cv2.bitwise_or(horiz, vert), np.ones((3, 3), np.uint8), iterations=2)

    contours, _ = cv2.findContours(lines, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    rects = []
    for c in contours:
        x, y, rw, rh = cv2.boundingRect(c)
        if rw < 3 * k or rh < k * 0.6:  # слишком мелкие
            continue
        if rw * rh > 0.5 * w * h:  # рамка всей страницы
            continue
        # контур рамки должен быть «прямоугольным»
        if cv2.contourArea(c) < 0.8 * rw * rh and len(cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)) != 4:
            continue
        rects.append((x, y, x + rw, y + rh))

    # дедупликация (внешний и внутренний контур линии почти совпадают)
    rects.sort(key=lambda r: (r[2] - r[0]) * (r[3] - r[1]), reverse=True)
    out = []
    for r in rects:
        if not any(iou(r, o) > 0.8 for o in out):
            out.append(r)
    return out


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua else 0


# ---------- OCR ----------
def make_ocr(lang):
    from paddleocr import PaddleOCR

    return PaddleOCR(
        lang=lang,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        enable_mkldnn=False,  # обход бага oneDNN/PIR в Paddle 3.x на CPU
    )


# Латинские буквы, неотличимые от кириллических (и наоборот)
_LAT2CYR = dict(zip("ABCEHKMOPTXYaceopxyk", "АВСЕНКМОРТХУасеорхук"))
_CYR2LAT = {v: k for k, v in _LAT2CYR.items()}
_LAT = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
_CYR = set("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя")


def fix_mixed_script(text):
    """Слово с латиницей и кириллицей одновременно -> один алфавит, если различия только в омоглифах.

    «Hoмер» (лат. H, o) -> «Номер». Чисто латинские/чисто кириллические слова не трогаем.
    """
    def fix(word):
        lat = [c for c in word if c in _LAT]
        cyr = [c for c in word if c in _CYR]
        if not lat or not cyr:
            return word
        if all(c in _LAT2CYR for c in lat):  # приоритет — кириллица
            return "".join(_LAT2CYR.get(c, c) for c in word)
        if all(c in _CYR2LAT for c in cyr):
            return "".join(_CYR2LAT.get(c, c) for c in word)
        return word  # настоящий микс (напр. «Москва-City») не трогаем

    return " ".join(fix(w) for w in text.split(" "))


def run_ocr(ocr, img):
    """-> [{'text','score','box':(x1,y1,x2,y2)}]"""
    res = ocr.predict(img)[0]
    items = []
    for t, s, b in zip(res["rec_texts"], res["rec_scores"], res["rec_boxes"]):
        t = fix_mixed_script(t.strip())
        if t:
            items.append({"text": t, "score": float(s), "box": tuple(int(v) for v in b)})
    return items


# ---------- сборка полей ----------
def center(b):
    return (b[0] + b[2]) / 2, (b[1] + b[3]) / 2


def v_overlap(a, b):
    """Доля вертикального перекрытия относительно меньшей высоты."""
    o = min(a[3], b[3]) - max(a[1], b[1])
    return o / max(1, min(a[3] - a[1], b[3] - b[1]))


def join_lines(items):
    """Склеивает фрагменты: сверху вниз, внутри строки слева направо."""
    items = sorted(items, key=lambda i: (center(i["box"])[1], i["box"][0]))
    rows, cur = [], []
    for it in items:
        if cur and v_overlap(cur[-1]["box"], it["box"]) < 0.5:
            rows.append(cur)
            cur = []
        cur.append(it)
    if cur:
        rows.append(cur)
    return " ".join(" ".join(i["text"] for i in sorted(r, key=lambda i: i["box"][0])) for r in rows)


def build_fields(items, rects):
    # текст -> самая маленькая рамка, внутри которой лежит его центр
    boxed = {i: [] for i in range(len(rects))}
    free = []
    for it in items:
        cx, cy = center(it["box"])
        hit = [i for i, r in enumerate(rects) if r[0] <= cx <= r[2] and r[1] <= cy <= r[3]]
        if hit:
            boxed[min(hit, key=lambda i: (rects[i][2] - rects[i][0]) * (rects[i][3] - rects[i][1]))].append(it)
        else:
            free.append(it)

    # Контейнеры (рамка, содержащая другие рамки) — не поля.
    def contains(a, b):
        return a != b and a[0] <= b[0] + 2 and a[1] <= b[1] + 2 and a[2] >= b[2] - 2 and a[3] >= b[3] - 2

    leaf = [i for i, r in enumerate(rects) if not any(contains(r, o) for o in rects)]
    leaf.sort(key=lambda i: (center(rects[i])[1], rects[i][0]))

    # группировка рамок в строки
    rows = []
    for i in leaf:
        if rows and v_overlap(rects[rows[-1][-1]], rects[i]) > 0.5:
            rows[-1].append(i)
        else:
            rows.append([i])

    top = min((rects[i][1] for i in leaf), default=10**9)
    title = join_lines([f for f in free if center(f["box"])[1] < top and not any(
        v_overlap(f["box"], rects[i]) > 0.3 for i in leaf)])

    fields, used = [], set()
    for row in rows:
        row.sort(key=lambda i: rects[i][0])
        left_limit = 0
        for i in row:
            r = rects[i]
            cand = [
                (k, f) for k, f in enumerate(free)
                if k not in used and f["box"][2] <= r[0] + 5 and center(f["box"])[0] >= left_limit
                and v_overlap(f["box"], r) > 0.3
            ]
            for k, _ in cand:
                used.add(k)
            label = join_lines([f for _, f in cand])
            vals = boxed[i]
            fields.append({
                "label": label,
                "value": join_lines(vals),
                "confidence": round(min((v["score"] for v in vals), default=0.0), 4),
                "box": list(r),
            })
            left_limit = r[2]

    leftovers = [f["text"] for k, f in enumerate(free) if k not in used and f["text"] not in title]
    return title, fields, leftovers


def process(ocr, path, dpi):
    pages = []
    for n, img in enumerate(load_pages(path, dpi), 1):
        title, fields, rest = build_fields(run_ocr(ocr, img), find_rects(img))
        pages.append({"page": n, "title": title, "fields": fields, "unassigned_text": rest})
    return {"file": str(path), "pages": pages}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+", type=Path, help="PDF/изображения или папки")
    ap.add_argument("-o", "--output", type=Path, default=Path("result.json"))
    ap.add_argument("--lang", default="ru")
    ap.add_argument("--dpi", type=int, default=200)
    a = ap.parse_args()

    files = []
    for p in a.inputs:
        files += sorted(f for f in p.iterdir() if f.suffix.lower() in IMG_EXT | {".pdf"}) if p.is_dir() else [p]

    ocr = make_ocr(a.lang)
    results = []
    for f in files:
        try:
            results.append(process(ocr, f, a.dpi))
        except Exception as e:  # один плохой файл не должен ронять весь пакет
            print(f"[ошибка] {f}: {e}", file=sys.stderr)
            results.append({"file": str(f), "error": str(e)})
    a.output.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"готово: {len(results)} файл(ов) -> {a.output}")


if __name__ == "__main__":
    main()
