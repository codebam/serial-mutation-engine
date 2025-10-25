import { describe, it, expect } from 'vitest';
import { parseSerial } from './parser.js';
import { toCustomFormat } from './custom_parser.js';
import { TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_PART, TOK_STRING, SUBTYPE_NONE, SUBTYPE_INT } from './types.js';

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
