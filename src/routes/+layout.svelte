<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Markdoc</title>
</svelte:head>

<main class="flex flex-col items-center justify-center gap-y-6">
	{@render children()}
</main>
