import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch }) => {
    try {
        const response = await fetch('/passives.json');
        if (!response.ok) {
            throw error(response.status, 'Could not load passives.json');
        }
        const passives = await response.json();
        return { passives };
    } catch (err) {
        console.error('Error loading passives.json:', err);
        throw error(500, 'Failed to load passive data');
    }
};