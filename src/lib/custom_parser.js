import { parseSerial } from './parser.js';
import { encodeSerial } from './encoder.js';
import { TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_VARBIT, TOK_PART, SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE } from './types.js';
function toCustomFormat(p) {
    if (!p)
        return '';
    var firstPartIndex = p.findIndex(function (block) { return block.token === TOK_PART; });
    return p.map(function (block, index) {
        var _a;
        switch (block.token) {
            case TOK_SEP1:
                return '|';
            case TOK_SEP2:
                return ',';
            case TOK_VARINT:
            case TOK_VARBIT:
                if (firstPartIndex === -1 || index < firstPartIndex) {
                    return block.value;
                }
                return "{".concat(block.value, "}");
            case TOK_PART:
                if (block.part) {
                    if (block.part.subType === SUBTYPE_NONE) {
                        return "{".concat(block.part.index, "}");
                    }
                    if (block.part.subType === SUBTYPE_INT) {
                        return "{".concat(block.part.index, ":").concat(block.part.value, "}");
                    }
                    if (block.part.subType === SUBTYPE_LIST) {
                        var values = ((_a = block.part.values) === null || _a === void 0 ? void 0 : _a.map(function (v) { return v.value; }).join(' ')) || '';
                        return "{".concat(block.part.index, ":[").concat(values, "]}");
                    }
                }
                return '{?}';
            default:
                return '?';
        }
    }).join('');
}
function parseCustomFormat(custom) {
    var tokens = custom.split(' ');
    var newParsed = [];
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var token = tokens_1[_i];
        if (token === '|') {
            newParsed.push({ token: TOK_SEP1 });
        }
        else if (token === ',') {
            newParsed.push({ token: TOK_SEP2 });
        }
        else if (token.startsWith('{') && token.endsWith('}')) {
            var content = token.slice(1, -1);
            if (content.includes(':')) {
                var _a = content.split(':'), indexStr = _a[0], valueStr = _a[1];
                var index = parseInt(indexStr, 10);
                if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
                    var valuesStr = valueStr.slice(1, -1);
                    var values = valuesStr !== '' ? valuesStr.split(' ').map(function (v) { return ({ type: TOK_VARINT, value: parseInt(v, 10) }); }) : [];
                    newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_LIST, index: index, values: values } });
                }
                else {
                    var value = parseInt(valueStr, 10);
                    newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_INT, index: index, value: value } });
                }
            }
            else {
                var value = parseInt(content, 10);
                if (!isNaN(value)) {
                    newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_NONE, index: value } });
                }
            }
        }
        else {
            var value = parseInt(token, 10);
            if (!isNaN(value)) {
                newParsed.push({ token: TOK_VARINT, value: value });
            }
        }
    }
    return newParsed;
}
export function base85_to_deserialized(serial) {
    var parsed = parseSerial(serial);
    return toCustomFormat(parsed);
}
export function deserialized_to_base85(custom) {
    var parsed = parseCustomFormat(custom);
    return encodeSerial(parsed);
}
