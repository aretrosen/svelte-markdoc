<script lang="ts">
	import MarkdocRenderer from '$lib/markdoc/renderer.svelte';
	import Toc from '$lib/markdoc/components/toc.svelte';

	let { data } = $props();
</script>

<div
	class="flex flex-col prose w-full px-2 py-4 bg-stone-400 rounded-lg max-w-screen-lg prose-li:list-none"
>
	<Toc headings={data.toc} />
</div>
<aside class="fixed top-1/2 left-4">{data.readingTime}</aside>
<div class="prose flex flex-col w-full px-2 max-w-screen-lg">
	<MarkdocRenderer children={JSON.parse(data.children)} />
</div>
