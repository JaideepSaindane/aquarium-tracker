---
id: co2-overdose
title: CO2 Overdose (Planted Tank)
status: sourced
review_tier: 1
aliases:
  - fish gasping planted tank co2
  - co2 too high aquarium
  - drop checker yellow
  - co2 killing fish
  - pressurised co2 fish dying
  - too much co2 injection
  - planted tank mein co2 zyada ho gaya
severity: critical
time_to_act: now
applies_to:
  water_type: [freshwater]
  species_traits: [invert]
symptoms:
  - Fish surface par gasping, especially overnight ya early morning zyada noticeable (jab plants oxygen produce karna band kar dete hain lekin CO2 injection abhi bhi chal raha ho sakta hai)
  - Ek drop checker (agar use ho raha ho) target green ki jagah yellow dikhana
  - Multiple fish mein simultaneously sudden lethargy ya balance loss, bina kisi doosre obvious cause ke
  - Shrimp/invertebrates fish se pehle ya zyada severely affect hona, unki generally lower CO2 tolerance ki wajah se
likely_causes:
  - Tank ke actual volume aur surface agitation ke liye CO2 injection rate bahut zyada set hona
  - Timer/solenoid cutoff ke bina overnight bhi CO2 inject hote rehna, jabki photosynthesis (jo CO2 consume karta hai) lights off hote hi ruk gaya ho
  - Excess dissolved CO2 offload karne ke liye insufficient surface agitation/gas exchange
  - Ek sudden system fault (stuck regulator, solenoid failure) jisse uncontrolled excess injection ho jaaye
immediate_actions:
  - CO2 injection ko immediately off kariye - ye har cheez se pehle priority hai.
  - Surface agitation immediately badhaiye (filter return badhaiye, airstone add kariye, ya manually surface agitate kariye) taaki excess dissolved CO2 jaldi se jaldi nikal jaaye.
  - Agar tank ko jaldi enough stabilise nahi kiya ja sakta, to visibly distressed fish ko ek CO2-free holding container mein good aeration ke saath move kariye.
  - Stabilise hone ke baad, injection rate review aur reduce kariye, aur confirm kariye ki timer/solenoid fitted hai taaki overnight CO2 injection ruk jaaye jab plants use consume nahi kar rahe.
  - CO2 ko lower rate par reintroduce kariye aur normal schedule par wapas jaane se pehle properly calibrated drop checker se closely monitor kariye.
do_not_do:
  - CO2 injection ko bina timer/solenoid cutoff ke 24 ghante mat chalaiye - overnight injection jab photosynthesis usse consume nahi kar raha, overdose event ka ek sabse common cause hai.
  - Real-time safety ke liye sirf drop checker par rely mat kariye - iski reading actual dissolved CO2 se roughly ek ghante lag karti hai, toh ye after the fact warn karta hai, moment mein nahi; surface agitation aur conservative injection rate hi actual safety margin hain.
  - CO2 injection ko usi rate par restart mat kariye jisse overdose hua, bina pehle surface agitation improve kiye ya proper timer/solenoid add kiye - same conditions simply same event reproduce kar denge.
when_to_escalate: "Ek CO2-injected tank mein multiple fish simultaneously gasping ya distress dikha rahe hain - ise acute emergency treat kariye jisme immediate CO2 shutoff aur aeration chahiye, urgency mein oxygen depletion event (corpus:oxygen-depletion) ke barabar."
treatments:
  - name: CO2 injection shutoff + surface agitation
    dose: "Injection ka full stop; surface agitation/aeration immediately maximise kariye"
    duration: Jab tak fish/inverts clear recovery na dikhaayein, phir reduced, timer-controlled rate par reintroduce kariye
    dangerous_to: [invert]
    notes: Invertebrates (shrimp especially) generally fish se zyada CO2-sensitive hote hain aur naye injection rate ko dial-in karte waqt sabse pehle indicator ke roop mein watch kiye jaane chahiye.
    source: https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
sources:
  - https://www.merckvetmanual.com/exotic-and-laboratory-animals/aquatic-systems/environmental-diseases-of-aquatic-animals-in-aquatic-systems
confidence: high
last_reviewed_by: ""
last_reviewed_on: 2026-09-11
review_due: 2027-03-11
---

CO2 overdose sirf planted, CO2-injected tanks ke liye specific hai aur genuinely dangerous hai kyunki mechanism - CO2 dissolved oxygen ko displace karna aur directly fish ki blood chemistry ko affect karna - fast move kar sakta hai, especially overnight, jab photosynthesis injected gas consume karna band kar chuka hota hai lekin injection abhi bhi chal raha ho sakta hai. Ye overnight window, daytime injection period nahi, single sabse common time hai jab overdose actually hota hai.

Ek drop checker dial-in karne ke liye useful tool hai lekin real-time safety device nahi - iska colour change actual dissolved CO2 levels se roughly ek ghante lag karta hai, matlab jab tak ye visibly yellow ho jaaye, tank pehle se hi kuch der se us level par tha. Actual safety margin ek conservative injection rate se aata hai, excess gas offload karne ke liye good surface agitation, aur critically, ek timer/solenoid jo overnight injection rokta hai, continuously chalane ki jagah.

Invertebrates, shrimp especially, generally fish se elevated CO2 ke liye zyada sensitive hote hain aur naye injection setup ko carefully dial in karte waqt ek useful early warning sign hain - rate change ke pehle dinon mein shrimp behaviour watch karna fish ke visible distress dikhane se pehle problems catch kar leta hai.
