<script lang="ts">
    import { parseSerial } from '$lib/parser';
    import { encodeSerial } from '$lib/encoder';
    import type { Serial, Block, Part } from '$lib/types';
    import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2, SUBTYPE_NONE } from '$lib/types';
    import FormGroup from './FormGroup.svelte';
    import BlockComponent from './Block.svelte';
    import AddBlockMenu from './AddBlockMenu.svelte';
    import DebugView from './DebugView.svelte';
    import { browser } from '$app/environment';
    import { PartService } from '$lib/partService';
    import Worker from '$lib/worker/worker.js?worker';
    import { parseCustomFormat } from '$lib/custom_parser';

    let { serial, onSerialUpdate, isMaximized } = $props<{ serial: string; onSerialUpdate: (newSerial: string) => void; isMaximized: boolean; }>();
    let parsed: Serial = $state([]);
    let error: string | null = $state(null);
    let itemType = $state('UNKNOWN');
    let pastedContent = $state('');

    $effect(() => {
        if (pastedContent) {
            if (worker) {
                worker.postMessage({ type: 'parse_pasted_content', payload: pastedContent });
            }
        }
    });
    
    class DummyPartService {
        loadPartData() { return Promise.resolve(); }
        findPartName(part) { return null; }
        getParts(itemType) { return []; }
    }

    let partService = $state(new DummyPartService());
    let worker: Worker | undefined;

    if (browser) {
        worker = new Worker();
        partService = new PartService(worker);

        $effect(() => {
            partService.loadPartData();
        });

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'parsed_serial') {
                parsed = payload.parsed;
                itemType = detectItemType(parsed);
                error = payload.error;
            } else if (type === 'encoded_serial') {
                if (payload.serial !== serial) {
                    onSerialUpdate(payload.serial);
                }
                error = payload.error;
            } else if (type === 'pasted_content_parsed') {
                if (payload.error) {
                    error = payload.error;
                } else {
                    parsed = payload.parsed;
                    updateSerial();
                    error = null;
                    pastedContent = '';
                }
            }
        };
    }

    function detectItemType(parsed: Serial): string {
        if (!parsed || parsed.length === 0) {
            return 'UNKNOWN';
        }

        const firstBlock = parsed[0];
        if (firstBlock.token === TOK_VARINT) {
            switch (firstBlock.value) {
                case 254:
                    return 'VEX_CLASS_MOD';
                case 256:
                    return 'RAFA_CLASS_MOD';
                case 259:
                    return 'HARLOWE_CLASS_MOD';
            }
        }

        if (parsed.some(b => b.token === TOK_PART && b.part && b.part.subType === 244)) {
            return 'HEAVY_ORDNANCE';
        }
        if (parsed.some(b => b.token === TOK_PART && b.part && (b.part.subType === 246 || b.part.subType === 248 || b.part.subType === 237))) {
            return 'SHIELD';
        }
        if (parsed.some(b => b.token === TOK_PART && b.part && b.part.subType === 243)) {
            return 'REPKIT';
        }
        if (parsed.some(b => b.token === TOK_PART && b.part && b.part.subType === 245)) {
            return 'GRENADE';
        }

        return 'UNKNOWN'; // Default to unknown
    }

    function analyzeSerial() {
        if (!serial) {
            parsed = [];
            error = null;
            return;
        }
        if (worker) {
            worker.postMessage({ type: 'parse_serial', payload: serial });
        }
    }

    function updateSerial() {
        if (parsed) {
            const plainParsed = JSON.parse(JSON.stringify(parsed));
            worker.postMessage({ type: 'encode_serial', payload: plainParsed });
        }
    }

    $effect(() => {
        analyzeSerial();
    });

    function onParsedUpdate(newParsed: Serial) {
        parsed = newParsed;
        updateSerial();
    }

    function addBlock(index: number, token: number, part?: Part) {
        const newBlock: Block = { token };
        if (token === TOK_VARINT || token === TOK_VARBIT) {
            newBlock.value = 0;
        } else if (token === TOK_PART) {
            newBlock.part = part || { subType: SUBTYPE_NONE, index: 0 };
        }
        parsed.splice(index, 0, newBlock);
        parsed = parsed; // Trigger reactivity
        updateSerial();
    }

    function deleteBlock(index: number) {
        parsed.splice(index, 1);
        parsed = parsed; // Trigger reactivity
        updateSerial();
    }

    function updateBlockValue(block: Block, value: number) {
        if (block.token === TOK_VARINT || block.token === TOK_VARBIT) {
            block.value = value;
        }
        updateSerial();
    }

    function updatePartListValue(part: Part, index: number, value: number) {
        if (part.values) {
            part.values[index].value = value;
            updateSerial();
        }
    }

    let dragIndex = $state(-1);
    let isHorizontal = $state(false);

    function handleDragStart(index: number) {
        dragIndex = index;
    }

    function handleDrop(event: DragEvent, dropIndex: number) {
        event.preventDefault();
        if (dragIndex === -1) return;

        const draggedBlock = parsed[dragIndex];
        parsed.splice(dragIndex, 1);
        parsed.splice(dropIndex, 0, draggedBlock);
        parsed = parsed;
        dragIndex = -1;
        updateSerial();
    }

</script>



<FormGroup label="Serial Input">
    <textarea
        class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm min-h-[80px]'
        value={serial}
        oninput={(e) => onSerialUpdate(e.currentTarget.value)}
        placeholder="Paste serial here..."
    ></textarea>
</FormGroup>

<FormGroup label="Paste Deserialized JSON or Custom Format">
    <textarea
        class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm min-h-[80px]'
        bind:value={pastedContent}
        placeholder="Paste deserialized JSON or Custom Format here..."
    ></textarea>
</FormGroup>



{#if parsed.length > 0}
    <div class="mt-4 p-4 bg-gray-800 border border-gray-700 text-gray-200 rounded-md">
        <p>Detected Item Type: <span class="font-semibold text-green-400">{itemType}</span></p>
        <select onchange={(e) => itemType = e.currentTarget.value} class="mt-2 p-2 bg-gray-700 text-white rounded-md" value={itemType}>
            <option value="UNKNOWN">Select Item Type</option>
            <option value="WEAPON">Weapon</option>
            <option value="SHIELD">Shield</option>
            <option value="GRENADE">Grenade</option>
            <option value="REPKIT">Repkit</option>
            <option value="HEAVY_ORDNANCE">Heavy Ordnance</option>
            <option value="VEX_CLASS_MOD">Vex Class Mod</option>
            <option value="RAFA_CLASS_MOD">Rafa Class Mod</option>
            <option value="HARLOWE_CLASS_MOD">Harlowe Class Mod</option>
        </select>
    </div>
    <DebugView {parsed} {onParsedUpdate} {isMaximized} />

{/if}



{#if error}

    <div class="mt-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded-md">

        <p>{error}</p>

    </div>

{/if}



<div class="mt-4" role="list">
    <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold">Parsed Blocks</h3>
        <button onclick={() => isHorizontal = !isHorizontal} class="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700">
            {#if isHorizontal}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            {:else}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125A1.125 1.125 0 0 0 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
                </svg>
            {/if}
        </button>
    </div>

    <AddBlockMenu {partService} {itemType} onAdd={(token, part) => addBlock(0, token, part)} />

    <div class="mt-2" class:flex={isHorizontal} class:flex-wrap={isHorizontal} class:gap-2={isHorizontal} class:space-y-2={!isHorizontal}>
        {#each parsed as block, i}

            <div ondragover={(e) => e.preventDefault()} ondrop={(e) => handleDrop(e, i)} role="listitem">

                <BlockComponent

                    {block}
                    {partService}
                    {itemType}

                    onDelete={() => deleteBlock(i)}

                    onAddBefore={() => addBlock(i, TOK_SEP1)} 

                    onAddAfter={() => addBlock(i + 1, TOK_SEP1)}

                    onUpdateBlockValue={(value) => updateBlockValue(block, value)}

                    onUpdatePart={(part) => updateSerial()}

                    onUpdatePartList={(part, index, value) => updatePartListValue(part, index, value)}

                    index={i}

                    ondragstart={() => handleDragStart(i)}

                />

            </div>

        {/each}
    </div>

    <AddBlockMenu {partService} {itemType} onAdd={(token, part) => addBlock(parsed.length, token, part)} />

</div>
