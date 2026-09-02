# Security Specification: FireMap Firestore Security

## 1. Data Invariants
1. **User Scoping**: A user can only read, create, update, or delete bookmarks under their own path `/users/{userId}/savedIncidents/{incidentId}` where `request.auth.uid == userId`.
2. **Community Reports**: Anyone authenticated can read community reports. However, reports can only be authored (`create`) by the authenticated user matching `userId == request.auth.uid`, and cannot be altered once submitted.
3. **Payload Sanitization**: Strings must have bounded length, IDs must conform to `^[a-zA-Z0-9_\-]+$`, and timestamps must be valid.
4. **Default Deny**: All unmatched collections and paths reject read and write operations.

## 2. Dirty Dozen Malicious Payloads Tested
1. **Impersonated Bookmark**: Writing a saved incident under `/users/otherUser/savedIncidents/fire1` while authenticated as `victimUser`. (Expected: DENIED)
2. **Unauthenticated Read**: Attempting to read `/users/alice/savedIncidents` without signing in. (Expected: DENIED)
3. **Unauthenticated Report**: Submitting a community report anonymously without auth token. (Expected: DENIED)
4. **Author Spoofing in Report**: Submitting a report where `userId: "bob"` while `request.auth.uid == "alice"`. (Expected: DENIED)
5. **Report Modification**: Attempting an `update` on an existing community report by another user. (Expected: DENIED)
6. **Oversized String Injection**: Submitting 500KB in `notes` to exhaust storage. (Expected: DENIED)
7. **Junk ID Path Poisoning**: Submitting document ID with path traversal or control characters `/users/{userId}/savedIncidents/<script>`. (Expected: DENIED)
8. **Shadow Field Injection**: Adding `{ isAdmin: true }` or `{ verified: true }` in `SavedIncident`. (Expected: DENIED)
9. **Missing Required Fields**: Submitting a bookmark without `incidentTitle` or `lat`. (Expected: DENIED)
10. **Type Mismatch**: Submitting string for `lat` or boolean for `incidentTitle`. (Expected: DENIED)
11. **Catch-All Probe**: Probing arbitrary root collection `/secrets/keys`. (Expected: DENIED)
12. **Cross-Tenant Document Deletion**: Attempting to delete another user's bookmark. (Expected: DENIED)
