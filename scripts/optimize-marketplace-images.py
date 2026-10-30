"""Otimiza as imagens do marketplace (banners 3:2 e fotos de exemplo) para o app. Reproduzível; NÃO comite os originais grandes.

Uso:  python scripts/optimize-marketplace-images.py [--src PASTA_DOS_ORIGINAIS] [--dst assets/marketplace]
Sem --src, lê e grava em assets/marketplace (idempotente: arquivo que já é JPEG de verdade, <= 1200 px e dentro do limite, é mantido).

Regras:
  - largura máxima 1200 px (proporção original mantida; 1536x1024 vira 1200x800, 3:2);
  - JPEG de verdade (o conteúdo, não só a extensão: os originais enviados eram PNG com extensão .jpg), RGB, baseline, sem metadados;
  - qualidade mais ALTA que caiba em ~200 KB (alvo); se o texto da imagem ficar com artefato, aceita até 300 KB (teto) e avisa;
  - amostragem de cor 4:4:4 (texto colorido nítido) quando couber no alvo; senão 4:2:0.
Requer Pillow (pip install pillow).
"""
import argparse
import io
import os
import sys

from PIL import Image

FILES = ['banner-anuncie', 'banner-treino', 'banner-vitrine', 'suplemento', 'proteina', 'whey']
MAX_WIDTH = 1200
TARGET = 200 * 1024
CEILING = 300 * 1024
QUALITIES = [90, 88, 86, 84, 82, 80, 78, 76, 74, 72, 70]


def encode(img, q, sub):
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=q, optimize=True, subsampling=sub)
    return buf.getvalue()


def best(img):
    """Maior qualidade que cabe no alvo (4:4:4 primeiro, depois 4:2:0); senão a maior que cabe no teto."""
    for limit in (TARGET, CEILING):
        for sub in (0, 2):
            for q in QUALITIES:
                data = encode(img, q, sub)
                if len(data) <= limit:
                    return data, q, sub, limit
    data = encode(img, QUALITIES[-1], 2)
    return data, QUALITIES[-1], 2, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src')
    ap.add_argument('--dst', default='assets/marketplace')
    a = ap.parse_args()
    src = a.src or a.dst
    os.makedirs(a.dst, exist_ok=True)
    bad = 0
    for name in FILES:
        path = os.path.join(src, name + '.jpg')
        out = os.path.join(a.dst, name + '.jpg')
        with open(path, 'rb') as f:
            raw = f.read()
        img = Image.open(io.BytesIO(raw))
        already = img.format == 'JPEG' and img.width <= MAX_WIDTH and len(raw) <= CEILING and src == a.dst
        if already:
            print(f'{name}.jpg: já otimizado ({len(raw) // 1024} KB, {img.width}x{img.height}), mantido')
            continue
        img = img.convert('RGB')
        if img.width > MAX_WIDTH:
            img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
        data, q, sub, limit = best(img)
        with open(out, 'wb') as f:
            f.write(data)
        note = '' if limit == TARGET else (' (ACIMA DO ALVO de 200 KB, dentro do teto de 300 KB: confira o texto)' if limit else ' (ACIMA DO TETO!)')
        if limit is None:
            bad += 1
        print(f'{name}.jpg: {len(raw) // 1024} KB -> {len(data) // 1024} KB, {img.width}x{img.height}, q={q}, {"4:4:4" if sub == 0 else "4:2:0"}{note}')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
