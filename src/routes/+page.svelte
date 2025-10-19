<script lang="ts">
    import { writable } from 'svelte/store';
    import Accordion from '$lib/components/Accordion.svelte';
    import Dropdown from '$lib/components/Dropdown.svelte';
    import FormGroup from '$lib/components/FormGroup.svelte';
    import MutableRangeSelector from '$lib/components/MutableRangeSelector.svelte';
    import SerialEditor from '$lib/components/SerialEditor.svelte';
    import { Chart, registerables } from 'chart.js';
    Chart.register(...registerables);

    import type { State } from '$lib/types';

    const appState = writable<State>({
        repository: '',
        seed: '@Uge9B?m/)}}!ffxLNwtrrhUgJFvP19)9>F7c1drg69->2ZNDt8=I>e4x5g)=u;D`>fBRx?3?tmf{sYpdCQjv<(7NJN*DpHY(R3rc',
        itemType: 'GUN',
        counts: { new: 10000, newV1: 0, newV2: 0, newV3: 0, tg1: 0, tg2: 0, tg3: 0, tg4: 0 },
        rules: {
            targetOffset: 200,
            mutableStart: 13,
            mutableEnd: 13,
            minChunk: 3,
            maxChunk: 7,
            targetChunk: 5,
            minPart: 4,
            maxPart: 8,
            legendaryChance: 100,
        },
        generateStats: false,
        debugMode: false,
    });

    const statusMessage = writable('Ready to generate.');
    const progress = writable(0);
    const isGenerating = writable(false);
    const outputYaml = writable('');
    const fullYaml = writable('');
    const filteredYaml = writable('');
    const baseYaml = writable('');

    const serialEditors = writable([
        {
            id: 1,
            serial: '',
            merged: false
        },
    ]);
    let nextSerialEditorId = 2;

    function addSerialEditor() {
        $serialEditors = [...$serialEditors, { id: nextSerialEditorId++, serial: '', merged: false }];
    }

    function removeSerialEditor(id: number) {
        $serialEditors = $serialEditors.filter((editor) => editor.id !== id);
    }

    function updateEditorSerial(editorId: number, newSerial: string) {
        const editor = $serialEditors.find(e => e.id === editorId);
        if (editor) {
            editor.serial = newSerial;
            editor.merged = false;
            $serialEditors = $serialEditors;
        }
    }

    const searchTerm = writable('');
    const copyText = writable('Copy');

    let worker: Worker;

    let chart: Chart;

    $effect(() => {
        async function setup() {
            const storedBaseYaml = localStorage.getItem('baseYaml');
            if (storedBaseYaml) {
                $baseYaml = storedBaseYaml;
                $statusMessage = 'Restored last used base YAML.';
            }

            const MyWorker = await import('$lib/worker/worker.js?worker');
            worker = new MyWorker.default();

            const ctx = document.getElementById('statsChart') as HTMLCanvasElement;
            chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Part Frequency',
                        data: [],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            worker.onmessage = (e) => {
                const { type, payload } = e.data;
                switch (type) {
                    case 'progress':
                        $progress = (payload.processed / payload.total) * 100;
                        if (payload.stage === 'stats') {
                            $statusMessage = `Generating Statistics... ${Math.round($progress)}%`;
                        } else {
                            $statusMessage = `Generating... ${payload.processed.toLocaleString()} / ${payload.total.toLocaleString()}`;
                        }
                        break;
                    case 'stats_complete':
                        updateChart(payload.chartData);
                        break;
                    case 'complete':
                        $isGenerating = false;
                        $outputYaml = payload.truncatedYaml;
                        $fullYaml = payload.yaml;
                        $filteredYaml = '';
                        $statusMessage = `✅ Complete! ${payload.uniqueCount.toLocaleString()} unique serials generated.`;
                        break;
                    case 'error':
                        $isGenerating = false;
                        $statusMessage = `❌ ERROR: ${payload.message}`;
                        break;
                }
            };
        }

        setup();

        return () => {
            worker.terminate();
        };
    });

    function updateChart(chartData: { labels: string[]; data: number[] }) {
        if (!chart) return;
        chart.data.labels = chartData.labels;
        chart.data.datasets[0].data = chartData.data;
        chart.update();
    }

    function truncate(str: string, maxLines = 50): string {
        if (!str) return '';
        const lines = str.split('\n');
        if (lines.length > maxLines) {
            return lines.slice(0, maxLines).join('\n') + `\n\n... and ${lines.length - maxLines} more lines`;
        }
        return str;
    }

    async function searchSerials() {
        if (!$searchTerm) return;
        $statusMessage = 'Searching...';
        try {
            const response = await fetch(`https://kamer-tuintje.be/BL4/BSE/api.php?search=${encodeURIComponent($searchTerm)}&action=records&sort_by=id&sort_order=ASC`);
            const data = await response.json();
            const serials = data.map((item: any) => item.serial).join('\n');
            $appState.repository = $appState.repository ? `${$appState.repository}\n${serials}` : serials;
            $statusMessage = `Found ${data.length} serials.`;
        } catch (error) {
            console.error('Failed to search serials:', error);
            $statusMessage = '❌ ERROR: Failed to search serials.';
        }
    }

    function startGeneration() {
        $isGenerating = true;
        $statusMessage = 'Sending job...';
        $progress = 0;
        $filteredYaml = '';
        const config = {
            seed: $appState.seed,
            itemType: $appState.itemType,
            repository: $appState.repository,
            newCount: $appState.counts.new,
            newV1Count: $appState.counts.newV1,
            newV2Count: $appState.counts.newV2,
            newV3Count: $appState.counts.newV3,
            tg1Count: $appState.counts.tg1,
            tg2Count: $appState.counts.tg2,
            tg3Count: $appState.counts.tg3,
            tg4Count: $appState.counts.tg4,
            minChunkSize: $appState.rules.minChunk,
            maxChunkSize: $appState.rules.maxChunk,
            targetChunkSize: $appState.rules.targetChunk,
            targetOffset: $appState.rules.targetOffset,
            minPartSize: $appState.rules.minPart,
            maxPartSize: $appState.rules.maxPart,
            legendaryChance: $appState.rules.legendaryChance,
            mutableStart: $appState.rules.mutableStart,
            mutableEnd: $appState.rules.mutableEnd,
            gpuBatchSize: 250000,
            generateStats: $appState.generateStats,
            debugMode: $appState.debugMode,
        };
        worker.postMessage({ type: 'generate', payload: config });
    }

    function resetForm() {
        if (confirm('Are you sure you want to reset all settings to their original defaults?')) {
            $appState = {
                repository: '',
                seed: '@Uge9B?m/)}}!ffxLNwtrrhUgJFvP19)9>F7c1drg69->2ZNDt8=I>e4x5g)=u;D`>fBRx?3?tmf{sYpdCQjv<(7NJN*DpHY(R3rc',
                itemType: 'GUN',
                counts: { new: 10000, newV1: 0, newV2: 0, newV3: 0, tg1: 0, tg2: 0, tg3: 0, tg4: 0 },
                rules: {
                    targetOffset: 200,
                    mutableStart: 13,
                    mutableEnd: 13,
                    minChunk: 3,
                    maxChunk: 7,
                    targetChunk: 5,
                    minPart: 4,
                    maxPart: 8,
                    legendaryChance: 100,
                },
                generateStats: false,
                debugMode: false,
            };
            $outputYaml = '';
            $fullYaml = '';
            $filteredYaml = '';
            $statusMessage = 'Settings have been reset to original defaults.';
        }
    }

    async function copyToClipboard() {
        const contentToCopy = $filteredYaml || $fullYaml;
        if (contentToCopy) {
            await navigator.clipboard.writeText(contentToCopy);
            $copyText = 'Copied!';
            setTimeout(() => ($copyText = 'Copy'), 2000);
        }
    }


    function downloadYAML() {
        const contentToDownload = $outputYaml || $filteredYaml || $fullYaml;
        if (!contentToDownload) return;
        const blob = new Blob([contentToDownload], { type: 'text/yaml;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'merged_serials.yaml';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function saveState() {
        try {
            const jsonStr = JSON.stringify($appState, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'serial-generator-state.json';
            link.click();
            URL.revokeObjectURL(link.href);
            $statusMessage = 'State saved successfully.';
        } catch (error) {
            console.error('Failed to save state:', error);
            $statusMessage = '❌ ERROR: Failed to save state.';
        }
    }

    function restoreState(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const restoredState = JSON.parse(reader.result as string);
                $appState = { ...$appState, ...restoredState };
                $statusMessage = 'State restored successfully.';
            } catch (error) {
                console.error('Failed to restore state:', error);
                $statusMessage = '❌ ERROR: Failed to restore state.';
            }
        };
        reader.readAsText(file);
    }

    function selectBaseYaml(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            return;
        }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                $baseYaml = reader.result as string;
                localStorage.setItem('baseYaml', $baseYaml);
                $statusMessage = 'Base YAML loaded successfully.';
                $serialEditors.forEach(e => e.merged = false);
                $serialEditors = $serialEditors;
            } catch (error) {
                console.error('Failed to load base YAML:', error);
                $statusMessage = '❌ ERROR: Failed to load base YAML.';
            }
        };
        reader.readAsText(file);
    }

    function importAndMerge() {
        if (!$baseYaml) {
            $statusMessage = 'Please select a base YAML file first.';
            return;
        }

        const editorToMerge = $serialEditors.find(e => e.serial && !e.merged);

        if (!editorToMerge) {
            $statusMessage = 'No unmerged serials found to merge.';
            return;
        }

        const serialToInsert = editorToMerge.serial;
        let currentYaml = $outputYaml || $baseYaml;

        if (currentYaml.includes('backpack: null')) {
            const backpackLine = currentYaml.split('\n').find(line => line.trim() === 'backpack: null');
            const indent = ' '.repeat(backpackLine!.search(/\S/));
            const newBackpackString = [
                `${indent}backpack:`,
                `${indent}  slot_0:`,
                `${indent}    serial: '${serialToInsert}'`
            ].join('\n');
            $outputYaml = currentYaml.replace(backpackLine!, newBackpackString);
            editorToMerge.merged = true;
            $serialEditors = $serialEditors;
            $statusMessage = `✅ Merged serial from Editor #${editorToMerge.id} into new backpack.`;
        } else if (currentYaml.includes('backpack:')) {
            let lines = currentYaml.split('\n');
            let backpackIndex = -1;
            let backpackIndent = -1;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === 'backpack:') {
                    backpackIndex = i;
                    backpackIndent = lines[i].search(/\S/);
                    break;
                }
            }

            let lastSlot = -1;
            let endOfBackpackIndex = -1;

            for (let i = backpackIndex + 1; i < lines.length; i++) {
                if (lines[i].trim() !== '' && lines[i].search(/\S/) <= backpackIndent) {
                    endOfBackpackIndex = i;
                    break;
                }
                const slotMatch = lines[i].match(/^\s*slot_(\d+):/);
                if (slotMatch) {
                    lastSlot = Math.max(lastSlot, parseInt(slotMatch[1], 10));
                }
            }
            if (endOfBackpackIndex === -1) {
                endOfBackpackIndex = lines.length;
            }

            const nextSlotNum = lastSlot + 1;
            const indent = ' '.repeat(backpackIndent + 2);
            const newSlotLines = [
                `${indent}slot_${nextSlotNum}:`,
                `${indent}  serial: '${serialToInsert}'`
            ];

            lines.splice(endOfBackpackIndex, 0, ...newSlotLines);
            $outputYaml = lines.join('\n');
            editorToMerge.merged = true;
            $serialEditors = $serialEditors;
            $statusMessage = `✅ Merged serial from Editor #${editorToMerge.id} into slot_${nextSlotNum}.`;
        } else {
            const newStructure = [
                'state:',
                '  inventory:',
                '    items:',
                '      backpack:',
                '        slot_0:',
                `          serial: '${serialToInsert}'`
            ];
            $outputYaml = (currentYaml.trim() === '' ? '' : currentYaml + '\n') + newStructure.join('\n');
            editorToMerge.merged = true;
            $serialEditors = $serialEditors;
            $statusMessage = '✅ Created new backpack structure and merged serial.';
        }
    }

    const inputClasses =
        'w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm';
    const btnClasses = {
        primary: 
            'py-3 px-4 w-full font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed',
        secondary: 
            'py-3 px-4 w-full font-semibold text-gray-300 bg-gray-600 rounded-md hover:bg-gray-700 transition-all disabled:opacity-50',
        tertiary: 'py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all',
    };

</script>

<div class="p-4 md:p-8 pt-0 md:pt-0">
    <main class="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-screen-3xl mx-auto">
        <div class="flex flex-col gap-4">
            <Accordion title="📦 Repository & Base Seed" open={true}>
                <FormGroup label="Repository">
                    <textarea
                        class="{inputClasses} min-h-[120px]"
                        bind:value={$appState.repository}
                        placeholder="Paste serials here..."
                        
                    ></textarea>
                </FormGroup>
                <FormGroup label="Search Serials">
                    <div class="flex gap-2">
                        <input
                            type="text"
                            name="searchTerm"
                            class={inputClasses}
                            placeholder="Enter search term..."
                            bind:value={$searchTerm}
                            
                        />
                        <button onclick={searchSerials} class={btnClasses.secondary} >Search</button>
                    </div>
                </FormGroup>
                <FormGroup label="Base Serial Seed">
                    <textarea class="{inputClasses} h-24" bind:value={$appState.seed} ></textarea>
                </FormGroup>

                <div class="grid grid-cols-2 gap-4">
                    <button onclick={saveState} class={btnClasses.secondary} >Save State</button>
                    <label class="{btnClasses.secondary} text-center cursor-pointer ">
                        Restore State
                        <input type="file" accept=".json" onchange={restoreState} class="hidden"  />
                    </label>
                </div>
            </Accordion>
            <Accordion title="🧬 Mutation Rules" open={true}>
                <FormGroup label="Item Type">
                    <select name="itemType" bind:value={$appState.itemType} class={inputClasses} >
                        <option value="GUN">Gun</option>
                        <option value="SHIELD">Shield</option>
                        <option value="CLASS_MOD">Class Mod</option>
                        <option value="ENHANCEMENT">Enhancement</option>
                        <option value="REPKIT">Repair Kit</option>
                        <option value="ORDNANCE">Ordnance</option>
                        <option value="GENERIC">Generic</option>
                    </select>
                </FormGroup>
                <MutableRangeSelector
                    bind:seed={$appState.seed}
                    bind:start={$appState.rules.mutableStart}
                    bind:end={$appState.rules.mutableEnd}
                    inputClasses={inputClasses}
                    isMerging={$isGenerating}
                />
                <FormGroup label="Crossover Chunk Size">
                    <div class="grid grid-cols-3 gap-4">
                        <input
                            type="number"
                            name="rules.minChunk"
                            bind:value={$appState.rules.minChunk}
                            class={inputClasses}
                            title="The smallest crossover segment size."
                            
                        />
                        <input
                            type="number"
                            name="rules.maxChunk"
                            bind:value={$appState.rules.maxChunk}
                            class={inputClasses}
                            title="The largest crossover segment size."
                            
                        />
                        <input
                            type="number"
                            name="rules.targetChunk"
                            bind:value={$appState.rules.targetChunk}
                            class={inputClasses}
                            title="The preferred crossover segment size."
                            
                        />
                    </div>
                </FormGroup>
                <FormGroup label="Legendary Part Chance ({$appState.rules.legendaryChance}%)">
                    <input
                        type="range"
                        name="rules.legendaryChance"
                        min="0"
                        max="100"
                        bind:value={$appState.rules.legendaryChance}
                        class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        
                    />
                </FormGroup>
                <FormGroup label="High-Value Part Size Range">
                    <div class="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            name="rules.minPart"
                            bind:value={$appState.rules.minPart}
                            class={inputClasses}
                            
                        />
                        <input
                            type="number"
                            name="rules.maxPart"
                            bind:value={$appState.rules.maxPart}
                            class={inputClasses}
                            
                        />
                    </div>
                </FormGroup>
                <FormGroup label="Final Tail Length Offset">
                    <input
                        type="number"
                        name="rules.targetOffset"
                        bind:value={$appState.rules.targetOffset}
                        class={inputClasses}
                        
                    />
                </FormGroup>
            </Accordion>
            <Accordion title="🔢 Output Counts" open={true}>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <FormGroup label="NEW (v0)">
                        <input
                            type="number"
                            name="counts.new"
                            bind:value={$appState.counts.new}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Randomly appends characters to the base seed.</p>
                    </FormGroup>
                    <FormGroup label="NEW (v1)">
                        <input
                            type="number"
                            name="counts.newV1"
                            bind:value={$appState.counts.newV1}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Injects two randomly generated repeating parts (full alphabet).</p>
                    </FormGroup>
                    <FormGroup label="NEW (v2)">
                        <input
                            type="number"
                            name="counts.newV2"
                            bind:value={$appState.counts.newV2}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Injects two randomly generated repeating parts (restricted alphabet).</p>
                    </FormGroup>
                    <FormGroup label="NEW (v3)">
                        <input
                            type="number"
                            name="counts.newV3"
                            bind:value={$appState.counts.newV3}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Experimental algorithm for data gathering.</p>
                    </FormGroup>
                    <FormGroup label="TG1">
                        <input
                            type="number"
                            name="counts.tg1"
                            bind:value={$appState.counts.tg1}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Inserts one stable motif at a random position within the serial's safe zone.</p>
                    </FormGroup>
                    <FormGroup label="TG2">
                        <input
                            type="number"
                            name="counts.tg2"
                            bind:value={$appState.counts.tg2}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Inserts two stable motifs at random positions within the serial's safe zone.</p>
                    </FormGroup>
                    <FormGroup label="TG3">
                        <input
                            type="number"
                            name="counts.tg3"
                            bind:value={$appState.counts.tg3}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Injects a repeating high-value part at the end of the serial.</p>
                    </FormGroup>
                    <FormGroup label="TG4">
                        <input
                            type="number"
                            name="counts.tg4"
                            bind:value={$appState.counts.tg4}
                            class={inputClasses}
                            
                        />
                        <p class="text-xs text-gray-400">Overwrites a large part of the serial with a random chunk from the repository.</p>
                    </FormGroup>
                </div>
            </Accordion>
        </div>
        <div class="flex flex-col gap-4">
            <Accordion title="📊 Statistics">
                <div class="overflow-x-auto">
                    <div id="chartContainer" style="position: relative; height: 400px;">
                        <canvas id="statsChart"></canvas>
                    </div>
                </div>
            </Accordion>

            <div class="bg-gray-800/50 border border-gray-700 rounded-lg flex flex-col flex-grow">
                <div class="p-4 flex justify-between items-center border-b border-gray-700 flex-wrap">
                    <h3 class="text-lg font-semibold mb-2 md:mb-0">📝 YAML Output (Read-Only)</h3>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick={copyToClipboard} class={btnClasses.tertiary} >
                            {$copyText}
                        </button>
                        <button onclick={downloadYAML} class={btnClasses.tertiary} >
                            Download
                        </button>
                        <button onclick={importAndMerge} class={btnClasses.tertiary} >Merge Serial</button>
                        <label class="{btnClasses.tertiary} cursor-pointer">
                                Select Base YAML
                                <input type="file" accept=".yaml,.yml" onchange={selectBaseYaml} class="hidden"  />
                        </label>
                        <button onclick={() => { $outputYaml = ''; $fullYaml = ''; $filteredYaml = ''; }} class={btnClasses.tertiary} >
                            Clear
                        </button>
                    </div>
                </div>
                <div class="p-5 flex-grow">
                    <textarea class="{inputClasses} h-full w-full resize-none" readonly bind:value={$outputYaml}></textarea>
                </div>
            </div>
            <div class="bg-gray-800/50 p-5 rounded-lg border border-gray-700 flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-4">
                    <button onclick={startGeneration} disabled={$isGenerating } class={btnClasses.primary}>
                        Generate Serials
                    </button>
                    <button onclick={resetForm} disabled={$isGenerating } class={btnClasses.secondary}>
                        Reset All
                    </button>
                </div>
                <div class="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-2">
                    <div class="flex items-center">
                        <input
                            type="checkbox"
                            id="genStats"
                            name="generateStats"
                            bind:checked={$appState.generateStats}
                            class="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                            
                        />
                        <label for="genStats" class="ml-2 text-sm font-medium text-gray-300">
                            Generate Part Statistics
                        </label>
                    </div>
                    <div class="flex items-center">
                        <input
                            type="checkbox"
                            id="debugMode"
                            name="debugMode"
                            bind:checked={$appState.debugMode}
                            class="h-4 w-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                            
                        />
                        <label for="debugMode" class="ml-2 text-sm font-medium text-gray-300">
                            Enable Debug Logging
                        </label>
                    </div>
                </div>
                <div
                    class="h-10 text-center text-sm text-gray-400 flex items-center justify-center"
                    style="white-space: pre-line"
                >
                    {#if $statusMessage.startsWith('✅')}
                        <div class="p-3 bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-md text-center whitespace-pre-wrap">
                            {$statusMessage}
                        </div>
                    {:else}
                        {$statusMessage}
                    {/if}
                </div>
                {#if $isGenerating}
                    <div class="w-full bg-gray-700 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: {$progress}%;"></div>
                    </div>
                {/if}
            </div>
        </div>
        <div class="flex flex-col gap-4 h-full xl:col-span-2 2xl:col-span-1">
            {#each $serialEditors as editor (editor.id)}
                {@const title = `⚙️ Serial Editor #${editor.id}`}
                <Accordion {title} open={true}>
                    <SerialEditor serial={editor.serial} onSerialUpdate={(newSerial) => updateEditorSerial(editor.id, newSerial)} />
                    {#snippet actions()}
                        <button
                            onclick={() => removeSerialEditor(editor.id)}
                            class="text-gray-400 hover:text-white transition-colors"
                            aria-label="Remove Serial Editor"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-5 h-5"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                ></path>
                            </svg>
                        </button>
                    {/snippet}
                </Accordion>
            {/each}
            <div class="flex justify-end">
                <button onclick={addSerialEditor} class="{btnClasses.tertiary} mb-4">+ Add Serial Editor</button>
            </div>
        </div>
    </main>
</div>
