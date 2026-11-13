/* =========================================================
   DOTest — Device database
   قاعدة بيانات الأجهزة — أضف أجهزة جديدة بسهولة هنا
   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.db = {
  /* iPhone: "width x height @ dpr" (CSS pixels, portrait) → [model, chip] */
  iphones: {
    '320x568@2': ['iPhone 5s / SE (1st gen)', 'Apple A7 / A9'],
    '375x667@2': ['iPhone 6 / 6s / 7 / 8 / SE (2nd/3rd gen)', 'Apple A8 – A15'],
    '414x736@3': ['iPhone 6 Plus / 6s Plus / 7 Plus / 8 Plus', 'Apple A8 – A11'],
    '375x812@3': ['iPhone X / XS / 11 Pro / 12 mini / 13 mini', 'Apple A11 – A15'],
    '414x896@2': ['iPhone XR / 11', 'Apple A12 / A13'],
    '414x896@3': ['iPhone XS Max / 11 Pro Max', 'Apple A12 / A13'],
    '390x844@3': ['iPhone 12 / 12 Pro / 13 / 13 Pro / 14 / 16e', 'Apple A14 – A18'],
    '428x926@3': ['iPhone 12 Pro Max / 13 Pro Max / 14 Plus', 'Apple A14 – A15'],
    '393x852@3': ['iPhone 14 Pro / 15 / 15 Pro / 16', 'Apple A16 – A18'],
    '430x932@3': ['iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus', 'Apple A16 – A18'],
    '402x874@3': ['iPhone 16 Pro / 17 / 17 Pro', 'Apple A18 Pro / A19 / A19 Pro'],
    '440x956@3': ['iPhone 16 Pro Max / 17 Pro Max', 'Apple A18 Pro / A19 Pro'],
    '420x912@3': ['iPhone Air', 'Apple A19 Pro']
  },

  /* iPad: shorter CSS side → model */
  ipads: [
    [1032, 'iPad Pro 13"', 'Apple M4 / M5'],
    [1024, 'iPad Pro 12.9" / iPad Air 13"', 'Apple A12X – M2'],
    [834, 'iPad Pro 11" / iPad Air 11"', 'Apple A12X – M4'],
    [820, 'iPad Air (4th/5th) / iPad (10th/11th)', 'Apple A14 – M1'],
    [810, 'iPad (7th–9th gen)', 'Apple A10 – A13'],
    [768, 'iPad / iPad Air (older)', 'Apple A9 – A12'],
    [744, 'iPad mini (6th/7th)', 'Apple A15 / A17 Pro']
  ],

  /* Qualcomm Adreno GPU → Snapdragon chip */
  adreno: {
    '840': 'Snapdragon 8 Elite Gen 5', '830': 'Snapdragon 8 Elite', '750': 'Snapdragon 8 Gen 3',
    '740': 'Snapdragon 8 Gen 2', '730': 'Snapdragon 8 Gen 1 / 8+ Gen 1', '735': 'Snapdragon 8s Gen 3',
    '825': 'Snapdragon 8s Gen 4', '732': 'Snapdragon 7+ Gen 3', '725': 'Snapdragon 7+ Gen 2',
    '722': 'Snapdragon 7s Gen 3', '720': 'Snapdragon 7 Gen 3', '710': 'Snapdragon 7s Gen 2 / 6 Gen 1',
    '660': 'Snapdragon 888 / 888+', '650': 'Snapdragon 865 / 870', '644': 'Snapdragon 7 Gen 1',
    '642L': 'Snapdragon 778G / 780G', '642': 'Snapdragon 780G', '640': 'Snapdragon 855 / 860',
    '630': 'Snapdragon 845', '620': 'Snapdragon 765G / 768G', '619': 'Snapdragon 480 / 695 / 4 Gen 1',
    '618': 'Snapdragon 720G / 730G / 732G', '616': 'Snapdragon 710 / 712', '613': 'Snapdragon 4 Gen 2',
    '612': 'Snapdragon 675 / 678', '610': 'Snapdragon 665 / 680 / 685', '540': 'Snapdragon 835',
    '530': 'Snapdragon 820 / 821', '512': 'Snapdragon 660', '509': 'Snapdragon 636', '506': 'Snapdragon 625 / 450'
  },

  /* ARM Mali / Immortalis / Xclipse / PowerVR patterns → chip family */
  armGpus: [
    [/Immortalis-G925|G925-Immortalis/i, 'MediaTek Dimensity 9400'],
    [/Immortalis-G720|G720-Immortalis/i, 'MediaTek Dimensity 9300'],
    [/Immortalis-G715|G715-Immortalis/i, 'MediaTek Dimensity 9200'],
    [/Mali-G925/i, 'MediaTek Dimensity 9400'],
    [/Mali-G720/i, 'MediaTek Dimensity 8300 / 9300'],
    [/Mali-G715/i, 'Google Tensor G3 / G4 / Dimensity'],
    [/Mali-G710 MC10|Mali-G710 MP10/i, 'Google Tensor G2 / Dimensity 9000'],
    [/Mali-G710/i, 'MediaTek Dimensity 9000 / Tensor G2'],
    [/Mali-G78 MP20|Mali-G78 MC20/i, 'Google Tensor G1'],
    [/Mali-G78 MP14/i, 'Samsung Exynos 2100'],
    [/Mali-G78/i, 'MediaTek Dimensity 1200 / Exynos 2100 / Tensor'],
    [/Mali-G77/i, 'MediaTek Dimensity 1000 / Exynos 990'],
    [/Mali-G76/i, 'Exynos 9820 / Kirin 980 / Helio G90'],
    [/Mali-G68/i, 'Exynos 1280 / 1380 / Dimensity 1080'],
    [/Mali-G615/i, 'MediaTek Dimensity 7300 / 8200 / Tensor'],
    [/Mali-G610/i, 'MediaTek Dimensity 1080 / 7050 / 8100'],
    [/Mali-G57/i, 'MediaTek Dimensity 700 / 810 / Helio G99'],
    [/Mali-G52/i, 'MediaTek Helio G85 / G88 / G96'],
    [/Mali/i, 'MediaTek / Samsung Exynos'],
    [/Xclipse 950/i, 'Samsung Exynos 2500'],
    [/Xclipse 940/i, 'Samsung Exynos 2400'],
    [/Xclipse 920/i, 'Samsung Exynos 2200'],
    [/Xclipse 5[34]0/i, 'Samsung Exynos 1480 / 1580'],
    [/Xclipse/i, 'Samsung Exynos'],
    [/Maleoon/i, 'Huawei Kirin 9000s / 9010'],
    [/PowerVR|IMG BXM|IMG DXT/i, 'MediaTek Helio / Unisoc'],
    [/Tegra/i, 'NVIDIA Tegra']
  ],

  /* PC integrated GPUs → CPU family */
  pcGpus: [
    [/Apple (M\d+(?: Pro| Max| Ultra)?)/i, function (m) { return 'Apple ' + m[1]; }],
    [/Radeon\s*(?:\(TM\)\s*)?890M|880M/i, 'AMD Ryzen AI 300 (Strix Point)'],
    [/Radeon\s*(?:\(TM\)\s*)?8060S|8050S|8040S/i, 'AMD Ryzen AI Max (Strix Halo)'],
    [/Radeon\s*(?:\(TM\)\s*)?780M|760M|740M/i, 'AMD Ryzen 7040 / 8040 (Phoenix / Hawk Point)'],
    [/Radeon\s*(?:\(TM\)\s*)?680M|660M/i, 'AMD Ryzen 6000 (Rembrandt)'],
    [/Radeon\s*(?:\(TM\)\s*)?610M/i, 'AMD Ryzen 7000 / 9000 desktop (iGPU)'],
    [/Radeon.*Vega|Radeon\(TM\) Graphics|AMD Radeon Graphics/i, 'AMD Ryzen (APU)'],
    [/Arc\(TM\) 1[34]0V|Arc 1[34]0V/i, 'Intel Core Ultra 200V (Lunar Lake)'],
    [/Arc\(TM\) Graphics|Intel\(R\) Arc\(TM\) Graphics|Intel Arc Graphics/i, 'Intel Core Ultra (Meteor / Arrow Lake)'],
    [/Iris\(R\) Xe|Iris Xe/i, 'Intel Core 11th – 13th Gen (mobile)'],
    [/UHD Graphics 7[0-9]{2}/i, 'Intel Core 12th – 14th Gen'],
    [/UHD Graphics 6[0-9]{2}/i, 'Intel Core 8th – 10th Gen'],
    [/HD Graphics 5[0-9]{2}|HD Graphics 6[0-9]{2}/i, 'Intel Core 6th – 7th Gen'],
    [/Intel/i, 'Intel Core / Celeron / Pentium']
  ],

  /* Samsung model codes: SM-XNNN → name (prefix match) */
  samsung: [
    [/^SM-S93[18]/, 'Galaxy S25', { 1: '', 6: '+', 7: ' Edge', 8: ' Ultra' }],
    [/^SM-S92/, 'Galaxy S24', { 1: '', 6: '+', 8: ' Ultra', 7: ' FE' }],
    [/^SM-S91/, 'Galaxy S23', { 1: '', 6: '+', 8: ' Ultra' }],
    [/^SM-S90/, 'Galaxy S22', { 1: '', 6: '+', 8: ' Ultra' }],
    [/^SM-S93/, 'Galaxy S25', { 1: '', 6: '+', 7: ' Edge', 8: ' Ultra' }],
    [/^SM-S711/, 'Galaxy S23 FE'], [/^SM-S721/, 'Galaxy S24 FE'],
    [/^SM-G99[18]/, 'Galaxy S21', { 1: '', 6: '+', 8: ' Ultra' }], [/^SM-G990/, 'Galaxy S21 FE'],
    [/^SM-G98/, 'Galaxy S20', { 0: '', 1: '', 6: '+', 8: ' Ultra' }], [/^SM-G97/, 'Galaxy S10'],
    [/^SM-F96/, 'Galaxy Z Fold7'], [/^SM-F95/, 'Galaxy Z Fold6'], [/^SM-F94/, 'Galaxy Z Fold5'], [/^SM-F93/, 'Galaxy Z Fold4'],
    [/^SM-F76/, 'Galaxy Z Flip7'], [/^SM-F74/, 'Galaxy Z Flip6'], [/^SM-F73/, 'Galaxy Z Flip5'], [/^SM-F72/, 'Galaxy Z Flip4'],
    [/^SM-N98/, 'Galaxy Note20'], [/^SM-N97/, 'Galaxy Note10'],
    [/^SM-X9/, 'Galaxy Tab S9/S10 Ultra/+'], [/^SM-X8/, 'Galaxy Tab S9/S10'], [/^SM-X7/, 'Galaxy Tab S8/S9'],
    [/^SM-X5/, 'Galaxy Tab S6 Lite / S9 FE'], [/^SM-X2|^SM-X1/, 'Galaxy Tab A'],
    [/^SM-A(\d)(\d)/, function (m) { return 'Galaxy A' + m[1] + m[2]; }],
    [/^SM-M(\d)(\d)/, function (m) { return 'Galaxy M' + m[1] + m[2]; }],
    [/^SM-E(\d)(\d)/, function (m) { return 'Galaxy F/E' + m[1] + m[2]; }]
  ],

  /* Model → brand */
  brands: [
    [/^SM-|Galaxy|Samsung/i, 'Samsung'], [/Pixel/i, 'Google'], [/^(CPH|PH[A-Z]{2}|OPPO|PG[A-Z]{2})/i, 'OPPO'],
    [/^RMX/i, 'realme'], [/^V2\d{3}|vivo|^I2\d{3}/i, 'vivo'], [/^(NE|LE|KB|IN|PJ|HD|GM|CPH25)\d{4}|OnePlus/i, 'OnePlus'],
    [/^(2\d{3}[A-Z0-9]{3,}|M2\d{3}|Redmi|POCO|Mi \d|Xiaomi)/i, 'Xiaomi'],
    [/^(ELS|ANA|NOH|LIO|VOG|ALN|BRA|MNA|HUAWEI|NOP|JAD|OCE|PLA)/i, 'Huawei'],
    [/HONOR|^(ANY|RMO|PGT|ALI|FNE|VER|BVL|LGE?)-/i, 'HONOR'], [/moto|^XT\d{4}/i, 'Motorola'],
    [/Nothing|^A0(59|63|65|142|015)/i, 'Nothing'], [/Infinix|^X6\d{2}/i, 'Infinix'], [/TECNO|^(CK|CL|KI|LH|LI|AD)\d/i, 'TECNO'],
    [/Lenovo|^TB-/i, 'Lenovo'], [/^(SO-|XQ-)/i, 'Sony'], [/^(ASUS|AI2\d{3}|ROG)/i, 'ASUS'], [/^(LM-|LG-)/i, 'LG'], [/Nokia|^TA-\d/i, 'Nokia']
  ],

  /* Common refresh rates to snap to */
  refreshRates: [24, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 160, 165, 170, 175, 180, 200, 240, 280, 300, 360, 480, 500]
};
