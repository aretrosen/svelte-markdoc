<script lang="ts">
	import Clipboard from '$lib/icons/clipboard.svelte';
	import ClipboardClicked from '$lib/icons/clipboard-clicked.svelte';
	let clicked = $state(false);
	let timeoutid: NodeJS.Timeout;
	function copyToClipboard(event: any) {
		if (timeoutid) {
			clearTimeout(timeoutid);
		}
		clicked = true;
		const code = event.currentTarget.parentNode.nextElementSibling;
		navigator.clipboard.writeText(code.textContent);
		timeoutid = setTimeout(() => (clicked = false), 3000);
	}
</script>

<div class="relative">
	<button onclick={copyToClipboard} class="absolute top-0 right-0">
		{#if clicked}
			<ClipboardClicked class="text-lg" />
		{:else}
			<Clipboard class="text-lg" />
		{/if}
	</button>
</div>
