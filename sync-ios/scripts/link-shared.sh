#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f shared
ln -s ../lib shared
echo "Linked sync-ios/shared -> ../lib"
