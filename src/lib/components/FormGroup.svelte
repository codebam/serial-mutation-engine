<script lang="ts">
	import { FormGroup } from 'carbon-components-svelte';
	let { legendText, children } = $props();
</script>

<FormGroup {legendText}>
	{@render children()}
</FormGroup>
