<script lang="ts">
	import Callout from './components/callout.svelte';
	import Counter from './components/counter.svelte';

	let { children }: any = $props();

	const components: Record<string, any> = { Callout, Counter };
</script>

{#each children as child}
	{#if components[child.name]}
		<svelte:component this={components[child.name]} {...child.attributes}>
			<svelte:self children={child.children} />
		</svelte:component>
	{:else}
		<svelte:element this={child.name} {...child.attributes}>
			<svelte:self children={child.children} />
		</svelte:element>
	{/if}

	{#if typeof child === 'string'}
		{child}
	{/if}
{/each}
