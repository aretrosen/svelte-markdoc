<script lang="ts">
	import Callout from './components/callout.svelte';
	import Counter from './components/counter.svelte';
	import CopyCode from './components/copycode.svelte';

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

	const components: Record<string, any> = { Callout, Counter, CopyCode };
</script>

{#each children as child}
	{#if typeof child === 'string' || typeof child === 'number'}
		{child.toString()}
	{:else if voidElements.has(child.name)}
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
