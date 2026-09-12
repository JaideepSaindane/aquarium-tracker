---
id: stalled-cycle
title: Stalled Cycle
status: live
review_tier: 2
aliases:
  - cycle stalled
  - ammonia not going down
  - nitrite stuck
  - cycle not progressing
  - bacteria not growing
  - cycle taking too long
  - cycle aage nahi badh raha
  - ammonia kam nahi ho raha
severity: medium
time_to_act: 72h
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Ammonia (ya nitrite) readings jo ek week ya usse zyada se girna band ho gayi hain, typical timeframe se kaafi aage
  - Consistent dosing ke bawajood expected ammonia-then-nitrite-then-nitrate pattern mein koi visible progress nahi
likely_causes:
  - pH roughly 6.5 se neeche — nitrifying bacteria isse kaafi neeche dramatically slow ho jaate hain ya function karna band kar dete hain
  - Chlorine ya chloramine present hona kyunki water change bina dechlorinator ke kiya gaya, jisse developing bacterial colony mar jaati hai
  - Koi bhi medication (especially antibiotics) cycling ke dauraan tank mein dose hona, jo collateral damage ke roop mein nitrifying bacteria maar sakti hai
  - Koi consistent ammonia source na hona — dosing mein gaps, ya ek source khatam ho jaana, jisse bacteria ke paas khaane ke liye aur badhne ke liye kuch na bache
  - Low temperature jo generally bacterial growth rate ko slow kar de
  - Insufficient time — ek otherwise normal-length cycle mein kuch dino ka stall aksar bas normal variation hai, genuine stall nahi
immediate_actions:
  - pH test aur record kariye — agar yeh roughly 6.5 se neeche gir gaya hai, yeh akela cycle ko almost completely stall kar sakta hai; nitrifying bacteria ko theek se function karne ke liye higher pH chahiye.
  - Confirm kariye ki recently bina dechlorinator ke koi chlorinated/chloramine water add nahi hua.
  - Confirm kariye ki cycling tank mein koi medication dose nahi hua.
  - Confirm kariye ki ammonia actually present hai aur consistently redose ho raha hai — ek stall bas iska matlab ho sakta hai ki bacteria ke paas consume karne ke liye kuch nahi hai.
  - Agar pH identified cause hai, isse gradually raise kariye (corpus:ph-crash-kh-exhaustion dekhiye "gradual, not sudden" principle ke liye), ek bade correction mein nahi.
  - Agar upar diya kuch bhi explain nahi karta, kuch actually galat hai yeh conclude karne se pehle further 1-2 weeks ke liye patient rahiye — cycle length genuinely vary karti hai.
do_not_do:
  - Already-high reading ke upar aur ammonia mat add kariye, yeh sochte hue ki "more feeding" ek stall fix kar degi — agar bacteria already present cheez ko process nahi kar rahe, toh aur add karna eventual correction ko sirf harder banata hai.
  - pH, chlorine ya medication causes pehle check kiye bina bottled bacteria products ko automatic fix ke roop mein dose mat kariye — yeh products kitne inconsistent hain iske liye dekhiye corpus:bottled-bacteria-claims.
  - Give up karke ek full tank reset (drain karke restart) mat kariye — isse jo bhi bacterial progress already ho chuka hai woh discard ho jaata hai.
when_to_escalate: "Ek stall jo kayi weeks tak chale bina common causes (pH, chlorine, medication, missing ammonia source) identify hue — guess karte rehne ke jagah poori parameter history par ek second, experienced pair of eyes ka input worth hai."
treatments:
  - name: Gradual pH correction if pH is below ~6.5
    dose: Small, staged buffer additions, re-testing between each (see corpus:ph-crash-kh-exhaustion)
    duration: Over several days
    dangerous_to: [rapid_swings_if_overdosed]
    notes: Sabse common genuine stall causes mein se ek hai aur aksar "bacteria ko bas aur time chahiye" maan kar overlook ho jaata hai.
    source: https://www.aquariumcoop.com/blogs/aquarium/how-to-cycle-a-fish-tank
sources:
  - https://www.aquariumcoop.com/blogs/aquarium/how-to-cycle-a-fish-tank
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
confidence: medium
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Ek cycle jo stall dikhta hai — ammonia ya nitrite readings jo ek week ya usse zyada gir na band ho jaayein — almost hamesha ek chote set of identifiable causes mein se ek hoti hai, na ki ek mystery jisse aur waiting chahiye. Sabse commonly missed cause pH hai: nitrifying bacteria roughly pH 6.5 se neeche substantially slow ho jaate hain aur almost function karna stop kar sakte hain, isliye naturally soft, acidic water mein ek cycle permanently stuck dikh sakta hai chahe aur kuch bhi galat na ho.

Doosre common causes zyada direct hain: bina dechlorinator ke add ki gayi chlorinated ya chloraminated water developing bacterial colony ko outright maar deti hai; koi bhi medication, especially antibiotics, wahi karta hai; aur ek missing ya inconsistent ammonia source bas bacteria ko badhne ke liye kuch nahi deta.

Ek stall diagnose karna in specific, ordinary causes ko order mein check karna hai, na ki yeh maan lena ki process khud fail ho gaya hai ya automatic fix ke roop mein ek bottled bacteria product ke liye reach karna — dekhiye corpus:bottled-bacteria-claims ki yeh products kitne inconsistent hain aur actual cause identify karne ka substitute nahi hain.
