<script>
    export let message;
</script>

<li class={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
    <div
        class={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user" ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-200 text-gray-800 rounded-bl-none"}`}
    >
        {message.role}: {message.content}
    </div>
</li>
