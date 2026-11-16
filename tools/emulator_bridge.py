"""
VK Multi Upload — emulator bridge.

Why this exists: VK only lets the *mobile app* put a community playlist at an
arbitrary position (server method catalog.reorderBlockItems, not available to
the website's token — the web API's own relative move is accepted and ignored
for communities, only "move to the top" works). The official VK app running in
the Android emulator can do it, in a single save. This helper drives that app
through adb (accessibility tree + touch events), so the extension can ask for
"put playlist X at position N" and get the app's one-save behaviour.

Nothing is sent to VK by this script itself: the app performs the request with
its own session. Needs: Android emulator running, VK app logged in and opened on
Music -> Playlists of the community / profile (the "Playlists" screen with the
pencil in the top right).

Usage (CLI, for debugging):
    python emulator_bridge.py status
    python emulator_bridge.py scan                  # titles in the app's current order
    python emulator_bridge.py move FROM TO [--save] # 0-based indices; without --save nothing is stored
    python emulator_bridge.py serve [PORT]          # HTTP API for the extension (default 47863)
"""
import json
import os
import re
import subprocess
import sys
import threading
import time
import xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ADB = os.environ.get('ADB') or os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Android', 'Sdk', 'platform-tools', 'adb.exe')
SERIAL = os.environ.get('ANDROID_SERIAL')  # optional

SCREEN_W = 1080
HEADER_CY = 137            # vertical centre of the top bar icons
LEFT_ICON_X = 79           # Cancel / Back
RIGHT_ICON_X = 1001        # Edit list / Save
LIST_TOP = 230             # rows are fully usable below the top bar
LIST_BOTTOM = 2200         # bottom navigation starts around here
EDGE_DOWN_Y = 2230         # hold here to auto-scroll down while dragging (faster the nearer the edge)
EDGE_UP_Y = 215            # ... and here to auto-scroll up

LOCK = threading.Lock()


# ── adb plumbing ─────────────────────────────────────────────────────────────
def adb(*args, check=True, timeout=60):
    cmd = [ADB] + (['-s', SERIAL] if SERIAL else []) + list(args)
    r = subprocess.run(cmd, capture_output=True, timeout=timeout)
    out = r.stdout.decode('utf-8', 'replace')
    if check and r.returncode != 0:
        raise RuntimeError('adb %s: %s' % (' '.join(args[:3]), r.stderr.decode('utf-8', 'replace').strip()))
    return out


def tap(x, y):
    adb('shell', 'input', 'tap', str(int(x)), str(int(y)))


def swipe(x1, y1, x2, y2, ms=500):
    adb('shell', 'input', 'swipe', str(x1), str(y1), str(x2), str(y2), str(ms))


def motion(action, x, y):
    adb('shell', 'input', 'motionevent', action, str(int(x)), str(int(y)))


def device_ok():
    out = adb('devices', check=False)
    return bool(re.search(r'\bdevice\b', out.split('\n', 1)[-1]))


def dump_nodes(retries=4):
    """Accessibility tree of the foreground window as a list of dicts."""
    last = ''
    for _ in range(retries):
        adb('shell', 'uiautomator', 'dump', '/sdcard/_vmu_ui.xml', check=False)
        xml = adb('exec-out', 'cat', '/sdcard/_vmu_ui.xml', check=False)
        adb('shell', 'rm', '-f', '/sdcard/_vmu_ui.xml', check=False)
        last = xml
        if xml.lstrip().startswith('<?xml') or xml.lstrip().startswith('<hierarchy'):
            break
        time.sleep(0.4)
    try:
        root = ET.fromstring(last)
    except ET.ParseError:
        raise RuntimeError('could not read the screen (is a finger still down?)')
    out = []
    for n in root.iter('node'):
        m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', n.get('bounds', ''))
        if not m:
            continue
        l, t, r, b = map(int, m.groups())
        out.append({'text': n.get('text', ''), 'desc': n.get('content-desc', ''), 'res': n.get('resource-id', ''),
                    'l': l, 't': t, 'r': r, 'b': b})
    return out


# ── screen model ─────────────────────────────────────────────────────────────
class Screen:
    def __init__(self, nodes):
        self.nodes = nodes
        descs = {n['desc'] for n in nodes if n['desc']}
        self.edit = any(n['res'].endswith('iv_close') for n in nodes) or 'Save' in descs or 'Сохранить' in descs
        self.rows = []
        cells = [n for n in nodes if n['res'].endswith('cell_music_track')]
        for c in cells:
            inside = [n for n in nodes if n['t'] >= c['t'] - 1 and n['b'] <= c['b'] + 1]
            title = next((n['text'] for n in inside if n['res'].endswith('middle_title') and n['text']), None)
            if title is None:
                continue
            handle = next((n for n in inside if n['res'].endswith('right_extra_wrapper')), None)
            self.rows.append({
                'title': title, 'top': c['t'], 'bottom': c['b'], 'cy': (c['t'] + c['b']) // 2,
                'handle_x': (handle['l'] + handle['r']) // 2 if handle else None,
            })
        self.rows.sort(key=lambda r: r['top'])
        self.titles = [r['title'] for r in self.rows]

    @property
    def is_playlists(self):
        return any(r['title'] for r in self.rows) and any(n['res'].endswith('top_bar') for n in self.nodes)


def screen():
    return Screen(dump_nodes())


def usable(rows):
    """Rows whose centre is comfortably inside the scrolling area."""
    return [r for r in rows if LIST_TOP + 20 < r['cy'] < LIST_BOTTOM - 20]


# ── mode switching ───────────────────────────────────────────────────────────
def enter_edit(s=None):
    s = s or screen()
    if s.edit:
        return s
    tap(RIGHT_ICON_X, HEADER_CY)
    time.sleep(1.6)
    s = screen()
    if not s.edit:
        raise RuntimeError('could not open the app\'s list editor (is the Playlists screen open?)')
    return s


def cancel_edit():
    tap(LEFT_ICON_X, HEADER_CY)
    time.sleep(1.2)


def save_edit():
    tap(RIGHT_ICON_X, HEADER_CY)
    time.sleep(3.0)


# ── list scanning ────────────────────────────────────────────────────────────
def scroll_to_top(max_iter=40):
    prev = None
    for _ in range(max_iter):
        s = screen()
        first = s.titles[0] if s.titles else None
        top_row = s.rows[0]['top'] if s.rows else None
        if top_row is not None and top_row >= 400 and first == prev:
            return s
        if top_row is not None and top_row >= 420:       # the "Create playlist" cell is on screen -> top
            return s
        prev = first
        swipe(540, 700, 540, 1900, 350)
        time.sleep(0.35)
    return screen()


def merge_window(collected, window):
    """Append the part of `window` that is new, using the longest tail/head overlap."""
    if not collected:
        return list(window)
    best = 0
    for k in range(min(len(collected), len(window)), 0, -1):
        if collected[-k:] == window[:k]:
            best = k
            break
    return collected + window[best:]


def scan_all(max_screens=80):
    s = scroll_to_top()
    collected = merge_window([], s.titles)
    stalled = 0
    for _ in range(max_screens):
        swipe(540, 1900, 540, 800, 450)   # ~5 rows per swipe (rows are 221 px)
        time.sleep(0.5)
        s = screen()
        before = len(collected)
        collected = merge_window(collected, s.titles)
        if len(collected) == before:
            stalled += 1
            if stalled >= 2:
                break
        else:
            stalled = 0
    return collected


def locate_window(full, titles):
    """Global index of the first of `titles` inside `full` (contiguous match), or None."""
    n = len(titles)
    if n == 0:
        return None
    for i in range(0, len(full) - n + 1):
        if full[i:i + n] == titles:
            return i
    return None


# ── dragging ─────────────────────────────────────────────────────────────────
def drag_visible(row_cy, handle_x, to_y, steps=8):
    motion('DOWN', handle_x, row_cy)
    time.sleep(0.7)
    for k in range(1, steps + 1):
        motion('MOVE', handle_x, row_cy + (to_y - row_cy) * k / steps)
        time.sleep(0.12)
    time.sleep(0.4)
    motion('UP', handle_x, to_y)
    time.sleep(0.9)


def hop(row_cy, handle_x, down, hold_s):
    """Pick the row up and hold it at the top/bottom edge so the list scrolls, then drop it there.
    The closer the finger is to the screen edge the faster the list scrolls (~3 rows/s at 200px
    from the edge, ~10 rows/s right at it), so park it as close as the screen allows."""
    edge = EDGE_DOWN_Y if down else EDGE_UP_Y
    motion('DOWN', handle_x, row_cy)
    time.sleep(0.7)
    steps = 6
    for k in range(1, steps + 1):
        motion('MOVE', handle_x, row_cy + (edge - row_cy) * k / steps)
        time.sleep(0.08)
    time.sleep(hold_s)
    motion('UP', handle_x, edge)
    time.sleep(1.4)           # let the list settle before reading it


def landed_index(rest, s, title, near_y=None):
    """Global index of the dragged playlist on screen `s`, given `rest` = the order without it."""
    best = None
    for r_idx, r in enumerate(s.rows):
        if r['title'] != title:
            continue
        others = s.titles[:r_idx] + s.titles[r_idx + 1:]
        st = locate_window(rest, others)
        if st is None:
            continue
        cand = (abs(r['cy'] - near_y) if near_y is not None else 0, st + r_idx)
        if best is None or cand < best:
            best = cand
    return None if best is None else best[1]


ROWS_PER_SEC = 9.0     # measured auto-scroll speed with the finger parked at the screen edge


def move_item(order, i, j, log=print):
    """Move the item at index i to index j inside the app's edit mode. `order` = titles in app order.
    Returns the new order. Does not save. Re-reads the screen after every drop and corrects."""
    title = order[i]
    for _ in range(30):
        if i == j:
            return order
        down = j > i
        s = screen()
        rest = order[:i] + order[i + 1:]
        start = locate_window(order, s.titles)
        if start is None:
            raise RuntimeError('the app list does not match the expected order - refresh the screen and retry')
        src_idx = i - start
        if not (0 <= src_idx < len(s.rows) and LIST_TOP + 40 < s.rows[src_idx]['cy'] < LIST_BOTTOM - 40):
            # bring the source row into view: a run of swipes (~5 rows each) without reading the
            # screen in between, undershooting a little; the loop then re-reads and corrects
            if src_idx < 0:
                rows_away = -src_idx + 1
                n = max(1, int(rows_away / 5.0) - 0)
                for _k in range(min(n, 40)):
                    swipe(540, 800, 540, 1900, 450)
                    time.sleep(0.35)
            else:
                rows_away = src_idx - len(s.rows) + 3
                n = max(1, int(rows_away / 5.0) - 0)
                for _k in range(min(n, 40)):
                    swipe(540, 1900, 540, 800, 450)
                    time.sleep(0.35)
            time.sleep(0.6)
            continue
        src = s.rows[src_idx]
        hx = src['handle_x'] or 880
        tgt_idx = j - start
        tgt_visible = 0 <= tgt_idx < len(s.rows) and LIST_TOP + 40 < s.rows[tgt_idx]['cy'] < LIST_BOTTOM - 40
        if tgt_visible:
            # Compose swaps rows only once the dragged item's centre is PAST the neighbour's centre,
            # so aim ~40% of a row beyond the target slot's centre in the travel direction.
            dst_y = s.rows[tgt_idx]['cy'] + (90 if down else -90)
            drag_visible(src['cy'], hx, dst_y)
            edge_y = None
        else:
            remaining = abs(j - i)
            visible = max(1, len(s.rows))
            # leave the last screenful for the precise drop; never hold more than the list can scroll
            hold = max(0.8, min(14.0, (remaining - visible // 2) / ROWS_PER_SEC))
            hop(src['cy'], hx, down, hold)
            edge_y = EDGE_DOWN_Y if down else EDGE_UP_Y
        s2 = screen()
        landed = landed_index(rest, s2, title, near_y=edge_y)
        if landed is None:
            raise RuntimeError('lost track of the dragged playlist after the drop')
        order = rest[:landed] + [title] + rest[landed:]
        log('  %s -> now at #%d (wanted #%d)' % ('hop' if edge_y else 'drop', landed, j))
        i = landed
    raise RuntimeError('could not place the playlist at #%d' % j)


# ── HTTP API ─────────────────────────────────────────────────────────────────
def status():
    st = {'adb': os.path.exists(ADB), 'device': False, 'screen': 'unknown'}
    try:
        st['device'] = device_ok()
        if st['device']:
            s = screen()
            st['screen'] = 'playlists-edit' if (s.edit and s.rows) else ('playlists' if s.rows else 'other')
            st['rows_visible'] = len(s.rows)
    except Exception as e:  # noqa: BLE001
        st['error'] = str(e)
    return st


def lis_indices(arr):
    """Indices of one longest strictly increasing subsequence of `arr` (patience sorting)."""
    tails, prev = [], [-1] * len(arr)
    for i, v in enumerate(arr):
        lo, hi = 0, len(tails)
        while lo < hi:
            mid = (lo + hi) // 2
            if arr[tails[mid]] < v:
                lo = mid + 1
            else:
                hi = mid
        if lo > 0:
            prev[i] = tails[lo - 1]
        if lo == len(tails):
            tails.append(i)
        else:
            tails[lo] = i
    keep, k = set(), tails[-1] if tails else -1
    while k != -1:
        keep.add(k)
        k = prev[k]
    return keep


def do_reorder(titles, target, log=print):
    """titles: playlist titles in the current order; target: same titles in the wanted order. One save at the end."""
    if sorted(titles) != sorted(target):
        raise ValueError('target is not a permutation of the current list')
    enter_edit()
    s = scroll_to_top()
    if s.titles != titles[:len(s.titles)]:
        raise RuntimeError('the app shows a different order at the top (%r vs %r); '
                           'pull the list down to refresh it in the app and retry'
                           % (s.titles[:3], titles[:3]))
    if len(set(titles)) != len(titles):
        raise ValueError('duplicate playlist titles are not supported by the emulator route')
    order = list(titles)
    pos = {t: i for i, t in enumerate(titles)}
    keep = lis_indices([pos[t] for t in target])      # target indices whose playlist can stay where it is
    moves = 0
    for k, want in enumerate(target):
        if k in keep:
            continue
        # put it right after its predecessor in the target (or first)
        rest = [t for t in order if t != want]
        j = 0 if k == 0 else rest.index(target[k - 1]) + 1
        i = order.index(want)
        if i == j:
            continue
        order = move_item(order, i, j, log)
        moves += 1
    if moves:
        save_edit()
    else:
        cancel_edit()
    return {'moves': moves}


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get('Origin', '')
        if re.match(r'^https://([a-z0-9-]+\.)?vk\.(com|ru)$', origin):
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Headers', 'content-type')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Private-Network', 'true')

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):  # noqa: N802
        if self.path.startswith('/ping'):
            with LOCK:
                self._json(200, {'ok': True, **status()})
        else:
            self._json(404, {'ok': False, 'error': 'not found'})

    def do_POST(self):  # noqa: N802
        if not self.path.startswith('/reorder'):
            self._json(404, {'ok': False, 'error': 'not found'})
            return
        try:
            n = int(self.headers.get('Content-Length', '0'))
            data = json.loads(self.rfile.read(n) or b'{}')
            with LOCK:
                res = do_reorder(data['titles'], data['target'])
            self._json(200, {'ok': True, **res})
        except Exception as e:  # noqa: BLE001
            self._json(200, {'ok': False, 'error': str(e)})

    def log_message(self, fmt, *args):  # quiet
        pass


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    cmd = argv[1] if len(argv) > 1 else 'status'
    if cmd == 'status':
        print(json.dumps(status(), ensure_ascii=False, indent=1))
    elif cmd == 'scan':
        enter_edit()
        titles = scan_all()
        for k, t in enumerate(titles):
            print('%3d  %s' % (k, t))
        cancel_edit()
    elif cmd == 'move':
        i, j = int(argv[2]), int(argv[3])
        save = '--save' in argv
        enter_edit()
        if '--titles' in argv:
            order = json.load(open(argv[argv.index('--titles') + 1], encoding='utf-8'))
            scroll_to_top()
        else:
            order = scan_all()
            scroll_to_top()
        print('list size', len(order))
        t0 = time.time()
        new = move_item(order, i, j)
        print('move took %.1fs' % (time.time() - t0))
        vis = screen().titles
        at = locate_window(new, vis)
        print('visible window consistent with the expected order:', at is not None,
              '(window starts at global #%s)' % at)
        if at is None:
            print('  visible:', [t[:25] for t in vis])
            print('  expected near target:', [t[:25] for t in new[max(0, j - 3): j + 4]])
        else:
            print('dragged item is at global #%d (wanted #%d)' % (at + vis.index(order[i]) if order[i] in vis else -1, j))
        if save:
            save_edit()
            print('saved')
        else:
            cancel_edit()
            print('discarded (no --save)')
    elif cmd == 'serve':
        port = int(argv[2]) if len(argv) > 2 else 47863
        srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
        print('emulator bridge on http://127.0.0.1:%d  (Ctrl+C to stop)' % port)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
    else:
        print(__doc__)


if __name__ == '__main__':
    main(sys.argv)
