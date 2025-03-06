<script>
    import { useChat } from "@ai-sdk/svelte";

    const { input, handleSubmit, messages } = useChat();
</script>

<main>
    <div class="flex justify-center items-center min-h-screen bg-gray-100 p-4">
        <div
            class="flex flex-col w-full max-w-2xl h-[80vh] rounded-lg shadow overflow-hidden"
        >
            <div class="flex-1 overflow-y-auto bg-white p-4">
                <ul class="space-y-4">
                    {#each $messages as message}
                        <li
                            class={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                class={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user" ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-200 text-gray-800 rounded-bl-none"}`}
                            >
                                {message.role}: {message.content}
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    </div>
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
</main>
