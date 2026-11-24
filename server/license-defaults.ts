// Existing seller-approved draft defaults, copied without changing terms.
export const initialLicenseSettings = {
  "basic": {
    "id": "basic",
    "name": "Basic License",
    "price": 50,
    "files": "MP3",
    "publishing": 50,
    "major": 90,
    "indie": 70,
    "grant": "Scope: One new song. Exclusivity: Nonexclusive. Music videos: 1. Live performances: No performance-count cap. Radio / TV broadcast: Separate written clearance. Film, ads and games: Separate sync agreement.",
    "limits": "Paid copies / downloads: 5,000 total. Audio-only streams: 100,000 total. Monetized video views: 250,000 total. Term: 10 years. Territory: Worldwide. Contact JT before exceeding the cap; new terms required. Counts apply to the licensed new song across outlets; counting definitions and expiry treatment require confirmation.",
    "terms": "Content ID reference registration: Not permitted for shared beat material. Producer credit: Produced by Joel Tracks. Raw beat / stems resale: Not permitted. Ownership, royalty revenue basis and deductions, artist eligibility, registration, sample clearance, reporting, termination, refunds, governing law and dispute terms require confirmation and review by a qualified lawyer in the applicable jurisdiction.",
    "version": 1,
    "delivery": [
      "mp3"
    ],
    "usageDefaultsVersion": 1
  },
  "premium": {
    "id": "premium",
    "name": "Premium License",
    "price": 100,
    "files": "MP3 + WAV",
    "publishing": 50,
    "major": 90,
    "indie": 70,
    "grant": "Scope: One new song. Exclusivity: Nonexclusive. Music videos: 2. Live performances: No performance-count cap. Radio / TV broadcast: Separate written clearance. Film, ads and games: Separate sync agreement.",
    "limits": "Paid copies / downloads: 10,000 total. Audio-only streams: 500,000 total. Monetized video views: 1,000,000 total. Term: 10 years. Territory: Worldwide. Contact JT before exceeding the cap; new terms required. Counts apply to the licensed new song across outlets; counting definitions and expiry treatment require confirmation.",
    "terms": "Content ID reference registration: Not permitted for shared beat material. Producer credit: Produced by Joel Tracks. Raw beat / stems resale: Not permitted. Ownership, royalty revenue basis and deductions, artist eligibility, registration, sample clearance, reporting, termination, refunds, governing law and dispute terms require confirmation and review by a qualified lawyer in the applicable jurisdiction.",
    "version": 1,
    "delivery": [
      "mp3",
      "wav"
    ],
    "usageDefaultsVersion": 1
  },
  "unlimited": {
    "id": "unlimited",
    "name": "Unlimited License",
    "price": 500,
    "files": "MP3 + WAV + Stems",
    "publishing": 50,
    "major": 90,
    "indie": 70,
    "grant": "Scope: One new song. Exclusivity: Nonexclusive. Music videos: No music-video cap. Live performances: No performance-count cap. Radio / TV broadcast: Separate written clearance. Film, ads and games: Separate sync agreement.",
    "limits": "Paid copies / downloads: No unit cap. Audio-only streams: No audio-stream cap. Monetized video views: No video-view cap. Term: 10 years. Territory: Worldwide. Other reserved uses still require consent. Counts apply to the licensed new song across outlets; counting definitions and expiry treatment require confirmation.",
    "terms": "Content ID reference registration: Not permitted for shared beat material. Producer credit: Produced by Joel Tracks. Raw beat / stems resale: Not permitted. Ownership, royalty revenue basis and deductions, artist eligibility, registration, sample clearance, reporting, termination, refunds, governing law and dispute terms require confirmation and review by a qualified lawyer in the applicable jurisdiction.",
    "version": 1,
    "delivery": [
      "mp3",
      "wav",
      "stems"
    ],
    "usageDefaultsVersion": 1
  },
  "custom": {
    "id": "custom",
    "name": "Custom License",
    "price": null,
    "files": "Negotiated",
    "publishing": 50,
    "major": 90,
    "indie": 70,
    "grant": "Price, delivery files, publishing and master splits, permitted uses and exclusivity are negotiated for this beat. Any exclusive arrangement must address existing licenses.",
    "limits": "Song count, copies, streams, videos, video views, live performances, broadcast, sync uses, term and territory must be recorded in the negotiated agreement.",
    "terms": "Producer credit, Content ID eligibility, raw beat or stems resale, upgrades and all remaining terms require written agreement. Specific negotiated terms appear with the offer revision. Legal contracting details, sample clearance, royalty accounting, termination, governing law and disputes require confirmation and lawyer review.",
    "version": 1,
    "delivery": [],
    "usageDefaultsVersion": 1
  }
};
