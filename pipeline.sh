#!/usr/bin/env bash
SERIAL="$1"
ORIGINAL_BINARY=$(node decode.js "$SERIAL")
PARSED_JSON=$(echo "$ORIGINAL_BINARY" | node parser.js)

if ! echo "$PARSED_JSON" | nix run nixpkgs#jq . > /dev/null 2>&1; then
    echo "Error: parser.js did not output valid JSON."
    echo "$PARSED_JSON"
    exit 1
fi

RECONSTRUCTED_SERIAL=$(echo "$PARSED_JSON" | node encoder.js)
RECONSTRUCTED_BINARY=$(node decode.js "$RECONSTRUCTED_SERIAL")

# Get the length of the reconstructed binary
RECONSTRUCTED_LENGTH=${#RECONSTRUCTED_BINARY}

# Trim the original binary to the same length
TRIMMED_ORIGINAL_BINARY=${ORIGINAL_BINARY:0:$RECONSTRUCTED_LENGTH}

if [ "$TRIMMED_ORIGINAL_BINARY" == "$RECONSTRUCTED_BINARY" ]; then
    echo "Success: Binaries match!"
else
    echo "Failure: Binaries do not match."
    echo "Original (trimmed):"
    echo "$TRIMMED_ORIGINAL_BINARY"
    echo "Reconstructed Serial:"
    echo "$RECONSTRUCTED_SERIAL"
    echo "Reconstructed Binary:"
    echo "$RECONSTRUCTED_BINARY"
fi
