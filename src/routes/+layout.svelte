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
		<HeaderGlobalAction
			iconDescription="Toggle theme"
			on:click={toggleTheme}
			hideTooltip={true}
			icon={$theme === 'g100' ? Sun : Moon}
		/>
	</HeaderUtilities>
</Header>

<Content>
	<slot />
</Content>

<footer class="text-light-primary dark:text-dark-primary py-4 text-center text-sm">
	Version: {page.data.version}
</footer>
