<script lang="ts">
    import Accordion from '$lib/components/Accordion.svelte';
    import Dropdown from '$lib/components/Dropdown.svelte';
    import FormGroup from '$lib/components/FormGroup.svelte';
    import MutableRangeSelector from '$lib/components/MutableRangeSelector.svelte';
    import SerialEditor from '$lib/components/SerialEditor.svelte';
    import { Chart, registerables } from 'chart.js';
    import { page } from '$app/stores';

    Chart.register(...registerables);

    import { getInitialState, mergeSerial } from '$lib/mutations';

    let appState = $state<State>(getInitialState());

    let statusMessage = $state('Ready to generate.');
    let progress = $state(0);
    let isGenerating = $state(false);
    let outputYaml = $state('');
    let fullYaml = $state('');
    let filteredYaml = $state('');
    let baseYaml = $state('');

    let serialEditors = $state([
        {
            id: 1,
            serial: '',
            merged: false
        },
    ]);
    let nextSerialEditorId = 2;

    function addSerialEditor() {
        serialEditors.push({ id: nextSerialEditorId++, serial: '', merged: false });
    }

    function removeSerialEditor(id: number) {
        serialEditors = serialEditors.filter((editor) => editor.id !== id);
    }

    function updateEditorSerial(editorId: number, newSerial: string) {
        const editor = serialEditors.find(e => e.id === editorId);
        if (editor) {
            editor.serial = newSerial;
            editor.merged = false;
        }
    }

    let searchTerm = $state('');
    let copyText = $state('Copy');
    let copiedEditorId = $state<number | null>(null);

    let worker: Worker;

    let chart: Chart;

    $effect(() => {
        const storedBaseYaml = localStorage.getItem('baseYaml');
        if (storedBaseYaml) {
            baseYaml = storedBaseYaml;
            statusMessage = 'Restored last used base YAML.';
        }

        async function setupWorkerAndChart() {
            const MyWorker = await import('$lib/worker/worker.js?worker');
            worker = new MyWorker.default();

            const ctx = document.getElementById('statsChart') as HTMLCanvasElement;
            if (ctx) {
                if (chart) chart.destroy();
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
            }

            worker.onmessage = (e) => {
                const { type, payload } = e.data;
                switch (type) {
                    case 'worker_loaded':
                        console.log('[DEBUG] Worker sent worker_loaded message.');
                        break;
                    case 'progress':
                        progress = (payload.processed / payload.total) * 100;
                        if (payload.stage === 'stats') {
                            statusMessage = `Generating Statistics... ${Math.round(progress)}%`;
                        } else if (payload.stage === 'merging') {
                            statusMessage = `Merging YAML... ${payload.processed.toLocaleString()} / ${payload.total.toLocaleString()}`;
                        } else if (payload.stage === 'generating') {
                            statusMessage = `Generating (${payload.mutation}, Difficulty: ${payload.difficulty.toFixed(1)})... ${payload.processed.toLocaleString()} / ${payload.total.toLocaleString()}`;
                        } else {
                            statusMessage = `Generating... ${payload.processed.toLocaleString()} / ${payload.total.toLocaleString()}`;
                        }
                        break;
                    case 'stats_complete':
                        updateChart(payload.chartData);
                        break;
                    case 'complete':
                        isGenerating = false;
                        outputYaml = payload.truncatedYaml;
                        fullYaml = payload.yaml;
                        filteredYaml = '';
                        statusMessage = `✅ Complete! ${payload.uniqueCount.toLocaleString()} unique serials generated.`;
                        break;
                    case 'error':
                        isGenerating = false;
                        statusMessage = `❌ ERROR: ${payload.message}`;
                        break;
                }
            };
        }

        setupWorkerAndChart();

        return () => {
            worker?.terminate();
            chart?.destroy();
        };
    });

    $effect(() => {
        const serialFromUrl = $page.url.searchParams.get('serial');
        if (serialFromUrl) {
            if (serialEditors[0]) {
                serialEditors[0].serial = serialFromUrl;
            }
        }
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
        if (!searchTerm) return;
        statusMessage = 'Searching...';
        try {
            const response = await fetch(`https://kamer-tuintje.be/BL4/BSE/api.php?search=${encodeURIComponent(searchTerm)}&action=records&sort_by=id&sort_order=ASC`);
            const data = await response.json();
            const serials = data.map((item: any) => item.serial).join('\n');
            appState.repository = appState.repository ? `${appState.repository}\n${serials}` : serials;
            statusMessage = `Found ${data.length} serials.`;
        } catch (error) {
            console.error('Failed to search serials:', error);
            statusMessage = '❌ ERROR: Failed to search serials.';
        }
    }

    function startGeneration() {
        isGenerating = true;
        statusMessage = 'Initializing...';
        progress = 0;
        filteredYaml = '';
        const config = {
            seed: appState.seed,
            itemType: appState.itemType,
            repository: appState.repository,
            counts: JSON.parse(JSON.stringify(appState.counts)),
            rules: JSON.parse(JSON.stringify(appState.rules)),
            difficulties: JSON.parse(JSON.stringify(appState.difficulties)),
            gpuBatchSize: 250000,
            generateStats: appState.generateStats,
            debugMode: appState.debugMode,

            baseYaml: baseYaml,
        };
        console.log('[DEBUG] Sending message to worker:', { type: 'generate', payload: config });
        worker.postMessage({ type: 'generate', payload: config });
    }

    function resetForm() {
        if (confirm('Are you sure you want to reset all settings to their original defaults?')) {
            appState = getInitialState();
            outputYaml = '';
            fullYaml = '';
            filteredYaml = '';
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
        const contentToDownload = outputYaml || filteredYaml || fullYaml;
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
            const jsonStr = JSON.stringify(appState, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'serial-generator-state.json';
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
                const restoredState = JSON.parse(reader.result as string);
                appState = { ...appState, ...restoredState };
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
                localStorage.setItem('baseYaml', baseYaml);
                statusMessage = 'Base YAML loaded successfully.';
                serialEditors.forEach(e => e.merged = false);
            } catch (error) {
                console.error('Failed to load base YAML:', error);
                statusMessage = '❌ ERROR: Failed to load base YAML.';
            }
        };
        reader.readAsText(file);
    }

    async function copyUrl(editor: any) {
        if (!editor.serial) return;
        const url = new URL(window.location.href);
        url.searchParams.set('serial', editor.serial);
        await navigator.clipboard.writeText(url.toString());
        copiedEditorId = editor.id;
        setTimeout(() => {
            copiedEditorId = null;
        }, 2000);
    }

    function importAndMerge() {
        const editorToMerge = serialEditors.find(e => e.serial && !e.merged);

        if (!editorToMerge) {
            statusMessage = 'No unmerged serials found to merge.';
            return;
        }

        const serialToInsert = editorToMerge.serial;
        const yamlToMerge = outputYaml || baseYaml;
        const result = mergeSerial(yamlToMerge, serialToInsert);

        outputYaml = result.newYaml;
        statusMessage = result.message;

        if (result.message.startsWith('✅')) {
            editorToMerge.merged = true;
        }
    }

    let maximizedEditorId = $state<number | null>(null);

    function toggleMaximize(editorId: number) {
        if (maximizedEditorId === editorId) {
            maximizedEditorId = null;
        } else {
            maximizedEditorId = editorId;
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
        {#if maximizedEditorId === null}
        <div class="flex flex-col gap-4">
            <Accordion title="📦 Repository & Base Seed" open={true}>
                <FormGroup label="Repository">
                    <textarea
                        class="{inputClasses} min-h-[120px]"
                        bind:value={appState.repository}
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
                            bind:value={searchTerm}
                            
                        />
                        <button onclick={searchSerials} class={btnClasses.secondary} >Search</button>
                    </div>
                </FormGroup>
                <FormGroup label="Base Serial Seed">
                    <textarea class="{inputClasses} h-24" bind:value={appState.seed} ></textarea>
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


                <FormGroup label="Crossover Chunk Size">
                    <div class="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            name="rules.minChunk"
                            bind:value={appState.rules.minChunk}
                            class={inputClasses}
                            title="The smallest crossover segment size."
                            
                        />
                        <input
                            type="number"
                            name="rules.maxChunk"
                            bind:value={appState.rules.maxChunk}
                            class={inputClasses}
                            title="The largest crossover segment size."
                            
                        />
                    </div>
                </FormGroup>
                <FormGroup label="Legendary Part Chance ({appState.rules.legendaryChance}%)">
                    <input
                        type="range"
                        name="rules.legendaryChance"
                        min="0"
                        max="100"
                        bind:value={appState.rules.legendaryChance}
                        class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        
                    />
                </FormGroup>
                <FormGroup label="High-Value Part Size Range">
                    <div class="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            name="rules.minPart"
                            bind:value={appState.rules.minPart}
                            class={inputClasses}
                            
                        />
                        <input
                            type="number"
                            name="rules.maxPart"
                            bind:value={appState.rules.maxPart}
                            class={inputClasses}
                            
                        />
                    </div>
                </FormGroup>
                <FormGroup label="Final Tail Length Offset">
                    <input
                        type="number"
                        name="rules.targetOffset"
                        bind:value={appState.rules.targetOffset}
                        class={inputClasses}
                        
                    />
                </FormGroup>
                <FormGroup label="Difficulty Increment">
                    <input
                        type="number"
                        name="rules.difficultyIncrement"
                        bind:value={appState.rules.difficultyIncrement}
                        class={inputClasses}
                        step="0.01"
                        min="0.01"
                    />
                </FormGroup>
            </Accordion>
            <Accordion title="🔢 Output Counts" open={true}>
                <div class="flex flex-col gap-4">
                    <FormGroup label="Append Random Asset">
                        <input type="number" name="counts.appendRandomAsset" bind:value={appState.counts.appendRandomAsset} class={inputClasses} />
                        <p class="text-xs text-gray-400">Appends one or more random assets (0-100) to the end of the serial. The number of appended assets increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Inject Repeating Part">
                        <input type="number" name="counts.injectRepeatingPart" bind:value={appState.counts.injectRepeatingPart} class={inputClasses} />
                        <p class="text-xs text-gray-400">Injects two or more repeating parts into the serial. The number of injected parts increases with difficulty. Uses a limited asset pool.</p>
                    </FormGroup>
                    <FormGroup label="Inject Repeating Part (Full)">
                        <input type="number" name="counts.injectRepeatingPartFull" bind:value={appState.counts.injectRepeatingPartFull} class={inputClasses} />
                        <p class="text-xs text-gray-400">Injects two or more repeating parts into the serial. The number of injected parts increases with difficulty. Uses the full asset pool.</p>
                    </FormGroup>
                    <FormGroup label="Scramble and Append from Repo">
                        <input type="number" name="counts.scrambleAndAppendFromRepo" bind:value={appState.counts.scrambleAndAppendFromRepo} class={inputClasses} />
                        <p class="text-xs text-gray-400">Reverses a random segment of the serial and appends one or more assets from a random repository serial's last 25%. The number of appended assets increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Inject Random Asset">
                        <input type="number" name="counts.injectRandomAsset" bind:value={appState.counts.injectRandomAsset} class={inputClasses} />
                        <p class="text-xs text-gray-400">Injects one or more random assets (0-84) at a random position in the serial. The number of injected assets increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Reverse Random Segments">
                        <input type="number" name="counts.reverseRandomSegments" bind:value={appState.counts.reverseRandomSegments} class={inputClasses} />
                        <p class="text-xs text-gray-400">Reverses one or more random segments of the serial. The number of reversed segments increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Inject High-Value Part">
                        <input type="number" name="counts.injectHighValuePart" bind:value={appState.counts.injectHighValuePart} class={inputClasses} />
                        <p class="text-xs text-gray-400">Injects one or more high-value parts from the repository into the serial, based on legendary chance. The number of injected parts increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Crossover with Repository">
                        <input type="number" name="counts.crossoverWithRepository" bind:value={appState.counts.crossoverWithRepository} class={inputClasses} />
                        <p class="text-xs text-gray-400">Overwrites a segment of the serial with a random segment from another serial in the repository. The size of the segment increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Shuffle Assets">
                        <input type="number" name="counts.shuffleAssets" bind:value={appState.counts.shuffleAssets} class={inputClasses} />
                        <p class="text-xs text-gray-400">Shuffles a percentage of the serial's assets. The percentage increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Randomize Assets">
                        <input type="number" name="counts.randomizeAssets" bind:value={appState.counts.randomizeAssets} class={inputClasses} />
                        <p class="text-xs text-gray-400">Randomizes a percentage of the serial's assets. The percentage increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Repeat High-Value Part">
                        <input type="number" name="counts.repeatHighValuePart" bind:value={appState.counts.repeatHighValuePart} class={inputClasses} />
                        <p class="text-xs text-gray-400">Repeats a high-value part of the serial. The number of repetitions increases with difficulty.</p>
                    </FormGroup>
                    <FormGroup label="Append High-Value Part">
                        <input type="number" name="counts.appendHighValuePart" bind:value={appState.counts.appendHighValuePart} class={inputClasses} />
                        <p class="text-xs text-gray-400">Appends a high-value part to the end of the serial. The number of appended parts increases with difficulty.</p>
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
                            {copyText}
                        </button>
                        <button onclick={downloadYAML} class={btnClasses.tertiary} >
                            Download
                        </button>
                        <button onclick={importAndMerge} class={btnClasses.tertiary} >Merge Serial</button>
                        <label class="{btnClasses.tertiary} cursor-pointer">
                                Select Base YAML
                                <input type="file" accept=".yaml,.yml" onchange={selectBaseYaml} class="hidden"  />
                        </label>
                        <button onclick={() => { outputYaml = ''; fullYaml = ''; filteredYaml = ''; }} class={btnClasses.tertiary} >
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
                    <button onclick={startGeneration} disabled={isGenerating } class={btnClasses.primary}>
                        Generate Serials
                    </button>
                    <button onclick={resetForm} disabled={isGenerating } class={btnClasses.secondary}>
                        Reset All
                    </button>
                </div>
                <div class="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-2">
                    <div class="flex items-center">
                        <input
                            type="checkbox"
                            id="genStats"
                            name="generateStats"
                            bind:checked={appState.generateStats}
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
                            bind:checked={appState.debugMode}
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
                    {#if statusMessage.startsWith('✅')}
                        <div class="p-3 bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-md text-center whitespace-pre-wrap">
                            {statusMessage}
                        </div>
                    {:else}
                        {statusMessage}
                    {/if}
                </div>
                {#if isGenerating}
                    <div class="w-full bg-gray-700 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: {progress}%;"></div>
                    </div>
                {/if}
            </div>
        </div>
        {/if}
        <div class="flex flex-col gap-4 h-full {maximizedEditorId !== null ? 'col-span-3' : 'xl:col-span-2 2xl:col-span-1'}">
            {#each serialEditors as editor (editor.id)}
                {#if maximizedEditorId === null || maximizedEditorId === editor.id}
                    {@const title = `⚙️ Serial Editor #${editor.id}`}
                    <Accordion {title} open={true}>
                        <SerialEditor serial={editor.serial} onSerialUpdate={(newSerial) => updateEditorSerial(editor.id, newSerial)} rules={appState.rules} isMaximized={maximizedEditorId === editor.id} />
                        {#snippet actions()}
                            <button onclick={(e) => { e.stopPropagation(); e.preventDefault(); copyUrl(editor); }} class="text-gray-400 hover:text-white transition-colors" aria-label="Copy URL">
                                {#if copiedEditorId === editor.id}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-green-500">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25v8.25A2.25 2.25 0 0 1 18 20.25h-8.25A2.25 2.25 0 0 1 7.5 18v-2.25m8.25-8.25h-6.75" />
                                    </svg>
                                {/if}
                            </button>
                            <button
                                onclick={(e) => { e.stopPropagation(); e.preventDefault(); removeSerialEditor(editor.id); }}
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
                            <button onclick={(e) => { e.stopPropagation(); e.preventDefault(); toggleMaximize(editor.id); }} class="text-gray-400 hover:text-white transition-colors" aria-label="Maximize/Minimize Editor">
                                {#if maximizedEditorId === editor.id}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v16.5h16.5V3.75H3.75z" />
                                    </svg>
                                {/if}
                            </button>
                        {/snippet}
                    </Accordion>
                {/if}
            {/each}
            <div class="flex justify-end">
                <button onclick={addSerialEditor} class="{btnClasses.tertiary} mb-4">+ Add Serial Editor</button>
            </div>
        </div>
    </main>
</div>
