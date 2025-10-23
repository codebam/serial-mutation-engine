# @codebam/u-serial

[source code](https://github.com/codebam/serial-mutation-engine)

A library for parsing and encoding U-Serials.

## Installation

```bash
npm install @codebam/u-serial
```

## Usage

### `parseSerial`

Parses a Base85 encoded serial string into a serial object.

```javascript
import { parseSerial } from '@codebam/u-serial';

const serialString = '@U4V5A0l*j.E6c';
const serialObject = parseSerial(serialString);
console.log(serialObject);
```

### `encodeSerial`

Encodes a serial object into a Base85 encoded serial string.

```javascript
import { encodeSerial } from '@codebam/u-serial';

const serialObject = [
  { token: 4, value: 1 },
  { token: 4, value: 100 },
  { token: 4, value: 2 },
  { token: 0 },
  { token: 5, part: { subType: 0, index: 1 } },
  { token: 5, part: { subType: 0, index: 8 } },
  { token: 0 }
];
const serialString = encodeSerial(serialObject);
console.log(serialString); // @U4V5A0l*j.E6c
```

### `base85_to_deserialized`

Converts a Base85 encoded serial string to a human-readable custom format.

```javascript
import { base85_to_deserialized } from '@codebam/u-serial';

const serialString = '@U4V5A0l*j.E6c';
const deserialized = base85_to_deserialized(serialString);
console.log(deserialized); // 1 100 2 | {1} {8} |
```

### `deserialized_to_base85`

Converts a human-readable custom format string to a Base85 encoded serial string.

```javascript
import { deserialized_to_base85 } from '@codebam/u-serial';

const deserialized = '1 100 2 | {1} {8} |';
const serialString = deserialized_to_base85(deserialized);
console.log(serialString); // @U4V5A0l*j.E6c
```

## CLI Usage

You can use the CLI with `npx @codebam/u-serial`.

**Decode a serial:**
```bash
npx @codebam/u-serial -d "@U4V5A0l*j.E6c"
```

**Encode a deserialized string:**
```bash
npx @codebam/u-serial -e "1 100 2 | {1} {8} |"
```

**Piping a serial for decoding:**
```bash
echo "@U4V5A0l*j.E6c" | npx @codebam/u-serial
```

**Piping a deserialized string for encoding:**
```bash
echo "1 100 2 | {1} {8} |" | npx @codebam/u-serial -e
```

## CDN Usage

You can directly use the library in a standalone HTML page via a CDN like `jsdelivr`.

```html
<script type="module">
    import { base85_to_deserialized, deserialized_to_base85 } from 'https://cdn.jsdelivr.net/npm/@codebam/u-serial@latest/dist/api.js';
    // your code goes here
</script>
```