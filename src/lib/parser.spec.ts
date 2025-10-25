import { describe, it, expect } from 'vitest';
import { parseSerial } from './parser.js';
import { toCustomFormat } from './custom_parser.js';
import { TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_PART, TOK_STRING, SUBTYPE_NONE, SUBTYPE_INT } from './types.js';
import { Bitstream } from './bitstream';

// Copied from encoder.ts to allow testing of arbitrary binary strings.
const BASE85_ALPHABET =
	'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

function encodeBase85(bytes: Uint8Array): string {
	let encoded = '';
	let i = 0;

	for (i = 0; i + 3 < bytes.length; i += 4) {
		let value =
			((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
		let block = '';
		for (let j = 0; j < 5; j++) {
			block = BASE85_ALPHABET[value % 85] + block;
			value = Math.floor(value / 85);
		}
		encoded += block;
	}

	const remaining = bytes.length - i;
	if (remaining > 0) {
		const temp = new Uint8Array(4);
		for (let j = 0; j < remaining; j++) {
			temp[j] = bytes[i + j];
		}

		let value = ((temp[0] << 24) | (temp[1] << 16) | (temp[2] << 8) | temp[3]) >>> 0;
		let block = '';
		for (let j = 0; j < 5; j++) {
			block = BASE85_ALPHABET[value % 85] + block;
			value = Math.floor(value / 85);
		}
		encoded += block.substring(0, remaining + 1);
	}

	return '@U' + encoded;
}

function mirrorBytes(bytes: Uint8Array): Uint8Array {
	const mirrored = new Uint8Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		let mirroredByte = 0;
		for (let j = 0; j < 8; j++) {
			mirroredByte |= ((byte >> j) & 1) << (7 - j);
		}
		mirrored[i] = mirroredByte;
	}
	return mirrored;
}
// End of copied functions

describe('Binary Encoding', () => {
    it('should encode a simple binary string to a base85 serial', () => {
      const binaryString = '00100001111100110000110001100110111000011110011111001111011011111101100100111111101001001110000110100111110101111111011100011000000001100100000110001001110000010001000011000000000001011100111000010000000000';
      const chunks = binaryString.match(/.{8}/g);
      const bytes = Uint8Array.from(chunks.map(chunk => parseInt(chunk, 2)));
      const bitstream = new Bitstream(bytes);
      const expectedSerial = '@U1O';
      // just to make sure we fail
  
      const mirrored = mirrorBytes(bytes);
      const serial = encodeBase85(mirrored);
  
      expect(serial).toEqual(expectedSerial);
    });
  });

describe('Phosphene Skin Deserialization', () => {
    const skinTests = [
        {
            name: "ORIGINAL L50 Lurking Cuca",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFnx",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}|",
        },
        {
            name: "Skin: Solar Flair",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vGE1",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 110|",
        },
        {
            name: "Skin: Carcade Shooter",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vB?G",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 105|",
        },
        {
            name: "Skin: Itty Bitty Kitty Committee",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vB3r",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 104|",
        },
        {
            name: "Skin: With the grain",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vGD}",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 94|",
        },
        {
            name: "Skin: The System",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vAG2",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 87|",
        },
        {
            name: "Skin: Devourer",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_v9Sd",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 86|",
        },
        {
            name: "Skin: Soused",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_v5^G",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 82|",
        },
        {
            name: "Skin: Bird of Prey",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_v55r",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 81|",
        },
        {
            name: "Skin: Eternal Defender",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vH1i",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 79|",
        },
        {
            name: "Skin: Weirdo",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vGD`",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 78|",
        },
        {
            name: "Skin: Smiley",
            serial: "@UgbV{rFme!KI4sa#RG}W#sX3@xsFsL_vFQW",
            deserialized: "3, 0, 1, 50| 2, 1292|| {95} {2} {7} {14} {25} {42} {70}| \"c\", 77|",
        },
    ];

    for (const tt of skinTests) {
        it(`deserializes ${tt.name}`, () => {
            const parsedSerial = parseSerial(tt.serial);
            const customFormat = toCustomFormat(parsedSerial);
            expect(customFormat).toEqual(tt.deserialized);
        });
    }

    const phospheneSkinTests = [
        {
            name: "Phosphene Skin 1",
            serialNormal: "@UgdhV<Fme!Kq%_bvRG/))sC1~Bs7#GP%/V4i%/iV`?L+_",
            serialPhosphene: "@UgdhV<Fme!Kq%_bvRG/))sC1~Bs7#GP%/V4i%/iV`?L<6`4Fd",
        },
        {
            name: "Phosphene Skin 2",
            serialNormal: "@Ugydj=2}TYgT#^p$Llx>!jY`yzp?s*9sF/pisFkQq?Ln17jY920r9%zj00",
            serialPhosphene: "@Ugydj=2}TYgT#^p$Llx>!jY`yzp?s*9sF/pisFkQq?Ln17jY920r9%zj01sn>1p",
        },
    ];

    for (const tt of phospheneSkinTests) {
        it(`deserializes ${tt.name} (normal)`, () => {
            expect(() => parseSerial(tt.serialNormal)).not.toThrow();
        });

        it(`deserializes ${tt.name} (phosphene)`, () => {
            expect(() => parseSerial(tt.serialPhosphene)).not.toThrow();
        });
    }

    it('should handle strings with special characters', () => {
        const customFormat = '"my name is \\"The Boss\\" and I use \\\\ in paths"|';
        const parsedSerial = parseSerial("@Uglo~xgWTbE8I+!bL{xMcBz({3B2d^(1/>oDc^Sk7rQINSn2w$U");
        const reserialized = toCustomFormat(parsedSerial);
        expect(reserialized).toEqual(customFormat);
    });
});
