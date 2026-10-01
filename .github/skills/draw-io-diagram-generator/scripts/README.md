# Draw.io scripts

Utilities for `.drawio` files in this repository. Run commands from the
repository root.

## Requirements

- Python 3.8 or later
- No third-party Python packages

## Validate a diagram

```bash
python .github/skills/draw-io-diagram-generator/scripts/validate-drawio.py docs/architecture.drawio
```

The validator checks XML well-formedness, required root cells, unique cell IDs,
parent references, vertex geometry, edge endpoints, and the presence of a title
cell. It supports uncompressed diagrams only. A `SKIP` message means a page was
not validated, even if the command exits successfully; uncompress that page
before treating the file as validated.

Run the validator once for each diagram you intend to deliver, and confirm that
it exits successfully without printing `SKIP`.

## Add a shape

```bash
python .github/skills/draw-io-diagram-generator/scripts/add-shape.py \
  docs/architecture.drawio "New Service" 700 380
```

Optional arguments include `--width`, `--height`, `--style`, and
`--diagram-index`. Use `--dry-run` to preview the cell XML without modifying the
diagram.

The shape utility also supports uncompressed diagrams only. Review the diff and
run the validator after it changes a file.
