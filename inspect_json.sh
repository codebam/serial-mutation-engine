#!/usr/bin/env bash
SERIAL="$1"
ORIGINAL_BINARY=$(node decode.js "$SERIAL")
PARSED_JSON=$(echo "$ORIGINAL_BINARY" | node parser.js)
echo "$PARSED_JSON" | nix run nixpkgs#jq .
