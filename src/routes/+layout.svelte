<script lang="ts">
  let { children } = $props()
</script>

<svelte:head>
  <title>Markdoc</title>
</svelte:head>

<main>
  {@render children()}
</main>
