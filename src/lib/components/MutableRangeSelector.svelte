<script lang="ts">
    import FormGroup from "./FormGroup.svelte";

    export let seed: string;
    export let start: number;
    export let end: number;
    export let inputClasses: string | undefined = undefined;
    export let isMerging: boolean | undefined = undefined;

    let lastSeed = seed;
    $: if (seed !== lastSeed) {
        start = seed.length;
        end = seed.length;
        lastSeed = seed;
    }

    function handleRangeChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const { name, value } = target;
        let intValue = parseInt(value, 10);
        if (isNaN(intValue)) intValue = name === 'start' ? start : end;

        let newStart = name === 'start' ? intValue : start;
        let newEnd = name === 'end' ? intValue : end;

        if (newStart < 0) newStart = 0;
        if (newEnd > seed.length) newEnd = seed.length;
        if (newStart > newEnd) {
            if (name === 'start') newStart = newEnd;
            else newEnd = newStart;
        }

        start = newStart;
        end = newEnd;
    }

    $: protectedPrefix = seed.substring(0, start);
    $: mutablePart = seed.substring(start, end);
    $: protectedSuffix = seed.substring(end);
</script>

<FormGroup label="Mutable Character Range">
    <div class="font-mono text-xs p-3 bg-gray-900 border border-gray-700 rounded-md break-all">
        <span class="text-gray-500" title="Protected Prefix">
            {protectedPrefix}
        </span>
        <span class="bg-blue-900 text-blue-300 rounded-sm" title="Mutable Part">
            {mutablePart}
        </span>
        <span class="text-gray-500" title="Protected Suffix">
            {protectedSuffix}
        </span>
    </div>
    <div class="grid grid-cols-2 gap-4">
        <FormGroup label="Start Index">
            <input
                type="number"
                name="start"
                bind:value={start}
                on:change={handleRangeChange}
                class={inputClasses}
                min="0"
                max={seed.length}
                disabled={isMerging}
            />
        </FormGroup>
        <FormGroup label="End Index">
            <input
                type="number"
                name="end"
                bind:value={end}
                on:change={handleRangeChange}
                class={inputClasses}
                min="0"
                max={seed.length}
                disabled={isMerging}
            />
        </FormGroup>
    </div>
</FormGroup>
