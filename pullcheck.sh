#!/bin/bash

# Checks package.json changes in root, frontend, and backend after git pull
# Usage: ./pullcheck.sh

BEFORE=$(git rev-parse HEAD)

git pull

echo ""
echo "Checking package.json changes..."
echo ""

FILES=("package.json" "frontend/package.json" "backend/package.json")

CHANGED=0

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        DIFF=$(git diff "$BEFORE" HEAD --stat -- "$FILE")
        if [ -n "$DIFF" ]; then
            echo "⚠️  $FILE changed:"
            echo "$DIFF"
            echo ""
            CHANGED=1
        else
            echo "✅ $FILE — no changes"
        fi
    else
        echo "ℹ️  $FILE — not found, skipping"
    fi
done

echo ""
if [ "$CHANGED" -eq 1 ]; then
    echo "👉 Run npm install in the affected folder(s)."
else
    echo "👉 No dependency changes. No need to run npm install."
fi