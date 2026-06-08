import os
import tempfile
import unittest


os.environ.setdefault("DATABASE_PATH", os.path.join(tempfile.gettempdir(), "baylis-test-bootstrap.sqlite3"))
os.environ.setdefault("SECRET_KEY", "test-secret-key")

import app as baylis_app  # noqa: E402


class BaylisAppTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "baylis.sqlite3")
        baylis_app.app.config.update(
            TESTING=True,
            DATABASE=self.db_path,
            SECRET_KEY="test-secret-key",
            WTF_CSRF_ENABLED=False,
        )
        with baylis_app.app.app_context():
            baylis_app.init_database()
        self.client = baylis_app.app.test_client()

    def tearDown(self):
        self.tmp.cleanup()

    def login(self, username="resident123", password="resident123", role="resident", client=None):
        target = client or self.client
        return target.post(
            "/api/auth/login",
            json={"username": username, "password": password, "role": role},
        )

    def test_login_and_role_validation(self):
        ok = self.login()
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.get_json()["user"]["role"], "resident")

        wrong_role = self.client.post(
            "/api/auth/login",
            json={"username": "resident123", "password": "resident123", "role": "landlord"},
        )
        self.assertEqual(wrong_role.status_code, 403)

    def test_resident_request_persists_in_sqlite(self):
        self.login()
        property_res = self.client.post(
            "/api/profile/property",
            json={"propertyId": "baylis-house-flat-1"},
        )
        self.assertEqual(property_res.status_code, 200)

        create_res = self.client.post(
            "/api/forms/cleaning",
            data={"propertyId": "baylis-house-flat-1", "date": "2026-06-20", "type": "Deep Clean"},
        )
        self.assertEqual(create_res.status_code, 200)
        request_id = create_res.get_json()["payload"]["id"]

        second_client = baylis_app.app.test_client()
        self.login(client=second_client)
        activity = second_client.get("/api/profile/activity")
        self.assertEqual(activity.status_code, 200)
        request_ids = [item["id"] for item in activity.get_json()["requests"]]
        self.assertIn(request_id, request_ids)

    def test_landlord_can_update_request_status_and_notify_resident(self):
        self.login()
        self.client.post("/api/profile/property", json={"propertyId": "baylis-house-flat-1"})
        created = self.client.post(
            "/api/forms/repairs",
            data={"propertyId": "baylis-house-flat-1", "issue": "Leaking tap"},
        )
        request_id = created.get_json()["payload"]["id"]

        landlord = baylis_app.app.test_client()
        self.login("landlord123", "landlord123", "landlord", client=landlord)
        requests_res = landlord.get("/api/requests")
        self.assertEqual(requests_res.status_code, 200)
        self.assertTrue(any(item["id"] == request_id for item in requests_res.get_json()))

        status_res = landlord.post(f"/api/requests/{request_id}/status", json={"status": "in_progress"})
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.get_json()["status"], "in_progress")

        notifications = self.client.get("/api/notifications")
        self.assertEqual(notifications.status_code, 200)
        titles = [item["title"] for item in notifications.get_json()["notifications"]]
        self.assertIn("Request status updated", titles)

    def test_landlord_property_crud(self):
        self.login("landlord123", "landlord123", "landlord")
        created = self.client.post("/api/properties", json={"label": "Court View - Flat 8"})
        self.assertEqual(created.status_code, 201)
        property_id = created.get_json()["property"]["id"]

        updated = self.client.patch(f"/api/properties/{property_id}", json={"label": "Court View - Flat 8A"})
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["property"]["label"], "Court View - Flat 8A")

        deleted = self.client.delete(f"/api/properties/{property_id}")
        self.assertEqual(deleted.status_code, 204)

    def test_community_post_and_comment_workflow(self):
        self.login()
        post_res = self.client.post(
            "/api/community",
            json={"title": "Parking", "message": "Can visitors park near the side gate?"},
        )
        self.assertEqual(post_res.status_code, 201)
        post_id = post_res.get_json()["id"]

        landlord = baylis_app.app.test_client()
        self.login("landlord123", "landlord123", "landlord", client=landlord)
        comment_res = landlord.post(
            f"/api/community/{post_id}/comments",
            json={"message": "Yes, use the marked visitor bays."},
        )
        self.assertEqual(comment_res.status_code, 201)

        feed_res = self.client.get("/api/community")
        self.assertEqual(feed_res.status_code, 200)
        post = next(item for item in feed_res.get_json() if item["id"] == post_id)
        self.assertEqual(post["comments"][0]["message"], "Yes, use the marked visitor bays.")

    def test_protected_pages_redirect_without_login(self):
        response = self.client.get("/resident.html")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response.headers["Location"])


if __name__ == "__main__":
    unittest.main()
