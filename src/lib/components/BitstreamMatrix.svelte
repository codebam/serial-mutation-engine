<script lang="ts">
	let { bits } = $props<{ bits: number[] }>();
</script>

<div class="matrix-container">
	<div class="grid-container">
		{#each bits as bit, i}
			<span class="bit" style="--delay: {i * 0.01}s">{bit}</span>
		{/each}
	</div>
</div>

<style>
	.matrix-container {
		background-color: #000;
		color: #0f0;
		font-family: 'monospace';
		padding: 1rem;
		overflow: hidden;
		position: relative;
		height: 100%;
	}

	.grid-container {
		display: grid;
		grid-template-columns: repeat(32, 1fr);
		gap: 2px;
	}

	.bit {
		display: inline-block;
		animation: fall 0.5s ease-out forwards;
		opacity: 0;
		transform: translateY(-20px);
		animation-delay: var(--delay);
	}

	@keyframes fall {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
