"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";
import { ChatMessage, chatJson, chatRequest, useChatLanguage } from "@/lib/chat";
import { useAuth } from "./auth-provider";
import { ChatIcon } from "./chat-icons";
import { MediaComposer } from "./media-composer";
import { PlaceReviews } from "./place-reviews";

function MessageBubble({ message, own, onReply, onActions }: { message: ChatMessage; own: boolean; onReply: () => void; onActions: () => void }) {
  const { t, language } = useChatLanguage();
  const start = useRef<{ x: number; y: number } | null>(null);
  const offset = useRef(0);
  const [drag, setDrag] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  return <article id={"msg-"+message.id} className={"message-row"+(own ? " own" : "")}
    onPointerDown={e => {
      if (e.button !== 0 || (e.target as HTMLElement).closest("button,a,audio,summary")) return;
      start.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={e => {
      if (!start.current) return;
      const dx = e.clientX-start.current.x, dy = Math.abs(e.clientY-start.current.y);
      offset.current = dy < 30 ? Math.max(0,Math.min(dx,64)) : 0;
      setDrag(offset.current);
    }}
    onPointerUp={() => { if (offset.current >= 48) onReply(); start.current = null; offset.current = 0; setDrag(0); }}
    onPointerCancel={() => { start.current = null; offset.current = 0; setDrag(0); }}>
    {!own && <span className="message-avatar" aria-hidden="true">{message.display_name.slice(0,1).toUpperCase()}</span>}
    <div className="message-content" style={drag ? { transform: "translateX("+drag+"px)" } : undefined}>
      {!own && <strong className="message-author">{message.display_name}</strong>}
      <div className="message-bubble">
        {message.is_reply && <blockquote className="message-quote">
          {message.reply ? <><strong>{message.reply.display_name}</strong><span>{message.reply.body || (message.reply.media_kind === "image" ? t("Photo","Photo") : t("Message vocal","Voice message"))}</span></> : <span>{t("Message cité supprimé ou masqué","Quoted message deleted or hidden")}</span>}
        </blockquote>}
        {message.body && <p>{message.body}</p>}
        {message.media_kind === "image" && <a href={API_BASE+"/community/media/"+message.id} target="_blank" rel="noreferrer"><img className="message-photo" src={API_BASE+"/community/media/"+message.id} alt={message.body || t("Photo de ","Photo from ")+message.display_name} loading="lazy" onError={() => setMediaError(true)} /></a>}
        {message.media_kind === "audio" && <audio className="message-audio" controls preload="none" src={API_BASE+"/community/media/"+message.id} aria-label={t("Vocal de ","Voice message from ")+message.display_name} onError={() => setMediaError(true)} />}
        {mediaError && <small role="status">{t("Média indisponible. Réessayez après reconnexion.","Media unavailable. Try again when connected.")}</small>}
        <time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString(language)}>{new Date(message.created_at).toLocaleTimeString(language,{hour:"2-digit",minute:"2-digit"})}</time>
      </div>
      <div className="message-tools">
        <button className="chat-icon-button" type="button" aria-label={t("Répondre à ","Reply to ")+message.display_name} onClick={onReply}><ChatIcon name="reply" /></button>
        <button className="chat-icon-button" type="button" aria-label={t("Actions du message de ","Message actions for ")+message.display_name} onClick={onActions}><ChatIcon name="more" /></button>
      </div>
    </div>
    {drag > 20 && <span className="swipe-hint" aria-hidden="true"><ChatIcon name="reply" /></span>}
  </article>;
}

export function DestinationChat({ slug, destinationName, subtitle, onBack, onManage }: {
  slug: string; destinationName: string; subtitle?: string; onBack?: () => void; onManage?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useChatLanguage();
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const [reply,setReply] = useState<ChatMessage | null>(null);
  const [loading,setLoading] = useState(true);
  const [olderBusy,setOlderBusy] = useState(false);
  const [hasOlder,setHasOlder] = useState(false);
  const [error,setError] = useState("");
  const [denied,setDenied] = useState(false);
  const [follow,setFollow] = useState(true);
  const [selected,setSelected] = useState<ChatMessage | null>(null);
  const [reason,setReason] = useState("");
  const [reportOpen,setReportOpen] = useState(false);
  const [actionBusy,setActionBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const followBottom = useRef(true);
  const revision = useRef(0);
  const mounted = useRef(true);
  const readBusy = useRef(false);
  const hydrated = useRef(false);
  const PAGE = 80;

  const load = useCallback(async (signal?: AbortSignal, reset = false) => {
    if (readBusy.current && !reset) return;
    readBusy.current = true;
    const version = revision.current;
    try {
      const latest = await chatRequest<ChatMessage[]>("/rooms/"+slug+"/messages?limit="+PAGE,{signal});
      if (!mounted.current || signal?.aborted || version !== revision.current) return;
      setDenied(false); setError("");
      if (reset || !hydrated.current) setHasOlder(latest.length === PAGE);
      hydrated.current = true;
      setMessages(previous => {
        if (!previous.length || reset) return latest;
        const first = latest[0];
        if (!first) return [];
        const older = previous.filter(m => m.created_at < first.created_at || (m.created_at === first.created_at && m.id < first.id));
        return [...older,...latest];
      });
    } catch (caught) {
      if (!mounted.current || signal?.aborted || version !== revision.current) return;
      const status = (caught as {status?:number}).status;
      if ([401,403,404].includes(status ?? 0)) { revision.current += 1; setMessages([]); setReply(null); setDenied(true); dialog.current?.close(); setSelected(null); }
      setError(caught instanceof Error ? caught.message : t("Discussion indisponible.","Conversation unavailable."));
    } finally { readBusy.current = false; if (mounted.current && !signal?.aborted) setLoading(false); }
  },[slug,t]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState !== "hidden") await load(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(() => void tick(),2500);
    };
    timer = setTimeout(() => void tick(),0);
    const wake = () => { if (document.visibilityState === "visible") void load(controller.signal); };
    document.addEventListener("visibilitychange",wake);
    return () => { mounted.current = false; controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange",wake); };
  },[load]);
  useEffect(() => {
    if (followBottom.current) list.current?.scrollTo({top:list.current.scrollHeight,behavior:"auto"});
  },[messages]);
  async function older() {
    if (!messages[0] || olderBusy) return;
    setOlderBusy(true);
    const height = list.current?.scrollHeight ?? 0;
    const version = revision.current;
    try {
      const rows = await chatRequest<ChatMessage[]>("/rooms/"+slug+"/messages?limit="+PAGE+"&before="+messages[0].id);
      if (!mounted.current || version !== revision.current) return;
      followBottom.current = false;
      setHasOlder(rows.length === PAGE);
      setMessages(current => [...rows.filter(m => !current.some(x => x.id === m.id)),...current]);
      requestAnimationFrame(() => { if (list.current) list.current.scrollTop += list.current.scrollHeight-height; });
    } catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : t("Historique indisponible.","History unavailable.")); }
    finally { if (mounted.current) setOlderBusy(false); }
  }
  function openActions(message: ChatMessage) {
    setSelected(message); setReportOpen(false); setReason(""); dialog.current?.showModal();
  }
  async function action(kind: "delete" | "report" | "block") {
    if (!selected || actionBusy) return;
    if (kind === "delete" && !confirm(t("Supprimer ce message et sa pièce jointe ?","Delete this message and its attachment?"))) return;
    if (kind === "block" && !confirm(t("Masquer les messages de cette personne pour vous ? Elle pourra toujours lire les groupes partagés.","Hide this person's messages for you? They can still read shared groups."))) return;
    setActionBusy(true); setError("");
    try {
      const path = "/messages/"+selected.id;
      await chatRequest(kind === "delete" ? path : path+(kind === "report" ? "/report" : "/block-author"),
        kind === "delete" ? {method:"DELETE"} : kind === "report" ? chatJson({reason}) : {method:"POST"});
      revision.current += 1;
      if (kind === "delete") {
        setMessages(current => current.filter(m => m.id !== selected.id).map(m => m.reply_to === selected.id ? {...m,reply:null,reply_to:null} : m));
        if (reply?.id === selected.id) setReply(null);
      }
      if (kind === "block") { setMessages([]); setReply(null); void load(undefined,true); }
      setNotice(kind === "report" ? t("Signalement transmis à la modération.","Report sent to moderation.") : kind === "block" ? t("Messages masqués. Vous pouvez débloquer cette personne dans les réglages.","Messages hidden. You can unblock this person in settings.") : t("Message supprimé.","Message deleted."));
      dialog.current?.close();
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("Action impossible.","Action failed.")); dialog.current?.close(); }
    finally { setActionBusy(false); }
  }
  return <div className="messenger-thread">
    <header className="messenger-thread-head">
      {onBack && <button type="button" className="chat-icon-button" aria-label={t("Retour aux conversations","Back to conversations")} onClick={onBack}><ChatIcon name="back" /></button>}
      <span className="thread-avatar" aria-hidden="true">{destinationName.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}</span>
      <div><h2>{destinationName}</h2><p>{subtitle || t("Discussion de destination","Destination conversation")}</p></div>
      {onManage && <button type="button" className="chat-icon-button" aria-label={t("Informations du groupe","Group information")} onClick={onManage}><ChatIcon name="more" /></button>}
    </header>
    {notice && <div className="messenger-notice" role="status"><span>{notice}</span><button type="button" className="chat-icon-button" onClick={() => setNotice("")} aria-label={t("Fermer la notification","Dismiss notification")}><ChatIcon name="close" /></button></div>}
    <div className="messenger-history" ref={list} role="log" aria-label={t("Messages","Messages")} aria-live="polite" aria-relevant="additions" onScroll={() => {
      const el = list.current;
      if (el) { followBottom.current = el.scrollHeight-el.scrollTop-el.clientHeight < 90; setFollow(followBottom.current); }
    }}>
      {hasOlder && <button type="button" className="history-button" disabled={olderBusy} onClick={() => void older()}>{olderBusy ? t("Chargement…","Loading…") : t("Messages précédents","Earlier messages")}</button>}
      {loading ? <div className="chat-skeleton" role="status"><span /><span /><span /><p>{t("Chargement de la discussion…","Loading conversation…")}</p></div>
        : !messages.length && !denied && <div className="messenger-empty"><ChatIcon name="people" /><h3>{t("La conversation commence ici","Your conversation starts here")}</h3><p>{t("Un conseil, une question, une idée de sortie : écrivez votre premier message.","A tip, a question, an outing idea: write your first message.")}</p></div>}
      {messages.map(message => <MessageBubble key={message.id} message={message} own={message.user_id === user?.id} onReply={() => setReply(message)} onActions={() => openActions(message)} />)}
    </div>
    {!follow && <button type="button" className="latest-messages" onClick={() => { followBottom.current = true; setFollow(true); list.current?.scrollTo({top:list.current.scrollHeight,behavior:"auto"}); }}><ChatIcon name="down" />{t("Derniers messages","Latest messages")}</button>}
    {error && <div className="messenger-error" role="alert">{error} <button type="button" onClick={() => void load(undefined,true)}>{t("Réessayer","Retry")}</button></div>}
    {user && <MediaComposer key={user.id+":"+slug} slug={slug} userId={user.id} reply={reply} clearReply={() => setReply(null)} disabled={denied || loading} onSent={message => {
      revision.current += 1; followBottom.current = true; setFollow(true);
      setMessages(current => current.some(m => m.id === message.id) ? current : [...current,message]);
    }} />}
    <dialog className="message-dialog" ref={dialog} aria-label={t("Actions du message","Message actions")} onCancel={e => { if (actionBusy) e.preventDefault(); }}>
      <div className="dialog-heading"><h3>{t("Message de ","Message from ")}{selected?.display_name}</h3><button type="button" className="chat-icon-button" disabled={actionBusy} onClick={() => dialog.current?.close()} aria-label={t("Fermer","Close")}><ChatIcon name="close" /></button></div>
      {selected && !reportOpen && <div className="dialog-actions">
        <button type="button" disabled={actionBusy} onClick={() => { setReply(selected); dialog.current?.close(); }}>{t("Répondre","Reply")}</button>
        {(selected.user_id === user?.id || user?.role === "admin") && <button type="button" disabled={actionBusy} onClick={() => void action("delete")}>{t("Supprimer","Delete")}</button>}
        {selected.user_id !== user?.id && <><button type="button" onClick={() => setReportOpen(true)}>{t("Signaler à la modération","Report to moderation")}</button><button type="button" disabled={actionBusy} onClick={() => void action("block")}>{t("Bloquer cette personne pour moi","Block this person for me")}</button></>}
      </div>}
      {reportOpen && <form className="group-form" onSubmit={e => { e.preventDefault(); void action("report"); }}><label>{t("Motif du signalement","Reason for reporting")}<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={500} required /></label><p>{t("La modération pourra consulter ce message signalé.","Moderators will be able to read this reported message.")}</p><button type="submit" disabled={actionBusy}>{t("Transmettre le signalement","Submit report")}</button></form>}
    </dialog>
    {!slug.startsWith("group-") && <PlaceReviews key={slug} slug={slug} />}
  </div>;
}
