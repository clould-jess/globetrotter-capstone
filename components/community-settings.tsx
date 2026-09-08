"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { chatRequest, useChatLanguage } from "@/lib/chat";
import { useAuth } from "./auth-provider";
import { API_BASE } from "@/lib/api";

type Block = { blocked_id: string; display_name: string };
type Report = { id: string; message_id: string; reason: string; body: string; display_name: string; media_kind: string | null };
export function CommunitySettings({ onChanged }: { onChanged: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { t } = useChatLanguage();
  const [blocks,setBlocks] = useState<Block[]>([]);
  const [reports,setReports] = useState<Report[]>([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [nextBlocks,nextReports] = await Promise.all([
        chatRequest<Block[]>("/blocks"),
        isAdmin ? chatRequest<Report[]>("/admin/reports") : Promise.resolve([]),
      ]);
      setBlocks(nextBlocks); setReports(nextReports);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("Réglages indisponibles.","Settings unavailable.")); }
    finally { setLoading(false); }
  },[isAdmin,t]);
  useEffect(() => { const timer = setTimeout(() => void load(),0); return () => clearTimeout(timer); },[load]);
  async function act(path: string, method: string) {
    if (busy) return;
    setBusy(true); setError("");
    try { await chatRequest(path,{method}); await load(); onChanged(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("Action impossible.","Action failed.")); }
    finally { setBusy(false); }
  }
  return <section className="community-settings">
    <h2>{t("Personnes bloquées","Blocked people")}</h2>
    <p>{t("Le blocage masque leurs messages pour vous, sans les exclure des groupes partagés.","Blocking hides their messages for you; it does not remove them from shared groups.")}</p>
    {loading && <p role="status">{t("Chargement…","Loading…")}</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !blocks.length && <p>{t("Aucune personne bloquée.","No blocked people.")}</p>}
    <ul>{blocks.map(block => <li key={block.blocked_id}><span>{block.display_name}</span><button type="button" disabled={busy} onClick={() => void act("/blocks/"+block.blocked_id,"DELETE")}>{t("Débloquer","Unblock")}</button></li>)}</ul>
    {user?.role === "admin" && <div><h2>{t("Signalements à traiter","Reports to review")}</h2>
      {!loading && !reports.length && <p>{t("Aucun signalement en attente.","No pending reports.")}</p>}
      {reports.map(report => <article className="moderation-report" key={report.id}><strong>{report.display_name}</strong><p>{report.body || t("Pièce jointe signalée","Reported attachment")}</p><p>{t("Motif : ","Reason: ")}{report.reason}</p>
        {report.media_kind === "image" && <img className="message-photo" src={API_BASE+"/community/admin/reports/"+report.id+"/media"} alt={t("Photo signalée","Reported photo")} loading="lazy" />}
        {report.media_kind === "audio" && <audio controls preload="none" src={API_BASE+"/community/admin/reports/"+report.id+"/media"} aria-label={t("Vocal signalé","Reported voice message")} />}
        <button type="button" disabled={busy} onClick={() => void act("/admin/reports/"+report.id+"/resolve","POST")}>{t("Classer le signalement","Resolve report")}</button>
        <button type="button" disabled={busy} onClick={() => { if (confirm(t("Supprimer le message signalé et sa pièce jointe ?","Delete the reported message and attachment?"))) void act("/messages/"+report.message_id,"DELETE"); }}>{t("Supprimer le message","Delete message")}</button>
      </article>)}
    </div>}
  </section>;
}
