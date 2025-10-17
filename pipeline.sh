#!/usr/bin/env bash
SERIAL="$1"
ORIGINAL_BINARY=$(node decode.js "$SERIAL")
PARSED_JSON=$(printf "%s" "$ORIGINAL_BINARY" | node parser.js)
RECONSTRUCTED_BINARY=$(echo "$PARSED_JSON" | node encoder.js)

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
    echo "Reconstructed:"
    echo "$RECONSTRUCTED_BINARY"
fi