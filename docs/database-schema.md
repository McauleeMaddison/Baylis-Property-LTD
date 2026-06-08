# Database Schema Evidence

The backend uses SQLite through Python's standard `sqlite3` module. The database path is controlled by `DATABASE_PATH`; if this is not set, the app uses `instance/baylis.sqlite3`.

## Tables

| Table | Purpose |
| --- | --- |
| `users` | Stores registered resident and landlord accounts, profile details, contact preferences, hashed password, and selected property. |
| `properties` | Stores managed property records. |
| `service_requests` | Stores resident cleaning and repair requests with status and property assignment. |
| `community_posts` | Stores community posts. |
| `community_comments` | Stores comments linked to community posts. |
| `notifications` | Stores resident/landlord notification records and read state. |
| `audit_logs` | Stores security and workflow events for landlord review. |
| `auth_sessions` | Stores active session metadata for settings/security evidence. |
| `password_resets` | Stores password reset tokens with expiry and used state. |

## Relationships

| Relationship | Description |
| --- | --- |
| `users.property_id -> properties.id` | Residents can be assigned to a property. |
| `service_requests.username -> users.username` | Requests belong to the resident who created them. |
| `service_requests.property_id -> properties.id` | Requests are routed to a property. |
| `community_posts.username -> users.username` | Posts belong to the author. |
| `community_comments.post_id -> community_posts.id` | Comments belong to a post. |
| `community_comments.username -> users.username` | Comments belong to the commenter. |
| `notifications.target_username -> users.username` | Notifications can target a single user. |
| `audit_logs.actor_username -> users.username` | Audit events can be linked to the actor. |
| `auth_sessions.username -> users.username` | Session records belong to a user. |
| `password_resets.username -> users.username` | Reset tokens belong to a user. |

## CRUD Coverage

| Data area | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Users | Register | `/api/auth/me` | Profile/contact/prefs/password | Session logout/revoke |
| Properties | `POST /api/properties` | `GET /api/properties` | `PATCH /api/properties/<id>` | `DELETE /api/properties/<id>` |
| Requests | `POST /api/forms/cleaning`, `POST /api/forms/repairs` | `GET /api/requests`, profile activity | `PATCH /api/requests/<id>`, status route | `DELETE /api/requests/<id>` |
| Community posts | `POST /api/community` | `GET /api/community`, `GET /api/posts` | Stored comments update activity | Comments removed when post is deleted by cascade |
| Notifications | Created by workflow events | `GET /api/notifications` | Mark read/read all | Removed when target user is deleted by cascade |

## Persistence Notes

SQLite persistence is suitable for local assessment and a small MVP. On Render, set `DATABASE_PATH=/data/baylis.sqlite3` only if a Render persistent disk is attached. Without a persistent disk, Render containers may lose SQLite data on redeploy.
