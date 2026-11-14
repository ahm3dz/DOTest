# DOTest — دوت تست
**CPU · GPU · RAM · Internet benchmark for every device — v3**
© Ahmed Al-Zahrani — All rights reserved / جميع الحقوق محفوظة

---

## 🇸🇦 بالعربي

### التشغيل
- ارفع المجلد كامل على أي استضافة (GitHub Pages / Netlify / Vercel / Cloudflare Pages / استضافتك).
- أو افتح `index.html` مباشرة — يشتغل حتى بدون سيرفر.
- يدعم العربي والإنجليزي (زر EN / عربي في الأعلى).

### هيكل المشروع
| الملف | وظيفته |
|---|---|
| `index.html` | هيكل الصفحة |
| `css/style.css` | التصميم والألوان (غيّر الألوان من `:root`) |
| `js/config.js` | **كل الإعدادات**: مدة كل مستوى، حجم الرام، معاملات السكور، التصنيفات |
| `js/i18n.js` | **كل النصوص** بالعربي والإنجليزي — عدّل أو أضف لغة |
| `js/data/devices.js` | **قاعدة بيانات الأجهزة**: آيفون، آيباد، سامسونج، معالجات سنابدراقون/ميدياتك/إنتل/AMD |
| `js/detect.js` | محرك التعرّف على الجهاز والمواصفات |
| `js/bench/kernels.js` | أحمال اختبار المعالج والرام (تشتغل داخل Workers) |
| `js/bench/cpu.js` | اختبار المعالج (نواة واحدة + كل الأنوية) |
| `js/bench/ram.js` | اختبار الرام (حجز + كتابة/قراءة/نسخ + زمن الاستجابة) |
| `js/bench/shaders.js` | شيدرات كرت الشاشة (المشهد ثلاثي الأبعاد + حوسبة WebGPU) |
| `js/bench/gpu.js` | اختبار كرت الشاشة (FPS + الضغط الأقصى + TFLOPS) |
| `js/bench/stress.js` | اختبار الضغط الشامل (كل شي مع بعض + الثبات والهبوط الحراري) |
| `js/ui/charts.js` | الرسوم البيانية |
| `js/ui/render.js` | عرض النتائج والمواصفات والسجل وصورة النتيجة |
| `js/app.js` | التحكم وتشغيل الاختبارات والتبويبات |
| `js/net/speedtest.js` | محرك اختبار سرعة النت |
| `js/ui/network.js` | واجهة سرعة النت (العداد والنتائج) |
| `js/agent/agent.js` | قراءة وعرض تقرير العتاد |
| `js/tools/tools.js` | أدوات الفحص الـ12 |
| `js/ui/settings.js` | لوحة الإعدادات |
| `js/ui/advice.js` | النصائح الذكية (أضف قواعد جديدة بسهولة) |
| `js/ui/hero3d.js` | الفراكتل المتحرك |
| `js/vendor/qrcode.min.js` | مكتبة QR (MIT — Kazuhiko Arase) |
| `agent/` | برامج تقرير العتاد |
| `assets/` | الشعار والأيقونة والصورة |

### تعديلات شائعة
- **تغيير مدة الاختبار:** `js/config.js` ← `levels`
- **إضافة جوال جديد:** `js/data/devices.js` ← `iphones` / `samsung` / `adreno` ...
- **تغيير نص:** `js/i18n.js`
- **اللغة الافتراضية:** `js/config.js` ← `defaultLang`

### ملاحظات
- المتصفحات تخفي بعض المعلومات (اسم المعالج الدقيق، موديل الآيفون، الرام فوق 8GB) — الموقع يستنتجها ويعلّمها بـ "تقديري".
- حجم الرام في الاختبار محدود تلقائياً على الجوالات حتى ما يقفل المتصفح الصفحة.
- اختبار حوسبة WebGPU يشتغل فقط في المتصفحات اللي تدعمه (Chrome / Edge الحديثة، Safari 26+).

### الجديد في v3
- 🌈 مشهد **Mandelbulb قوس قزح** لاختبار كرت الشاشة + فراكتل متحرك أعلى الصفحة
- 🌐 **اختبار سرعة الإنترنت**: تحميل، رفع، بنق، تذبذب، بنق تحت الضغط (Bufferbloat) + الـIP ومزود الخدمة
- 🛠️ **تقرير العتاد الكامل (Agent)**: اسم المعالج بالضبط، الرامات قطعة قطعة، السيريلات، MAC و IP المحلي، اللوحة الأم، البيوس، الأقراص، الشاشات، صحة البطارية
- ⚙️ **لوحة إعدادات** بأزرار: المشهد، الدقة، المدة، المسارات، حجم الرام، لون الموقع، الصوت، الاهتزاز…
- 🧰 **12 أداة فحص**: بكسل ميت، تدرج ألوان، حركة، لمس، كيبورد، ماوس، يد تحكم، سماعات، تخزين، بطارية، حساسات، اهتزاز
- 💡 **نصائح ذكية** حسب نتائجك + مقارنة مع أفضل نتيجة لك
- 🖼️ **صورة النتيجة** فيها رابط الموقع (يتعرف عليه تلقائياً) + **QR**
- 🗂️ تبويبات منظمة: الاختبارات · المواصفات · سرعة النت · تقرير العتاد · الأدوات · السجل · عن الموقع

### رابط الموقع
يتعرف تلقائياً من شريط العنوان. تقدر تثبته يدوياً من `js/config.js` ← `siteURL`.

### الـ Agent (مجلد agent/)
| الملف | النظام |
|---|---|
| `DOTest-Agent.bat` | ويندوز — دبل كلك (ملف واحد مستقل) |
| `DOTest-Agent.ps1` | ويندوز — نفس السكربت كـ PowerShell |
| `DOTest-Agent-mac.command` | ماك |
| `dotest-agent-linux.py` | لينكس (`sudo` للسيريلات) |

يقرأ فقط، ما يرسل أي شي، ويحفظ `DOTest-Report.json` على سطح المكتب.
إذا عدّلت `DOTest-Agent.ps1` أعد بناء الـ`.bat` (الجزء بعد `#PS_START#` هو نفس السكربت).

### سيرفرات سرعة النت
افتراضياً Cloudflare العامة. غيّرها من `js/config.js` ← `net`.
اختبار السرعة يحتاج الموقع يكون مرفوع على رابط حقيقي (https).

---



### تحديث 3.1
- واجهة رسمية خالية من الإيموجي، مع مجموعة أيقونات خطية موحّدة.
- إعادة صياغة كامل النصوص (عربي/إنجليزي) بأسلوب احترافي رسمي.
- شعار وبانر وأيقونة جديدة (assets/).
- عرض الحد الأدنى والأعلى والمتوسط لمعدل الإطارات ضمن النتائج.
- نسخة إنتاج مُصغّرة ومشوّشة (obfuscated) في مجلد الجذر؛ المصدر المقروء في source/.
- تطبيق قابل للتثبيت (PWA) وتصدير السجلّ بصيغة CSV.

## 🇬🇧 English

### Run
- Upload the whole folder to any static host, or open `index.html` directly.
- Arabic & English (toggle at the top).

### What it tests
- **CPU**: single-core + all-cores with 7 workloads (integer, float, primes, sorting, matrix, hashing, cache).
- **GPU**: ray-marched 3D scene → real FPS (avg / min / max / 1% low / stability), adaptive max-load throughput, WebGPU FP32 compute (GFLOPS/TFLOPS).
- **RAM**: allocates real memory across threads, write / read / copy bandwidth + random-access latency.
- **Stress test**: all CPU cores + GPU + RAM simultaneously → stability % and thermal throttling %.
- **Levels**: Light · Medium · Heavy · Extreme.

### New in v3
Rainbow Mandelbulb GPU scene · Internet speed test (down/up/ping/jitter/bufferbloat + IP/ISP) · Hardware Agent (exact CPU, RAM sticks, serials, MAC/local IP, board, BIOS, disks, monitors, battery health) · Settings panel · 12 device tools · Smart tips · Result image with auto-detected site link + QR · Tabbed layout.

### Customize
Everything adjustable lives in `js/config.js`, texts in `js/i18n.js`, device data in `js/data/devices.js`.

© Ahmed Al-Zahrani
