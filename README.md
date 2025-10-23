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