#!/usr/bin/env python3
"""Exercise mutation during file and ZIP streams in a disposable container."""
import http.cookiejar
import http.client
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

image = sys.argv[1] if len(sys.argv) > 1 else "sharelyze-ci"
root = Path(tempfile.mkdtemp(prefix="sharelyze-integrity-"))
os.chmod(root, 0o755)
file = root / "large.bin"
with file.open("wb") as handle:
    handle.truncate(128 * 1024 * 1024)
os.chmod(file, 0o644)
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
origin = f"http://127.0.0.1:{port}"
name = f"sharelyze-test-{uuid.uuid4().hex[:12]}"
token = "isolated-test-token-0123456789abcdef"


def call(path, data=None, agent=None):
    headers = {"Origin": origin}
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(origin + path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
    return (agent or urllib.request.build_opener()).open(request, timeout=30)


def change_during(path):
    response = call(path)
    try:
        assert response.read(65536)
        subprocess.run(["docker", "exec", name, "node", "-e", "const f=require('fs');const d=f.openSync('/sources/test/large.bin','r+');f.writeSync(d,require('crypto').randomBytes(32),0,32,64*1024*1024);f.fsyncSync(d);f.closeSync(d)"], check=True)
        try:
            while response.read(1024 * 1024):
                pass
        except (http.client.IncompleteRead, ConnectionError, OSError):
            pass  # A stream interrupted after headers has no replacement HTTP status.
    finally:
        response.close()


try:
    subprocess.run(["docker", "run", "--rm", "-d", "--name", name,
        "-p", f"127.0.0.1:{port}:3000", "--tmpfs", "/data:uid=1000,gid=1000",
        "--tmpfs", "/sources/test:uid=1000,gid=1000", "-e", f"PUBLIC_ORIGIN={origin}",
        "-e", f"SETUP_TOKEN={token}", image],
        check=True, stdout=subprocess.DEVNULL)
    for _ in range(100):
        try:
            with call("/api/health") as response:
                response.read()
            break
        except OSError:
            time.sleep(0.1)
    else:
        raise RuntimeError("Container did not start")
    subprocess.run(["docker", "exec", name, "node", "-e", "require('fs').writeFileSync('/sources/test/large.bin','');require('fs').truncateSync('/sources/test/large.bin',128*1024*1024)"], check=True)
    agent = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    with call("/api/auth/setup", {"username":"test", "password":"test-password-123", "setupToken":token}, agent) as response:
        response.read()
    with call("/api/sources", agent=agent) as response:
        sources = json.load(response)["sources"]
    source_id = next(source["id"] for source in sources if source["name"] == "test")
    with call("/api/shares", {"title":"Test", "slug":"integrity", "items":[{"sourceId":source_id, "path":"large.bin", "kind":"file"}]}, agent) as response:
        response.read()
    with call("/api/public/integrity") as response:
        item = json.load(response)["items"][0]["id"]
    change_during(f"/api/public/integrity/items/{item}/download")
    change_during("/api/public/integrity/zip")
    with call("/api/analytics", agent=agent) as response:
        totals = {row["type"]: row["count"] for row in json.load(response)["totals"]}
    assert totals.get("download_start") == 1 and totals.get("zip_start") == 1, totals
    assert not totals.get("transfer_finished") and not totals.get("zip_finished"), totals
    with call("/api/analytics/events", agent=agent) as response:
        events = json.load(response)["events"]
    failures = [row for row in events if row["type"] in ("download_error", "zip_error")]
    assert {row["type"] for row in failures} == {"download_error", "zip_error"}, failures
    for row in failures:
        assert row["details"]["transfer"]["outcome"] == "failed"
        assert row["details"]["diagnostic"]["code"] == "source_changed"
    print("Mutated file and ZIP streams were not counted as completed; structured error logs identify source changes")
finally:
    subprocess.run(["docker", "stop", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shutil.rmtree(root)
