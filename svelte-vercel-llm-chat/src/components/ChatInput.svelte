<script>
    export let input;
    export let handleSubmit;
</script>

<form
    on:submit={handleSubmit}
    class="flex gap-2 bg-gray-50 border-t border-gray-200 p-3"
>
    <input
        class="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        bind:value={$input}
    />
    <button
        class="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        type="submit">Send</button
    >
</form>
