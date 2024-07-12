<script lang="ts">
	import Callout from './components/callout.svelte';
	import Counter from './components/counter.svelte';

	let { children }: any = $props();

	const voidElements = new Set([
		'area',
		'base',
		'br',
		'col',
		'embed',
		'hr',
		'input',
		// TODO: img needs to comment out if I can use enhanced:img somehow
		'img',
		'link',
		'meta',
		'source',
		'track',
		'wbr'
	]);

	const components: Record<string, any> = { Callout, Counter };
</script>

{#each children as child}
	{#if typeof child === 'string' || typeof child === 'number'}
		{child.toString()}
	{/if}

	<!-- {#if child.name === 'img'}
		<enhanced:img
			{...child.attributes}
			sizes="(min-width:1920px) 1280px, (min-width:1080px) 640px, (min-width:768px) 400px"
			fetchpriority="high"
			loading="eager"
		></enhanced:img> -->
	{#if voidElements.has(child.name)}
		<svelte:element this={child.name} {...child.attributes} />
	{:else if components[child.name]}
		<svelte:component this={components[child.name]} {...child.attributes}>
			<svelte:self children={child.children} />
		</svelte:component>
	{:else}
		<svelte:element this={child.name} {...child.attributes}>
			<svelte:self children={child.children} />
		</svelte:element>
	{/if}
{/each}
