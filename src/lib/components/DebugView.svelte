
<script lang="ts">
    import type { Serial, Block, Part } from '$lib/types';
    import { TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_VARBIT, TOK_PART, SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE } from '$lib/types';

    let { parsed, onParsedUpdate } = $props<{
        parsed: Serial;
        onParsedUpdate: (newParsed: Serial) => void;
    }>();

    let jsonString = $state(JSON.stringify(parsed, null, 2));
    let customString = $state(toCustomFormat(parsed));

    $effect(() => {
        jsonString = JSON.stringify(parsed, null, 2);
        customString = toCustomFormat(parsed);
    });

    function toCustomFormat(p: Serial): string {
        if (!p) return '';
        return p.map(block => {
            switch (block.token) {
                case TOK_SEP1:
                    return '|';
                case TOK_SEP2:
                    return ',';
                case TOK_VARINT:
                case TOK_VARBIT:
                    return `{${block.value}}`;
                case TOK_PART:
                    if (block.part) {
                        if (block.part.subType === SUBTYPE_NONE) {
                            return `{${block.part.index}}`;
                        }
                        if (block.part.subType === SUBTYPE_INT) {
                            return `{${block.part.index}:${block.part.value}}`;
                        }
                        if (block.part.subType === SUBTYPE_LIST) {
                            const values = block.part.values?.map(v => v.value).join(' ') || '';
                            return `{${block.part.index}:[${values}]}`;
                        }
                    }
                    return '{?}';
                default:
                    return '?';
            }
        }).join(' ');
    }

    function updateParsedFromJson() {
        try {
            const newParsed = JSON.parse(jsonString);
            onParsedUpdate(newParsed);
        } catch (e) {
            console.error("Invalid JSON", e);
        }
    }

    function parseCustomFormat(custom: string): Serial {
        const tokens = custom.split(' ');
        const newParsed: Serial = [];
        for (const token of tokens) {
            if (token === '|') {
                newParsed.push({ token: TOK_SEP1 });
            } else if (token === ',') {
                newParsed.push({ token: TOK_SEP2 });
            } else if (token.startsWith('{') && token.endsWith('}')) {
                const content = token.slice(1, -1);
                if (content.includes(':')) {
                    const [indexStr, valueStr] = content.split(':');
                    const index = parseInt(indexStr, 10);
                    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
                        const values = valueStr.slice(1, -1).split(' ').map(v => ({ type: TOK_VARINT, value: parseInt(v, 10) }));
                        newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_LIST, index, values } });
                    } else {
                        const value = parseInt(valueStr, 10);
                        newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_INT, index, value } });
                    }
                } else {
                    const value = parseInt(content, 10);
                    if (!isNaN(value)) {
                         newParsed.push({ token: TOK_VARINT, value });
                    } else {
                        const index = parseInt(content, 10);
                        if (!isNaN(index)) {
                            newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_NONE, index } });
                        }
                    }
                }
            }
        }
        return newParsed;
    }

    function updateParsedFromCustom() {
        try {
            const newParsed = parseCustomFormat(customString);
            onParsedUpdate(newParsed);
        } catch (e) {
            console.error("Invalid custom format", e);
        }
    }

</script>

<div class="mt-4 space-y-2">
    <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
        <div class="flex justify-between items-center">
            <h4 class="font-semibold">Custom Format</h4>
            <button class="py-1 px-3 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={updateParsedFromCustom}>Apply</button>
        </div>
        <textarea class="text-xs text-gray-300 bg-gray-900 p-2 rounded-md mt-2 w-full h-24 font-mono" bind:value={customString}></textarea>
    </div>
    <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
        <div class="flex justify-between items-center">
            <h4 class="font-semibold">JSON</h4>
            <button class="py-1 px-3 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={updateParsedFromJson}>Apply</button>
        </div>
        <textarea class="text-xs text-gray-300 bg-gray-900 p-2 rounded-md mt-2 w-full h-48 font-mono" bind:value={jsonString}></textarea>
    </div>
</div>
