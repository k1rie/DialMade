// Conceptos de audiencia/dominio para cruzar «Do Not Use For» (styles.csv) con los tipos de producto.
// `avoid` se prueba contra cada frase de «Do Not Use For»; `product` contra «nombre + keywords» del producto,
// o solo contra el nombre si `nameOnly` (cuando las keywords dan falsos positivos: «portfolio» de inversión, «hospitality»…).
// Solo cuentan los conceptos que se reconocen en ambos lados: si una frase no encaja en ninguno, se ignora.
export const AUDIENCE_CONCEPTS = [
  {
    id: "finance",
    avoid: /\bfinanc|banking|fintech|accounting|trading/,
    product: /financ|\bbank|fintech|crypto|invoice|billing|insurance|expense|crowdfunding|web3|\bnft\b|budget/,
    nameOnly: true,
  },
  {
    id: "health",
    avoid: /health|medical/,
    product: /health|medical|clinic|patient|dental|pharma|telemedicine|veterinar|senior|elderly|medication|\bhospitals?\b/,
    nameOnly: true,
  },
  {
    id: "government",
    avoid: /government|public service|civic/,
    product: /government|civic|public service|municipal|citizen|\bgrant\b/,
  },
  {
    id: "legal",
    avoid: /\blegal\b/,
    product: /\blegal\b|\blaw\b|attorney|e-signature|patent/,
  },
  {
    id: "conservative",
    avoid: /conservative|formal business|formal corporate|serious\/medical|calm trust|needing trust|trust signals/,
    product: /\bbank|insurance|\blegal\b|government|civic|medical|clinic|pharma|dental|senior|patient|telemedicine|accounting|religious|church/,
  },
  {
    id: "enterprise",
    avoid: /corporate|enterprise|professional services|customer-facing professional|business apps|serious tools|professional tools|b2b/,
    product: /\bb2b\b|enterprise|corporate|consulting|\bcrm\b|\berp\b|inventory|automation|e-signature|invoice/,
  },
  {
    id: "elderly",
    avoid: /elderly/,
    product: /senior|elderly/,
  },
  {
    id: "children",
    avoid: /child|\bkids\b|family apps/,
    product: /child|\bkids?\b|daycare|\bbaby\b|parenting|family/,
  },
  {
    id: "data",
    avoid: /dashboard|data-heavy|data-critical|data tables|data grids|data interfaces|data-entry|data entry|dense data|high-density data|data-heavy screens|real-time data|real-time monitoring|complex apps|complex workflows/,
    product: /dashboard|analytics|\bcrm\b|inventory|monitor|status page|incident|automation|fleet|feature flag/,
    nameOnly: true,
  },
  {
    id: "gaming",
    avoid: /gaming|\bgames?\b/,
    product: /\bgames?\b|gaming|esports|arcade|puzzle|trivia/,
  },
  {
    id: "entertainment",
    avoid: /entertainment|video platforms/,
    product: /entertainment|streaming|\bmusic\b|podcast|theater|cinema|\bgames?\b|gaming|meme|wallpaper/,
  },
  {
    id: "luxury",
    avoid: /luxury|premium/,
    product: /luxury|premium|high-end|exclusive/,
  },
  {
    id: "commerce",
    avoid: /e-commerce|ecommerce/,
    product: /e-commerce|ecommerce|\bshop\b|\bstore\b|retail|marketplace|subscription box|grocery|auction|classifieds|digital products/,
  },
  {
    id: "tech",
    avoid: /tech-focused|tech startups|modern tech|\bsaas\b/,
    product: /\bsaas\b|micro-saas|software|developer|\bapi\b|\bide\b|devtool|\bcloud\b|no-code|low-code|feature flag|status page|changelog|open source|cybersecurity|\bai\b|chatbot/,
  },
  {
    id: "creative",
    avoid: /portfolio|artistic/,
    product: /portfolio|creative|artist|\bart\b|gallery|photograph/,
    nameOnly: true,
  },
  {
    id: "playful",
    avoid: /playful/,
    product: /playful|\bfun\b|\bkids?\b|\bgames?\b|casual|meme|sticker/,
  },
  {
    id: "accessibility",
    avoid: /critical accessibility|accessibility-critical|accessibility-first|accessibility-required|high-contrast required|accessible public services|high-accessibility|maximum contrast|a11y/,
    product: /government|civic|healthcare|mental health|medical|clinic|patient|senior|elderly|emergency|pharma|telemedicine|medication|\bbank|insurance|public service|\bgrant\b|\blegal\b/,
    nameOnly: true,
  },
  {
    id: "reading",
    avoid: /long-form|text-heavy|content-heavy|reading heavy|dense reading|editorial reading|blogs|technical documentation/,
    product: /\bblog|magazine|\bnews\b|journal|documentation|knowledge base|\bwiki\b|academic|newsletter|changelog|research|\bbooks?\b/,
    nameOnly: true,
  },
  {
    id: "forms",
    avoid: /\bforms\b|data entry|data-entry/,
    product: /form builder|survey|e-signature|invoice|insurance|government portal|\bgrant\b|resume|booking/,
  },
  {
    id: "energetic",
    avoid: /nightlife|high-energy/,
    product: /sports|fitness|\bgym\b|esports|gaming|nightlife/,
  },
  {
    id: "industrial",
    avoid: /industrial|urban brands/,
    product: /industrial|construction|logistics|manufactur|automotive|\bdrone/,
  },
];

// Tipos de estilo cuyo «Do Not Use For» describe subtipos de dashboard, no audiencias: no se cruzan.
export const SKIPPED_STYLE_TYPES = new Set(["BI/Analytics", "Platform/System"]);
