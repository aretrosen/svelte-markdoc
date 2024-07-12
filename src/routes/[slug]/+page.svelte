<script lang="ts">
	import MarkdocRenderer from '$lib/markdoc/renderer.svelte'
	import Toc from '$lib/markdoc/components/toc.svelte';

	let { data } = $props()
</script>

<Toc headings={data.toc} />
<MarkdocRenderer children={JSON.parse(data.children)} />
