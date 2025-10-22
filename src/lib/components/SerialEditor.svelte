<script lang="ts">
    import { parseSerial } from '$lib/parser';
    import { encodeSerial } from '$lib/encoder';
    import type { Serial, Block, Part } from '$lib/types';
    import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2, SUBTYPE_NONE } from '$lib/types';
    import FormGroup from './FormGroup.svelte';
    import BlockComponent from './Block.svelte';
    import AddBlockMenu from './AddBlockMenu.svelte';
    import DebugView from './DebugView.svelte';

    let { serial, onSerialUpdate, onMaximize, isMaximized } = $props<{ serial: string; onSerialUpdate: (newSerial: string) => void; onMaximize: () => void; isMaximized: boolean; }>();
    let parsed: Serial = $state([]);
    let error: string | null = $state(null);

    function analyzeSerial() {
        if (!serial) {
            parsed = [];
            error = null;
            return;
        }
        try {
            parsed = parseSerial(serial);
            error = null;
        } catch (e: any) {
            parsed = [];
            error = e.message;
        }
    }

    function updateSerial() {
        if (parsed) {
            try {
                const newSerial = encodeSerial(parsed);
                onSerialUpdate(newSerial);
            } catch (e: any) {
                error = e.message;
            }
        }
    }

    $effect(() => {
        analyzeSerial();
    });

    function onParsedUpdate(newParsed: Serial) {
        parsed = newParsed;
        updateSerial();
    }

    function addBlock(index: number, token: number) {
        const newBlock: Block = { token };
        if (token === TOK_VARINT || token === TOK_VARBIT) {
            newBlock.value = 0;
        } else if (token === TOK_PART) {
            newBlock.part = { subType: SUBTYPE_NONE, index: 0 };
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

    let dragIndex = -1;

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

    let copyUrlText = $state('Copy URL');
    async function copyUrl() {
        if (!serial) return;
        const url = new URL(window.location.href);
        url.searchParams.set('serial', serial);
        await navigator.clipboard.writeText(url.toString());
        copyUrlText = 'Copied!';
        setTimeout(() => {
            copyUrlText = 'Copy URL';
        }, 2000);
    }

</script>



<FormGroup label="Serial Input">
    <div class="flex items-start gap-2">
        <textarea
            class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm min-h-[80px]'
            value={serial}
            oninput={(e) => onSerialUpdate(e.currentTarget.value)}
            placeholder="Paste serial here..."
        ></textarea>
        <button onclick={copyUrl} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all h-full">
            {copyUrlText}
        </button>
        <button onclick={onMaximize} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all h-full">
            {isMaximized ? 'Minimize' : 'Maximize'}
        </button>
    </div>
</FormGroup>



{#if parsed.length > 0}

    <DebugView {parsed} {onParsedUpdate} />

{/if}



{#if error}

    <div class="mt-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded-md">

        <p>{error}</p>

    </div>

{/if}



<div class="mt-4 space-y-2" role="list">

    <h3 class="text-lg font-semibold">Parsed Blocks</h3>

    <AddBlockMenu onAdd={(token) => addBlock(0, token)} />

    {#each parsed as block, i}

        <div ondragover={(e) => e.preventDefault()} ondrop={(e) => handleDrop(e, i)} role="listitem">

            <BlockComponent

                {block}

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

    <AddBlockMenu onAdd={(token) => addBlock(parsed.length, token)} />

</div>
