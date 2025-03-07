<script>
	import { onMount } from 'svelte';

	const TOTAL_BOXES = 1_000_000_000;
	const GRID_WIDTH = 50;
	const GRID_HEIGHT = 50;
	const CHUNK_SIZE = GRID_WIDTH * GRID_HEIGHT;

	let checkboxStates = new Map();
	let userCheckedCount = TOTAL_BOXES;
	let visibleChunks = 5;

	function getCheckboxState(index) {
		const chunkIndex = Math.floor(index / CHUNK_SIZE);
		const localIndex = index % CHUNK_SIZE;

		if (!checkboxStates.has(chunkIndex)) {
			checkboxStates.set(chunkIndex, new Uint8Array(CHUNK_SIZE).fill(1));
		}

		return checkboxStates.get(chunkIndex)[localIndex] === 1;
	}

	function setCheckboxState(index, state) {
		console.log(setCheckboxState);
		console.log(index);
		const chunkIndex = Math.floor(index / CHUNK_SIZE);
		const localIndex = index % CHUNK_SIZE;

		if (!checkboxStates.has(chunkIndex)) {
			checkboxStates.set(chunkIndex, new Uint8Array(CHUNK_SIZE).fill(1));
		}

		const chunk = checkboxStates.get(chunkIndex);
		const oldState = chunk[localIndex];
		chunk[localIndex] = state ? 1 : 0;

		userCheckedCount += state ? 1 : -1;
	}

	function handleCheckboxClick(index) {
		const newState = !getCheckboxState(index);
		setCheckboxState(index, newState);
	}

	function handleScroll(event) {
		const { scrollTop, scrollHeight, clientHeight } = event.target;
		if (scrollHeight - scrollTop - clientHeight < 200) {
			visibleChunks += 1;
		}
	}

	onMount(() => {
		const container = document.querySelector('.grid-container');
		if (container) {
			container.addEventListener('scroll', handleScroll);
		}
	});
</script>

<main>
	<div class="counter">
		You checked {userCheckedCount.toLocaleString()} out of {TOTAL_BOXES.toLocaleString()} boxes
	</div>

	<div class="grid-container">
		{#each Array(visibleChunks) as _, chunkIndex}
			<div class="grid-chunk">
				{#each Array(GRID_HEIGHT) as _, row}
					<div class="grid-row">
						{#each Array(GRID_WIDTH) as _, col}
							{@const index = chunkIndex * CHUNK_SIZE + row * GRID_WIDTH + col}
							{#if index < TOTAL_BOXES}
								<div
									class="checkbox"
									class:checked={getCheckboxState(index)}
									on:click={() => handleCheckboxClick(index)}
								>
									{#if getCheckboxState(index)}
										<span class="checkmark">✓</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		{/each}
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
			'Helvetica Neue', sans-serif;
		background-color: #f0f0f0;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.counter {
		text-align: right;
		margin-bottom: 10px;
		font-size: 0.9rem;
		position: sticky;
		top: 0;
		background-color: rgba(240, 240, 240, 0.9);
		padding: 10px;
		z-index: 10;
	}

	.grid-container {
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		height: calc(100vh - 100px);
		overflow-y: auto;
	}

	.grid-row {
		display: grid;
		grid-template-columns: repeat(50, 1fr);
		gap: 1px;
	}

	.checkbox {
		aspect-ratio: 1;
		border: 1px solid #ccc;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		background-color: white;
		transition: background-color 0.1s;
	}

	.checkbox.checked {
		background-color: #e8f5e9;
	}

	.checkmark {
		color: #4caf50;
		font-weight: bold;
	}
</style>
