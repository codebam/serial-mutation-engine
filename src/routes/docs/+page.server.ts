export async function load({ fetch }) {
	const response = await fetch('/docs');
	const { comments } = await response.json();

	return {
		comments: comments
	};
}
