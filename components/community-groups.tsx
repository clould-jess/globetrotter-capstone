"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChatGroup, chatJson, chatRequest, useChatLanguage } from "@/lib/chat";
import { DestinationChat } from "./destination-chat";
import { useAuth } from "./auth-provider";
import { ChatIcon } from "./chat-icons";
import { CommunitySettings } from "./community-settings";

type Member = { user_id: string; display_name: string; blocked: boolean; is_owner: boolean };
export function CommunityGroups() {
  const { user } = useAuth();
  const { t } = useChatLanguage();
  const [groups,setGroups] = useState<ChatGroup[]>([]);
  const [name,setName] = useState("");
  const [description,setDescription] = useState("");
  const [privateGroup,setPrivateGroup] = useState(true);
  const [search,setSearch] = useState("");
  const [creating,setCreating] = useState(false);
  const [settings,setSettings] = useState(false);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [active,setActive] = useState<ChatGroup | null>(null);
  const [members,setMembers] = useState<Member[]>([]);
  const [memberLoading,setMemberLoading] = useState(false);
  const [invitation,setInvitation] = useState("");
  const [inviteLink,setInviteLink] = useState("");
  const [notice,setNotice] = useState("");
  const [infoOpen,setInfoOpen] = useState(false);
  const info = useRef<HTMLDialogElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const mutation = useRef(false);

  const load = useCallback(async () => {
    try { setGroups(await chatRequest<ChatGroup[]>("/groups")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("Groupes indisponibles.","Groups unavailable.")); }
    finally { setLoading(false); }
  },[t]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
      const token = new URLSearchParams(window.location.hash.slice(1)).get("invite");
      try {
        const pending = token || sessionStorage.getItem("cameroon-pending-invite");
        if (pending && /^[A-Za-z0-9_-]{40,100}$/.test(pending)) {
          setInvitation(pending); sessionStorage.setItem("cameroon-pending-invite",pending);
        }
      } catch { if (token) setInvitation(token); }
      if (token) history.replaceState(null,"",location.pathname+location.search);
    },0);
    return () => clearTimeout(timer);
  },[load]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      workspace.current?.style.setProperty("--messenger-height",(viewport?.height ?? window.innerHeight)+"px");
      workspace.current?.style.setProperty("--messenger-top",(viewport?.offsetTop ?? 0)+"px");
    };
    resize(); viewport?.addEventListener("resize",resize); viewport?.addEventListener("scroll",resize);
    return () => { viewport?.removeEventListener("resize",resize); viewport?.removeEventListener("scroll",resize); };
  },[]);
  async function perform(work: () => Promise<void>) {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("Vérifiez votre connexion puis réessayez.","Check your connection and try again.")); }
    finally { mutation.current = false; setBusy(false); }
  }
  function dismissInvite() {
    setInvitation("");
    try { sessionStorage.removeItem("cameroon-pending-invite"); } catch { /* Optional storage. */ }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const group = await chatRequest<ChatGroup>("/groups",chatJson({name,description,is_private:privateGroup}));
      setActive(group); setCreating(false); setName(""); setDescription(""); await load();
    });
  }
  async function open(group: ChatGroup) {
    await perform(async () => {
      if (!group.joined) {
        await chatRequest("/groups/"+group.id+"/join",{method:"POST"});
        group = {...group,joined:true,member_count:group.member_count+1};
      }
      setActive(group); await load();
    });
  }
  async function loadMembers(group: ChatGroup) {
    setMemberLoading(true);
    try { setMembers(await chatRequest<Member[]>("/groups/"+group.id+"/members")); }
    finally { setMemberLoading(false); }
  }
  function manage() {
    if (!active) return;
    setMembers([]); setInviteLink(""); setNotice(""); setError("");
    setInfoOpen(true); info.current?.showModal();
    void perform(() => loadMembers(active));
  }
  const owner = active?.owner_id === user?.id;
  const visible = groups.filter(g => (g.name+" "+g.description).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <section className="messaging-section" aria-label={t("Messagerie","Messaging")}>
    <div className="messaging-title"><div><h1>{t("Discussions","Conversations")}</h1><p>{t("Des conseils, des rencontres et des sorties à partager.","Share tips, meet people and plan outings.")}</p></div><button type="button" onClick={() => setSettings(!settings)}>{t("Réglages","Settings")}</button></div>
    {settings && <CommunitySettings onChanged={() => { setActive(null); void load(); }} />}
    {invitation && <div className="invitation-prompt"><div><strong>{t("Vous avez reçu une invitation","You received an invitation")}</strong><p>{t("En acceptant, votre nom sera visible des membres du groupe.","By accepting, your name will be visible to the group members.")}</p></div>
      <button type="button" disabled={busy} onClick={() => void perform(async () => {
        const group = await chatRequest<ChatGroup>("/groups/invitations/accept",chatJson({token:invitation}));
        setActive(group); dismissInvite(); await load();
      })}>{t("Accepter et rejoindre","Accept and join")}</button><button type="button" disabled={busy} onClick={dismissInvite}>{t("Ignorer","Dismiss")}</button>
    </div>}
    {error && !infoOpen && <p className="messenger-error" role="alert">{error}</p>}
    <div ref={workspace} className={"messenger-workspace"+(active ? " has-active" : "")}>
      <aside className="conversation-sidebar" aria-label={t("Liste des conversations","Conversation list")}>
        <div className="conversation-sidebar-heading"><h2>{t("Vos groupes","Your groups")}</h2><button type="button" className="chat-icon-button" aria-label={t("Créer un groupe","Create group")} aria-expanded={creating} onClick={() => setCreating(!creating)}><ChatIcon name={creating ? "close" : "plus"} /></button></div>
        <label className="conversation-search"><ChatIcon name="search" /><span className="sr-only">{t("Rechercher un groupe","Search groups")}</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Rechercher","Search")} /></label>
        {creating && <form className="group-form create-group-form" onSubmit={create}>
          <label>{t("Nom du groupe","Group name")}<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required /></label>
          <label>{t("Description","Description")}<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={400} rows={2} /></label>
          <label>{t("Accès au groupe","Group access")}<select value={privateGroup ? "private" : "public"} onChange={e => setPrivateGroup(e.target.value === "private")}><option value="private">{t("Privé — sur invitation","Private — invitation only")}</option><option value="public">{t("Public — ouvert aux comptes du site","Public — open to site accounts")}</option></select></label>
          <small>{privateGroup ? t("Visible uniquement des membres. Sans chiffrement de bout en bout.","Visible only to members. Not end-to-end encrypted.") : t("Visible et accessible à tous les comptes du site.","Visible and open to all site accounts.")}</small>
          <button type="submit" disabled={busy}>{busy ? t("Création…","Creating…") : t("Créer le groupe","Create group")}</button>
        </form>}
        <div className="conversation-list">
          {loading ? <p role="status">{t("Chargement des groupes…","Loading groups…")}</p> : !visible.length && <p className="sidebar-empty">{search ? t("Aucun groupe ne correspond.","No matching groups.") : t("Créez un groupe pour votre prochaine sortie, ou utilisez une invitation.","Create a group for your next outing, or use an invitation.")}</p>}
          {visible.map(group => <button type="button" className={"conversation-item"+(active?.id === group.id ? " selected" : "")} key={group.id} disabled={busy} onClick={() => void open(group)} aria-pressed={active?.id === group.id}>
            <span className="conversation-avatar" aria-hidden="true">{group.name.slice(0,2).toUpperCase()}</span>
            <span><strong>{group.name}</strong><small>{group.is_private ? t("Privé","Private") : t("Public","Public")} · {group.member_count} {t("membre(s)","member(s)")}</small><em>{group.joined ? group.description || t("Ouvrir la conversation","Open conversation") : t("Rejoindre le groupe","Join group")}</em></span>
            {group.is_private && <ChatIcon name="lock" />}
          </button>)}
        </div>
      </aside>
      {active ? <DestinationChat key={(user?.id ?? "")+active.id} slug={active.id} destinationName={active.name}
        subtitle={(active.is_private ? t("Groupe privé","Private group") : t("Groupe public","Public group"))+" · "+active.member_count+" "+t("membre(s)","member(s)")}
        onBack={() => { setActive(null); void load(); }} onManage={manage} />
        : <div className="conversation-welcome"><ChatIcon name="people" /><h2>{t("Explorer, ensemble","Explore together")}</h2><p>{t("Choisissez un groupe ou créez le vôtre. Les discussions de destination restent disponibles ci-dessous.","Choose a group or create your own. Destination discussions are still available below.")}</p><small>{t("Les groupes privés nécessitent une invitation.","Private groups require an invitation.")}</small></div>}
    </div>
    <dialog className="group-info-dialog" ref={info} aria-label={t("Informations du groupe","Group information")} onClose={() => setInfoOpen(false)} onCancel={e => { if (busy) e.preventDefault(); }}>
      <div className="dialog-heading"><h2>{active?.name}</h2><button type="button" className="chat-icon-button" disabled={busy} onClick={() => info.current?.close()} aria-label={t("Fermer","Close")}><ChatIcon name="close" /></button></div>
      <p>{active?.description}</p><p>{active?.is_private ? t("Groupe privé : seuls les membres peuvent consulter les conversations et fichiers. Les messages signalés sont accessibles à la modération. Sans chiffrement de bout en bout.","Private group: only members can read conversations and files. Reported messages are accessible to moderators. Not end-to-end encrypted.") : t("Groupe public : tous les comptes du site peuvent le rejoindre.","Public group: any site account can join.")}</p>
      {error && <p className="messenger-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {owner && <div className="group-invitation-controls">
        <button type="button" disabled={busy} onClick={() => void perform(async () => {
          const result = await chatRequest<{token:string}>("/groups/"+active!.id+"/invitation",{method:"POST"});
          setInviteLink(window.location.origin+"/community#invite="+result.token);
        })}>{t("Créer un nouveau lien d’invitation","Create a new invitation link")}</button>
        <small>{t("Valable 7 jours. Tout nouveau lien invalide le précédent. Partagez-le seulement avec les personnes souhaitées.","Valid for 7 days. A new link invalidates the previous one. Share it only with intended members.")}</small>
        {inviteLink && <label>{t("Lien à partager","Link to share")}<input readOnly value={inviteLink} onFocus={e => e.currentTarget.select()} /><button type="button" onClick={() => void perform(async () => {
          if (navigator.clipboard) { await navigator.clipboard.writeText(inviteLink); setNotice(t("Lien copié.","Link copied.")); }
          else setNotice(t("Sélectionnez et copiez le lien ci-dessus.","Select and copy the link above."));
        })}>{t("Copier le lien","Copy link")}</button></label>}
        <button type="button" disabled={busy} onClick={() => void perform(async () => { await chatRequest("/groups/"+active!.id+"/invitation",{method:"DELETE"}); setInviteLink(""); setNotice(t("Lien révoqué.","Link revoked.")); })}>{t("Révoquer le lien actif","Revoke active link")}</button>
      </div>}
      <h3>{t("Membres","Members")}</h3>
      {memberLoading && <p role="status">{t("Chargement…","Loading…")}</p>}
      <ul className="group-members">{members.map(member => <li key={member.user_id}><div><strong>{member.display_name}</strong><small>{member.is_owner ? t("Responsable","Owner") : member.blocked ? t("Exclu","Removed") : t("Membre","Member")}</small></div>
        {owner && member.user_id !== user?.id && <div className="member-controls">
          {member.blocked ? <button type="button" disabled={busy} onClick={() => void perform(async () => { await chatRequest("/groups/"+active!.id+"/members/"+member.user_id+"/restore",{method:"POST"}); await loadMembers(active!); })}>{t("Autoriser une nouvelle invitation","Allow a new invitation")}</button>
            : <><button type="button" disabled={busy} onClick={() => {
              if (confirm(t("Exclure ce membre ? Son accès aux messages et fichiers sera retiré.","Remove this member? Their access to messages and files will be revoked."))) void perform(async () => {
                await chatRequest("/groups/"+active!.id+"/members/"+member.user_id,{method:"DELETE"});
                setActive(current => current ? {...current,member_count:Math.max(1,current.member_count-1)} : null);
                await loadMembers(active!); await load();
              });
            }}>{t("Exclure","Remove")}</button><button type="button" disabled={busy} onClick={() => {
              if (confirm(t("Transférer votre rôle de responsable à ce membre ?","Transfer your owner role to this member?"))) void perform(async () => {
                await chatRequest("/groups/"+active!.id+"/owner/"+member.user_id,{method:"POST"});
                setActive(current => current ? {...current,owner_id:member.user_id} : null); setInviteLink(""); info.current?.close(); await load();
              });
            }}>{t("Nommer responsable","Make owner")}</button></>}
        </div>}
      </li>)}</ul>
      <button type="button" disabled={busy} onClick={() => {
        if (confirm(t("Quitter ce groupe ? Vos anciens messages seront conservés.","Leave this group? Your previous messages will be kept."))) void perform(async () => {
          await chatRequest("/groups/"+active!.id+"/membership",{method:"DELETE"}); setActive(null); info.current?.close(); await load();
        });
      }}>{t("Quitter le groupe","Leave group")}</button>
      {owner && <small>{t("Transférez votre rôle à un autre membre avant de quitter.","Transfer ownership to another member before leaving.")}</small>}
      {owner && active?.member_count === 1 && <button type="button" disabled={busy} onClick={() => {
        if (confirm(t("Supprimer définitivement ce groupe et tout son historique ?","Permanently delete this group and its entire history?"))) void perform(async () => {
          await chatRequest("/groups/"+active.id,{method:"DELETE"}); setActive(null); info.current?.close(); await load();
        });
      }}>{t("Supprimer ce groupe sans autre membre","Delete this group with no other members")}</button>}
    </dialog>
  </section>;
}
