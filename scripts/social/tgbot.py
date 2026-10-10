"""@onchainTRAVIAN_bot - hands out the X posts from branding/social/posts.md on request.

python3 scripts/social/tgbot.py            run the bot (long polling; systemd user unit onchain-tgbot)
python3 scripts/social/tgbot.py send <n>   push post n to the paired chat now
python3 scripts/social/tgbot.py check      parse posts.md and print the queue

Stdlib only. Needs TELEGRAM_BOT_TOKEN (and after pairing TELEGRAM_CHAT_ID) in the repo's .env.
posts.md is the source of truth: headings `### <n>. <Title> - <status>` (draft|ready|posted|skipped),
optional `File: <path>` line, the first ``` block is the post, `Reply under it: `...`` the reply.
"""
import html
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
import uuid

REPO = pathlib.Path(__file__).resolve().parents[2]
POSTS = REPO / 'branding' / 'social' / 'posts.md'
STATUSES = ('draft', 'ready', 'posted', 'skipped')
ICON = {'draft': '📝', 'ready': '🟢', 'posted': '✅', 'skipped': '⏭'}
HEAD = re.compile(r'^### (\d+)\. (.+?) - (' + '|'.join(STATUSES) + r')[ \t]*$', re.M)
KEYBOARD = {'keyboard': [[{'text': 'Next'}, {'text': 'List'}, {'text': 'Help'}]], 'resize_keyboard': True}
HELP = ('<b>onchainTRAVIAN post queue</b>\n'
        'Next - the next ready post (file + text to copy)\n'
        'List - all posts and their status\n'
        '/post 3 - show post 3 (also drafts)\n'
        'After posting on X tap ✅ Posted.')


def env() -> dict[str, str]:
    out = {}
    for line in (REPO / '.env').read_text().splitlines():
        m = re.match(r'\s*([A-Z0-9_]+)\s*=\s*(.*)$', line)
        if m:
            out[m[1]] = m[2].strip().strip('"\'')
    return out


TOKEN = env().get('TELEGRAM_BOT_TOKEN', '')


def log(*a: object) -> None:
    print(time.strftime('%H:%M:%S'), *(str(x).replace(TOKEN, '***') if TOKEN else x for x in a), flush=True)


# ---------- posts.md ----------

def posts() -> list[dict]:
    text = POSTS.read_text()
    heads = list(HEAD.finditer(text))
    out = []
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        body = text[h.end():end]
        body = body.split('\n## ', 1)[0]  # stop at the next day heading
        lines = [l for l in body.strip().splitlines() if l.strip()]
        code = re.search(r'```\n(.*?)```', body, re.S)
        file = re.search(r'^File: (.+?)\s*$', body, re.M)
        reply = re.search(r'^Reply under it: `(.+?)`', body, re.M)
        poll = re.search(r'^📊 poll: (.+?)\s*$', body, re.M)
        out.append({
            'n': int(h[1]), 'title': h[2], 'status': h[3],
            'media': lines[0] if lines else '',
            'file': (REPO / file[1]) if file else None,
            'text': code[1].strip() if code else '',
            'reply': reply[1] if reply else '',
            'poll': poll[1] if poll else '',
        })
    return out


def find(n: int) -> dict | None:
    return next((p for p in posts() if p['n'] == n), None)


def set_status(n: int, status: str) -> None:
    text = POSTS.read_text()
    pat = re.compile(r'^(### ' + str(n) + r'\. .+? - )(' + '|'.join(STATUSES) + r')([ \t]*)$', re.M)
    POSTS.write_text(pat.sub(lambda m: m[1] + status + m[3], text, count=1))


# ---------- Telegram API ----------

def api(method: str, data: dict | None = None, files: dict[str, pathlib.Path] | None = None, timeout: int = 70) -> dict:
    url = f'https://api.telegram.org/bot{TOKEN}/{method}'
    if files:
        boundary = uuid.uuid4().hex
        parts = []
        for k, v in (data or {}).items():
            v = json.dumps(v) if isinstance(v, (dict, list)) else str(v)
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        for k, path in files.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{path.name}"\r\n'
                         'Content-Type: application/octet-stream\r\n\r\n'.encode() + path.read_bytes() + b'\r\n')
        body = b''.join(parts) + f'--{boundary}--\r\n'.encode()
        req = urllib.request.Request(url, body, {'Content-Type': f'multipart/form-data; boundary={boundary}'})
    else:
        req = urllib.request.Request(url, json.dumps(data or {}).encode(), {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        res = json.load(e)
        log('api error', method, res.get('description'))
        return res


def say(chat: int, text: str, markup: dict | None = None) -> None:
    api('sendMessage', {'chat_id': chat, 'text': text, 'parse_mode': 'HTML', 'disable_web_page_preview': True,
                        'reply_markup': markup or KEYBOARD})


def buttons(n: int) -> dict:
    return {'inline_keyboard': [[{'text': '✅ Posted', 'callback_data': f'st:{n}:posted'},
                                 {'text': '⏭ Skip', 'callback_data': f'st:{n}:skipped'},
                                 {'text': '⏸ Later', 'callback_data': f'st:{n}:later'}]]}


def send_post(chat: int, p: dict) -> None:
    head = f"#{p['n']} {p['title']} ({p['status']})"
    if p['file'] and p['file'].exists():
        api('sendDocument', {'chat_id': chat, 'caption': head}, {'document': p['file']}, timeout=300)
    elif p['file']:
        say(chat, f'<b>{html.escape(head)}</b>\n⚠️ media not made yet: {html.escape(p["file"].name)}')
    else:
        say(chat, f'<b>{html.escape(head)}</b>\n{html.escape(p["media"])}')
    say(chat, f'<pre>{html.escape(p["text"])}</pre>')
    if p['poll']:
        say(chat, f'📊 Poll options: <b>{html.escape(p["poll"])}</b>')
    if p['reply']:
        say(chat, f'Reply under it:\n<pre>{html.escape(p["reply"])}</pre>')
    say(chat, f'Posted #{p["n"]} on X?', buttons(p['n']))


def next_ready() -> dict | None:
    return next((p for p in posts() if p['status'] == 'ready'), None)


def queue_text() -> str:
    rows = []
    for p in posts():
        media = '' if not p['file'] else (' 🖼' if p['file'].exists() else ' ⚠️no file')
        rows.append(f"{ICON[p['status']]} {p['n']}. {html.escape(p['title'])}{media}")
    return '<b>Post queue</b>\n' + '\n'.join(rows) + '\n\n📝 draft · 🟢 ready · ✅ posted · ⏭ skipped'


# ---------- bot loop ----------

def handle_message(m: dict, owner: int | None) -> None:
    chat, text = m['chat']['id'], (m.get('text') or '').strip()
    if owner is None:
        if text.startswith('/start'):
            log(f'pairing: chat id {chat} - add TELEGRAM_CHAT_ID={chat} to .env')
            say(chat, 'Not paired yet. Ask Claude to pair this chat.')
        return
    if chat != owner:
        return
    cmd = text.lower().lstrip('/').split('@')[0]
    if cmd in ('start', 'help'):
        say(chat, HELP)
    elif cmd == 'next':
        p = next_ready()
        if p:
            send_post(chat, p)
        else:
            say(chat, 'No ready posts right now. Ask Claude for the next batch.')
    elif cmd == 'list':
        say(chat, queue_text())
    elif re.fullmatch(r'post\s+\d+', cmd):
        p = find(int(cmd.split()[1]))
        if p:
            send_post(chat, p)
        else:
            say(chat, 'No post with that number.')
    else:
        say(chat, HELP)


def handle_callback(q: dict, owner: int | None) -> None:
    chat = q['message']['chat']['id']
    if owner is None or chat != owner:
        return
    _, n, status = q['data'].split(':')
    n = int(n)
    api('answerCallbackQuery', {'callback_query_id': q['id']})
    api('editMessageReplyMarkup', {'chat_id': chat, 'message_id': q['message']['message_id'],
                                   'reply_markup': {'inline_keyboard': []}})
    if status in STATUSES:
        set_status(n, status)
        log(f'post {n} -> {status}')
    nxt = next_ready()
    done = 'Left as ready' if status == 'later' else f'Marked #{n} {status}'
    say(chat, f'{done}. Next: ' + (f"#{nxt['n']} {html.escape(nxt['title'])}" if nxt else 'nothing ready'))


def owner_id() -> int | None:
    v = env().get('TELEGRAM_CHAT_ID', '')
    return int(v) if v.lstrip('-').isdigit() else None


def run() -> None:
    log('bot started, queue:', len(posts()), 'posts')
    offset, wait = 0, 5
    while True:
        try:
            res = api('getUpdates', {'offset': offset, 'timeout': 50, 'allowed_updates': ['message', 'callback_query']})
            for u in res.get('result', []):
                offset = u['update_id'] + 1
                owner = owner_id()
                if 'message' in u:
                    handle_message(u['message'], owner)
                elif 'callback_query' in u:
                    handle_callback(u['callback_query'], owner)
            wait = 5
        except Exception as e:  # network hiccups: back off, never die
            log('error', type(e).__name__, e)
            time.sleep(wait)
            wait = min(wait * 2, 30)


if __name__ == '__main__':
    if not TOKEN:
        sys.exit('TELEGRAM_BOT_TOKEN missing in .env')
    arg = sys.argv[1:]
    if arg[:1] == ['check']:
        for p in posts():
            f = '' if not p['file'] else f" file={'ok' if p['file'].exists() else 'MISSING'}"
            print(f"{p['n']:>3} {p['status']:<8} {len(p['text']):>4} ch  reply={'y' if p['reply'] else 'n'}{f}  {p['title']}")
    elif arg[:1] == ['send'] and len(arg) == 2:
        owner, p = owner_id(), find(int(arg[1]))
        if owner is None or p is None:
            sys.exit('not paired (TELEGRAM_CHAT_ID) or no such post')
        send_post(owner, p)
    else:
        run()
