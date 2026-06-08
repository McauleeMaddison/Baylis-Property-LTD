# Testing Evidence

Date run: 2026-06-08

## Automated Tests

Command:

```bash
PYTHONPYCACHEPREFIX=.pycache python3 -m unittest discover -s tests -v
```

Result:

```text
Ran 6 tests in 12.817s
OK
```

## Covered Behaviours

| Test | Behaviour |
| --- | --- |
| `test_login_and_role_validation` | Confirms successful resident login and rejects incorrect role selection. |
| `test_resident_request_persists_in_sqlite` | Confirms resident property selection and cleaning request are persisted in SQLite across a new client session. |
| `test_landlord_can_update_request_status_and_notify_resident` | Confirms landlord can view resident requests, update status, and create a resident notification. |
| `test_landlord_property_crud` | Confirms landlord property create, update, and delete workflow. |
| `test_community_post_and_comment_workflow` | Confirms community post creation and comment workflow. |
| `test_protected_pages_redirect_without_login` | Confirms protected pages redirect unauthenticated users. |

## Syntax Checks

Commands:

```bash
PYTHONPYCACHEPREFIX=.pycache python3 -m py_compile app.py tests/test_app.py
for f in static/js/*.js; do node --check "$f" || exit 1; done
```

Result: passed.

## Manual Test Checklist

| Area | Steps | Expected result |
| --- | --- | --- |
| Resident login | Log in as `resident123` / `resident123`. | Resident portal is available. |
| Resident property | Select a property and save. | Selected property appears as the active property. |
| Cleaning request | Submit date and cleaning type. | Request appears in resident history and landlord queue. |
| Repair request | Submit issue details. | Request appears in resident history and landlord queue. |
| Landlord login | Log in as `landlord123` / `landlord123`. | Landlord portal is available. |
| Status update | Change a request to `In progress`. | Resident notification is created. |
| Property admin | Add, rename, and delete a property. | Property list updates. |
| Community | Create a post and add a comment. | Feed shows post and comment. |
| Protected routes | Visit `/resident.html` while logged out. | User is redirected to login. |
