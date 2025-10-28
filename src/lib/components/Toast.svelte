<script lang="ts">
  import { ToastNotification } from "carbon-components-svelte";
  let { title, subtitle, caption, kind, show } = $props();
</script>

{#if show}
  <ToastNotification
    {title}
    {subtitle}
    {caption}
    {kind}
    on:close={() => (show = false)}
  />
{/if}
