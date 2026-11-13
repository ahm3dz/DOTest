# DOTest — دوت تست
**CPU · GPU · RAM benchmark for every device**
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
| `js/app.js` | التحكم وتشغيل الاختبارات |
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

---

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

### Customize
Everything adjustable lives in `js/config.js`, texts in `js/i18n.js`, device data in `js/data/devices.js`.

© Ahmed Al-Zahrani
