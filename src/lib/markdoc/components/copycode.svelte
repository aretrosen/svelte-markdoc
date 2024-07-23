<script lang="ts">
	import Clipboard from '$lib/icons/clipboard.svelte';
	import ClipboardClicked from '$lib/icons/clipboard-clicked.svelte';
	let clicked = $state(false);
	function copyToClipboard(event: any) {
		clicked = true;
		const code = event.currentTarget.parentNode.nextElementSibling;
		navigator.clipboard.writeText(code.textContent);
	}
</script>

<div class="relative">
	<button onclick={copyToClipboard} class="absolute top-0 right-0">
		{#if clicked}
			<ClipboardClicked />
		{:else}
			<Clipboard />
		{/if}
	</button>
</div>
