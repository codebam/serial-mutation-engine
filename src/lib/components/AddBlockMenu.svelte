
<script lang="ts">
    import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2 } from '$lib/types';

    let { onAdd } = $props<{
        onAdd: (token: number) => void;
    }>();
</script>

<div class="flex gap-2">
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={() => onAdd(TOK_VARINT)}>+VARINT</button>
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={() => onAdd(TOK_VARBIT)}>+VARBIT</button>
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={() => onAdd(TOK_PART)}>+PART</button>
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" onclick={() => onAdd(TOK_SEP1)}>+SEP1</button>
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" onclick={() => onAdd(TOK_SEP2)}>+SEP2</button>
</div>
