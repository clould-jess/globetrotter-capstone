"use client";
import { useEffect, useRef, useState } from "react";
import { ChatIcon } from "./chat-icons";
import { useChatLanguage } from "@/lib/chat";

export function PhotoCapture({ disabled, onCapture, compact = false }: { disabled: boolean; onCapture: (file: File) => void; compact?: boolean }) {
  const { t } = useChatLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  function close() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (video.current) video.current.srcObject = null; dialog.current?.close(); setOpen(false); }
  async function start() {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices) { setError("La caméra nécessite HTTPS. Utilisez le bouton photo mobile ou joignez un fichier."); return; }
    setPending(true);
    try {
      const input = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!mounted.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input; setOpen(true); dialog.current?.showModal();
      if (video.current) { video.current.srcObject = input; await video.current.play(); }
    } catch { stream.current?.getTracks().forEach(track => track.stop()); setOpen(false); setError("Caméra refusée ou indisponible. Vérifiez les autorisations, ou joignez une photo."); }
    finally { if (mounted.current) setPending(false); }
  }
  function snap() {
    const frame = video.current;
    if (!frame?.videoWidth) { setError("La caméra se prépare. Réessayez dans un instant."); return; }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2048 / Math.max(frame.videoWidth, frame.videoHeight));
    canvas.width = Math.round(frame.videoWidth * scale); canvas.height = Math.round(frame.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(frame, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => { if (blob && mounted.current) { onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" })); close(); } }, "image/jpeg", .9);
  }
  return <div className={compact ? "photo-capture is-compact" : "photo-capture"}>
    <button type="button" className={compact ? "chat-icon-button" : "button button-outline"} aria-label={t("Ouvrir la caméra","Open camera")} disabled={disabled || pending || open} onClick={() => void start()}>{compact ? <ChatIcon name="camera" /> : pending ? "Ouverture de la caméra…" : "Ouvrir la caméra"}</button>
    <dialog className="camera-dialog" ref={dialog} onCancel={close} aria-label={t("Prendre une photo","Take a photo")}>
    <video ref={video} hidden={!open} muted playsInline aria-label="Aperçu de votre caméra" />
    {open && <div className="media-actions"><button type="button" className="button button-sun" onClick={snap} disabled={disabled || pending}>{t("Prendre cette photo","Capture photo")}</button><button type="button" className="button button-outline" onClick={close}>{t("Fermer la caméra","Close camera")}</button></div>}
    </dialog>
    {error && <p className="chat-error" role="alert">{error}</p>}
  </div>;
}
