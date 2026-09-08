"""Group membership, revocable invitations and user-controlled moderation."""
import hashlib
import secrets
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Response
from pydantic import Field

from .community import Database, GroupCreate, TextModel, room_access
from .security import User

router = APIRouter()


def group_row(database, group_id):
    # Every membership/invitation change locks this row. Reads of room content
    # hold a shared lock, preventing authorization changing during a write.
    group = database.execute("SELECT * FROM chat_groups WHERE id = %s FOR UPDATE", (group_id,)).fetchone()
    if not group:
        raise HTTPException(404, "Group not found")
    return group


def owner_group(database, group_id, user):
    group = group_row(database, group_id)
    if str(group["owner_id"]) != str(user.id):
        raise HTTPException(403, "Only the group owner can manage this group")
    return group


def add_member(database, group_id, user):
    member = database.execute("SELECT blocked FROM group_members WHERE group_id = %s AND user_id = %s", (group_id,user.id)).fetchone()
    if member and member["blocked"]:
        raise HTTPException(403, "You were removed from this group")
    count = database.execute("SELECT COUNT(*) AS n FROM group_members WHERE group_id = %s AND NOT blocked", (group_id,)).fetchone()["n"]
    if not member and count >= 200:
        raise HTTPException(409, "This group has reached its 200 member limit")
    database.execute("""INSERT INTO group_members(group_id,user_id,display_name) VALUES (%s,%s,%s)
        ON CONFLICT(group_id,user_id) DO UPDATE SET display_name = EXCLUDED.display_name""", (group_id,user.id,user.display_name))


@router.get("/groups")
def groups(user: User, database: Database):
    return database.execute("""SELECT g.*,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND NOT blocked)::int AS member_count,
        EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = %s AND NOT blocked) AS joined
        FROM chat_groups g WHERE
        (NOT g.is_private OR EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = %s AND NOT blocked))
        AND NOT EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = %s AND blocked)
        ORDER BY joined DESC, created_at DESC LIMIT 100""", (user.id,user.id,user.id)).fetchall()


@router.post("/groups", status_code=201)
def create_group(payload: GroupCreate, user: User, database: Database):
    database.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (str(user.id),))
    if database.execute("SELECT COUNT(*) AS n FROM chat_groups WHERE owner_id = %s", (user.id,)).fetchone()["n"] >= 20:
        raise HTTPException(429, "Maximum 20 groups per account")
    group = database.execute("""INSERT INTO chat_groups(id,name,description,owner_id,is_private)
        VALUES (%s,%s,%s,%s,%s) RETURNING *""",
        ("group-"+str(uuid4()),payload.name,payload.description,user.id,payload.is_private)).fetchone()
    add_member(database,group["id"],user)
    return {**group,"joined": True,"member_count": 1}


@router.post("/groups/{group_id}/join", status_code=204)
def join_group(group_id: str, user: User, database: Database):
    group = group_row(database,group_id)
    if group["is_private"]:
        raise HTTPException(404, "Group not found or invitation required")
    add_member(database,group_id,user)


@router.delete("/groups/{group_id}/membership", status_code=204)
def leave_group(group_id: str, user: User, database: Database):
    group = group_row(database,group_id)
    if str(group["owner_id"]) == str(user.id):
        raise HTTPException(409, "Transfer ownership before leaving this group")
    database.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s AND NOT blocked", (group_id,user.id))


@router.delete("/groups/{group_id}", status_code=204)
def delete_empty_group(group_id: str, user: User, database: Database):
    owner_group(database,group_id,user)
    if database.execute("SELECT COUNT(*) AS n FROM group_members WHERE group_id = %s AND NOT blocked", (group_id,)).fetchone()["n"] > 1:
        raise HTTPException(409,"Transfer ownership before leaving a populated group")
    database.execute("DELETE FROM messages WHERE destination_slug = %s",(group_id,))
    database.execute("DELETE FROM chat_groups WHERE id = %s",(group_id,))


class Invitation(TextModel):
    token: str = Field(min_length=40,max_length=100,pattern=r"^[A-Za-z0-9_-]+$")


@router.post("/groups/{group_id}/invitation")
def invite(group_id: str, user: User, database: Database):
    owner_group(database,group_id,user)
    token = secrets.token_urlsafe(32)
    database.execute("DELETE FROM group_invites WHERE group_id = %s", (group_id,))
    row = database.execute("""INSERT INTO group_invites(token_hash,group_id,expires_at)
        VALUES (%s,%s,NOW()+INTERVAL '7 days') RETURNING expires_at""",
        (hashlib.sha256(token.encode()).hexdigest(),group_id)).fetchone()
    return {"token": token,"expires_at": row["expires_at"]}


@router.delete("/groups/{group_id}/invitation", status_code=204)
def revoke_invite(group_id: str, user: User, database: Database):
    owner_group(database,group_id,user)
    database.execute("DELETE FROM group_invites WHERE group_id = %s", (group_id,))


@router.post("/groups/invitations/accept")
def accept_invite(payload: Invitation, user: User, database: Database):
    digest = hashlib.sha256(payload.token.encode()).hexdigest()
    invitation = database.execute("SELECT group_id FROM group_invites WHERE token_hash = %s AND expires_at > NOW()", (digest,)).fetchone()
    if not invitation:
        raise HTTPException(404, "Invitation expired or revoked")
    group = group_row(database,invitation["group_id"])
    # Check again after acquiring the group lock: revocation may have won.
    if not database.execute("SELECT 1 FROM group_invites WHERE token_hash = %s AND expires_at > NOW()", (digest,)).fetchone():
        raise HTTPException(404, "Invitation expired or revoked")
    add_member(database,group["id"],user)
    count = database.execute("SELECT COUNT(*)::int AS n FROM group_members WHERE group_id = %s AND NOT blocked", (group["id"],)).fetchone()["n"]
    return {**group,"joined": True,"member_count": count}


@router.get("/groups/{group_id}/members")
def members(group_id: str, user: User, database: Database):
    room_access(database,group_id,user)
    return database.execute("""SELECT gm.user_id, gm.display_name, gm.blocked,
        gm.user_id = g.owner_id AS is_owner FROM group_members gm JOIN chat_groups g ON g.id = gm.group_id
        WHERE gm.group_id = %s AND (NOT gm.blocked OR g.owner_id = %s)
        ORDER BY is_owner DESC, gm.display_name, gm.user_id""", (group_id,user.id)).fetchall()


@router.delete("/groups/{group_id}/members/{member_id}", status_code=204)
def remove_member(group_id: str, member_id: UUID, user: User, database: Database):
    owner_group(database,group_id,user)
    if member_id == user.id:
        raise HTTPException(409,"The owner cannot remove themselves")
    if not database.execute("""UPDATE group_members SET blocked = TRUE WHERE group_id = %s AND user_id = %s
        RETURNING user_id""", (group_id,member_id)).fetchone():
        raise HTTPException(404,"Member not found")


@router.post("/groups/{group_id}/members/{member_id}/restore", status_code=204)
def restore_member(group_id: str, member_id: UUID, user: User, database: Database):
    owner_group(database,group_id,user)
    # Removes exclusion without granting access; the person must join/invite again.
    database.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s AND blocked", (group_id,member_id))


@router.post("/groups/{group_id}/owner/{member_id}", status_code=204)
def transfer_owner(group_id: str, member_id: UUID, user: User, database: Database):
    owner_group(database,group_id,user)
    if not database.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s AND NOT blocked", (group_id,member_id)).fetchone():
        raise HTTPException(404,"Active member not found")
    database.execute("UPDATE chat_groups SET owner_id = %s WHERE id = %s", (member_id,group_id))
    database.execute("DELETE FROM group_invites WHERE group_id = %s", (group_id,))


class Report(TextModel):
    reason: str = Field(min_length=5,max_length=500)


def accessible_message(database,message_id,user):
    row = database.execute("SELECT * FROM messages WHERE id = %s", (message_id,)).fetchone()
    if not row:
        raise HTTPException(404,"Message not found")
    room_access(database,row["destination_slug"],user)
    return row


@router.post("/messages/{message_id}/report", status_code=204)
def report(message_id: UUID, payload: Report, user: User, database: Database):
    accessible_message(database,message_id,user)
    database.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (str(user.id),))
    if database.execute("SELECT COUNT(*) AS n FROM message_reports WHERE reporter_id = %s AND created_at > NOW()-INTERVAL '1 day'", (user.id,)).fetchone()["n"] >= 20:
        raise HTTPException(429,"Maximum 20 reports per day")
    database.execute("""INSERT INTO message_reports(id,message_id,reporter_id,reason) VALUES (%s,%s,%s,%s)
        ON CONFLICT(message_id,reporter_id) DO NOTHING""", (uuid4(),message_id,user.id,payload.reason))


@router.post("/messages/{message_id}/block-author", status_code=204)
def block_author(message_id: UUID, user: User, database: Database):
    row = accessible_message(database,message_id,user)
    if str(row["user_id"]) == str(user.id):
        raise HTTPException(422,"You cannot block yourself")
    database.execute("""INSERT INTO user_blocks(user_id,blocked_id,display_name) VALUES (%s,%s,%s)
        ON CONFLICT DO NOTHING""", (user.id,row["user_id"],row["display_name"]))


@router.get("/blocks")
def blocks(user: User, database: Database):
    return database.execute("SELECT blocked_id,display_name FROM user_blocks WHERE user_id = %s", (user.id,)).fetchall()


@router.delete("/blocks/{blocked_id}", status_code=204)
def unblock(blocked_id: UUID, user: User, database: Database):
    database.execute("DELETE FROM user_blocks WHERE user_id = %s AND blocked_id = %s", (user.id,blocked_id))


@router.get("/admin/reports")
def reports(user: User, database: Database):
    if user.role != "admin":
        raise HTTPException(403,"Administrator role required")
    return database.execute("""SELECT r.*,m.body,m.display_name,m.media_kind,m.destination_slug
        FROM message_reports r JOIN messages m ON m.id = r.message_id
        WHERE NOT resolved ORDER BY created_at LIMIT 100""").fetchall()


@router.post("/admin/reports/{report_id}/resolve", status_code=204)
def resolve(report_id: UUID, user: User, database: Database):
    if user.role != "admin":
        raise HTTPException(403,"Administrator role required")
    database.execute("UPDATE message_reports SET resolved = TRUE WHERE id = %s", (report_id,))


@router.get("/admin/reports/{report_id}/media")
def reported_media(report_id: UUID, user: User, database: Database):
    if user.role != "admin":
        raise HTTPException(403,"Administrator role required")
    row = database.execute("""SELECT a.content_type,a.data FROM message_reports r
        JOIN message_media a ON a.message_id = r.message_id WHERE r.id = %s AND NOT r.resolved""",(report_id,)).fetchone()
    if not row:
        raise HTTPException(404,"Reported attachment not found")
    return Response(bytes(row["data"]),media_type=row["content_type"],
        headers={"Content-Disposition":"inline","Content-Security-Policy":"default-src 'none'; sandbox"})
