"""kie.ai image generation helper for the game art (Nano Banana models).

Reads KIE_API_KEY from the project's .env (never printed). Functions:
  upload(path)                      -> public URL (kept 3 days by kie.ai), for reference images
  generate(prompt, refs=[], ratio)  -> local PNG path of the generated image
Runs tasks in parallel with generate_many([...]).
"""
from __future__ import annotations

import base64
import json
import os
import pathlib
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[3]
API = 'https://api.kie.ai'


def _key() -> str:
    for line in (ROOT / '.env').read_text().splitlines():
        if line.startswith('KIE_API_KEY='):
            return line.split('=', 1)[1].strip()
    raise SystemExit('KIE_API_KEY missing in .env')


KEY = _key()


def _req(method: str, url: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(r, timeout=120) as resp:
        out = json.loads(resp.read().decode())
    if out.get('code') not in (200, None):
        raise RuntimeError(f"kie.ai {url.split('/api/')[-1]}: {out.get('code')} {out.get('msg')}")
    return out


def upload(path: str | pathlib.Path) -> str:
    p = pathlib.Path(path)
    mime = 'image/png' if p.suffix == '.png' else 'image/webp' if p.suffix == '.webp' else 'image/jpeg'
    b64 = f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()
    body = {'base64Data': b64, 'uploadPath': 'ancient-realms', 'fileName': p.name}
    last: Exception | None = None
    for url in (f'{API}/api/v1/file-base64-upload', 'https://kieai.redpandaai.co/api/file-base64-upload'):
        try:
            d = _req('POST', url, body).get('data') or {}
            link = d.get('downloadUrl') or d.get('fileUrl') or d.get('url')
            if link:
                return link
        except Exception as e:  # try the next documented host
            last = e
    raise RuntimeError(f'upload failed: {last}')


def _create(prompt: str, refs: list[str], ratio: str) -> str:
    if refs:
        body = {'model': 'google/nano-banana-edit', 'input': {'prompt': prompt, 'image_urls': refs, 'output_format': 'png', 'aspect_ratio': ratio}}
    else:
        body = {'model': 'google/nano-banana', 'input': {'prompt': prompt, 'output_format': 'png', 'aspect_ratio': ratio}}
    return _req('POST', f'{API}/api/v1/jobs/createTask', body)['data']['taskId']


def _wait(task: str, timeout: int = 600) -> tuple[str, int]:
    t0 = time.time()
    while time.time() - t0 < timeout:
        d = _req('GET', f'{API}/api/v1/jobs/recordInfo?taskId={task}')['data']
        if d['state'] == 'success':
            return json.loads(d['resultJson'])['resultUrls'][0], int(d.get('creditsConsumed') or 0)
        if d['state'] == 'fail':
            raise RuntimeError(f"generation failed: {d.get('failCode')} {d.get('failMsg')}")
        time.sleep(4)
    raise TimeoutError(task)


def generate(prompt: str, out: str | pathlib.Path, refs: list[str] | None = None, ratio: str = '1:1', tries: int = 2) -> dict:
    out = pathlib.Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    last: Exception | None = None
    for _ in range(tries):
        try:
            task = _create(prompt, refs or [], ratio)
            url, credits = _wait(task)
            urllib.request.urlretrieve(url, out)
            return {'out': str(out), 'credits': credits}
        except Exception as e:  # retry once on a failed/timeout task
            last = e
    return {'out': str(out), 'error': str(last)}


def generate_many(jobs: list[dict], workers: int = 4) -> list[dict]:
    """jobs: [{prompt, out, refs?, ratio?}] — runs in parallel, returns results in order."""
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(lambda j: generate(j['prompt'], j['out'], j.get('refs'), j.get('ratio', '1:1')), jobs))
