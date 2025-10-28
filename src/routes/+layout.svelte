<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { theme, toggleTheme } from '$lib/stores/themeStore';
	import {
		Header,
		HeaderNav,
		HeaderNavItem,
		HeaderUtilities,
		HeaderGlobalAction,
		Content
	} from 'carbon-components-svelte';
	import { Moon, Sun } from 'carbon-icons-svelte';
</script>

<Header company="Serial Mutation" platformName="Engine">
	<HeaderNav>
		<HeaderNavItem href={resolve('/')} text="Home" />
		<HeaderNavItem href={resolve('/bulk')} text="Bulk Processing" />
	</HeaderNav>
	<HeaderUtilities>
		<HeaderGlobalAction on:click={toggleTheme}>
			{#if $theme === 'g100'}
				<Sun />
			{:else}
				<Moon />
			{/if}
		</HeaderGlobalAction>
	</HeaderUtilities>
</Header>

<Content>
	<slot />
</Content>

<footer class="py-4 text-center text-sm text-light-primary dark:text-dark-primary">
	Version: {page.data.version}
</footer>
