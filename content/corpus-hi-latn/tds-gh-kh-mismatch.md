---
id: tds-gh-kh-mismatch
title: TDS / GH / KH Mismatch and Osmotic Shock
status: live
review_tier: 2
aliases:
  - tds mismatch
  - shrimp dying after water change
  - hardness swing
  - borewell water fish tank
  - tanker water shrimp died
  - ro water fish died
  - gh kh swing
  - water change ke baad shrimp mar gaye
  - borewell ka paani fish tank ke liye
severity: high
time_to_act: 24h
applies_to:
  water_type: [freshwater]
  species_traits: [invert, soft_water]
symptoms:
  - Shrimp ya soft-water fish water change ke thodi der baad mar rahe hain ya distress dikha rahe hain, bina kisi ammonia/nitrite/nitrate explanation ke
  - Shrimp moult hone ke thodi der baad mar rahe hain, ya "dead in shell"
  - Fresh water add hone ke baad fish ya shrimp lethargic dikh rahe hain, ajeeb tarah se float kar rahe hain, ya normally swim karne mein struggle kar rahe hain
  - Tank ke paani aur abhi add kiye jaane wale paani ke TDS/GH/KH mein bada difference, jab side by side test kiya jaaye
likely_causes:
  - Water source jo fills ke beech significantly vary karta hai — tanker-delivered water, borewell water, ya kayi Indian cities mein RO/purifier "reject" water ke saath common hai, jahan mineral content din-din alag hota hai
  - Water sources switch karna (jaise tap se RO, ya alag-alag tanker suppliers ke beech) bina yeh check kiye ki naye source ka TDS/GH/KH actually kitna different hai
  - Evaporated water ko top off karna ek alag source se, jisse tank originally fill aur maintain nahi hua tha
  - RO ya purified water directly use karna bina remineralisation ke, jisse ek unstable, mineral-poor environment banta hai
immediate_actions:
  - Water change karne se pehle tank water aur add hone wale paani, dono ka TDS (ya GH/KH agar TDS meter nahi hai) test kariye — yeh mat maaniye ki dono match karte hain sirf isliye ki dono "tap water" hain ya dono "RO water" hain.
  - Agar significant mismatch hai, ek usual se chota water change (10-15%) kariye aur subsequent changes ko normal full change ek baar mein karne ke jagah zyada close together space kariye.
  - Shrimp ke liye specifically, kisi bhi bade TDS/GH/KH swing ko ek real risk maaniye, chahe usi tank ki fish koi symptoms na dikhayein — shrimp mineral swings ke liye zyadatar fish se kaafi zyada sensitive hote hain.
  - Agar RO ya purified water use kar rahe hain, isse ek stable target GH/KH tak remineralise kariye tank mein add karne se pehle, plain add karne ke jagah.
  - Aage ek water source aur ek remineralisation routine standardise kariye, tank-tank ya week-week sources switch karne ke jagah.
do_not_do:
  - Yeh mat maaniye ki "clean" ya "pure" water direct bade water change ke liye automatically safer hai — zero mineral content wala RO/purified water khud livestock ke liye ek shock hai jo mineral-bearing tank ke adapted hain, particularly shrimp.
  - Ek water change ke liye water sources ko mix mat kariye bina dono test kiye, especially tanker ya borewell water ke saath jahan mineral content genuinely fill-to-fill vary karta hai.
  - Yeh mat maaniye ki mixed-stock tank mein fish theek dikh rahi hain matlab usi tank mein shrimp bhi theek hain — shrimp mineral swings ko fish se kaafi zyada badly tolerate karte hain.
when_to_escalate:
  - Routine water changes ke baad repeated unexplained shrimp deaths — poore water-source aur remineralisation routine ko ek experienced shrimp keeper ke saath review karna worth hai, kyunki shrimp-specific parameter sensitivity apne aap mein ek deep topic hai.
  - Ek water source jo known hai ki significantly vary karta hai aur consistent nahi banaya ja sakta (jaise shared building tanker supply) — har baar unpredictable source se seedha lene ke jagah ek dedicated, tested top-off/change reservoir consider karna worth hai.
treatments:
  - name: Pre-testing and matching TDS/GH/KH before water changes
    dose: "N/A — a testing practice, not a dose"
    duration: Every water change, ongoing
    dangerous_to: [none_known]
    notes: Sabse effective prevention. Inconsistent water source par kisi ke liye ek cheap TDS meter ek worthwhile investment hai.
    source: https://www.shrimpsandsnails.com/water-parameters-for-shrimp/
  - name: Remineralisation of RO/purified water to a target GH/KH
    dose: Per remineraliser product instructions, calibrated to the tank's established parameters
    duration: Every batch of RO/purified water before use
    dangerous_to: [none_known_at_correct_dose]
    notes: Pure water is safe water wale trap ko prevent karta hai — zero-mineral water livestock ke liye apne aap mein ek tarah ka unstable hota hai.
    source: https://www.shrimpsandsnails.com/water-parameters-for-shrimp/
sources:
  - https://www.shrimpsandsnails.com/water-parameters-for-shrimp/
  - https://www.fishkeepingworld.com/general-hardness-gh-fish-tank/
confidence: medium
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

TDS (total dissolved solids), general hardness (GH) aur carbonate hardness (KH) water ke mineral content ko describe karte hain, aur livestock — especially shrimp — physiologically jis bhi level par unka tank stabilise ho chuka hai usse acclimate ho jaate hain. Danger ek high ya low number isolation mein nahi hai; danger tank ke water aur water change ya top-off ke dauraan add hone wale kisi bhi cheez ke beech ek bada, sudden difference hai.

Yeh India mein zyada matter karta hai doosre markets ke muqable kyunki water sources genuinely inconsistent hain: tanker-delivered water supplier se supplier, fill se fill vary karta hai, borewell water seasonally shift ho sakta hai, aur RO ya purifier "reject" water jo topping off ke liye use hota hai essentially koi mineral content carry nahi karta — inme se har ek ek real risk represent karta hai ek sudden GH/KH/TDS swing ka agar bina yeh check kiye use kiya jaaye ki tank kis par chal raha hai.

Is cheez ke liye shrimp sabse sensitive common livestock hain — ek bada mismatch water change ke dauraan post-change deaths aur failed moults ka ek well-documented cause hai, aksar disease par blame kiya jaata hai jab actual cause ek mineral swing tha. Fix principle mein simple hai: change se pehle tank aur incoming water dono test kariye, difference chota rakhiye, aur agar RO ya purified water use kar rahe hain, isse plain add karne ke jagah ek stable target par remineralise kariye.
