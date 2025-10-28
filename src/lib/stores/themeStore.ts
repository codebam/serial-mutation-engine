import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

const initialTheme: Theme = browser ? (localStorage.getItem('theme') as Theme) || 'light' : 'light';

export const theme = writable<Theme>(initialTheme);

theme.subscribe((value) => {
	if (browser) {
		localStorage.setItem('theme', value);
		if (value === 'dark') {
			document.body.classList.add('cds--g100');
		} else {
			document.body.classList.remove('cds--g100');
		}
	}
});

export function toggleTheme() {
	theme.update((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
}
