"""Real SQL integration checks in a newly created isolated PostgreSQL schema.

Run inside the existing community-service image with the candidate app package
on PYTHONPATH. Uses its existing DATABASE_URL, never prints credentials.
The production tables are not in the test connection's search_path.
"""
import io
import os
import re
import sys
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row
from PIL import Image
from fastapi import HTTPException, UploadFile

base_dsn = os.environ["DATABASE_URL"]
schema = "messaging_v3_test_" + uuid4().hex
assert re.fullmatch(r"messaging_v3_test_[a-f0-9]{32}",schema)
with psycopg.connect(base_dsn) as db:
    db.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
test_dsn = make_conninfo(base_dsn,options="-csearch_path="+schema)
os.environ["DATABASE_URL"] = test_dsn
checks = 0


def check(condition, description):
    global checks
    assert condition, description
    checks += 1
    print("PASS",description,flush=True)


try:
    from app import community as c
    from app import groups as g
    from app.security import Identity
    people = [Identity(id=uuid4(),display_name="Simulated "+str(i),role="user") for i in range(20)]
    owner, member = people[:2]
    outsider = Identity(id=uuid4(),display_name="Outsider",role="user")
    admin = Identity(id=uuid4(),display_name="Moderator",role="admin")
    legacy_id = uuid4()
    with psycopg.connect(test_dsn) as db:
        db.execute("""CREATE TABLE messages(id UUID PRIMARY KEY,destination_slug VARCHAR(80) NOT NULL,
            user_id UUID NOT NULL,display_name VARCHAR(80) NOT NULL,body VARCHAR(1000) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
        db.execute("INSERT INTO messages VALUES (%s,'kribi',%s,'Legacy','Preserve me',NOW())",(legacy_id,owner.id))
        db.execute("""CREATE TABLE chat_groups(id VARCHAR(80) PRIMARY KEY,name VARCHAR(80) NOT NULL,
            description VARCHAR(400) NOT NULL,owner_id UUID NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW())""")
        db.execute("INSERT INTO chat_groups VALUES ('group-legacy','Legacy group','Existing public group',%s,NOW())",(owner.id,))
        db.execute("""CREATE TABLE group_members(group_id VARCHAR(80) REFERENCES chat_groups(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,PRIMARY KEY(group_id,user_id))""")
        db.execute("INSERT INTO group_members VALUES ('group-legacy',%s)",(owner.id,))
    c.initialise_database()
    c.initialise_database()

    def call(fn,*args,actor=owner,**kwargs):
        with psycopg.connect(test_dsn,row_factory=dict_row) as db:
            return fn(*args,user=actor,database=db,**kwargs)

    def denied(code,fn,*args,**kwargs):
        try:
            call(fn,*args,**kwargs)
        except HTTPException as error:
            check(error.status_code == code,fn.__name__+" denied "+str(code))
        else:
            raise AssertionError(fn.__name__+" unexpectedly allowed")

    def read(room,actor=owner,**kwargs):
        return call(c.messages,room,actor=actor,limit=kwargs.get("limit",80),before=kwargs.get("before"))

    check(read("kribi")[0]["id"] == legacy_id,"migration preserves legacy messages")
    check(not call(g.groups)[0]["is_private"],"legacy groups remain public")
    group = call(g.create_group,c.GroupCreate(name="Private test",is_private=True))
    room = group["id"]
    check(group["joined"] and group["member_count"] == 1,"private group owner joins")
    check(room not in [x["id"] for x in call(g.groups,actor=outsider)],"private group hidden from discovery")
    check(room not in [x["id"] for x in call(g.groups,actor=admin)],"private group hidden from global administrator")
    denied(404,g.join_group,room,actor=outsider)
    denied(404,c.messages,room,actor=admin,limit=80,before=None)
    denied(403,g.invite,room,actor=outsider)
    invitation = call(g.invite,room)
    with psycopg.connect(test_dsn) as db:
        digest = db.execute("SELECT token_hash FROM group_invites WHERE group_id=%s",(room,)).fetchone()[0]
    check(invitation["token"] != digest and len(digest)==64,"invitation stored as hash, not bearer token")
    for person in people[1:]:
        call(g.accept_invite,g.Invitation(token=invitation["token"]),actor=person)
    check(len(call(g.members,room)) == 20,"20 simulated accounts join via invitation")
    posted = []
    for person in people:
        posted.append(call(c.post_message,room,c.MessageCreate(body="Hello from "+person.display_name),actor=person))
    check(len(read(room)) == 20,"20 simulated accounts persist messages")
    parent = posted[1]
    reply = call(c.post_message,room,c.MessageCreate(body="A specific reply",reply_to=parent["id"]))
    check(read(room)[-1]["reply"]["id"] == str(parent["id"]),"reply resolves its actual parent")
    denied(422,c.post_message,room,c.MessageCreate(body="Wrong room",reply_to=legacy_id))
    denied(422,c.post_message,room,c.MessageCreate(body="Unknown parent",reply_to=uuid4()))
    photo = io.BytesIO()
    Image.new("RGB",(12,12),color="green").save(photo,format="PNG")
    media = call(c.post_attachment,room,actor=member,file=UploadFile(io.BytesIO(photo.getvalue()),filename="photo.png"),
        kind="image",body="Photo reply",reply_to=posted[0]["id"])
    check(media["is_reply"],"attachment can reply to a message")
    response = call(c.media,media["id"])
    check(response.media_type == "image/jpeg" and response.body.startswith(b"\xff\xd8"),"actual image sanitized and stored")
    denied(404,c.media,media["id"],actor=outsider)
    call(g.report,parent["id"],g.Report(reason="Test moderation reason"))
    check(len(call(g.reports,actor=admin)) == 1,"reported private message visible to moderation")
    denied(403,g.reports,actor=member)
    report = call(g.reports,actor=admin)[0]
    call(g.resolve,report["id"],actor=admin)
    check(not call(g.reports,actor=admin),"report can be resolved")
    call(g.report,media["id"],g.Report(reason="Review this attachment"))
    media_report = call(g.reports,actor=admin)[0]
    check(call(g.reported_media,media_report["id"],actor=admin).media_type == "image/jpeg","moderation can inspect reported media only")
    denied(403,g.reported_media,media_report["id"],actor=member)
    denied(409,g.delete_empty_group,room)
    call(g.block_author,parent["id"])
    check(all(m["user_id"] != member.id for m in read(room)),"blocked author hidden from history")
    check(next(m for m in read(room) if m["id"] == reply["id"])["reply"] is None,"blocked parent hidden from quotations")
    denied(404,c.media,media["id"])
    call(g.unblock,member.id)
    check(any(m["user_id"] == member.id for m in read(room)),"unblocking restores messages")
    denied(403,g.remove_member,room,owner.id,actor=member)
    call(g.remove_member,room,member.id)
    denied(404,c.messages,room,actor=member,limit=80,before=None)
    denied(404,c.media,media["id"],actor=member)
    denied(403,g.accept_invite,g.Invitation(token=invitation["token"]),actor=member)
    call(g.restore_member,room,member.id)
    call(g.accept_invite,g.Invitation(token=invitation["token"]),actor=member)
    check(len(call(g.members,room)) == 20,"restored member must accept invitation again")
    fresh = call(g.invite,room)
    denied(404,g.accept_invite,g.Invitation(token=invitation["token"]),actor=outsider)
    call(g.revoke_invite,room)
    denied(404,g.accept_invite,g.Invitation(token=fresh["token"]),actor=outsider)
    expiring = call(g.invite,room)
    with psycopg.connect(test_dsn) as db:
        db.execute("UPDATE group_invites SET expires_at=NOW()-INTERVAL '1 second' WHERE group_id=%s",(room,))
    denied(404,g.accept_invite,g.Invitation(token=expiring["token"]),actor=outsider)
    call(c.delete_message,parent["id"],actor=member)
    deleted_quote = next(m for m in read(room) if m["id"] == reply["id"])
    check(deleted_quote["is_reply"] and deleted_quote["reply"] is None,"deleted parent removes quote content")
    denied(409,g.leave_group,room)
    call(g.transfer_owner,room,member.id)
    denied(403,g.invite,room)
    call(g.leave_group,room)
    denied(404,c.messages,room,limit=80,before=None)
    with psycopg.connect(test_dsn) as db:
        with db.cursor() as cur:
            cur.executemany("""INSERT INTO messages(id,destination_slug,user_id,display_name,body,created_at)
                VALUES (%s,'limbe',%s,'Pagination',%s,NOW()+(%s * INTERVAL '1 second'))""",
                [(uuid4(),owner.id,str(i),i) for i in range(101)])
    latest = read("limbe")
    earlier = read("limbe",before=latest[0]["id"])
    check(len(latest)==80 and len(earlier)==21,"cursor pagination retrieves all 101 messages")
    check(not ({m["id"] for m in latest} & {m["id"] for m in earlier}),"pagination does not duplicate messages")
    empty = call(g.create_group,c.GroupCreate(name="Empty group"))
    call(g.delete_empty_group,empty["id"])
    check(empty["id"] not in [x["id"] for x in call(g.groups)],"owner can delete a group with no other members")
    print("RESULT",checks,"checks passed; 20 simulated accounts; isolated schema only",flush=True)
finally:
    # Only the exact random schema created by this process is ever removed.
    assert re.fullmatch(r"messaging_v3_test_[a-f0-9]{32}",schema)
    with psycopg.connect(base_dsn) as db:
        db.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
    print("Temporary test schema removed; production tables untouched.",flush=True)
