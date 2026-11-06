#!/usr/bin/env python3
"""Isolated Linux-container smoke test of backpressure, capacity and cleanup."""
import http.cookiejar
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
root = Path(tempfile.mkdtemp(prefix="sharelyze-concurrency-"))
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
connections = []


def call(path, data=None, agent=None, headers=None):
    request_headers = {"Origin": origin, **(headers or {})}
    if data is not None:
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        origin + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers=request_headers,
    )
    return (agent or urllib.request.build_opener()).open(request, timeout=15)


try:
    subprocess.run(
        ["docker", "run", "--rm", "-d", "--name", name,
         "-p", f"127.0.0.1:{port}:3000", "--tmpfs", "/data:uid=1000,gid=1000",
         "-v", f"{root}:/sources/test:ro", "-e", f"PUBLIC_ORIGIN={origin}",
         "-e", f"SETUP_TOKEN={token}", image],
        check=True, stdout=subprocess.DEVNULL,
    )
    for _ in range(100):
        try:
            with call("/api/health") as response:
                response.read()
            break
        except OSError:
            time.sleep(0.1)
    else:
        raise RuntimeError("Container did not start")
    agent = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )
    with call("/api/auth/setup", {"username": "test", "password": "test-password-123", "setupToken": token}, agent) as response:
        response.read()
    with call("/api/sources", agent=agent) as response:
        sources = json.load(response)["sources"]
    source_id = next(source["id"] for source in sources if source["name"] == "test")
    with call("/api/shares", {"title": "Test", "slug": "capacity", "items": [{"sourceId": source_id, "path": "large.bin", "kind": "file"}]}, agent) as response:
        response.read()
    with call("/api/public/capacity") as response:
        item = json.load(response)["items"][0]["id"]
    url = f"/api/public/capacity/items/{item}/download"
    for _ in range(32):
        response = call(url)
        if response.status != 200:
            raise AssertionError(f"Unexpected status {response.status}")
        connections.append(response)
    try:
        call(url)
        raise AssertionError("33rd download should have been rejected")
    except urllib.error.HTTPError as error:
        if error.code != 503:
            raise
    for response in connections:
        response.close()
    connections.clear()
    for _ in range(50):
        try:
            with call(url, headers={"Range": "bytes=0-3"}) as response:
                assert response.status == 206 and len(response.read()) == 4
            break
        except urllib.error.HTTPError as error:
            if error.code != 503:
                raise
            time.sleep(0.1)
    else:
        raise AssertionError("Capacity was not released after disconnect")
    for _ in range(50):
        with call("/api/analytics/events?type=download_aborted", agent=agent) as response:
            aborted = json.load(response)["events"]
        if len(aborted) == 32:
            break
        time.sleep(0.1)
    else:
        raise AssertionError(f"Expected 32 logged disconnects, got {len(aborted)}")
    for row in aborted:
        details = row["details"]
        assert details["transfer"]["outcome"] == "aborted"
        assert details["transfer"]["bytes"] < 128 * 1024 * 1024
        assert details["transfer"]["durationMs"] >= 0
        assert details["diagnostic"]["code"] == "client_disconnected"
        assert len(details["diagnostic"]["possibleReasons"]) > 1
    print("32 paused downloads accepted, 33rd rejected, capacity released; 32 structured abort logs include partial bytes, duration and possible causes")
finally:
    for response in connections:
        response.close()
    subprocess.run(["docker", "stop", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shutil.rmtree(root)
