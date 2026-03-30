draw-io-diagram-generator scripts
=================================

This folder contains simple helper scripts used by the draw-io skill.

Files
-----
- validate-drawio.py — A lightweight validator that checks the mxGraph XML structure in uncompressed .drawio files.
- add-shape.py — A tiny helper that appends a rectangular shape to the first diagram page in an uncompressed .drawio file.

Usage
-----
- Validate a .drawio file:

```bash
python .github/skills/draw-io-diagram-generator/scripts/validate-drawio.py path/to/file.drawio
```

- Add a shape to a .drawio file (first page):

```bash
python .github/skills/draw-io-diagram-generator/scripts/add-shape.py path/to/file.drawio "Label" x y [width] [height]
```

Notes
-----
- These scripts do not support compressed/base64-encoded diagram contents produced by draw.io's default "compressed" save. If you need support for compressed diagrams, add the decompression step (zlib) and base64 decode.
- These are simple convenience tools to assist generation and testing; they are not full-featured editors. Use with care and keep backups of original files.

