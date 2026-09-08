"use client";
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useRef, useState } from "react";
import { ChatMessage, chatJson, chatRequest, useChatLanguage } from "@/lib/chat";
import { ChatIcon } from "./chat-icons";
import { PhotoCapture } from "./photo-capture";

type Props = {
  slug: string; userId: string; reply: ChatMessage | null;
  clearReply: () => void; onSent: (message: ChatMessage) => void; disabled?: boolean;
};
export function MediaComposer({ slug, userId, reply, clearReply, onSent, disabled = false }: Props) {
  const { t } = useChatLanguage();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [kind, setKind] = useState<"image" | "audio">("image");
  const [recording, setRecording] = useState(false);
  const [pendingMic, setPendingMic] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [extras, setExtras] = useState(false);
  const [emojis, setEmojis] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const photos = useRef<HTMLInputElement>(null);
  const audioFile = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const micPending = useRef(false);
  const previewUrl = useRef("");
  const discardRecording = useRef(false);
  const draftKey = "cameroon-chat-draft:" + userId + ":" + slug;

  useEffect(() => {
    mounted.current = true;
    const restore = setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(draftKey) || "null");
        if (saved && Date.now() - saved.at < 86400000 && typeof saved.body === "string") setBody(saved.body.slice(0,1000));
      } catch { /* Storage can be disabled in private browsing. */ }
    }, 0);
    return () => {
      mounted.current = false; clearTimeout(restore);
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, [draftKey]);
  useEffect(() => { if (reply) textarea.current?.focus(); }, [reply]);
  useEffect(() => {
    const input = textarea.current;
    if (input) { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight,112) + "px"; }
  }, [body]);

  function changeBody(value: string) {
    setBody(value);
    try {
      if (value) sessionStorage.setItem(draftKey, JSON.stringify({ body: value, at: Date.now() }));
      else sessionStorage.removeItem(draftKey);
    } catch { /* Draft remains in memory. */ }
  }
  function updateFile(next: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next ? URL.createObjectURL(next) : "";
    setPreview(previewUrl.current); setFile(next);
  }
  function choose(next: File | undefined, mediaKind: "image" | "audio") {
    if (!next) return;
    setError("");
    if (next.size > 12 * 1024 * 1024) { setError(t("Fichier trop volumineux : 12 Mo maximum.", "File too large: maximum 12 MB.")); return; }
    setKind(mediaKind); updateFile(next); setExtras(false); textarea.current?.focus();
  }
  async function record() {
    if (micPending.current || recording || inFlight.current || disabled) return;
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices || !window.MediaRecorder) {
      setError(t("Microphone indisponible. Vous pouvez joindre un fichier audio avec +.", "Microphone unavailable. Attach an audio file using +.")); return;
    }
    micPending.current = true; setPendingMic(true); discardRecording.current = false;
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const device = new MediaRecorder(input, mimeType ? { mimeType } : undefined);
      recorder.current = device;
      const chunks: Blob[] = [];
      let bytes = 0;
      device.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes > 12 * 1024 * 1024 && device.state === "recording") device.stop();
      };
      device.onstop = () => {
        input.getTracks().forEach(track => track.stop());
        if (timer.current) clearInterval(timer.current);
        if (!mounted.current) return;
        setRecording(false);
        if (!discardRecording.current && chunks.length) choose(new File(chunks,"voice-note",{ type: device.mimeType }),"audio");
      };
      device.onerror = () => {
        discardRecording.current = true;
        input.getTracks().forEach(track => track.stop());
        if (timer.current) clearInterval(timer.current);
        if (mounted.current) { setRecording(false); setError(t("Enregistrement interrompu. Réessayez.", "Recording interrupted. Try again.")); }
      };
      device.start(1000); setRecording(true); setSeconds(0); updateFile(null); setExtras(false);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed += 1; setSeconds(elapsed);
        if (elapsed >= 90 && device.state === "recording") device.stop();
      },1000);
    } catch {
      stream.current?.getTracks().forEach(track => track.stop());
      if (mounted.current) setError(t("Microphone refusé ou indisponible. Vérifiez les autorisations du navigateur.", "Microphone denied or unavailable. Check browser permissions."));
    } finally { micPending.current = false; if (mounted.current) setPendingMic(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if ((!body.trim() && !file) || inFlight.current || recording || disabled) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      let message: ChatMessage;
      if (file) {
        const data = new FormData();
        data.set("file",file); data.set("kind",kind); data.set("body",body.trim());
        if (reply) data.set("reply_to",reply.id);
        message = await chatRequest<ChatMessage>("/rooms/"+slug+"/attachments", { method: "POST", body: data });
      } else {
        message = await chatRequest<ChatMessage>("/rooms/"+slug+"/messages", chatJson({ body: body.trim(), reply_to: reply?.id ?? null }));
      }
      if (mounted.current) { changeBody(""); updateFile(null); clearReply(); onSent(message); textarea.current?.focus(); }
    } catch (caught) {
      if (mounted.current) setError(caught instanceof TypeError
        ? t("Connexion interrompue. Vérifiez la discussion avant de réessayer ; votre saisie est conservée.", "Connection interrupted. Check the conversation before retrying; your draft is kept.")
        : caught instanceof Error ? caught.message : t("Envoi impossible.", "Unable to send."));
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  const locked = busy || recording || pendingMic || disabled;
  return <form className="messenger-composer" onSubmit={event => void send(event)} aria-label={t("Écrire un message","Write a message")}>
    {reply && <div className="reply-preview">
      <ChatIcon name="reply" /><div><strong>{t("Réponse à","Reply to")} {reply.display_name}</strong><span>{reply.body || (reply.media_kind === "image" ? t("Photo","Photo") : t("Message vocal","Voice message"))}</span></div>
      <button className="chat-icon-button" type="button" onClick={clearReply} disabled={busy} aria-label={t("Annuler la réponse","Cancel reply")}><ChatIcon name="close" /></button>
    </div>}
    {file && <div className="attachment-preview">
      {kind === "image" ? <img src={preview} alt={t("Photo à envoyer","Photo to send")} /> : <audio src={preview} controls preload="metadata" />}
      <button type="button" className="chat-icon-button" disabled={busy} onClick={() => updateFile(null)} aria-label={t("Retirer la pièce jointe","Remove attachment")}><ChatIcon name="close" /></button>
      <small>{t("Aperçu avant envoi","Preview before sending")}</small>
    </div>}
    {recording && <div className="recording-strip" role="status">
      <span className="recording-dot" /> <span>{t("Enregistrement","Recording")} · {seconds}s / 90s</span>
      <button type="button" className="chat-icon-button" onClick={() => { discardRecording.current = true; recorder.current?.stop(); }} aria-label={t("Annuler l’enregistrement","Cancel recording")}><ChatIcon name="trash" /></button>
      <button type="button" className="chat-icon-button" onClick={() => recorder.current?.stop()} aria-label={t("Arrêter et écouter","Stop and preview")}><ChatIcon name="stop" /></button>
    </div>}
    {extras && <div className="composer-extras">
      <button type="button" disabled={locked} onClick={() => audioFile.current?.click()}>{t("Joindre un fichier audio","Attach an audio file")}</button>
      <label>{t("Photo avec l’appareil","Photo from your device")}<input type="file" disabled={locked} accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => { choose(e.target.files?.[0],"image"); e.target.value = ""; }} /></label>
      <small>{t("Photos : 12 Mo max. Vocaux : 90 s max.","Photos: up to 12 MB. Voice messages: up to 90 s.")}</small>
    </div>}
    {emojis && <div className="emoji-options" aria-label={t("Émojis","Emoji")}>{["😊","👍","❤️","🎉","🌴","📍","🙏","😂"].map(emoji => <button type="button" disabled={locked} key={emoji} onClick={() => { changeBody((body+emoji).slice(0,1000)); setEmojis(false); textarea.current?.focus(); }}>{emoji}</button>)}</div>}
    <div className="composer-toolbar">
      <button type="button" className="chat-icon-button" disabled={locked} aria-expanded={extras} aria-label={t("Pièces jointes","Attachments")} onClick={() => { setExtras(!extras); setEmojis(false); }}><ChatIcon name="plus" /></button>
      <PhotoCapture disabled={locked} compact onCapture={next => choose(next,"image")} />
      <button type="button" className="chat-icon-button" disabled={locked} aria-label={t("Joindre une photo","Attach a photo")} onClick={() => photos.current?.click()}><ChatIcon name="image" /></button>
      <div className="composer-input">
        <label className="sr-only" htmlFor={"message-"+slug}>{t("Votre message","Your message")}</label>
        <textarea ref={textarea} id={"message-"+slug} value={body} onChange={e => changeBody(e.target.value)} maxLength={1000} rows={1}
          disabled={locked} placeholder={t("Message","Message")} onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); }
          }} />
        <button type="button" className="chat-icon-button emoji-toggle" disabled={locked} aria-expanded={emojis} aria-label={t("Choisir un émoji","Choose an emoji")} onClick={() => { setEmojis(!emojis); setExtras(false); }}><ChatIcon name="smile" /></button>
      </div>
      {body.trim() || file ? <button type="submit" className="chat-icon-button send-button" disabled={locked} aria-label={busy ? t("Envoi en cours","Sending") : t("Envoyer","Send")}><ChatIcon name="send" /></button>
        : <button type="button" className="chat-icon-button mic-button" disabled={locked} onClick={() => void record()} aria-label={pendingMic ? t("Ouverture du microphone","Opening microphone") : t("Enregistrer un vocal","Record a voice message")}><ChatIcon name="mic" /></button>}
    </div>
    <input ref={photos} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e => { choose(e.target.files?.[0],"image"); e.target.value = ""; }} />
    <input ref={audioFile} type="file" hidden accept="audio/webm,audio/ogg,audio/mp4,audio/wav,.m4a" onChange={e => { choose(e.target.files?.[0],"audio"); e.target.value = ""; }} />
    {busy && <p className="composer-status" role="status">{t("Traitement et envoi…","Processing and sending…")}</p>}
    {body.length >= 900 && <small className="composer-status">{body.length}/1000</small>}
    {error && <p className="messenger-error" role="alert">{error}</p>}
  </form>;
}
