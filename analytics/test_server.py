import os
import tempfile
import unittest

import server


class AnalyticsTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        server.DATABASE = os.path.join(self.folder.name, "analytics.sqlite3")
        server.setup()
        self.card = "a" * 64
        self.creator = "11111111-1111-4111-8111-111111111111"
        self.reader = "22222222-2222-4222-8222-222222222222"

    def tearDown(self):
        self.folder.cleanup()

    def event(self, kind, visitor):
        return {"event": kind, "cardId": self.card, "visitorId": visitor, "audience": "friend"}

    def test_unique_people_and_recipient_open_are_distinct_from_actions(self):
        server.record(self.event("created", self.creator))
        server.record(self.event("created", self.creator))
        server.record(self.event("share_copy", self.creator))
        server.record(self.event("share_copy", self.creator))
        server.record(self.event("opened", self.creator))
        server.record(self.event("opened", self.reader))
        server.record(self.event("opened", self.reader))
        result = server.metrics()
        self.assertEqual(result["summary"], {
            "creators": 1, "cards": 1, "sharers": 1, "creatorSharers": 1, "shareActions": 2,
            "cardsShared": 1, "cardsOpenedByOthers": 1, "recipientOpens": 1,
        })
        self.assertEqual(result["byMethod"], {"share_copy": 2})

    def test_only_opaque_identifiers_are_accepted(self):
        self.assertTrue(server.valid_event(self.event("created", self.creator)))
        self.assertFalse(server.valid_event({**self.event("created", self.creator), "sender": "private name"}))
        self.assertFalse(server.valid_event({**self.event("created", self.creator), "cardId": "a name"}))
        self.assertFalse(server.valid_event({**self.event("created", self.creator), "event": []}))


if __name__ == "__main__":
    unittest.main()
