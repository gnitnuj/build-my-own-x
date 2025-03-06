<script>
    import { useChat } from "@ai-sdk/svelte";
    import Message from "../components/Message.svelte";
    import ChatInput from "../components/ChatInput.svelte";
    // TODO: Try out Svelte5 reactive store
    const { input, handleSubmit, messages } = useChat();

    // Note to self: Interesting way to inspect state
    // $inspect(messages).with(console.trace);
</script>

<main>
    <div class="flex justify-center items-center min-h-screen bg-gray-100 p-4">
        <div
            class="flex flex-col w-full max-w-2xl h-[80vh] rounded-lg shadow overflow-hidden"
        >
            <div class="flex-1 overflow-y-auto bg-white p-4">
                <ul class="space-y-4">
                    {#each $messages as message}
                        <Message {message} />
                    {/each}
                </ul>
            </div>
        </div>
    </div>

    <ChatInput {input} {handleSubmit} />
</main>
