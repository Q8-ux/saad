import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app/legal-office-app.tsx", import.meta.url);
let source = await readFile(path, "utf8");
const oldLine = '<form className="whatsapp-reply" onSubmit={async (event) => { event.preventDefault(); if (!text.trim()) return; setPhone(selectedConversation.waId); await sendMessage(event); }}>';
const newBlock = `<form className="whatsapp-reply" onSubmit={async (event) => {
                  event.preventDefault();
                  if (!text.trim() || sending) return;
                  setSending(true);
                  try {
                    const result = await readJson<{ ok: boolean; conversationId: string }>(
                      await fetch("/api/whatsapp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "send",
                          to: selectedConversation.waId,
                          text,
                          clientId: selectedConversation.clientId,
                          caseId: selectedConversation.caseId,
                        }),
                      }),
                    );
                    setText("");
                    await loadSnapshot(true);
                    await loadMessages(result.conversationId);
                    onToast(t("تم إرسال رسالة واتساب."));
                  } catch (error) {
                    onToast(t(error instanceof Error ? error.message : "تعذّر إرسال رسالة واتساب"));
                  } finally {
                    setSending(false);
                  }
                }}>`;

if (!source.includes(newBlock)) {
  if (!source.includes(oldLine)) throw new Error("WhatsApp direct-reply patch target not found.");
  source = source.replace(oldLine, newBlock);
  await writeFile(path, source, "utf8");
  console.log("Applied WhatsApp direct-conversation reply fix.");
} else {
  console.log("WhatsApp direct-conversation reply fix already applied.");
}
