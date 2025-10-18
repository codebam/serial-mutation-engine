# BL4 Serial Reverse Engineering Knowledge Base

This document summarizes the findings from the community's reverse engineering efforts.

## Serial Structure

- All BL4 serials start with `@U` prefix.
- The rest of the serial is Base85 encoded using a custom alphabet.
- After Base85 decoding, each byte is bit-reversed.

## Serial Classification

There are two main types of serials:

- **TYPE A**: Binary starts with `0010000100`. Uses VarInt encoding for level.
- **TYPE B**: Binary starts with `0010000110`. Uses fixed 8-bit level encoding.

The 9th bit indicates enhanced/special items.

## Header

- The header is not a fixed size.
- A `0x22` marker in the first 12 bytes indicates a VarInt structure.
- The byte after the `0x22` marker indicates the header size.

## Level Detection

- **TYPE A (VarInt)**: Uses Base-128 LEB128 style encoding. 5-bit blocks with a continuation bit.
- **TYPE B (Fixed)**: Uses a standard marker pattern (`000000`) followed by an 8-bit value.
- Some levels use `level + 48` encoding.

## Manufacturer Identification

Manufacturers are identified by specific hex patterns in the serial.

- **Maliwan**: `212B0601`, `21270601`, `2114C032`
- **Vladof**: `21130601`, `211B0601`, `21030601`
- **Daedalus**: `210B0601`, `212CC032`, `2110C032`
- **Torgue**: `210CC032`, `2118C032`, `21230601`
- **Tediore**: `211CC032`, `2128C032`, `2134C032`
- **Ripper**: `21330601`, `2138C032`
- **Jakobs**: `2124C032`, `21070601`, `2130C032`
- **Order**: `21170601`, `2108C032`, `213CC032`
- **Unknown**: `211FE601`, `213FE601`

## Safe Serial Modification

- **Danger Zone**: Everything before the first `u~Q` marker.
- **Safe Zone**: After the first `u~Q` marker.
- **Trailer**: Last 8-12 characters must be preserved.