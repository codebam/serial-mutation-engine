<script lang="ts">
    let { label, children } = $props();
    const id = `form-group-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="flex flex-col gap-2">
    <label for={id} class="font-medium text-gray-400 text-sm">{label}</label>
    <div id={id}>
        {@render children()}
    </div>
</div>