<script lang="ts">
    let { bitSize, onBitSizeChange } = $props<{
        bitSize: number;
        onBitSizeChange: (newBitSize: number) => void;
    }>();
</script>

<div class="flex items-center gap-4">
    <label for="bit-size-slider" class="text-sm font-medium">Bit Size: {bitSize}</label>
    <input
        id="bit-size-slider"
        type="range"
        min="1"
        max="16"
        bind:value={bitSize}
        oninput={(e) => onBitSizeChange(parseInt(e.currentTarget.value))}
        class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
    />
</div>
