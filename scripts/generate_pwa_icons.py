import zlib
import struct
import math
import os

def create_brand_png(width, height, is_maskable=False):
    header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    ihdr = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + ihdr_crc

    cx, cy = width / 2.0, height / 2.0
    corner_r = width * 0.22 if not is_maskable else 0 # no rounded outer corners for maskable

    raw = bytearray()
    for y in range(height):
        raw.append(0) # filter type None
        for x in range(width):
            # Coordinates relative to center
            dx = abs(x - cx)
            dy = abs(y - cy)

            # Gradient background from indigo-700 (#4338ca) to sky-500 (#0ea5e9)
            t = (x + y) / (width + height * 1.0)
            r_bg = int(67 + t * (14 - 67))
            g_bg = int(56 + t * (165 - 56))
            b_bg = int(202 + t * (233 - 202))

            # Alpha for rounded squircle (if not maskable)
            alpha = 255
            if not is_maskable:
                box_w = width * 0.48
                box_h = height * 0.48
                if dx > box_w - corner_r and dy > box_h - corner_r:
                    dist = math.hypot(dx - (box_w - corner_r), dy - (box_h - corner_r))
                    if dist > corner_r:
                        alpha = max(0, min(255, int((corner_r + 1.0 - dist) * 255)))

            # Inner icon: House roof + wallet badge in center
            # Scale inside safe zone: center 50%
            icon_scale = 0.5 if not is_maskable else 0.4
            nx = (x - cx) / (width * icon_scale)
            ny = (y - cy) / (height * icon_scale)

            is_icon = False
            # Roof triangle: ny between -0.8 and 0.0, |nx| <= 1.0 - (ny + 0.8) / 0.8
            if -0.8 <= ny <= -0.05:
                max_w = (ny + 0.8) * 1.1
                if abs(nx) <= max_w:
                    is_icon = True
            # House body: ny between -0.05 and 0.75, |nx| <= 0.65
            elif -0.05 < ny <= 0.75:
                if abs(nx) <= 0.68:
                    is_icon = True

            # Door / Wallet shape in center: nx between -0.3 and 0.3, ny between 0.15 and 0.75
            if 0.15 <= ny <= 0.75 and abs(nx) <= 0.32:
                is_icon = False # cutout inside house

            if is_icon and alpha > 0:
                # Golden white color for the icon
                raw.extend([255, 255, 255, alpha])
            elif alpha > 0:
                raw.extend([r_bg, g_bg, b_bg, alpha])
            else:
                raw.extend([0, 0, 0, 0])

    compressed = zlib.compress(bytes(raw), 9)
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    idat = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + idat_crc

    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    iend = struct.pack('>I', 0) + b'IEND' + iend_crc

    return header + ihdr + idat + iend

out_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
os.makedirs(out_dir, exist_ok=True)

icons = [
    ('pwa-192x192.png', 192, 192, False),
    ('pwa-512x512.png', 512, 512, False),
    ('pwa-maskable-512x512.png', 512, 512, True),
    ('apple-touch-icon.png', 180, 180, False),
    ('apple-touch-icon-180x180.png', 180, 180, False),
]

for filename, w, h, maskable in icons:
    filepath = os.path.join(out_dir, filename)
    data = create_brand_png(w, h, maskable)
    with open(filepath, 'wb') as f:
        f.write(data)
    print(f"Generated {filepath}: {len(data)} bytes")

print("All PWA PNG icons generated successfully!")
