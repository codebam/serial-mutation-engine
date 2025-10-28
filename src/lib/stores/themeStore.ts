import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'g100' | 'white';

const initialTheme: Theme = browser ? (localStorage.getItem('theme') as Theme) || 'g100' : 'g100';

export const theme = writable<Theme>(initialTheme);

theme.subscribe((value) => {
	if (browser) {
		localStorage.setItem('theme', value);
		document.cookie = `theme=${value}; path=/; max-age=31536000`;
		document.documentElement.setAttribute('theme', value);
	}
});

export function toggleTheme() {
	theme.update((currentTheme) => (currentTheme === 'g100' ? 'white' : 'g100'));
}
