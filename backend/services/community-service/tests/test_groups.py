import os
import sys
from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL","postgresql://unused/test")
from app.community import app, connection, MessageCreate, room_access, insert_message
from app.groups import Invitation, owner_group, add_member, join_group, transfer_owner
from app.security import Identity, authenticated


def actor(role="user"):
    return Identity(id=uuid4(),display_name="Test",role=role)


@pytest.mark.parametrize("role",["user","admin"])
def test_private_group_does_not_grant_global_admin_read(role):
    database = Mock()
    database.execute.return_value.fetchone.side_effect = [{"id":"group-private","is_private":True},None]
    with pytest.raises(HTTPException) as error:
        room_access(database,"group-private",actor(role))
    assert error.value.status_code == 404


def test_private_group_member_can_read():
    database = Mock()
    database.execute.return_value.fetchone.side_effect = [{"id":"group-private","is_private":True},{"exists":1}]
    room_access(database,"group-private",actor())


def test_removed_member_cannot_rejoin():
    database = Mock()
    database.execute.return_value.fetchone.return_value = {"blocked":True}
    with pytest.raises(HTTPException) as error:
        add_member(database,"group-private",actor())
    assert error.value.status_code == 403
    assert not any("INSERT" in call.args[0] for call in database.execute.call_args_list)


def test_join_endpoint_rejects_private_group():
    database = Mock()
    database.execute.return_value.fetchone.return_value = {"is_private":True}
    with pytest.raises(HTTPException) as error:
        join_group("group-private",actor(),database)
    assert error.value.status_code == 404


def test_only_owner_can_manage_even_site_admin():
    database = Mock()
    database.execute.return_value.fetchone.return_value = {"owner_id":uuid4()}
    with pytest.raises(HTTPException) as error:
        owner_group(database,"group-private",actor("admin"))
    assert error.value.status_code == 403


def test_transfer_requires_active_member():
    owner = actor()
    database = Mock()
    database.execute.return_value.fetchone.side_effect = [{"owner_id":owner.id},None]
    with pytest.raises(HTTPException) as error:
        transfer_owner("group-private",uuid4(),owner,database)
    assert error.value.status_code == 404


def test_reply_requires_existing_same_room_parent():
    database = Mock()
    database.execute.return_value.fetchone.side_effect = [{"n":0},None]
    with pytest.raises(HTTPException) as error:
        insert_message(database,"group-private",actor(),"reply",reply_to=uuid4())
    assert error.value.status_code == 422
    assert not any("INSERT INTO messages" in call.args[0] for call in database.execute.call_args_list)


@pytest.mark.parametrize("token",["", "../secret", "a"*39, "a"*101, "a"*42+"?"])
def test_bad_invitation_token_rejected(token):
    with pytest.raises(ValidationError):
        Invitation(token=token)


def test_reply_uuid_validation():
    with pytest.raises(ValidationError):
        MessageCreate(body="Hello",reply_to="../../private")


@pytest.mark.parametrize("method,path,payload",[
    ("POST","/groups/group-private/invitation",None),
    ("DELETE","/groups/group-private/invitation",None),
    ("POST","/groups/invitations/accept",{"token":"a"*43}),
    ("GET","/groups/group-private/members",None),
    ("GET","/blocks",None),
    ("GET","/admin/reports",None),
])
def test_new_routes_require_actual_session(method,path,payload):
    response = TestClient(app).request(method,path,json=payload,headers={"X-User-Role":"admin","X-User-ID":str(uuid4())})
    assert response.status_code == 401


def test_ordinary_member_cannot_read_reports():
    app.dependency_overrides[authenticated] = lambda: actor()
    app.dependency_overrides[connection] = lambda: Mock()
    try:
        assert TestClient(app).get("/admin/reports").status_code == 403
    finally:
        app.dependency_overrides.clear()
