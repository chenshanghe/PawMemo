#!/bin/bash
set -e

REPO="https://chenshanghe:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/chenshanghe/PawMemo.git"

git remote add github "$REPO" 2>/dev/null || git remote set-url github "$REPO"
git push github main --force
echo "Done! Code pushed to GitHub."
