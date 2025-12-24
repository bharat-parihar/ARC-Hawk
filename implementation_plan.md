# Implementation Plan - Metadata and Logging Enhancements

This plan addresses the user's request for "complete metadata" (file properties) and "log history" (scan execution logs) in the Hawk Scanner and its API wrapper.

## 1. Hawk Scanner Enhancements (Python)

### A. enhance `getFileData` in `hawk_scanner/internals/system.py`
- [ ] Update `getFileData` to collect:
    - **Size**: File size in bytes.
    - **Permissions**: Octal mode.
    - **Extension**: File extension.
    - **AbsolutePath**: Full path.
    - **Timestamps**: Created Time (`st_ctime`), Modified Time (`st_mtime`), Accessed Time (`st_atime`).
    - **Owner**: Owner name/ID (`st_uid` -> name).
    - **Group**: Group name/ID (`st_gid` -> name).
    - **History/Sharing**:
        - Note: "Shared" status and "Who edited" logs are often filesystem/OS dependent and may not be available for standard local files (ext4/ntfs) without audit logs (auditd) or specific FS features.
        - We will attempt to capture what is standard (`stat`).
        - For specific cloud providers (Google Drive, S3) already in the scanner, we will map their specific API fields (e.g., `owners`, `lastModifyingUser`, `permissions`) to this common structure.
- [ ] This will propagate to `output.json`.

## 2. Go API Wrapper Enhancements

### A. Log Persistence and Retrieval
- [ ] Update `StartScanHandler`:
    - Instead of just returning output, write stdout/stderr to a log file: `logs/scan_<timestamp>.log`.
    - Return `scan_id` (timestamp) in the response.
- [ ] Add `GET /logs/:scan_id` endpoint:
    - Reads the specified log file and returns content.
- [ ] Add `GET /logs` endpoint:
    - Lists available scan logs.

### B. Metadata Exposure
- [ ] Update `HawkFinding` struct in `types.go` to include `MetaData` field (mapping to `file_data` from Python).
- [ ] (Optional) Add `GET /metadata/:scan_id` or similar if the user wants purely metadata without findings, but `output.json` with `file_data` likely suffices. We will ensure `GET /results` includes this rich data.

## 3. Execution Steps
1.  **Modify Python Code**: Update `system.py`.
2.  **Verify Python Output**: Run a quick scan and check `output.json` for new fields.
3.  **Modify Go Code**:
    - Update `handlers.go` for log management.
    - Update `main.go` to register new routes.
4.  **Verify API**: Start server, run scan, fetch logs.

## 4. Verification Plan
- Run `curl -X POST /scan`.
- Check `output.json` for `size`, `permissions`.
- Run `curl -X GET /logs`.
- Run `curl -X GET /logs/<latest>`.
