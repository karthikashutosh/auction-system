export interface Product {
  brand: string;
  model: string;
  noun: string; // "camera", "watch" ...
  base: number; // typical price in INR for a "good" item
  keywords: string[];
  era?: string;
}

export const CATALOG: Record<string, Product[]> = {
  cameras: [
    { brand: "Canon", model: "AE-1", noun: "35mm SLR film camera", base: 14000, keywords: ["camera", "film", "photography", "slr", "vintage"], era: "1970s" },
    { brand: "Nikon", model: "F3", noun: "35mm SLR film camera", base: 28000, keywords: ["camera", "film", "photography", "slr", "professional"], era: "1980s" },
    { brand: "Pentax", model: "K1000", noun: "35mm student SLR camera", base: 9000, keywords: ["camera", "film", "photography", "slr", "beginner"], era: "1970s" },
    { brand: "Olympus", model: "OM-1", noun: "compact 35mm SLR camera", base: 12000, keywords: ["camera", "film", "photography", "slr", "compact"], era: "1970s" },
    { brand: "Leica", model: "M3", noun: "rangefinder film camera", base: 180000, keywords: ["camera", "rangefinder", "film", "photography", "collectible"], era: "1950s" },
    { brand: "Yashica", model: "Mat-124G", noun: "medium format twin lens reflex camera", base: 22000, keywords: ["camera", "medium format", "film", "photography", "tlr"], era: "1970s" },
    { brand: "Sony", model: "A7 II", noun: "full frame mirrorless camera body", base: 52000, keywords: ["camera", "mirrorless", "digital", "photography", "lens"], era: "2010s" },
    { brand: "Fujifilm", model: "X100V", noun: "premium compact digital camera", base: 95000, keywords: ["camera", "digital", "photography", "street", "compact"], era: "2020s" },
  ],
  audio: [
    { brand: "Technics", model: "SL-1200 MK2", noun: "direct drive turntable", base: 55000, keywords: ["turntable", "vinyl", "record player", "audio", "dj"], era: "1980s" },
    { brand: "Marantz", model: "2270", noun: "stereo receiver amplifier", base: 85000, keywords: ["receiver", "amplifier", "hifi", "audio", "stereo"], era: "1970s" },
    { brand: "JBL", model: "L100", noun: "floorstanding studio speakers", base: 95000, keywords: ["speakers", "hifi", "audio", "sound", "stereo"], era: "1970s" },
    { brand: "Sony", model: "WH-1000XM4", noun: "noise cancelling wireless headphones", base: 16000, keywords: ["headphones", "wireless", "audio", "noise cancelling", "sound"], era: "2020s" },
    { brand: "Sennheiser", model: "HD 650", noun: "open back reference headphones", base: 22000, keywords: ["headphones", "audiophile", "audio", "open back", "sound"], era: "2010s" },
    { brand: "Bose", model: "Wave", noun: "tabletop music system radio", base: 9000, keywords: ["radio", "speaker", "audio", "tabletop", "sound"], era: "2000s" },
    { brand: "Pioneer", model: "SX-780", noun: "vintage stereo receiver", base: 25000, keywords: ["receiver", "stereo", "vintage", "audio", "hifi"], era: "1970s" },
    { brand: "Yamaha", model: "NS-10", noun: "studio monitor speakers", base: 30000, keywords: ["monitor", "speakers", "studio", "audio", "sound"], era: "1980s" },
  ],
  watches: [
    { brand: "Seiko", model: "5 Sports", noun: "automatic wristwatch", base: 7000, keywords: ["watch", "automatic", "wristwatch", "timepiece", "everyday"], era: "2010s" },
    { brand: "Rolex", model: "Submariner 5513", noun: "dive watch", base: 600000, keywords: ["watch", "dive", "wristwatch", "luxury", "timepiece"], era: "1970s" },
    { brand: "Omega", model: "Speedmaster", noun: "manual wind chronograph watch", base: 300000, keywords: ["watch", "chronograph", "wristwatch", "luxury", "timepiece"], era: "1990s" },
    { brand: "Tissot", model: "PRX", noun: "quartz wristwatch", base: 28000, keywords: ["watch", "quartz", "wristwatch", "retro", "timepiece"], era: "2020s" },
    { brand: "Citizen", model: "Eco-Drive Promaster", noun: "solar powered dive watch", base: 12000, keywords: ["watch", "solar", "dive", "wristwatch", "timepiece"], era: "2010s" },
    { brand: "Longines", model: "Conquest", noun: "automatic dress watch", base: 60000, keywords: ["watch", "automatic", "dress", "wristwatch", "timepiece"], era: "1990s" },
    { brand: "Hamilton", model: "Khaki Field", noun: "field watch", base: 30000, keywords: ["watch", "field", "military", "wristwatch", "timepiece"], era: "2010s" },
    { brand: "Orient", model: "Bambino", noun: "automatic dress watch", base: 11000, keywords: ["watch", "automatic", "dress", "wristwatch", "timepiece"], era: "2010s" },
  ],
  furniture: [
    { brand: "Danish", model: "Teak", noun: "mid-century dining table", base: 45000, keywords: ["table", "teak", "dining", "furniture", "mid-century"], era: "1960s" },
    { brand: "Oak", model: "Sideboard", noun: "mid-century oak sideboard cabinet", base: 38000, keywords: ["cabinet", "oak", "storage", "furniture", "mid-century"], era: "1960s" },
    { brand: "Rosewood", model: "Writing Desk", noun: "antique writing desk", base: 30000, keywords: ["desk", "rosewood", "antique", "furniture", "study"], era: "1930s" },
    { brand: "Chesterfield", model: "Three Seater", noun: "tufted leather sofa", base: 70000, keywords: ["sofa", "leather", "chesterfield", "furniture", "living room"], era: "1980s" },
    { brand: "Bentwood", model: "Rocker", noun: "rocking chair", base: 8000, keywords: ["chair", "rocking", "bentwood", "furniture", "vintage"], era: "1950s" },
    { brand: "Mahogany", model: "Wardrobe", noun: "double door wardrobe", base: 32000, keywords: ["wardrobe", "mahogany", "storage", "furniture", "bedroom"], era: "1940s" },
    { brand: "Rattan", model: "Peacock", noun: "armchair", base: 6000, keywords: ["chair", "rattan", "armchair", "furniture", "boho"], era: "1970s" },
    { brand: "Industrial", model: "Pipe Shelf", noun: "iron and wood bookshelf", base: 12000, keywords: ["shelf", "bookshelf", "industrial", "furniture", "storage"], era: "2010s" },
  ],
  art: [
    { brand: "Landscape", model: "Oil", noun: "oil painting on canvas", base: 25000, keywords: ["painting", "oil", "canvas", "art", "landscape"] },
    { brand: "Limited Edition", model: "Lithograph", noun: "signed lithograph print", base: 18000, keywords: ["print", "lithograph", "art", "signed", "framed"] },
    { brand: "Bronze", model: "Dancer", noun: "sculpture", base: 55000, keywords: ["sculpture", "bronze", "art", "statue", "figure"] },
    { brand: "Botanical", model: "Watercolor", noun: "framed watercolor print", base: 6000, keywords: ["watercolor", "botanical", "print", "art", "framed"] },
    { brand: "Abstract", model: "Acrylic", noun: "acrylic painting on canvas", base: 20000, keywords: ["painting", "acrylic", "canvas", "art", "abstract"] },
    { brand: "Ravi Varma", model: "Print", noun: "vintage framed print", base: 9000, keywords: ["print", "vintage", "art", "framed", "indian"] },
    { brand: "Madhubani", model: "Folk", noun: "hand painted folk artwork", base: 7000, keywords: ["painting", "folk", "art", "handmade", "indian"] },
    { brand: "Charcoal", model: "Portrait", noun: "framed portrait drawing", base: 4000, keywords: ["portrait", "charcoal", "drawing", "art", "framed"] },
  ],
  computers: [
    { brand: "Apple", model: "MacBook Pro 14 M1", noun: "laptop computer", base: 120000, keywords: ["laptop", "macbook", "computer", "apple", "notebook"], era: "2020s" },
    { brand: "Lenovo", model: "ThinkPad X230", noun: "business laptop computer", base: 12000, keywords: ["laptop", "thinkpad", "computer", "notebook", "retro"], era: "2010s" },
    { brand: "Keychron", model: "Q1", noun: "mechanical keyboard", base: 13000, keywords: ["keyboard", "mechanical", "computer", "typing", "custom"], era: "2020s" },
    { brand: "Dell", model: "UltraSharp U2723QE", noun: "4K monitor", base: 45000, keywords: ["monitor", "display", "computer", "4k", "screen"], era: "2020s" },
    { brand: "NVIDIA", model: "RTX 3080", noun: "graphics card gpu", base: 40000, keywords: ["gpu", "graphics", "computer", "gaming", "card"], era: "2020s" },
    { brand: "Raspberry Pi", model: "4B", noun: "single board computer kit", base: 7000, keywords: ["raspberry", "computer", "maker", "board", "kit"], era: "2020s" },
    { brand: "Apple", model: "iPad Air 4", noun: "tablet computer", base: 38000, keywords: ["tablet", "ipad", "computer", "apple", "touch"], era: "2020s" },
    { brand: "Logitech", model: "MX Master 3", noun: "wireless mouse", base: 6000, keywords: ["mouse", "wireless", "computer", "ergonomic", "office"], era: "2020s" },
  ],
  jewelry: [
    { brand: "22k Gold", model: "Chain", noun: "gold chain necklace", base: 60000, keywords: ["gold", "chain", "necklace", "jewelry", "22k"] },
    { brand: "Diamond", model: "Solitaire", noun: "engagement ring", base: 150000, keywords: ["diamond", "ring", "solitaire", "jewelry", "engagement"] },
    { brand: "Sterling Silver", model: "Anklet", noun: "pair of anklets", base: 5000, keywords: ["silver", "anklet", "jewelry", "traditional", "pair"] },
    { brand: "Freshwater Pearl", model: "Strand", noun: "pearl necklace", base: 35000, keywords: ["pearl", "necklace", "jewelry", "classic", "strand"] },
    { brand: "Ruby", model: "Pendant", noun: "gemstone pendant", base: 48000, keywords: ["ruby", "pendant", "gemstone", "jewelry", "gold"] },
    { brand: "Kundan", model: "Jhumka", noun: "bridal earrings", base: 22000, keywords: ["kundan", "earrings", "bridal", "jewelry", "traditional"] },
    { brand: "Platinum", model: "Band", noun: "wedding band ring", base: 40000, keywords: ["platinum", "ring", "band", "jewelry", "wedding"] },
    { brand: "Emerald", model: "Bangle", noun: "gemstone bracelet", base: 65000, keywords: ["emerald", "bracelet", "gemstone", "jewelry", "gold"] },
  ],
  collectibles: [
    { brand: "Hot Wheels", model: "Redline", noun: "vintage die-cast car", base: 8000, keywords: ["toy", "diecast", "car", "collectible", "vintage"], era: "1960s" },
    { brand: "Harry Potter", model: "First Edition", noun: "first edition hardcover book", base: 45000, keywords: ["book", "first edition", "collectible", "hardcover", "rare"], era: "1990s" },
    { brand: "Amazing Spider-Man", model: "Comic", noun: "silver age comic book", base: 30000, keywords: ["comic", "marvel", "collectible", "book", "rare"], era: "1960s" },
    { brand: "Coca-Cola", model: "Tin Sign", noun: "enamel advertising sign", base: 6000, keywords: ["sign", "advertising", "collectible", "tin", "vintage"], era: "1950s" },
    { brand: "LEGO", model: "Millennium Falcon UCS", noun: "sealed collector set", base: 55000, keywords: ["lego", "star wars", "collectible", "set", "sealed"], era: "2010s" },
    { brand: "Beatles", model: "Abbey Road", noun: "first pressing vinyl LP record", base: 20000, keywords: ["vinyl", "record", "beatles", "collectible", "music"], era: "1960s" },
    { brand: "Kenner", model: "Star Wars", noun: "carded action figure", base: 12000, keywords: ["figure", "star wars", "collectible", "toy", "carded"], era: "1970s" },
    { brand: "Antique Brass", model: "Compass", noun: "marine navigation compass", base: 5000, keywords: ["compass", "brass", "antique", "collectible", "nautical"], era: "1900s" },
  ],
};

export const CONDITIONS = [
  { name: "Mint", mult: 1.25, weight: 1, text: "in mint condition with no visible wear" },
  { name: "Excellent", mult: 1.1, weight: 3, text: "in excellent condition with only light signs of use" },
  { name: "Good", mult: 1.0, weight: 4, text: "in good working condition with normal signs of use" },
  { name: "Fair", mult: 0.8, weight: 2, text: "in fair condition with visible wear but fully functional" },
  { name: "For parts", mult: 0.5, weight: 1, text: "sold as is for parts or repair" },
];

export const DESCRIPTION_OPENERS = [
  "Offering my {brand} {model} {noun}, {cond}.",
  "Up for auction is a {brand} {model} {noun} {cond}.",
  "Selling a genuine {brand} {model} {noun}, {cond}.",
  "Well kept {brand} {model} {noun} {cond}.",
];

export const DESCRIPTION_CLOSERS = [
  "Comes from a smoke free home and has been stored carefully.",
  "A great piece for collectors and enthusiasts alike.",
  "Ships securely packed; local pickup is also welcome.",
  "Would make a thoughtful gift for the right person.",
  "Bought years ago and rarely used since, ready for a new owner.",
  "Photos show the actual item; message with any questions.",
];
