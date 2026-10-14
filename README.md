# HomiShaper

**فارسی** · [English](#english)

آماده‌سازی متن فارسی و عربی برای موتورهایی که راست‌به‌چپ (RTL) و چسباندن حروف را پشتیبانی نمی‌کنند؛ مثل Unity (`UI.Text`)، برخی ویرایشگرهای ویدیو و موتورهای بازی.

## کار چه می‌کند؟

1. **چسباندن حروف**: هر حرف به شکل ابتدایی، میانی، پایانی یا جدا (Unicode Presentation Forms) تبدیل می‌شود. شامل `پ چ ژ گ ک ی`، لیگاتور «لا» و حروفی که به بعد نمی‌چسبند (`ا د ذ ر ز ژ و`).
2. **نیم‌فاصله** (ZWNJ) اتصال را قطع می‌کند و از خروجی حذف می‌شود.
3. **وارونه‌سازی ترتیب نمایش** برای موتورهای چپ‌به‌راست: اعداد و کلمات انگلیسی برعکس نمی‌شوند و پرانتزها و گیومه‌ها آینه می‌شوند.
4. **شکستن خط** با حداکثر طول دلخواه؛ خطوط پیش از وارونه‌سازی شکسته می‌شوند، پس ترتیب بالا به پایین خطوط درست می‌ماند.
5. گزینه‌ی **حذف اعراب**.

## استفاده

### صفحه‌ی وب
فایل `index.html` را باز کنید (تک‌فایل، بدون اینترنت و بدون CDN). متن را بنویسید، خروجی زنده است؛ با «کپی» آن را بردارید.

### JavaScript / Node
```js
const H = require('./shaper.js');
H.process('پیام 123 ABC', { maxLength: 30, stripDiacritics: false }); // رشته؛ خطوط با \n
H.processLines('...', { maxLength: 30 });                            // آرایه‌ی خطوط
H.shape('سلام');   // فقط چسباندن حروف (ترتیب منطقی)
H.reorder(shaped); // فقط ترتیب نمایش
H.wrap(text, 30);  // فقط شکستن خط (ترتیب منطقی)
```

### Unity
فایل [`unity/HomiShaper.cs`](unity/HomiShaper.cs) را در پروژه بیندازید:
```csharp
myText.text = HomiShaper.Fix("سلام دنیا");          // یا HomiShaper.Fix(text, maxLength: 28)
```
فونت باید حروف Arabic Presentation Forms (`FB50–FDFF` و `FE70–FEFF`) را داشته باشد. اگر از TextMeshPro استفاده می‌کنید، `isRightToLeftText` را خاموش بگذارید، چون ترتیب را خود تابع درست می‌کند. این فایل هنوز در Unity کامپایل و آزمایش نشده است.

> نتیجه برای **نمایش** است؛ متن اصلی (منطقی) را برای ذخیره و جست‌وجو نگه دارید و فقط هنگام نمایش `Fix` را صدا بزنید.

## تست
```
node test.js        # اجرای تست‌ها
node build.js       # پس از تغییر shaper.js، نسخه‌ی داخل index.html را به‌روز می‌کند
```

---

## English

Prepare Persian/Arabic text for engines that lack right-to-left layout and letter joining (Unity `UI.Text`, some video editors, game engines).

**What it does**

1. **Letter joining** — maps letters to isolated/initial/medial/final Unicode Presentation Forms, including `پ چ ژ گ ک ی`, the lam-alef ligature, and non-connecting letters (`ا د ذ ر ز ژ و`).
2. **ZWNJ (half-space)** breaks the join and is removed from the output.
3. **Visual reordering** for LTR renderers: numbers and Latin words keep their order, brackets and guillemets are mirrored.
4. **Line wrapping** with a configurable max length. Lines are wrapped in logical order *before* each one is reversed, so the top-to-bottom order stays correct.
5. Optional **diacritics stripping**.

**Usage**

- **Web:** open `index.html` — a single offline file, no CDN. Live output plus a copy button.
- **Node/JS:** `require('./shaper.js')` → `process`, `processLines`, `shape`, `reorder`, `wrap` (see above).
- **Unity:** copy [`unity/HomiShaper.cs`](unity/HomiShaper.cs) and call `myText.text = HomiShaper.Fix(text, maxLength)`. The font must include the Arabic Presentation Forms blocks. With TextMeshPro, leave RTL off. The C# port has not been compiled or tested inside Unity yet.

Keep the original logical text for storage/search; only call the shaper when displaying.

**Tests:** `node test.js`. After editing `shaper.js`, run `node build.js` to refresh the copy embedded in `index.html`.

## License
See [LICENSE](LICENSE).
