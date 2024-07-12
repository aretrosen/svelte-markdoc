<script lang="ts">
    import type { TOCItem } from "../markdocx";

    let {expanded = false, title="Contents", id="contents", ...others} : { expanded?: boolean } & TOCItem = $props();

    const {headings = [], ...attributes} = others;
</script>


<span>
    <button onclick={() => {expanded = !expanded}}>
        {#if expanded}
         C
        {:else}
         O
        {/if}
    </button>
    <a href={`#${id}`} {...attributes}>{title}</a>
</span>

{#if expanded}
    <ul>
        {#each headings as heading (heading.id)}
            <li>
                {#if heading.headings}
                    <svelte:self {...heading} />
                {:else}
                    <a href={`#${heading.id}`} {...attributes}>{heading.title}</a>
                {/if}
            </li>
        {/each}
    </ul>
{/if}