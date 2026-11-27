# gemini-extension — ajan rehberi

Chrome/Brave için bir Manifest V3 eklentisi. Yan panelde `https://gemini.google.com/app` sayfasını iframe içinde açar ve şu araçları ekler:
- seçili metni Gemini'ye gönderen sağ tık menüsü ve `Alt+Q` kısayolu,
- istem şablonlu bir araç çubuğu,
- sürükle-bırak,
- yerel Todo ve Notlar sekmeleri.

Derleme adımı ve npm yok; saf JS/HTML/CSS. Hedef Chrome Web Store.

## Dosyalar ve veri akışı

| Dosya | Görev |
|---|---|
| `manifest.json` | İzinler, içerik betiği, kısayollar, DNR kural dosyası |
| `background.js` | Service worker: sağ tık menüsü, `Alt+Q`, son sohbet URL'sini saklama |
| `sidepanel.html` / `sidepanel.js` / `style.css` | Yan panel: iframe, araç çubuğu, sürükle-bırak, Todo, Notlar |
| `content_script.js` | Gemini iframe'inin **içinde** çalışır; istemi Gemini'nin giriş kutusuna yazar ve gönderir |
| `rules.json` | Gemini alt çerçeve yanıtlarından `X-Frame-Options` ve `Content-Security-Policy` başlıklarını siler (yoksa iframe yüklenmez) |
| `paketle.ps1` | Mağaza zip'ini `dist\` klasörüne üretir |

İstem nasıl gider:

```
sağ tık / Alt+Q (background.js) ─┐
araç çubuğu / sürükle-bırak      ─┼─> chrome.storage.local.pendingPrompt
  (sidepanel.js)                  ┘          │  storage.onChanged
                                             v
                     content_script.js (panelin Gemini iframe'i)
                     -> giriş kutusuna yazar -> Gönder'e tıklar -> pendingPrompt'u siler
```

Son sohbet URL'si de şu yolu izler: `content_script.js` (Navigation API) → `runtime.sendMessage` → `background.js` → `storage.local.lastGeminiUrl` → `sidepanel.js` paneli açarken bu URL'yi yükler.

## Değişmezler — bunları bozma

1. **`manifest.json` içinde `content_scripts[0].all_frames` değeri `true` kalmalı.** Gemini panelde bir iframe içinde açılır; `false` olursa içerik betiği panele hiç girmez. 2b9e1d2 commit'inde tam olarak bu oldu ve istemler panel yerine kullanıcının açık Gemini sekmelerine gönderildi.
2. **`content_script.js` başındaki `isInsideOurSidePanel()` kontrolü kalmalı.** `all_frames: true` olduğu için betik her Gemini çerçevesine yüklenir; bu kontrol, yalnızca doğrudan üst çerçevesi bu eklenti olan çerçevede çalışmasını sağlar. Kaldırılırsa istemler normal Gemini sekmelerinde de otomatik gönderilir.
3. **`sidePanel.open()`, olay dinleyicisinde ilk ve eşzamanlı çağrı olmalı** (`background.js` içindeki `openSidePanel(tab)`). Chrome bu çağrıya yalnızca kullanıcı eylemine doğrudan yanıt olarak izin verir. Önüne `await` veya bir callback koyarsan panel açılmaz.
4. **`chrome.permissions.request()`, araç çubuğu tıklamasında ilk `await` olmalı** (`sidepanel.js` içindeki `handleToolbarButtonClick`). Bunun da kullanıcı eylemi bağlamında çağrılması gerekir.
5. **Yan paneldeki tıklama `activeTab` izni vermez.** Bu izni yalnızca araç çubuğu simgesi, sağ tık menüsü, klavye kısayolu ve omnibox verir (Chrome belgesi). Araç çubuğu düğmeleri bu yüzden isteğe bağlı `<all_urls>` iznini ister. `<all_urls>` izinini **zorunlu** `host_permissions`'a taşıma; c625621 commit'i izinleri bilerek daralttı ve mağaza incelemesi geniş izinleri sorun eder.
6. **`minimum_chrome_version` en az `"116"` olmalı**, çünkü `sidePanel.open()` Chrome 116'da geldi.
7. **Panelden iframe'in `location` bilgisini okumaya çalışma.** Çapraz köken olduğu için her zaman hata verir. Güncel URL için `storage.local.lastGeminiUrl` kullan.
8. **Kullanıcı metnini `innerHTML` ile ekleme.** Todo listesi `textContent` ve `createElement` kullanır; öyle kalmalı.
9. **Yeni bir saklama anahtarı veya izin eklersen `PRIVACY_POLICY.md`'yi de güncelle.** Mağaza bunu ister.

## Doğrulama

Otomatik kontrol (proje klasöründen):

```bash
for f in background.js content_script.js sidepanel.js; do node --check "$f"; done
node -e "require('./manifest.json'); JSON.parse(require('fs').readFileSync('rules.json','utf8')); console.log('JSON OK')"
powershell -ExecutionPolicy Bypass -File paketle.ps1   # dist\ içinde yalnızca 8 dosya olmalı
```

Davranışı yalnızca gerçek tarayıcı doğrulayabilir; ajan bunu yapamıyorsa kullanıcıdan şunları denemesini iste:

1. `chrome://extensions` → eklentiyi yeniden yükle.
2. Bir sayfada metin seç → sağ tık → "Explain selection with Gemini". Panel açılmalı ve metin panelde gönderilmeli.
3. Aynı denemeyi `Alt+Q` ile yap.
4. Ayrı bir sekmede gemini.google.com açıkken 2. adımı tekrarla. İstem **o sekmede görünmemeli**.
5. Panelde bir sohbet aç → paneli kapat ve yeniden aç. Aynı sohbet gelmeli. "Yenile" düğmesi de aynı sohbeti yüklemeli.
6. Araç çubuğundaki "Summarize" düğmesine bas. İlk seferde izin istemeli; izin verilince sayfa metni gitmeli.

## Açık görevler

Her görev için önce sahibine sor; bazıları ürün kararıdır.

- **CSP'yi tamamen silmek yerine daraltmak** (`rules.json:9`). Şu an Gemini'nin tüm `content-security-policy` başlığı siliniyor; bu, panel içinde XSS korumasını da kapatıyor. Hedef: yalnızca `frame-ancestors` yönergesini kaldırmak. Zorluk: declarativeNetRequest başlık *değerini* düzenleyemez, yalnızca `set`/`remove`/`append` yapabilir; bu yüzden çözüm araştırma ister. **Kabul ölçütü:** iframe yüklenmeye devam eder ve CSP'nin geri kalanı korunur.
- **"Explain selection" menüsü metne açıklama talimatı eklemiyor** (`background.js`, `savePendingPrompt(info.selectionText)`). Menü başlığı "Explain" diyor, ama gönderilen şey ham metin. Sağ tık ve `Alt+Q` için ayrı bir önek eklenip eklenmeyeceği bir ürün kararıdır.
- **Çift gönderim riski** (`content_script.js`). Yapay Enter olayı ile Gönder tıklaması aynı anda tetiklenebilir. Gemini yapay `KeyboardEvent`'i yok sayıyorsa sorun yoktur; tarayıcıda gözlemlenmeli.
- **Kullanıcının taslağına ekleme** (`content_script.js`, `execCommand('insertText')`). Kutuda yazılmış bir metin varsa istem onun sonuna eklenir.
- **`icon.png` 1056×1056 boyutunda ve 830 KB.** 16, 48 ve 128 piksellik ayrı ikonlar üretilmeli.
- **Arayüz metinleri.** UI İngilizce. Türkçe eklenecekse `_locales/` ile yapılmalı.
- **Seçiciler Gemini'nin DOM yapısına bağlı** (`content_script.js` içinde `selectors` ve Send düğmesi seçicisi). Gemini arayüzü değişince ilk bozulacak yer burası.
