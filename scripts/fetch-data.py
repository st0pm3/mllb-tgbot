#!/usr/bin/env python3
"""Bounded, resumable public-data import. No player accounts or credentials."""
import argparse, concurrent.futures, datetime, json, pathlib, time, threading, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'content' / 'raw'
BASE = 'https://arena.rone.dev'
STOP = threading.Event()
LOCK = threading.Lock()
REPORT = {'provider': BASE, 'resources': {}, 'policy': 'Import only. Editorial review required.'}
def checkpoint(name, status, **details):
    with LOCK:
        REPORT['resources'][name] = {'status': status, **details}
        temporary = OUT / 'retrieval.json.tmp'
        temporary.write_text(json.dumps(REPORT, ensure_ascii=False))
        temporary.replace(OUT / 'retrieval.json')

def validate_envelope(data, complete=True):
    if not isinstance(data, dict) or data.get('code') not in [0, None] or not isinstance(data.get('data'), dict):
        raise ValueError('Unexpected or rejected provider envelope')
    payload = data['data']
    records = payload.get('records')
    total = payload.get('total')
    if complete and isinstance(records, list) and isinstance(total, (int, float)) and total > len(records):
        raise ValueError('Incomplete page: total exceeds returned records; review pagination before normalizing')
    return data

def fetch(path, name):
    target = OUT / (name + '.json')
    if STOP.is_set():
        checkpoint(name, 'not_attempted', reason='Import stopped after provider or network refusal')
        return None
    if target.exists() and not args.refresh:
        try:
            cached = validate_envelope(json.loads(target.read_text()), complete=not name.startswith(('core-', 'guide-')))
            checkpoint(name, 'cached', fetchedAt=datetime.datetime.fromtimestamp(target.stat().st_mtime, datetime.timezone.utc).isoformat())
            return cached
        except (ValueError, OSError) as e:
            checkpoint(name, 'invalid_cache', error=str(e))
            return None
    time.sleep(0.8)
    request = urllib.request.Request(BASE + path, headers={'User-Agent': 'MLBBMetaBot/0.1 (cached-development-import)'})
    try:
        with urllib.request.urlopen(request, timeout=25) as r:
            data = json.load(r)
        validate_envelope(data, complete=not name.startswith(('core-', 'guide-')))
        temporary = target.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(data, ensure_ascii=False))
        temporary.replace(target)
        checkpoint(name, 'fetched', fetchedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
        return data
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as e:
        if isinstance(e, urllib.error.URLError) or (isinstance(e, urllib.error.HTTPError) and e.code in [401,403,429,503]):
            STOP.set()
        checkpoint(name, 'failed', error=str(e))
        print('Skipped', name, str(e), flush=True)
        return None


def main():
    global args
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    for name, path in [
        ('catalog', '/api/academy/heroes/catalog?size=200&lang=en'),
        ('heroes', '/api/heroes?size=200&lang=en'),
        ('version', '/api/academy/meta/version?size=1&lang=en'),
        ('equipment', '/api/academy/equipment?size=300&lang=en'),
        ('spells', '/api/academy/spells?size=100&lang=en'),
        ('emblems', '/api/academy/emblems?size=100&lang=en'),
    ]:
        fetch(path, name)
    for rank in ['all', 'epic', 'legend', 'mythic', 'honor', 'glory']:
        fetch(f'/api/heroes/rank?days=7&rank={rank}&size=200&lang=en', 'rank-' + rank)

    if STOP.is_set():
        raise SystemExit('Import stopped. Cached files preserved; inspect content/raw/retrieval.json before retrying.')
    roster = validate_envelope(json.loads((OUT / 'catalog.json').read_text()))['data']['records']
    def one(record):
        d = record['data']; hero = d['hero_id']
        fetch(f'/api/heroes/{hero}?lang=en', f'hero-{hero}')
        roads = [r.get('data',{}).get('road_sort_id') for r in d['hero']['data'].get('roadsort',[]) if isinstance(r,dict)]
        lane = next(({'1':'exp','2':'mid','3':'roam','4':'jungle','5':'gold'}[r] for r in roads if r in ['1','2','3','4','5']), None)
        if lane:
            fetch(f'/api/academy/heroes/{hero}/builds?lane={lane}&rank=mythic&size=1&lang=en', f'core-{hero}-{lane}')
        fetch(f'/api/academy/heroes/{hero}/recommended?size=1&lang=en', f'guide-{hero}')
        return hero

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for i, hero in enumerate(pool.map(one, roster[:args.limit or None]), 1):
            if i % 10 == 0 or i == len(roster):
                print(f'Imported {i}/{len(roster)} heroes', flush=True)
    failed = any(r['status'] in ['failed','not_attempted','invalid_cache'] for r in REPORT['resources'].values())
    print('Import incomplete; inspect retrieval.json.' if failed else 'Fetch complete. Run npm run normalize.', flush=True)
    raise SystemExit(1 if failed else 0)

if __name__ == '__main__':
    main()
