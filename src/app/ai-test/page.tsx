"use client";

import { useState } from "react";

export default function AITestPage() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);
    setReply("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        setReply(data.reply);
      } else {
        setReply("No response received.");
      }
    } catch (error) {
      console.error(error);
      setReply("Error talking to AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        OpenAI API Test
      </h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask something..."
        className="w-full border rounded-lg p-4 min-h-[150px]"
      />

      <button
        onClick={sendMessage}
        disabled={loading}
        className="bg-black text-white px-6 py-3 rounded-lg"
      >
        {loading ? "Thinking..." : "Send"}
      </button>

      <div className="border rounded-lg p-4 min-h-[120px]">
        <h2 className="font-semibold mb-2">
          Response:
        </h2>

        <p className="whitespace-pre-wrap">
          {reply}
        </p>
      </div>
    </div>
  );
}