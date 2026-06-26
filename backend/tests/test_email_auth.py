"""Password reset + email verification flows (auth slice)."""

import re

from app.core.email import OUTBOX

_PW = "Sup3rSecret!"


def _token_in(email) -> str:
    m = re.search(r"token=([A-Za-z0-9_\-]+)", email.text)
    assert m, f"no token link in email:\n{email.text}"
    return m.group(1)


def _outbox_to(addr: str):
    return [m for m in OUTBOX if m.to == addr]


async def _register(client, email: str, password: str = _PW):
    r = await client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code == 201, r.text
    return r.json()


# ---- email verification ----------------------------------------------------


async def test_register_sends_verification_email(client):
    await _register(client, "v1@x.io")
    sent = _outbox_to("v1@x.io")
    assert len(sent) == 1
    assert "token=" in sent[0].text
    assert "token=" in sent[0].html


async def test_verify_email_marks_user_verified(client):
    await _register(client, "v2@x.io")
    token = _token_in(_outbox_to("v2@x.io")[0])

    r = await client.post("/auth/verify-email", json={"token": token})
    assert r.status_code == 200

    login = await client.post("/auth/login", json={"email": "v2@x.io", "password": _PW})
    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert me.json()["email_verified"] is True


async def test_verify_email_invalid_token_rejected(client):
    r = await client.post("/auth/verify-email", json={"token": "not-a-real-token"})
    assert r.status_code == 422


async def test_verify_email_token_is_single_use(client):
    await _register(client, "v3@x.io")
    token = _token_in(_outbox_to("v3@x.io")[0])
    assert (await client.post("/auth/verify-email", json={"token": token})).status_code == 200
    assert (await client.post("/auth/verify-email", json={"token": token})).status_code == 422


async def test_resend_verification_sends_again(client):
    await _register(client, "v4@x.io")
    login = await client.post("/auth/login", json={"email": "v4@x.io", "password": _PW})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    OUTBOX.clear()

    r = await client.post("/auth/resend-verification", headers=headers)
    assert r.status_code == 202
    assert len(_outbox_to("v4@x.io")) == 1


async def test_resend_verification_conflicts_when_already_verified(client):
    await _register(client, "v5@x.io")
    token = _token_in(_outbox_to("v5@x.io")[0])
    await client.post("/auth/verify-email", json={"token": token})
    login = await client.post("/auth/login", json={"email": "v5@x.io", "password": _PW})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    r = await client.post("/auth/resend-verification", headers=headers)
    assert r.status_code == 409


async def test_resend_verification_requires_auth(client):
    assert (await client.post("/auth/resend-verification")).status_code == 401


# ---- password reset --------------------------------------------------------


async def test_forgot_password_unknown_email_is_silent(client):
    r = await client.post("/auth/forgot-password", json={"email": "nobody@x.io"})
    assert r.status_code == 202
    assert OUTBOX == []  # no email, no enumeration signal


async def test_forgot_password_known_email_sends_reset(client):
    await _register(client, "r1@x.io")
    OUTBOX.clear()
    r = await client.post("/auth/forgot-password", json={"email": "r1@x.io"})
    assert r.status_code == 202
    assert len(_outbox_to("r1@x.io")) == 1


async def test_reset_password_changes_password(client):
    await _register(client, "r2@x.io", password=_PW)
    OUTBOX.clear()
    await client.post("/auth/forgot-password", json={"email": "r2@x.io"})
    token = _token_in(_outbox_to("r2@x.io")[0])

    new_pw = "BrandNewPw9!"
    r = await client.post("/auth/reset-password", json={"token": token, "new_password": new_pw})
    assert r.status_code == 200

    assert (
        await client.post("/auth/login", json={"email": "r2@x.io", "password": new_pw})
    ).status_code == 200
    assert (
        await client.post("/auth/login", json={"email": "r2@x.io", "password": _PW})
    ).status_code == 401


async def test_reset_password_invalid_token_rejected(client):
    r = await client.post(
        "/auth/reset-password", json={"token": "bogus-token", "new_password": "Whatever12!"}
    )
    assert r.status_code == 422


async def test_reset_password_token_is_single_use(client):
    await _register(client, "r3@x.io")
    OUTBOX.clear()
    await client.post("/auth/forgot-password", json={"email": "r3@x.io"})
    token = _token_in(_outbox_to("r3@x.io")[0])

    first = await client.post(
        "/auth/reset-password", json={"token": token, "new_password": "FirstReset1!"}
    )
    assert first.status_code == 200
    second = await client.post(
        "/auth/reset-password", json={"token": token, "new_password": "SecondReset1!"}
    )
    assert second.status_code == 422


async def test_new_reset_request_voids_the_previous_link(client):
    await _register(client, "r4@x.io")
    OUTBOX.clear()
    await client.post("/auth/forgot-password", json={"email": "r4@x.io"})
    old_token = _token_in(_outbox_to("r4@x.io")[0])

    OUTBOX.clear()
    await client.post("/auth/forgot-password", json={"email": "r4@x.io"})
    new_token = _token_in(_outbox_to("r4@x.io")[0])

    # The superseded link no longer works...
    assert (
        await client.post(
            "/auth/reset-password", json={"token": old_token, "new_password": "Nope123456!"}
        )
    ).status_code == 422
    # ...but the fresh one does.
    assert (
        await client.post(
            "/auth/reset-password", json={"token": new_token, "new_password": "Yep1234567!"}
        )
    ).status_code == 200


async def test_reset_password_short_password_rejected(client):
    await _register(client, "r5@x.io")
    OUTBOX.clear()
    await client.post("/auth/forgot-password", json={"email": "r5@x.io"})
    token = _token_in(_outbox_to("r5@x.io")[0])
    r = await client.post("/auth/reset-password", json={"token": token, "new_password": "short"})
    assert r.status_code == 422


async def test_forgot_password_is_rate_limited(client):
    # EMAIL_SEND_RATE_LIMIT defaults to 5 within the window.
    codes = [
        (await client.post("/auth/forgot-password", json={"email": "rl@x.io"})).status_code
        for _ in range(7)
    ]
    assert codes.count(202) == 5
    assert codes.count(429) == 2


# ---- change password (authenticated) ---------------------------------------


async def _login_headers(client, email: str, password: str = _PW):
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def test_change_password_succeeds_and_new_password_works(client):
    await _register(client, "cp1@x.io")
    headers = await _login_headers(client, "cp1@x.io")
    new_pw = "Br4ndNew!pw"

    r = await client.post(
        "/auth/change-password",
        json={"current_password": _PW, "new_password": new_pw},
        headers=headers,
    )
    assert r.status_code == 200, r.text

    # Old password no longer works, new one does.
    assert (
        await client.post("/auth/login", json={"email": "cp1@x.io", "password": _PW})
    ).status_code == 401
    assert (
        await client.post("/auth/login", json={"email": "cp1@x.io", "password": new_pw})
    ).status_code == 200


async def test_change_password_wrong_current_rejected(client):
    await _register(client, "cp2@x.io")
    headers = await _login_headers(client, "cp2@x.io")
    r = await client.post(
        "/auth/change-password",
        json={"current_password": "WrongPass123", "new_password": "Wh4tever!pw"},
        headers=headers,
    )
    assert r.status_code == 401
    # The password is unchanged — the original still logs in.
    assert (
        await client.post("/auth/login", json={"email": "cp2@x.io", "password": _PW})
    ).status_code == 200


async def test_change_password_same_password_rejected(client):
    await _register(client, "cp3@x.io")
    headers = await _login_headers(client, "cp3@x.io")
    r = await client.post(
        "/auth/change-password",
        json={"current_password": _PW, "new_password": _PW},
        headers=headers,
    )
    assert r.status_code == 422


async def test_change_password_requires_auth(client):
    r = await client.post(
        "/auth/change-password",
        json={"current_password": _PW, "new_password": "Wh4tever!pw"},
    )
    assert r.status_code == 401


async def test_change_password_voids_outstanding_reset_tokens(client):
    await _register(client, "cp4@x.io")
    OUTBOX.clear()
    # User requests a reset link...
    await client.post("/auth/forgot-password", json={"email": "cp4@x.io"})
    reset_token = _token_in(_outbox_to("cp4@x.io")[0])
    # ...then changes the password from inside the app.
    headers = await _login_headers(client, "cp4@x.io")
    assert (
        await client.post(
            "/auth/change-password",
            json={"current_password": _PW, "new_password": "Ch4nged!pw"},
            headers=headers,
        )
    ).status_code == 200
    # The stale reset link is now dead.
    assert (
        await client.post(
            "/auth/reset-password",
            json={"token": reset_token, "new_password": "Yet4nother!"},
        )
    ).status_code == 422
