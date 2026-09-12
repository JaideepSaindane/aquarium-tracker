---
id: filter-failure
title: Filter Failure
status: live
review_tier: 2
aliases:
  - filter stopped working
  - filter not pumping water
  - filter making noise not working
  - aquarium filter broken
  - filter died fish tank
  - no flow from filter
  - filter kaam nahi kar raha
  - filter se paani nahi aa raha
severity: high
time_to_act: 24h
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Filter outlet se koi visible water flow/return nahi
  - Unusual noise (grinding, rattling) ya motor chal raha hai lekin bahut kam ya bilkul flow nahi de raha
  - Filter rukne ke ek-do din ke andar water clouding, ya ammonia/nitrite readings badhna
likely_causes:
  - Motor abhi bhi chalne ke bawajood ek clogged intake, impeller, ya media flow ko block kar raha ho
  - Ek failed motor, worn impeller, ya stuck/broken impeller shaft
  - Media ko bina rinse kiye bahut zyada der chhod dena, jisse biofilter effectively suffocate hota hai aur saath hi flow bhi restrict hota hai
  - Power interruption (dekhiye corpus:power-cuts) jisse filter baaki sab cheezon ke saath ruk jaata hai
immediate_actions:
  - Pehle obvious cheezein check kariye: power connection, intake blockage, aur housing kholne par impeller freely spin kar raha hai ya nahi.
  - Agar impeller ya media simply clogged hai, ise removed tank water mein clean kariye (tap water nahi, jo beneficial bacteria maar sakta hai) aur restart kariye.
  - Agar filter genuinely mechanically fail ho gaya hai, jaldi se jaldi practical replacement ya backup filtration chalu kariye - ek basic air-powered sponge filter temporarily bhi koi biological filtration na hone se kahin better hai.
  - Filtration fully restore aur stable hone tak daily ammonia aur nitrite monitor kariye, kyunki ek stopped filter usi biofilter die-back aur delayed spike ka risk rakhta hai jo corpus:cycle-crash mein cover hua hai.
  - Hardware replace karte waqt existing filter media ko jitna possible ho preserve kariye - established media ko naye filter housing mein move karna zyadatar biological colony ko intact rakhta hai, cycle se dobara shuru karne ki jagah.
do_not_do:
  - Filter media ya impeller ko tap water ke neeche mat rinse kariye - tap water mein chlorine/chloramine media ko preserve karne ki koshish kar raha beneficial bacteria maar deta hai; iski jagah removed tank water use kariye.
  - Tank ko extended period ke liye bina filtration ke mat chhodiye ye assume karte hue ki "ek-do din theek rahega" - ise ek stalled ya crashed cycle ke barabar urgency se treat kariye.
  - Failed filter unit replace karte waqt purana filter media discard mat kariye agar media khud abhi bhi viable hai - ise naye unit mein transfer karna biological colony preserve karta hai.
when_to_escalate: "Filtration roughly 24 hours se zyada down hai combined with rising ammonia ya nitrite, ya fish distress dikha rahi hai - ise acute ammonia/nitrite protocols (corpus:ammonia-spike, corpus:nitrite-spike) apply hote hue treat kariye, sirf ek equipment fix nahi."
treatments: []
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: high
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Filter failure water flow ke immediate loss se aage matter karta hai kyunki filter usually tank ki biological filtration bhi hoti hai - un nitrifying bacteria ka ghar jo ammonia aur nitrite ko safe levels par rakhte hain. Ek stopped filter isliye ek mechanical problem hai aur, agar itne der tak stopped rahe, ek biofilter problem bhi hai usi delayed-spike risk ke saath jo corpus:cycle-crash mein describe kiya gaya hai.

Sabse common real fix ek full replacement se simpler hai: ek clogged intake, impeller, ya media bed flow ko restrict kar raha hai jabki motor khud abhi bhi fine hai. Removed tank water se clean karna, tap water se kabhi nahi, yahan specifically matter karta hai bacterial colony ko marne se bachane ke liye jise cleaning preserve karne ki koshish kar rahi hai - tap water ka chlorine ya chloramine exactly wahi karta hai jise touch karta hai kisi bhi bacteria ke saath, jaisa ki wo design kiya gaya hai.

Jab ek filter genuinely mechanically fail ho jaaye, existing media ko preserve karke replacement hardware mein move karna (fresh media se shuru karne ki jagah) zyadatar established biological colony ko intact rakhta hai, recovery period ko meaningfully shorten karte hue ek fresh, uncolonised filter ko scratch se chalane ke comparison mein.
