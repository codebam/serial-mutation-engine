# @codebam/u-serial

[source code](https://github.com/codebam/serial-mutation-engine)

A library for parsing and encoding U-Serials.

## Installation

```bash
npm install @codebam/u-serial
```

## Usage

**Note:** As of version 0.0.24, `parseSerial`, `serialToCustomFormat`, and `customFormatToSerial` are now asynchronous and return a `Promise`. You will need to use `await` or `.then()` to get the result.

### `parseSerial`

Parses a Base85 encoded serial string into a serial object.

```javascript
import { parseSerial } from '@codebam/u-serial';

const serialString =
	'@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r@!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrp#^w?L';
const serialObject = await parseSerial(serialString);
console.log(serialObject);
// [
// 	{ token: 4, value: 25 },
// 	{ token: 1 },
// 	{ token: 4, value: 0 },
// 	{ token: 1 },
// 	{ token: 4, value: 1 },
// 	{ token: 1 },
// 	{ token: 4, value: 50 },
// 	{ token: 0 },
// 	{ token: 4, value: 2 },
// 	{ token: 1 },
// 	{ token: 4, value: 0 },
// 	{ token: 0 },
// 	{ token: 0 },
// 	{ token: 5, part: { subType: 0, index: 59 } },
// 	{ token: 5, part: { subType: 0, index: 2 } },
// 	{ token: 5, part: { subType: 0, index: 4 } },
// 	{ token: 5, part: { subType: 1, index: 1, value: 12 } },
// 	{ token: 5, part: { subType: 2, index: 8, values: [ { type: 4, value: 14 } ] } },
// 	// removed unneccessary data
// 	{ token: 0 }
// ]
```

To parse (or encode) many serials you can process them asyncronously.
In this example I write them to a JSON file.

This script requires Node.JS and will not work in a browser.

```javascript
import { parseSerial } from '@codebam/u-serial';
import * as fs from fs; // nodejs
import * as path from 'path'; // nodejs

const serials_path = path.join(__dirname, './serials.txt');
const serials_text = fs.readFileSync(serials_path, 'utf-8');
const serials = serials_text.split('\n').filter((s) => s.length > 0);
const deserialized = Promise.all(serials.map(parseSerial));
const deserialized_path = path.join(__dirname, './deserialized.json');

fs.writeFileSync(deserialized_path, JSON.stringify(await deserialized, null, 2));
```

### `encodeSerial`

Encodes a serial object into a Base85 encoded serial string.

```javascript
import { encodeSerial } from '@codebam/u-serial';

const serialObject = [
	{ token: 4, value: 25 },
	{ token: 1 },
	{ token: 4, value: 0 },
	{ token: 1 },
	{ token: 4, value: 1 },
	{ token: 1 },
	{ token: 4, value: 50 },
	{ token: 0 },
	{ token: 4, value: 2 },
	{ token: 1 },
	{ token: 4, value: 0 },
	{ token: 0 },
	{ token: 0 },
	{ token: 5, part: { subType: 0, index: 59 } },
	{ token: 5, part: { subType: 0, index: 2 } },
	{ token: 5, part: { subType: 0, index: 4 } },
	{ token: 5, part: { subType: 1, index: 1, value: 12 } },
	{ token: 5, part: { subType: 2, index: 8, values: [{ type: 4, value: 14 }] } },
	// removed unneccessary data
	{ token: 0 }
];
const serialString = await encodeSerial(serialObject);
console.log(serialString);
```

### `serialToCustomFormat`

Converts a Base85 encoded serial string to a human-readable custom format.

```javascript
import { serialToCustomFormat } from '@codebam/u-serial';

const serialString =
	'@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r@!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrp#^w?L';
const deserialized = await serialToCustomFormat(serialString);
console.log(deserialized); // 25, 0, 1, 50| 2, 0|| {59} {2} {3} {4} {6} {1:12} {20} {66} {65} {73} {16} {32} {16} {51} {65} {73} {65} {73} {65} {73} {65} {73} {44} {4} {43} {68} {65} {66} {16} {27} {31} {32} {44} {54} {4} {4} {44} {31} {24} {52} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {3:58} {5} {5} {5} {5} {5} {5} {5} {5} {5} {3} {3} {3} {3} {3} {3} {8:[14 14 14 14 14 2 14 14 14 14 14 14 6 2 14 14 14 14 14 14]}| "c", 71|
```

### `customFormatToSerial`

Converts a human-readable custom format string to a Base85 encoded serial string.

```javascript
import { customFormatToSerial } from '@codebam/u-serial';

const deserialized =
	'25, 0, 1, 50| 2, 0|| {59} {2} {3} {4} {6} {1:12} {20} {66} {65} {73} {16} {32} {16} {51} {65} {73} {65} {73} {65} {73} {65} {73} {44} {4} {43} {68} {65} {66} {16} {27} {31} {32} {44} {54} {4} {4} {44} {31} {24} {52} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {3:58} {5} {5} {5} {5} {5} {5} {5} {5} {5} {3} {3} {3} {3} {3} {3} {8:[14 14 14 14 14 2 14 14 14 14 14 14 6 2 14 14 14 14 14 14]}| "c", 71|';
const serialString = await customFormatToSerial(deserialized);
console.log(serialString); // @Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r@!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrp#^w?L
```

## CLI Usage

You can use the CLI with `npx @codebam/u-serial`.

**Decode a serial:**

```bash
npx @codebam/u-serial -d '@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r@!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrp#^w?L'
```

**Encode a deserialized string:**

```bash
npx @codebam/u-serial -e '25, 0, 1, 50| 2, 0|| {59} {2} {3} {4} {6} {1:12} {20} {66} {65} {73} {16} {32} {16} {51} {65} {73} {65} {73} {65} {73} {65} {73} {44} {4} {43} {68} {65} {66} {16} {27} {31} {32} {44} {54} {4} {4} {44} {31} {24} {52} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {43} {3:58} {5} {5} {5} {5} {5} {5} {5} {5} {5} {3} {3} {3} {3} {3} {3} {8:[14 14 14 14 14 2 14 14 14 14 14 14 6 2 14 14 14 14 14 14]}| "c", 71|'
```

**Piping a serial for decoding:**

```bash
echo "serial" | npx @codebam/u-serial
```

**Piping a deserialized string for encoding:**

```bash
echo "deserialized" | npx @codebam/u-serial -e
```

## CDN Usage

You can directly use the library in a standalone HTML page via a CDN like `jsdelivr`.

```html
<script type="module">
	import {
		serialToCustomFormat,
		customFormatToSerial
	} from 'https://cdn.jsdelivr.net/npm/@codebam/u-serial@latest/dist/api.js';

	async function run() {
		const serialString = 'serial';
		const deserialized = await serialToCustomFormat(serialString);
		console.log(deserialized);

		const customFormat = 'deserialized';
		const encoded = await customFormatToSerial(customFormat);
		console.log(encoded);
	}

	run();
</script>
```
