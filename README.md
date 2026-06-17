# BlockEnt – Blockbench Plugin v1.0.0

Gabungan **Bedrock Block** + **Bedrock Entity** jadi satu format.  
Buat model & texture seperti biasa, plus **Display Settings** dan **Animation Manager**.

---

## Cara Install

1. Buka Blockbench 5.1.4
2. Masuk ke **File → Plugins → Load Plugin from File**
3. Pilih file `blockent.js`
4. Plugin aktif otomatis

---

## Cara Pakai

### Buat Project Baru
- **File → New → BlockEnt Project**
- Atau pilih format **BlockEnt** di start screen

### Display Settings
- Menu **Tools → BlockEnt: Display Settings**
- Atur Rotation / Translation / Scale untuk setiap slot:
  - Third Person Right/Left Hand
  - First Person Right/Left Hand
  - Ground, GUI, Head, Item Frame

### Animation Manager
- Menu **Tools → BlockEnt: Animation Manager**
- Buat animasi dari timeline Blockbench
- Atur nama, loop, panjang animasi
- Hapus animasi yang tidak dipakai

### Export
- **File → Export → BlockEnt Model**
- Output: `nama.blockent.json`
- Berisi: model bones + display settings + animasi

---

## Format Output

```json
{
  "format_version": "1.12.0",
  "blockent:model": {
    "description": { "identifier": "blockent:nama", ... },
    "bones": [ ... ],
    "display": { "gui": {...}, "ground": {...}, ... },
    "animations": { "animation.blockent.idle": {...} }
  }
}
```

---

## Kompatibilitas

- Blockbench 5.1.0+
- Minecraft Bedrock Edition (behavior pack + resource pack)
