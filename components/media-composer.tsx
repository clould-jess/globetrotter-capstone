"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { API_BASE, responseMessage } from "@/lib/api";
import { PhotoCapture } from "./photo-capture";

export function MediaComposer({ slug, onSent }: { slug: string; onSent: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [kind, setKind] = useState<"image" | "audio">("image");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const previewUrl = useRef("");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);
  function updateFile(next: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next ? URL.createObjectURL(next) : "";
    setPreview(previewUrl.current); setFile(next);
  }

  function choose(next: File | undefined, mediaKind: "image" | "audio") {
    setError("");
    if (!next) return;
    if (next.size > 12 * 1024 * 1024) { setError("Fichier trop volumineux : 12 Mo maximum."); return; }
    setKind(mediaKind); updateFile(next);
  }

  async function record() {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices || !window.MediaRecorder) {
      setError("Le microphone nécessite HTTPS et un navigateur compatible. Vous pouvez joindre un fichier audio."); return;
    }
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const recordingDevice = new MediaRecorder(input, mimeType ? { mimeType } : undefined);
      recorder.current = recordingDevice;
      const chunks: Blob[] = [];
      recordingDevice.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recordingDevice.onstop = () => {
        input.getTracks().forEach(track => track.stop());
        if (timer.current) clearInterval(timer.current);
        if (!mounted.current) return;
        setRecording(false);
        choose(new File(chunks, "voice-note", { type: recordingDevice.mimeType }), "audio");
      };
      recordingDevice.onerror = () => { setError("Enregistrement interrompu. Réessayez."); input.getTracks().forEach(track => track.stop()); setRecording(false); if (timer.current) clearInterval(timer.current); };
      recordingDevice.start(1000); setRecording(true); setSeconds(0); updateFile(null);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed += 1; setSeconds(elapsed);
        if (elapsed >= 90 && recordingDevice.state === "recording") recordingDevice.stop();
      }, 1000);
    } catch { stream.current?.getTracks().forEach(track => track.stop()); setError("Microphone refusé ou indisponible. Vérifiez les autorisations de votre navigateur."); }
  }

  async function send() {
    if (!file || busy) return;
    setBusy(true); setError("");
    const data = new FormData(); data.set("file", file); data.set("kind", kind); data.set("body", caption);
    try {
      const response = await fetch(`${API_BASE}/community/rooms/${encodeURIComponent(slug)}/attachments`, { method: "POST", credentials: "include", body: data });
      if (!response.ok) throw new Error(await responseMessage(response));
      updateFile(null); setCaption(""); onSent();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Envoi impossible."); }
    finally { setBusy(false); }
  }

  return <div className="media-composer">
    <PhotoCapture disabled={busy || recording} onCapture={file => choose(file, "image")} />
    <div className="media-actions">
      <label className="button button-outline">Prendre une photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy || recording} onChange={e => { choose(e.target.files?.[0], "image"); e.target.value = ""; }} /></label>
      <label className="button button-outline">Joindre une photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || recording} onChange={e => { choose(e.target.files?.[0], "image"); e.target.value = ""; }} /></label>
      <button type="button" className="button button-outline" disabled={busy} onClick={() => recording ? recorder.current?.stop() : void record()}>{recording ? `■ Arrêter · ${seconds}s / 90s` : "Enregistrer un vocal"}</button>
      <label className="button button-outline">Joindre un audio<input type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/wav,.m4a" disabled={busy || recording} onChange={e => { choose(e.target.files?.[0], "audio"); e.target.value = ""; }} /></label>
    </div>
    <small>Photos : 12 Mo max. Vocaux : 90 secondes max. Prévisualisez avant d’envoyer. Les membres du salon peuvent consulter vos publications.</small>
    {file && <div className="media-preview">
      {preview && (kind === "image" ? <img src={preview} alt="Photo à envoyer" /> : <audio src={preview} controls preload="metadata" />)}
      <label>Légende (facultatif)<input maxLength={1000} value={caption} onChange={e => setCaption(e.target.value)} disabled={busy} /></label>
      <button type="button" className="button button-sun" onClick={() => void send()} disabled={busy}>{busy ? "Traitement et envoi…" : "Envoyer le fichier"}</button>
      <button type="button" className="button button-outline" onClick={() => updateFile(null)} disabled={busy}>Annuler</button>
    </div>}
    {error && <p role="alert" className="chat-error">{error}</p>}
  </div>;
}
