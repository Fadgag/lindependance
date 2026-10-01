#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SKILLS_DIR="$ROOT_DIR/skills"
START_MARKER="<!-- BEGIN:skills-list -->"
END_MARKER="<!-- END:skills-list -->"

if [ ! -d "$SKILLS_DIR" ]; then
  printf 'Skills directory not found: %s\n' "$SKILLS_DIR" >&2
  exit 1
fi

files=()
while IFS= read -r file; do
  files+=("${file#"$ROOT_DIR"/}")
done < <(
  find "$SKILLS_DIR" -type f \
    \( -name '*.skill.md' -o -name '*.agent.md' -o -name 'global-rules.md' \) \
    ! -path "$SKILLS_DIR/template/*" |
    LC_ALL=C sort
)

if [ "${#files[@]}" -eq 0 ]; then
  printf 'No Markdown skills found under %s\n' "$SKILLS_DIR" >&2
  exit 1
fi

block_file=$(mktemp)
trap 'rm -f "$block_file"' EXIT
{
  printf '%s\n' "$START_MARKER"
  printf '## Skills disponibles\n\n'
  printf 'Liste générée depuis `skills/`. Voir `skills/README.md` pour les rôles et l’utilisation.\n'
  for file in "${files[@]}"; do
    printf -- '- `%s`\n' "$file"
  done
  printf '%s\n' "$END_MARKER"
} > "$block_file"

replace_skill_section() {
  local file="$1"
  local start_count end_count temp inside line

  start_count=$(grep -Fxc "$START_MARKER" "$file" || true)
  end_count=$(grep -Fxc "$END_MARKER" "$file" || true)
  if [ "$start_count" -ne 1 ] || [ "$end_count" -ne 1 ]; then
    printf 'Expected exactly one skills marker pair in %s\n' "$file" >&2
    return 1
  fi

  temp=$(mktemp "${file}.tmp.XXXXXX")
  inside=0
  while IFS= read -r line || [ -n "$line" ]; do
    if [ "$line" = "$START_MARKER" ]; then
      if [ "$inside" -ne 0 ]; then
        rm -f "$temp"
        printf 'Nested skills marker in %s\n' "$file" >&2
        return 1
      fi
      cat "$block_file" >> "$temp"
      inside=1
    elif [ "$line" = "$END_MARKER" ]; then
      if [ "$inside" -ne 1 ]; then
        rm -f "$temp"
        printf 'Skills end marker precedes start marker in %s\n' "$file" >&2
        return 1
      fi
      inside=0
    elif [ "$inside" -eq 0 ]; then
      printf '%s\n' "$line" >> "$temp"
    fi
  done < "$file"

  if [ "$inside" -ne 0 ]; then
    rm -f "$temp"
    printf 'Unclosed skills marker in %s\n' "$file" >&2
    return 1
  fi

  mv "$temp" "$file"
}

replace_skill_section "$ROOT_DIR/AGENTS.md"
replace_skill_section "$ROOT_DIR/CLAUDE.md"
printf 'Updated skill indexes in AGENTS.md and CLAUDE.md with %s files.\n' "${#files[@]}"
