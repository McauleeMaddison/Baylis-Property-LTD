# Landlord Workflow Evidence

## Workflow Summary

The landlord portal is designed as an operational dashboard for managing resident requests across properties.

## Workflow Steps

1. Landlord logs in using the landlord account.
2. Landlord opens `/landlord.html`.
3. Dashboard loads requests, properties, community posts, notifications, and audit logs from the Flask API.
4. Landlord filters requests by property, type, status, or search term.
5. Landlord changes a request status to `open`, `in_progress`, or `done`.
6. The resident receives a notification when the request status changes.
7. The audit log records the status update event.

## Landlord Features

| Feature | Evidence |
| --- | --- |
| Request queue | `GET /api/requests` returns all requests to landlords. |
| Status updates | `POST /api/requests/<id>/status`. |
| Property management | `POST`, `PATCH`, and `DELETE /api/properties`. |
| Property-level summary | Landlord JavaScript groups requests by property. |
| Notifications | `GET /api/notifications` and mark-read routes. |
| Audit log | `GET /api/security/audit`. |
| CSV export | Landlord front end exports filtered request data. |

## Assessment Evidence

This workflow demonstrates role-based access, operational decision-making, server-side persistence, update behaviour, notifications, and auditability. These are stronger indicators of a real full-stack application than static front-end pages alone.
