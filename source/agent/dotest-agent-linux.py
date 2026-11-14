#!/usr/bin/env python3
# =====================================================================
#  DOTest Hardware Agent for Linux  —  v1.0      © Ahmed Al-Zahrani
#  Read-only. Saves ~/Desktop/DOTest-Report.json (or ~/DOTest-Report.json)
#  Nothing is uploaded. Run:  python3 dotest-agent-linux.py
#  Run with sudo to also read serial numbers & RAM sticks (dmidecode).
# =====================================================================
import json, os, re, subprocess, time, glob, socket, getpass, datetime


def sh(cmd):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15).stdout.strip()
    except Exception:
        return ''


def rd(path):
    try:
        with open(path) as f:
            v = f.read().strip()
            return v or None
    except Exception:
        return None


def clean(v):
    if v is None:
        return None
    v = str(v).strip()
    if not v or re.match(r'^(To Be Filled.*|Default string|None|0+|System Serial Number|Not Specified|Unknown|N/A)$', v, re.I):
        return None
    return v


def js(cmd):
    try:
        return json.loads(sh(cmd) or 'null')
    except Exception:
        return None


dmi = lambda k: clean(rd('/sys/class/dmi/id/' + k))

# ---- CPU ----
cpuinfo = rd('/proc/cpuinfo') or ''
lscpu = {}
for e in (js('lscpu -J') or {}).get('lscpu', []):
    lscpu[e.get('field', '').strip(':')] = e.get('data')
threads = int(lscpu.get('CPU(s)') or os.cpu_count() or 0)
cps = int(lscpu.get('Core(s) per socket') or 0)
sockets = int(lscpu.get('Socket(s)') or 1)
def kb(s):
    m = re.match(r'([\d.]+)\s*(K|M|G)i?B?', s or '')
    return int(float(m.group(1)) * {'K': 1, 'M': 1024, 'G': 1048576}[m.group(2)]) if m else None
cpu = [{
    'name': clean(lscpu.get('Model name')) or (re.search(r'model name\s*:\s*(.+)', cpuinfo) or [None, None])[1],
    'manufacturer': lscpu.get('Vendor ID'),
    'cores': cps * sockets or None,
    'threads': threads,
    'maxClockMHz': int(float(lscpu['CPU max MHz'])) if lscpu.get('CPU max MHz') else None,
    'currentClockMHz': int(float(lscpu['CPU MHz'])) if lscpu.get('CPU MHz') else None,
    'l2KB': kb(lscpu.get('L2 cache')), 'l3KB': kb(lscpu.get('L3 cache')),
    'socket': None, 'processorId': None, 'serial': None,
    'virtualization': lscpu.get('Virtualization'),
}]

# ---- RAM ----
memtotal = int(re.search(r'MemTotal:\s+(\d+)', rd('/proc/meminfo') or 'MemTotal: 0').group(1)) * 1024
modules = []
dm = sh('dmidecode -t memory 2>/dev/null')
for block in dm.split('\n\n'):
    if 'Memory Device' not in block or re.search(r'Size:\s*No Module', block):
        continue
    g = lambda k: (re.search(r'^\s*' + k + r':\s*(.+)$', block, re.M) or [None, None])[1]
    size = g('Size') or ''
    m = re.match(r'(\d+)\s*(MB|GB)', size)
    modules.append({
        'slot': g('Locator'), 'bank': g('Bank Locator'),
        'capacityBytes': int(m.group(1)) * (1 << 20 if m.group(2) == 'MB' else 1 << 30) if m else None,
        'speedMHz': int(re.sub(r'\D', '', g('Speed') or '') or 0) or None,
        'configuredMHz': int(re.sub(r'\D', '', g('Configured Memory Speed') or '') or 0) or None,
        'type': g('Type'), 'formFactor': g('Form Factor'), 'manufacturer': clean(g('Manufacturer')),
        'partNumber': clean(g('Part Number')), 'serial': clean(g('Serial Number')),
    })

# ---- GPU ----
gpus = []
for line in sh("lspci -mm 2>/dev/null | grep -Ei 'VGA|3D|Display'").splitlines():
    parts = re.findall(r'"([^"]*)"', line)
    if len(parts) >= 3:
        gpus.append({'name': parts[2], 'vendor': parts[1], 'vramBytes': None, 'driver': None})
glx = sh('glxinfo -B 2>/dev/null')
if glx and gpus:
    m = re.search(r'Video memory:\s*(\d+)MB', glx)
    if m:
        gpus[0]['vramBytes'] = int(m.group(1)) << 20
    m = re.search(r'OpenGL version string:\s*(.+)', glx)
    if m:
        gpus[0]['driver'] = m.group(1)

# ---- Disks / volumes ----
disks = []
for d in (js('lsblk -J -d -b -o NAME,MODEL,SERIAL,SIZE,ROTA,TRAN,REV,TYPE 2>/dev/null') or {}).get('blockdevices', []):
    if d.get('type') != 'disk':
        continue
    disks.append({'model': (d.get('model') or d['name']).strip(), 'sizeBytes': int(d.get('size') or 0), 'serial': clean(d.get('serial')),
                  'firmware': clean(d.get('rev')), 'bus': (d.get('tran') or '').upper() or None,
                  'media': 'HDD' if str(d.get('rota')) in ('1', 'True', 'true') else 'SSD', 'health': None})
volumes = []
for line in sh('df -B1 -T -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null').splitlines()[1:]:
    p = line.split()
    if len(p) >= 7:
        volumes.append({'drive': p[6], 'label': p[0], 'fs': p[1], 'sizeBytes': int(p[2]), 'freeBytes': int(p[4])})

# ---- Network ----
network = []
for a in js('ip -j addr 2>/dev/null') or []:
    if a.get('ifname') == 'lo':
        continue
    infos = a.get('addr_info', [])
    speed = rd('/sys/class/net/%s/speed' % a.get('ifname'))
    network.append({'name': a.get('ifname'), 'conn': a.get('operstate'), 'mac': (a.get('address') or '').upper() or None,
                    'ipv4': [i['local'] for i in infos if i.get('family') == 'inet'],
                    'ipv6': [i['local'] for i in infos if i.get('family') == 'inet6'],
                    'speedMbps': int(speed) if speed and speed.lstrip('-').isdigit() and int(speed) > 0 else None})
gw = sh("ip route show default 2>/dev/null | awk '{print $3}' | head -1")
dns = re.findall(r'^nameserver\s+(\S+)', rd('/etc/resolv.conf') or '', re.M)
for n in network:
    n['gateway'] = [gw] if gw and n['ipv4'] else []
    n['dns'] = dns if n['ipv4'] else []

# ---- Battery ----
battery = None
for b in glob.glob('/sys/class/power_supply/BAT*'):
    full = rd(b + '/energy_full') or rd(b + '/charge_full')
    design = rd(b + '/energy_full_design') or rd(b + '/charge_full_design')
    battery = {'name': rd(b + '/model_name'), 'chargePercent': int(rd(b + '/capacity') or 0), 'status': rd(b + '/status'),
               'designMWh': int(design) // 1000 if design else None, 'fullMWh': int(full) // 1000 if full else None,
               'cycles': int(rd(b + '/cycle_count') or 0) or None, 'serial': clean(rd(b + '/serial_number')),
               'manufacturer': rd(b + '/manufacturer'),
               'healthPercent': round(100 * int(full) / int(design), 1) if full and design and int(design) else None}
    break

osr = dict(re.findall(r'^(\w+)="?([^"\n]*)"?', rd('/etc/os-release') or '', re.M))
up = float((rd('/proc/uptime') or '0').split()[0])

report = {
    'agent': 'DOTest-Agent', 'version': '1.0', 'platform': 'linux', 'generated': datetime.datetime.now().isoformat(timespec='seconds'),
    'system': {'name': socket.gethostname(), 'manufacturer': dmi('sys_vendor'), 'model': dmi('product_name'), 'family': dmi('product_family'),
               'sku': dmi('product_sku'), 'type': None, 'serial': dmi('product_serial'), 'uuid': dmi('product_uuid'), 'chassisSerial': dmi('chassis_serial')},
    'os': {'name': osr.get('PRETTY_NAME'), 'version': osr.get('VERSION_ID'), 'build': sh('uname -r'), 'arch': sh('uname -m'),
           'lastBoot': datetime.datetime.fromtimestamp(time.time() - up).isoformat(timespec='seconds'), 'uptimeHours': round(up / 3600, 1), 'user': getpass.getuser()},
    'cpu': cpu,
    'ram': {'totalBytes': memtotal, 'installedBytes': sum(m['capacityBytes'] or 0 for m in modules) or None, 'slots': len(re.findall('Memory Device', dm)) or None, 'modules': modules},
    'gpu': gpus,
    'motherboard': {'manufacturer': dmi('board_vendor'), 'product': dmi('board_name'), 'version': dmi('board_version'), 'serial': dmi('board_serial')},
    'bios': {'vendor': dmi('bios_vendor'), 'version': dmi('bios_version'), 'date': dmi('bios_date'), 'serial': dmi('product_serial'),
             'mode': 'UEFI' if os.path.isdir('/sys/firmware/efi') else 'Legacy', 'secureBoot': None},
    'disks': disks, 'volumes': volumes, 'network': network, 'monitors': [], 'battery': battery,
    'tpm': {'present': True, 'version': rd('/sys/class/tpm/tpm0/tpm_version_major')} if os.path.exists('/sys/class/tpm/tpm0') else None,
    'audio': [l.split(':', 2)[-1].strip() for l in sh('lspci 2>/dev/null | grep -i audio').splitlines()],
}

desk = os.path.expanduser('~/Desktop')
out = os.path.join(desk if os.path.isdir(desk) else os.path.expanduser('~'), 'DOTest-Report.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print('\n  DOTest Hardware Agent — Ahmed Al-Zahrani')
print('  Done ✓  Saved:', out)
if os.geteuid() != 0:
    print('  Tip: run with sudo to include serial numbers and RAM sticks.')
print('  تم ✓ ارفع الملف في موقع DOTest (تبويب تقرير العتاد)\n')
