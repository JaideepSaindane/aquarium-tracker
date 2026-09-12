---
id: ph-crash-kh-exhaustion
title: pH Crash / KH Exhaustion
status: live
review_tier: 2
aliases:
  - ph crash
  - kh exhaustion
  - ph dropped overnight
  - ph 5 fish tank
  - all fish dead overnight ph
  - acidic tank sudden
  - kh zero
  - buffer ran out
  - raat mein ph crash ho gaya
  - kh khatam ho gaya
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [soft_water, invert]
symptoms:
  - Fish bina kisi aur warning sign ke mari hui ya marte hue milna, aksar raat mein ya ek-do din mein
  - pH test unusually low aana (6.0 se neeche, kabhi 5.0 se bhi neeche) jabki pehle 7 ke range mein stable tha
  - KH (carbonate hardness) test 0 ke paas ya 0 aana
  - Agar early catch ho jaaye toh crash se pehle fish gasping, erratic swimming, ya bottom par letna
  - Sudden fish deaths jo time mein spread hone ke jagah clustered together hon
likely_causes:
  - KH (carbonate hardness) nitrogen cycle ke apne acid production se dheere-dheere consume hoti gayi aur kabhi replace nahi hui, jab tak yeh zero tak nahi pahunchi aur pH ko buffer karna bilkul band kar diya
  - Soft ya RO/DI water bina remineralisation ya buffering ke use ho rahi ho, especially shrimp ya planted tanks mein
  - CO2 injection (planted tanks) already-low KH ko overwhelm kar raha ho
  - Driftwood, kuch substrates, ya peat continuously already low-buffer tank mein tannins/acids release kar rahe hon
  - Naturally soft source water wale tank mein water changes ke beech lamba gap ho aur koi added buffer na ho
immediate_actions:
  - KH aur pH ko saath test kariye, sirf pH akela nahi — bina KH jaane pH crash confusing lagta hai; confirmed 0 KH ke saath pH crash ek clear diagnosis hai.
  - Chemical pH-up products se pH ko fast raise karne ki koshish MAT kariye. Crash ke baad ek fast pH swing survivors ke liye low pH se bhi zyada dangerous hai — jo fish crash survive kar chuki hain woh current (low) reading ke adapted hain, aur ek rapid jump upar ek doosra shock hai pehle ke upar.
  - Iske jagah pH ko gradually raise kariye: moderate KH/hardness wale paani se chote water changes (10-15%) kariye, ek doosre se kayi hours se ek din apart, har change ke beech fish ka response dekhte hue.
  - Ek KH buffer add kariye (crushed coral, carefully measured chote doses mein baking soda, ya ek commercial buffer), KH ko days mein slowly raise karne ka target rakhte hue, hours mein nahi.
  - Aeration badhaiye — low-pH crash ke saath aksar elevated CO2 hota hai, aur extra surface agitation usse off-gas karne mein madad karta hai.
  - Stabilise hone ke baad, underlying KH-depletion cause identify aur fix kariye (dekhiye likely_causes) taaki yeh dobara na ho.
do_not_do:
  - Crash ko turant "fix" karne ke liye pH-up ya baking soda ek bade single dose mein mat daaliye. Fast pH swings, ek baar fish partially adapt ho jaayein toh low pH se bhi zyada dangerous hain.
  - Crash discover karne ke turant baad normal tap water se ek bada water change mat kariye agar tap water ka pH/KH tank ki current reading se significantly zyada hai — isko kisi bhi pH swing se recover karne jaisa hi cautious, gradual treat kariye.
  - KH check kiye bina crash ko ek one-off event mat maaniye — agar KH abhi bhi bahut low ya 0 hai, toh wahi crash usi timeline par dobara hoga jab tak buffering capacity actually restore nahi ho jaati.
  - Ek tank jisne pehle hi KH exhaustion dikhaya hai, uske water changes ke liye bina remineralise kiye RO ya bahut soft water use mat kariye.
when_to_escalate:
  - Buffer add karne ke bawajood ek predictable cycle par (jaise har kuch weeks mein) repeated pH crashes — yeh ek ongoing acid source (driftwood, substrate, CO2 system) ki taraf point karta hai jise identify karna zaroori hai, na ki bas baar-baar buffer daalna.
  - Koi bhi tank jisme shrimp ya doosre especially pH-sensitive invertebrates hon aur crash ho chuka ho — inhe aksar fish-only tanks se zyada slow, carefully monitored recovery chahiye hoti hai.
treatments:
  - name: Gradual water changes with moderate-KH water
    dose: 10-15% per change, spaced several hours to a day apart
    duration: Over 2-4 days until pH and KH stabilise at a normal level
    dangerous_to: [none_known_when_done_gradually]
    notes: Sabse safe recovery path. Goal ek slow climb back hai, fast correction nahi.
    source: https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
  - name: Crushed coral or aragonite substrate/media (as a KH buffer)
    dose: A small mesh bag in the filter, adjusted by testing KH over several days
    duration: Ongoing — dissolves gradually and needs monitoring/replacing
    dangerous_to: [soft_water_species_if_overdone, plants_sensitive_to_high_hardness]
    notes: Buffering capacity add karne ka ek gentle, self-limiting tarika — yeh lower-pH water mein fast aur pH badhne par slow dissolve hota hai, jo ek-time chemical dose se naturally zyada safe curve hai.
    source: https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
  - name: Commercial pH buffer / baking soda (sodium bicarbonate)
    dose: Very small, carefully measured doses, re-testing KH before each addition
    duration: As needed, added gradually over days
    dangerous_to: [rapid_swings_if_overdosed, soft_water_and_blackwater_species]
    notes: Effective hai lekin actually zaroorat se kaafi kam ke muqable overdose karna asaan hai — ek target number tak ek hi baar mein dose karne ke jagah measure kariye, wait kariye, re-test kariye.
    source: https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
sources:
  - https://www.fishkeepingworld.com/ph-crash-in-fish-tank/
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: medium
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Carbonate hardness (KH) hi hai jo pH ko stable rakhta hai — yeh water ki buffering capacity hai, woh cheez jo ek healthy nitrogen cycle ke chote, constant acid production ko absorb karti hai bina pH ko actually move hone diye. Yeh buffering capacity finite hai. Naturally soft source water wale tanks mein, ya un tanks mein jinme water changes se enough hardness kabhi wapas nahi aati, KH thoda-thoda karke consume hoti rehti hai jab tak yeh zero tak nahi pahunch jaati — aur ek baar yeh zero par pahunch jaaye, toh pH ke paas usse resist karne ke liye kuch nahi bachta aur yeh bahut fast gir sakta hai, kabhi raat bhar mein, aur aksar poore kayi points se.

Isi liye ek pH crash keeper ko sudden aur mysterious lagta hai chahe underlying cause (KH ka slowly khatam hona) weeks se build ho raha ho. Practical trap yeh hai ki aage kya hota hai: jo fish initial crash survive kar leti hain woh hours ke andar naye, lower pH ke saath partially adapt ho jaati hain, isliye instinctive "fix" — ek strong buffer dose karna ya normal-KH tap water se ek bada water change karke pH ko fast wapas upar snap karna — khud ek doosra, aksar zyada lethal shock hota hai. Safe recovery path kisi bhi bade water-parameter swing ke general rule jaisa hi hai: isko gradually, chote steps mein wapas le jaao, har ek ke beech fish dekhte hue, ek corrective jump mein nahi.

Recurrence rokne ke liye periodically KH test karna zaroori hai, sirf pH nahi, kyunki pH akela buffer khatam hone tak bilkul normal dikh sakta hai.
