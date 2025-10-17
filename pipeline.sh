#!/usr/bin/env bash
SERIAL="$1"
node decode.js "$SERIAL" | node chunk.js