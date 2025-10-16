<script lang="ts">
    import Accordion from '$lib/components/Accordion.svelte';
    import Dropdown from '$lib/components/Dropdown.svelte';
    import FormGroup from '$lib/components/FormGroup.svelte';
    import MutableRangeSelector from '$lib/components/MutableRangeSelector.svelte';
    import SerialEditor from '$lib/components/SerialEditor.svelte';
    import { onMount } from 'svelte';
    import yaml from 'js-yaml';

    let state = {
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
        validationChars: 12,
        generateStats: false,
        debugMode: false,
    };

    let statusMessage = 'Ready to generate.';
    let validationResult = '';
    let progress = 0;
    let isGenerating = false;
    let outputYaml = '';
    let fullYaml = '';
    let filteredYaml = '';
    let liveMerge = false;
    let baseYaml = '';
    let isMerging = false;
    let searchTerm = '';
    let copyText = 'Copy';

    let worker: Worker;

    onMount(async () => {
        const MyWorker = await import('$lib/worker/worker.js?worker');
        worker = new MyWorker.default();

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            switch (type) {
                case 'progress':
                    progress = (payload.processed / payload.total) * 100;
                    if (payload.stage === 'stats') {
                        statusMessage = `Generating Statistics... ${Math.round(progress)}%`;
                    } else {
                        statusMessage = `Generating... ${payload.processed.toLocaleString()} / ${payload.total.toLocaleString()}`;
                    }
                    break;
                case 'stats_complete':
                    // updateChart(payload.chartData);
                    break;
                case 'complete':
                    if (payload.validationResult) {
                        validationResult = payload.validationResult;
                        filteredYaml = payload.validatedYaml || '';
                        const filteredCount = payload.validatedYaml ? (payload.validatedYaml.match(/serial:/g) || []).length : 0;
                        statusMessage = `Filtering complete.\nCopy/Download will use the ${filteredCount} filtered serials.`;
                        outputYaml = truncate(payload.validatedYaml || '');
                        // updateChart(payload.chartData);
                    } else {
                        isGenerating = false;
                        outputYaml = payload.truncatedYaml;
                        fullYaml = payload.yaml;
                        filteredYaml = '';
                        validationResult = '';
                        statusMessage = `✅ Complete! ${payload.uniqueCount.toLocaleString()} unique serials generated.`;
                    }
                    break;
                case 'error':
                    isGenerating = false;
                    statusMessage = `❌ ERROR: ${payload.message}`;
                    break;
            }
        };

        return () => {
            worker.terminate();
        };
    });

    function truncate(str: string, maxLines = 50): string {
        if (!str) return '';
        const lines = str.split('\n');
        if (lines.length > maxLines) {
            return lines.slice(0, maxLines).join('\n') + `\n\n... and ${lines.length - maxLines} more lines`;
        }
        return str;
    }

    async function searchSerials() {
        if (!searchTerm) return;
        statusMessage = 'Searching...';
        try {
            const response = await fetch(`https://kamer-tuintje.be/BL4/BSE/api.php?search=${encodeURIComponent(searchTerm)}&action=records&sort_by=id&sort_order=ASC`);
            const data = await response.json();
            const serials = data.map((item: any) => item.serial).join('\n');
            state.repository = state.repository ? `${state.repository}\n${serials}` : serials;
            statusMessage = `Found ${data.length} serials.`;
        } catch (error) {
            console.error('Failed to search serials:', error);
            statusMessage = '❌ ERROR: Failed to search serials.';
        }
    }

    function startGeneration() {
        isGenerating = true;
        statusMessage = 'Sending job...';
        progress = 0;
        validationResult = '';
        filteredYaml = '';
        const config = {
            seed: state.seed,
            itemType: state.itemType,
            repository: state.repository,
            newCount: state.counts.new,
            newV1Count: state.counts.newV1,
            newV2Count: state.counts.newV2,
            newV3Count: state.counts.newV3,
            tg1Count: state.counts.tg1,
            tg2Count: state.counts.tg2,
            tg3Count: state.counts.tg3,
            tg4Count: state.counts.tg4,
            minChunkSize: state.rules.minChunk,
            maxChunkSize: state.rules.maxChunk,
            targetChunkSize: state.rules.targetChunk,
            targetOffset: state.rules.targetOffset,
            minPartSize: state.rules.minPart,
            maxPartSize: state.rules.maxPart,
            legendaryChance: state.rules.legendaryChance,
            mutableStart: state.rules.mutableStart,
            mutableEnd: state.rules.mutableEnd,
            gpuBatchSize: 250000,
            generateStats: state.generateStats,
            debugMode: state.debugMode,
        };
        worker.postMessage({ type: 'generate', payload: config });
    }

    function resetForm() {
        if (confirm('Are you sure you want to reset all settings to their original defaults?')) {
            state = {
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
                validationChars: 12,
                generateStats: false,
                debugMode: false,
            };
            outputYaml = '';
            fullYaml = '';
            filteredYaml = '';
            validationResult = '';
            statusMessage = 'Settings have been reset to original defaults.';
        }
    }

    async function copyToClipboard() {
        const contentToCopy = filteredYaml || fullYaml;
        if (contentToCopy) {
            await navigator.clipboard.writeText(contentToCopy);
            copyText = 'Copied!';
            setTimeout(() => (copyText = 'Copy'), 2000);
        }
    }

    function downloadYAML() {
        const contentToDownload = filteredYaml || fullYaml;
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
            const yamlStr = yaml.dump(state);
            const blob = new Blob([yamlStr], { type: 'text/yaml;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'serial-generator-state.yaml';
            link.click();
            URL.revokeObjectURL(link.href);
            statusMessage = 'State saved successfully.';
        } catch (error) {
            console.error('Failed to save state:', error);
            statusMessage = '❌ ERROR: Failed to save state.';
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
                const restoredState = yaml.load(reader.result as string);
                state = { ...state, ...restoredState };
                statusMessage = 'State restored successfully.';
            } catch (error) {
                console.error('Failed to restore state:', error);
                statusMessage = '❌ ERROR: Failed to restore state.';
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
                baseYaml = reader.result as string;
                statusMessage = 'Base YAML loaded successfully.';
            } catch (error) {
                console.error('Failed to load base YAML:', error);
                statusMessage = '❌ ERROR: Failed to load base YAML.';
            }
        };
        reader.readAsText(file);
    }

    function importAndMerge() {
        if (!baseYaml) {
            statusMessage = 'Please select a base YAML file first.';
            return;
        }
        try {
            const mergedYaml = baseYaml + '\n' + fullYaml;
            outputYaml = mergedYaml;
            statusMessage = 'YAML files merged successfully.';
        } catch (error) {
            console.error('Failed to merge YAML files:', error);
            statusMessage = '❌ ERROR: Failed to merge YAML files.';
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

<div class="p-4 md:p-8">
    <header class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-100">
            Serial Mutation <span class="text-blue-400">Engine</span>
        </h1>
        <p class="text-gray-400 text-lg mt-2">A professional tool for procedural serial generation and mutation.</p>
    </header>
    <main class="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-screen-3xl mx-auto">
        <div class="flex flex-col gap-4">
            <Accordion title="📦 Repository & Base Seed" open={true}>
                <FormGroup label="Repository">
                    <textarea
                        class="{inputClasses} min-h-[120px]"
                        bind:value={state.repository}
                        placeholder="Paste serials here..."
                        disabled={isMerging}
                    ></textarea>
                </FormGroup>
                <FormGroup label="Search Serials">
                    <div class="flex gap-2">
                        <input
                            type="text"
                            name="searchTerm"
                            class={inputClasses}
                            placeholder="Enter search term..."
                            bind:value={searchTerm}
                            disabled={isMerging}
                        />
                        <button onclick={searchSerials} class={btnClasses.secondary} disabled={isMerging}>Search</button>
                    </div>
                </FormGroup>
                <FormGroup label="Base Serial Seed">
                    <textarea class="{inputClasses} h-24" bind:value={state.seed} disabled={isMerging}></textarea>
                </FormGroup>
                <div class="grid grid-cols-2 gap-4">
                    <button onclick={saveState} class={btnClasses.secondary} disabled={isMerging}>Save State</button>
                    <label class="{btnClasses.secondary} text-center cursor-pointer {isMerging ? 'opacity-50 cursor-not-allowed' : ''}">
                        Restore State
                        <input type="file" accept=".yaml,.yml" onchange={restoreState} class="hidden" disabled={isMerging} />
                    </label>
                </div>
            </Accordion>
            <Accordion title="🔢 Output Counts" open={true}>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <FormGroup label="NEW (v0)">
                        <input
                            type="number"
                            name="counts.new"
                            bind:value={state.counts.new}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Randomly appends characters to the base seed.</p>
                    </FormGroup>
                    <FormGroup label="NEW (v1)">
                        <input
                            type="number"
                            name="counts.newV1"
                            bind:value={state.counts.newV1}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Injects two randomly generated repeating parts (full alphabet).</p>
                    </FormGroup>
                    <FormGroup label="NEW (v2)">
                        <input
                            type="number"
                            name="counts.newV2"
                            bind:value={state.counts.newV2}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Injects two randomly generated repeating parts (restricted alphabet).</p>
                    </FormGroup>
                    <FormGroup label="NEW (v3)">
                        <input
                            type="number"
                            name="counts.newV3"
                            bind:value={state.counts.newV3}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Experimental algorithm for data gathering.</p>
                    </FormGroup>
                    <FormGroup label="TG1">
                        <input
                            type="number"
                            name="counts.tg1"
                            bind:value={state.counts.tg1}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Inserts one stable motif at a random position within the serial's safe zone.</p>
                    </FormGroup>
                    <FormGroup label="TG2">
                        <input
                            type="number"
                            name="counts.tg2"
                            bind:value={state.counts.tg2}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Inserts two stable motifs at random positions within the serial's safe zone.</p>
                    </FormGroup>
                    <FormGroup label="TG3">
                        <input
                            type="number"
                            name="counts.tg3"
                            bind:value={state.counts.tg3}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Injects a repeating high-value part at the end of the serial.</p>
                    </FormGroup>
                    <FormGroup label="TG4">
                        <input
                            type="number"
                            name="counts.tg4"
                            bind:value={state.counts.tg4}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <p class="text-xs text-gray-400">Overwrites a large part of the serial with a random chunk from the repository.</p>
                    </FormGroup>
                </div>
            </Accordion>
        </div>
        <div class="flex flex-col gap-4">
            <Accordion title="🧬 Mutation Rules" open={true}>
                <FormGroup label="Item Type">
                    <select name="itemType" bind:value={state.itemType} class={inputClasses} disabled={isMerging}>
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
                    bind:seed={state.seed}
                    bind:start={state.rules.mutableStart}
                    bind:end={state.rules.mutableEnd}
                    inputClasses={inputClasses}
                />
                <FormGroup label="Crossover Chunk Size">
                    <div class="grid grid-cols-3 gap-4">
                        <input
                            type="number"
                            name="rules.minChunk"
                            bind:value={state.rules.minChunk}
                            class={inputClasses}
                            title="The smallest crossover segment size."
                            disabled={isMerging}
                        />
                        <input
                            type="number"
                            name="rules.maxChunk"
                            bind:value={state.rules.maxChunk}
                            class={inputClasses}
                            title="The largest crossover segment size."
                            disabled={isMerging}
                        />
                        <input
                            type="number"
                            name="rules.targetChunk"
                            bind:value={state.rules.targetChunk}
                            class={inputClasses}
                            title="The preferred crossover segment size."
                            disabled={isMerging}
                        />
                    </div>
                </FormGroup>
                <FormGroup label="Legendary Part Chance ({state.rules.legendaryChance}%)">
                    <input
                        type="range"
                        name="rules.legendaryChance"
                        min="0"
                        max="100"
                        bind:value={state.rules.legendaryChance}
                        class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        disabled={isMerging}
                    />
                </FormGroup>
                <FormGroup label="High-Value Part Size Range">
                    <div class="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            name="rules.minPart"
                            bind:value={state.rules.minPart}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                        <input
                            type="number"
                            name="rules.maxPart"
                            bind:value={state.rules.maxPart}
                            class={inputClasses}
                            disabled={isMerging}
                        />
                    </div>
                </FormGroup>
                <FormGroup label="Final Tail Length Offset">
                    <input
                        type="number"
                        name="rules.targetOffset"
                        bind:value={state.rules.targetOffset}
                        class={inputClasses}
                        disabled={isMerging}
                    />
                </FormGroup>
            </Accordion>
            <Accordion title="✔️ Filtering">
                <FormGroup label="Characters to Filter">
                    <input
                        type="number"
                        name="validationChars"
                        bind:value={state.validationChars}
                        class={inputClasses}
                        disabled={isMerging}
                    />
                </FormGroup>
                <button
                    onclick={() =>
                        worker.postMessage({
                            type: 'validate',
                            payload: {
                                yaml: fullYaml,
                                seed: state.seed,
                                validationChars: state.validationChars,
                                generateStats: state.generateStats,
                                minPart: state.rules.minPart,
                                maxPart: state.rules.maxPart,
                                debugMode: state.debugMode,
                            },
                        })}
                    class={btnClasses.secondary}
                    disabled={isMerging}
                >
                    Filter
                </button>
                {#if validationResult}
                    <div class="p-3 bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-md text-center whitespace-pre-wrap">
                        {validationResult}
                    </div>
                {/if}
            </Accordion>
            <SerialEditor />
        </div>
        <div class="flex flex-col gap-4 h-full xl:col-span-2 2xl:col-span-1">
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
                        <button onclick={copyToClipboard} class={btnClasses.tertiary} disabled={isMerging}>
                            {copyText}
                        </button>
                        <button onclick={downloadYAML} class={btnClasses.tertiary} disabled={isMerging}>
                            Download
                        </button>
                        <Dropdown title="Merge" btnClasses={btnClasses.tertiary}>
                            <button
                                onclick={importAndMerge}
                                class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                                disabled={!baseYaml || isMerging}
                            >
                                Import & Merge
                            </button>
                            <label class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 cursor-pointer {isMerging ? 'opacity-50 cursor-not-allowed' : ''}">
                                Select Base YAML
                                <input type="file" accept=".yaml,.yml" onchange={selectBaseYaml} class="hidden" disabled={isMerging} />
                            </label>
                            <div class="flex items-center px-4 py-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    id="liveMerge"
                                    bind:checked={liveMerge}
                                    disabled={!baseYaml || isMerging}
                                    class="mr-2"
                                />
                                <label for="liveMerge">Live Merge</label>
                            </div>
                        </Dropdown>
                        <button onclick={() => { outputYaml = ''; fullYaml = ''; filteredYaml = ''; }} class={btnClasses.tertiary} disabled={isMerging}>
                            Clear
                        </button>
                    </div>
                </div>
                <div class="p-5 flex-grow">
                    <textarea class="{inputClasses} h-full w-full resize-none" readonly bind:value={outputYaml}></textarea>
                </div>
            </div>
            <div class="bg-gray-800/50 p-5 rounded-lg border border-gray-700 flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-4">
                    <button onclick={startGeneration} disabled={isGenerating || isMerging} class={btnClasses.primary}>
                        Generate Serials
                    </button>
                    <button onclick={resetForm} disabled={isGenerating || isMerging} class={btnClasses.secondary}>
                        Reset All
                    </button>
                </div>
                <div class="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-2">
                    <div class="flex items-center">
                        <input
                            type="checkbox"
                            id="genStats"
                            name="generateStats"
                            bind:checked={state.generateStats}
                            class="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                            disabled={isMerging}
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
                            bind:checked={state.debugMode}
                            class="h-4 w-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                            disabled={isMerging}
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
                    {statusMessage}
                </div>
                {#if isGenerating}
                    <div class="w-full bg-gray-700 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: {progress}%;"></div>
                    </div>
                {/if}
            </div>
        </div>
    </main>
</div>
