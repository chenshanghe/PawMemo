---
name: xunhupay signing algorithm
description: Correct signing for 虎皮椒/迅虎支付 (xunhupay.com) — critical bug trap with "&key=" vs direct append
---

# xunhupay Signing Algorithm

## The Rule
Sign string = sorted non-empty params joined by `&`, then APPKEY appended **directly** (no separator):

```
md5(key1=val1&key2=val2&...APPKEY)
```

**NOT** `md5(key1=val1&...&key=APPKEY)` — that's the old WeChat Pay format and causes errcode 40029.

**Why:** The official PHP SDK (`XH_Payment_Api::generate_xh_hash`) does `md5($arg . $hashkey)` — direct string concatenation, no `&key=` prefix.

**How to apply:** In `makeHash()` in `pay-hupi.ts`:
```typescript
const base = keys.map(k => `${k}=${params[k]}`).join("&") + HUPI_APPKEY;
```

## Other Key Facts
- Old domain `api.hupi.io` was taken over by a Spanish company — dead
- New domain: `https://api.xunhupay.com/payment/do.html` (create), `/payment/query.html` (query)
- Backup platform: `https://api.dpweixin.com` (different APPID pool)
- `total_fee` is in **yuan** (e.g. "28.00"), not fen
- Signature field name: `hash` (not `sign`)
- Response success: `errcode === 0`
- Response error: `errcode` non-zero, `errmsg` has message
- `url_qrcode` = QR code image URL for PC scanning
- `url` = redirect URL for mobile
- APPID format: 12-digit number (e.g. 201906181261) — migrated from old hupi.io
