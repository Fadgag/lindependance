#!/usr/bin/env bash
set -euo pipefail

# Rebuild skills list for AGENTS.md and CLAUDE.md from skills/agents/
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SKILLS_DIR="$ROOT_DIR/skills/agents"
AGENTS_MD="$ROOT_DIR/AGENTS.md"
CLAUDE_MD="$ROOT_DIR/CLAUDE.md"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "No skills directory found at $SKILLS_DIR"
  exit 1
fi

# gather skill files (relative paths) in a portable way
files=()
while IFS= read -r -d '' f; do
  rel="${f#$ROOT_DIR/}"
  files+=("$rel")
done < <(find "$SKILLS_DIR" -type f \( -name "*.md" -o -name "*.yaml" -o -name "*.yml" \) -print0)

# sort the array
IFS=$'\n' files=($(printf "%s\n" "${files[@]}" | sort))
unset IFS

tmpfile=$(mktemp)
cat > "$tmpfile" <<'EOF'
<!-- BEGIN:skills-list -->
## Skills disponibles

Liste des skills et agents disponibles dans le dépôt (emplacements relatifs) :

EOF
for f in "${files[@]}"; do
  echo "- \\`$f\\`" >> "$tmpfile"
done
cat >> "$tmpfile" <<'EOF'

<!-- END:skills-list -->
EOF
list_text=$(cat "$tmpfile")
rm "$tmpfile"

# update AGENTS.md between markers or append if missing
if grep -q "<!-- BEGIN:skills-list -->" "$AGENTS_MD"; then
  awk -v new="$list_text" 'BEGIN{print_flag=1} /<!-- BEGIN:skills-list -->/{print new; skip=1} /<!-- END:skills-list -->/{skip=0; next} {if(!skip) print}' "$AGENTS_MD" > "$AGENTS_MD.tmp"
  mv "$AGENTS_MD.tmp" "$AGENTS_MD"
else
  printf "\n%s\n" "$list_text" >> "$AGENTS_MD"
fi

# update CLAUDE.md: replace existing "## Skills référencés" section if present, else append
skills_section="## Skills référencés\n\n"
skills_section_content=""
for f in "${files[@]}"; do
  skills_section_content+="- $f\n"
done
skills_block="$skills_section$skills_section_content"

if grep -q "^## Skills référencés" "$CLAUDE_MD"; then
  awk -v block="$skills_block" 'BEGIN{p=1} /^## Skills référencés/{print block; skip=1; next} { if(skip && /^$/){skip=0; print; next} if(!skip) print }' "$CLAUDE_MD" > "$CLAUDE_MD.tmp"
  mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
else
  printf "\n%s\n" "$skills_block" >> "$CLAUDE_MD"
fi

echo "Updated $AGENTS_MD and $CLAUDE_MD with ${#files[@]} skills."





