---
id: temperature-swings
title: Temperature Swings
status: live
review_tier: 2
aliases:
  - temperature swing
  - temperature dropped
  - heater failed temperature
  - paani thanda ho gaya
  - tank ka temperature girr gaya
  - fish stressed after cold water
  - sudden temperature change fish
  - heater kaam nahi kar raha temperature girr gaya
severity: high
time_to_act: 24h
applies_to:
  water_type: [freshwater]
  species_traits: [all, cool_water]
symptoms:
  - Known temperature change (water change, heater fault, weather, power cut) ke baad sudden lethargy, clamped fins, ya hiding
  - Ek cold snap ya ek bade cold water change ke thodi der baad ich outbreak (dekhiye corpus:ich-white-spot)
  - Temperature ke fast rise ke baad fish ka gasping ya unusually inactive hona (higher heat par lower dissolved oxygen)
likely_causes:
  - Ek water change jisme use hua paani tank se temperature-matched nahi tha
  - Heater fail off ho jaana, ya room unusually thanda ho jaana (power cut, winter, air conditioning) — dekhiye corpus:heater-failed-off
  - Heater stuck on ho jaana, ya ek heatwave — dekhiye corpus:heater-stuck-on aur corpus:heatwave-overheating
  - Water change, transport, ya acclimation ke dauraan fish ko different temperature ke containers ke beech move karna
immediate_actions:
  - Pehle change ki direction aur size identify kariye — ek chota, slow drift ek fast several-degree jump se kaafi kam concern hai, aur har ek ke liye response different hai.
  - Agar swing ongoing hai (heater fault, room temperature genuinely normal se different), water temperature ko directly correct karne ki koshish se pehle room/equipment cause ko correct kariye — cause fix kiye bina sirf water fix karna problem repeat karta hai.
  - Tank ko uske normal range ki taraf gradually wapas laaiye — roughly 1-2°C per hour se fast nahi — ek bade step mein swing correct karne ki koshish ke jagah, jo khud ek doosra swing hai.
  - Correction ke dauraan aur baad mein surface agitation/aeration badhaiye — higher temperature par dissolved oxygen kam hota hai aur fish already stressed hain, dono taraf se.
  - Baad ke 24-48 hours ke liye ich ya secondary infection ke liye closely watch kariye — temperature swing ek otherwise stable tank mein ich outbreak ka sabse common triggers mein se ek hai (dekhiye corpus:ich-white-spot).
do_not_do:
  - Ek temperature swing ko ek fast step mein correct mat kariye. Rapid correction khud ek doosra swing hai aur stress remove karne ke jagah add karta hai.
  - Water-change water ki temperature check kiye bina add mat kariye, kisi bhi direction mein — winter mein cold tap water aur summer mein sun-warmed stored water dono is exact problem ke common causes hain.
  - Yeh mat maaniye ki cool-sensitive fish, fry, ya kisi doosre stressor (illness, recent move, recent medication) se already dealing kar rahe tank ke liye ek "chota" swing harmless hai — un cases ke liye safe margin chota hota hai.
  - Ek heater jo ek baar fail ho chuka hai usse ignore mat kariye, chahe tank recover ho gaya ho — equipment-side fix ke liye dekhiye corpus:heater-failed-off aur corpus:heater-stuck-on; ek heater jo already ek baar fail ho chuka hai ek known future risk hai, ek one-off nahi.
when_to_escalate:
  - Ek swing ke dauraan ya turant baad fish acute distress dikha rahi hai (hard gasping, side par letna, erratic swimming) — isse turant intervention chahiye, gradual correction plan nahi.
  - Ek heater confirmed stuck on hai aur tank abhi bhi climb kar raha hai — emergency cool-down protocol ke liye dekhiye corpus:heater-stuck-on; isse wait out mat kariye.
  - Same unresolved cause se repeated swings (ek genuinely faulty heater, ek consistently cold room) — equipment ya setup ko fix karna chahiye, repeated manual correction nahi.
treatments: []
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ichthyophthirius-multifiliis-White-Spot-Infections-in-Fish.pdf
confidence: high
last_reviewed_by: "Jaideep"
last_reviewed_on: 2026-08-30
review_due: 2027-02-28
---

Fish ectothermic hoti hain — unka body temperature, metabolism aur immune response sab directly unke around ke paani ko track karte hain, ek warm-blooded animal jaisi koi buffering nahi hoti. Ek swing jo insaan ke liye non-event hoga, fish ke liye ek real physiological event hota hai: rate of change endpoint jitna hi matter karta hai. Ek din mein couple degrees ka slow drift usually bina incident ke tolerate ho jaata hai; wahi couple degrees minutes mein ek genuine stressor hai, kyunki fish ka metabolism aur gas exchange itna fast adjust nahi kar sakta.

Sabse consistently cited consequence suppressed immunity hai, jo exactly wajah hai ki ek ich outbreak aksar ek cold snap, ek bade cold water change, ya heater failure ke baad follow karta hai — parasite ko ek nayi introduction ki zaroorat nahi hoti; woh already low numbers mein present ho sakta hai, aur ek stressed immune system hi hai jo isse take hold karne deta hai. Isi liye ek swing ka correct response sirf "temperature ko normal par le aao" nahi hai balki "isse gradually normal par le aao, aur phir agle ek-do din secondary problem ke liye watch karo."

Is app ke context mein temperature swings ek chote number of recurring causes se aate hain, har ek ka apna entry equipment ya event side ke fix ke liye: ek heater jo fail off ho jaaye ya ek thande room mein undersized ho (corpus:heater-failed-off), ek heater stuck on ho ya ek genuine heatwave (corpus:heater-stuck-on, corpus:heatwave-overheating), ek untempered water change, ya ek power cut jo heater aur filter dono ek saath rok de (corpus:power-cuts). Yeh entry shared response cover karta hai — gradual correction, extra aeration, aur baad mein close observation — jo apply hota hai chahe swing ka cause inme se kuch bhi ho.
