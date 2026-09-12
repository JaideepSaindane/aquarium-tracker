---
id: nitrite-spike
title: Nitrite Spike
status: sourced
review_tier: 1
aliases:
  - nitrite spike
  - nitrite high
  - brown blood disease
  - methemoglobinemia
  - fish gasping normal oxygen
  - nitrite 1 ppm
  - second stage cycle ammonia gone
  - gills brown
  - nitrite bahut zyada ho gaya hai
  - gills brown ho gaye hain
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [all]
symptoms:
  - Ammonia 0 test hone ke bawajood surface par gasping
  - Gills jo red ki jagah brown ya grey-brown dikhte hain (methaemoglobinaemia — "brown blood disease")
  - Rest mein rapid, laboured breathing
  - Lethargy, appetite loss, fish surface ya filter outflow ke paas hang kar rahe hain
  - Ek tank mein sudden deaths jo cycling mein 2-4 weeks mein hai, ammonia gir na shuru hone ke turant baad
likely_causes:
  - Mid-cycle — ammonia-oxidising bacteria establish ho chuke hain lekin nitrite-oxidising bacteria abhi tak catch up nahi kiye (ek fishless ya fish-in cycle ka normal, expected second hump)
  - Overstocking ya overfeeding jo biofilter ke nitrite-oxidisers handle kar sakte usse zyada nitrogen tank ke through push kar raha hai
  - Ek cycle disruption jisne specifically nitrite-oxidising bacteria maar diye (ye ammonia-oxidisers se recover hone mein slower hote hain)
  - Kuch regions mein high-nitrite well ya borewell water, jo water changes ke saath enter karta hai
immediate_actions:
  - Ammonia, nitrite, nitrate aur pH ek saath test kariye. Nitrite toxicity "hamesha sab kuch test karo" ka ek exception hai jise ek genuine shortcut milta hai — chloride directly gill par nitrite uptake ko block karta hai, isliye exact ppm jaanne se pehle bhi fix water hardness ke hisaab se differ karta hai.
  - Freshwater, scaleless-safe species ke liye aquarium salt (plain non-iodised NaCl) ya ek chloride source 1 gram per litre (roughly 1 teaspoon per 5 US gallons) par add kariye. Ye single sabse effective emergency step hai — chloride ions same gill uptake pathway ke liye nitrite se compete karte hain aur ye ghanton mein kaam karta hai. Scaleless fish ke liye ye step poori tarah skip kariye, aur tank mein kisi bhi shrimp ya snail ke saath extreme caution use kariye (dekhiye do_not_do).
  - Nitrite ko directly dilute karne ke liye dechlorinated, temperature-matched water se ek 30-50% water change kariye.
  - Surface agitation/aeration badha dijiye — nitrite-damaged blood oxygen poorly carry karta hai, isliye dissolved oxygen badhaana partially compensate karta hai chahe ye underlying nitrite fix na kare.
  - Biofilter se guzarne wala nitrogen load kam karne ke liye 24-48 ghante feeding rok dijiye.
  - 12-24 ghanton mein nitrite re-test kariye; water change aur salt dose repeat kariye (total salt target ke andar rehte hue, already andar jo hai uske upar re-dose mat kariye) jab tak nitrite 0 read na kare.
do_not_do:
  - Scaleless fish (zyada tar catfish, loaches) wale tank mein pehle us specific species ki salt tolerance research kiye bina salt add mat kariye — kayi is dose par bhi poorly tolerate karte hain.
  - Shrimp, snails ya doosre freshwater invertebrates wale tank mein salt add mat kariye — 1g/L sensitive shrimp species (jaise Caridina) ke liye harmful ya fatal ho sakta hai. Invertebrate tanks ke liye sirf water-change/aeration steps use kariye aur jaldi escalate kariye.
  - Mid-cycle 0 ammonia ko "tank theek hai" mat samajhiye — zyada tar livestock ke liye nitrite kaafi zyada dangerous stage hai aur miss karna easy hai kyunki water aksar clear hi lagta hai.
  - Nitrite "reset" karne ke liye 100% water change mat kariye — isse beneficial bacteria nitrite ke saath strip ho jaate hain aur cycle aur peeche se restart ho jaata hai.
  - Jab tak nitrite 0 se upar read karta hai, aur fish add mat kariye, chahe wo trend down hota lage.
when_to_escalate:
  - Nitrite roughly 5 ppm se upar hai aur fish brown gills aur heavy gasping dikha rahe hain — ye ek severe case hai; salt aur water changes ke saath saath, vulnerable fish ko already-cycled water mein move karna consider karne layak hai, jaisa severe ammonia spike ke liye hota hai.
  - Repeated water changes aur correct salt dosing ke baad bhi nitrite nahi gir raha — ye assume karne se pehle ki biofilter simply slow hai, ek nitrite-contaminated water source (kuch borewell/well water) check kariye.
  - Nitrite spike experience kar rahe tank mein koi bhi scaleless ya invertebrate stock — inhe upar diye default salt protocol ke bajaye individual research chahiye safe intervention ke liye.
treatments:
  - name: Non-iodised aquarium/cooking salt (sodium chloride)
    dose: "1 gram per litre (~1 tsp per 5 US gallons) of tank water, dosed once and maintained at that level via top-offs, not redosed per water change"
    duration: Until nitrite reads 0, then can be left to dilute out gradually via normal water changes
    dangerous_to: [scaleless_species_variable_tolerance, shrimp, most_snails, live_plants_at_higher_doses]
    notes: Chloride ions competitively gill par nitrite uptake ko block karte hain — ye ek genuine, well-supported emergency intervention hai, ek folk remedy nahi, lekin tolerance mein ye species-specific hai. Plain community-tank salt levels dose karne se pehle tank ki exact species research kariye.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - name: Water changes to dilute nitrite
    dose: 30-50%, temperature-matched and dechlorinated
    duration: Repeat every 12-24h until nitrite reads 0
    dangerous_to: [none_known]
    notes: Akele salt se slower hai lekin scaleless fish aur invertebrates sameth har species ke liye kaam karta hai.
    source: https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
  - https://extension.rwfm.tamu.edu/wp-content/uploads/sites/8/2013/09/Ammonia-in-Aquatic-Systems1.pdf
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

Nitrite nitrogen cycle ka middle stage hai: ammonia-oxidising bacteria ammonia ko nitrite mein convert karte
hain, aur bacteria ka ek doosra, slower-growing group nitrite ko kaafi kam toxic nitrate mein convert karta
hai. Kyunki doosra group pehle se baad mein establish hota hai, almost har naya tank ek genuine nitrite spike
se guzarta hai chahe sab kuch correctly kiya jaaye — ye expected hai, failure ka sign nahi, lekin ye dangerous
hai aur active management maangta hai, sirf patience nahi.

Nitrite gill membrane cross karta hai aur haemoglobin se bind hota hai, methaemoglobin banata hai, jo oxygen
carry nahi kar sakta. Fish us paani mein suffocate ho jaata hai jisme kaafi dissolved oxygen hota hai — yehi
wajah hai ki 0 ammonia reading ke saath surface par gasping kayi first-time keepers ko confuse karta hai, aur
kyun ek badly affected fish ki gills khud aksar red ki jagah brown dikhti hain.

Emergency fix chloride hai, zyada oxygen nahi. Chloride ions gill par same transport mechanism ke liye nitrite
se compete karte hain, isliye chloride badhana (plain non-iodised salt ke through, salt-tolerant species ke
liye) directly nitrite uptake kam karta hai aur biofilter ke catch up hone ka wait karne se faster kaam karta
hai. Ye is corpus mein wo ek jagah hai jahan "salt sab kuch fix kar deta hai" wala instinct actually correct
hai — lekin sirf salt-tolerant freshwater fish ke liye. Scaleless fish aur invertebrates ko iske bajaye water
changes aur time chahiye, kyunki jo dose nitrite par kaam karti hai uske liye unki tolerance inconsistent se
poor hoti hai.
