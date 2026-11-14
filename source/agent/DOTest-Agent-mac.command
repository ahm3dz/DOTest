#!/bin/bash
# =====================================================================
#  DOTest Hardware Agent for macOS  —  v1.0      © Ahmed Al-Zahrani
#  Read-only. Saves ~/Desktop/DOTest-Report.json and copies it.
#  Nothing is uploaded. يقرأ فقط ولا يرسل أي شي.
#  Run: double-click (first time: right-click → Open), or: bash DOTest-Agent-mac.command
# =====================================================================
OUT="$HOME/Desktop/DOTest-Report.json"
echo ""
echo "  DOTest Hardware Agent — Ahmed Al-Zahrani"
echo "  Reading hardware... / جاري قراءة العتاد..."

esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n\r'; }
num() { local v="$1"; [[ "$v" =~ ^[0-9]+$ ]] && echo "$v" || echo 0; }

CPU=$(sysctl -n machdep.cpu.brand_string 2>/dev/null)
CORES=$(num "$(sysctl -n hw.physicalcpu 2>/dev/null)")
THREADS=$(num "$(sysctl -n hw.logicalcpu 2>/dev/null)")
PCORES=$(num "$(sysctl -n hw.perflevel0.physicalcpu 2>/dev/null)")
ECORES=$(num "$(sysctl -n hw.perflevel1.physicalcpu 2>/dev/null)")
MEM=$(num "$(sysctl -n hw.memsize 2>/dev/null)")
L2=$(num "$(sysctl -n hw.l2cachesize 2>/dev/null)")
L3=$(num "$(sysctl -n hw.l3cachesize 2>/dev/null)")
FREQ=$(num "$(sysctl -n hw.cpufrequency_max 2>/dev/null)")
MODEL=$(sysctl -n hw.model 2>/dev/null)
BOOT=$(sysctl -n kern.boottime 2>/dev/null | sed -E 's/^[{] sec = ([0-9]+).*/\1/')

SP=$(system_profiler -json SPHardwareDataType SPDisplaysDataType SPMemoryDataType SPNVMeDataType SPSerialATADataType SPStorageDataType SPPowerDataType SPNetworkDataType SPSoftwareDataType SPAudioDataType 2>/dev/null)
[ -z "$SP" ] && SP='{}'

cat > "$OUT" <<JSON
{"agent":"DOTest-Agent","version":"1.0","platform":"mac","generated":"$(date +%Y-%m-%dT%H:%M:%S)",
"sysctl":{"cpu":"$(esc "$CPU")","cores":$CORES,"threads":$THREADS,"pcores":$PCORES,"ecores":$ECORES,"memBytes":$MEM,"l2":$L2,"l3":$L3,"freqHz":$FREQ,"model":"$(esc "$MODEL")","bootEpoch":$(num "$BOOT"),"user":"$(esc "$USER")","host":"$(esc "$(scutil --get ComputerName 2>/dev/null)")"},
"sp":$SP}
JSON

pbcopy < "$OUT" 2>/dev/null && COPIED=1
echo ""
echo "  Done ✓  Saved: $OUT"
[ "$COPIED" = "1" ] && echo "  Also copied to clipboard — paste it in DOTest → Hardware Report."
echo "  تم ✓ ارفع الملف أو الصقه في موقع DOTest (تبويب تقرير العتاد)"
echo ""
