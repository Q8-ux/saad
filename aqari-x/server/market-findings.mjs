// Factual research notes, not copies of advertisements. No advertiser contacts or media.
// observedAt is the research date, never the source publication date.
const observedAt = '2026-10-24T13:18:00.000Z';
const q = (id, slug, type, category, location, governorate, price, area=null, bedrooms=null, bathrooms=null) => ({
  id: `market-4sale-${id}`, source: '4Sale', sourceId: String(id),
  sourceUrl: `https://www.q84sale.com/ar/listing/${slug}-${id}`,
  evidenceKind: 'search-index', type, category, location, governorate,
  priceFils: price == null ? null : price * 1000, area, bedrooms, bathrooms,
});
const s = (id, slug, location, governorate, price, area=null, bedrooms=null, bathrooms=null) => ({
  id: `market-sakan-${id}`, source: 'سكن', sourceId: String(id),
  sourceUrl: `https://sakan.co/ar/property/details/${id}-${encodeURIComponent(slug)}`,
  evidenceKind: 'public-page', type: 'شقة', category: 'للإيجار', location, governorate,
  priceFils: price * 1000, area, bedrooms, bathrooms,
});
export const marketFindings = [
  q(21217150,'apartment-for-rent','شقة','للإيجار','جابر الأحمد — قطعة 7','العاصمة',320,130,3),
  q(21225881,'apartment-for-rent','شقة','للإيجار','العارضية','الفروانية',300,140,3),
  q(21220448,'apartment-for-rent','شقة','للإيجار','سلوى — قطعة 6','حولي',230),
  q(21219445,'furnished-apartment','شقة','للإيجار','صباح السالم','مبارك الكبير',360,null,2,2),
  q(21231971,'apartment-for-rent','شقة','للإيجار','الصباحية — قطعة 4','الأحمدي',350,null,3),
  q(21214571,'apartment-for-rent','شقة','للإيجار','جابر الأحمد — قطعة 5','العاصمة',350,null,3,3),
  q(21278902,'apartment-for-rent','شقة','للإيجار','محافظة مبارك الكبير — المنطقة غير محددة','مبارك الكبير',450,null,3,3),
  q(21261558,'apartment-for-rent','شقة','للإيجار','الواحة','الجهراء',200),
  q(21220241,'house-for-sale','بيت','للبيع','عبدالله المبارك','الفروانية',350000),
  q(21289801,'house-for-sale','بيت','للبيع','جابر الأحمد — قطعة 6','العاصمة',350000),
  q(21189547,'house-for-sale','بيت','للبيع','بيان','حولي',300000,300),
  q(21200702,'house-for-sale','فيلا','للبيع','الخيران السكنية — قطعة 2','الأحمدي',260000),
  q(21212349,'house-for-sale','فيلا','للبيع','الشهداء — قطعة 5','حولي',535000,400),
  q(21208985,'house-for-sale','فيلا','للبيع','كيفان — قطعة 2','العاصمة',680000,500),
  q(21189365,'building-or-floors','عمارة','للبيع','خيطان','الفروانية',1000000),
  q(21130266,'office','مكتب','للإيجار','المباركية','العاصمة',250),
  q(20817461,'office','مكتب','للإيجار','حولي','حولي',260,16),
  q(21223102,'office','مكتب','للإيجار','شرق','العاصمة',1250,120),
  q(21193106,'shop-for-rent','محل','للإيجار','حولي','حولي',1200),
  q(21193038,'shop-for-rent','محل','للإيجار','الضجيج — قطعة 1','الفروانية',3000,200),
  q(21171334,'land','أرض','للبيع','السلام — قطعة 1','حولي',480000),
  q(21211619,'land','أرض','للبيع','صباح الأحمد البحرية — المرحلة الثالثة','الأحمدي',300000,536),
  q(21210868,'land','أرض','للبيع','صباح الأحمد البحرية — المرحلة الرابعة','الأحمدي',285000,478),
  q(21224337,'residential-lands','أرض','للبدل','خيطان الجنوبي','الفروانية',null,400),
  s(163667,'شقة-سكنية-للإيجار-في-حولي-منطقة-الصديق','الصديق','حولي',570,null,3,null),
  s(163655,'شقة-سكني-للإيجار-في-الجابرية','الجابرية','حولي',460,120,3,2),
  s(163673,'شقة-سكنية-للإيجار-في-مبارك-الكبير-الفنيطيس','الفنيطيس','مبارك الكبير',450,null,3,3),
  s(163670,'شقه-للايجار-في-الفنطاس','الفنطاس','الأحمدي',470,null,3,4),
  s(163712,'شقة-سكني-للإيجار-في-حولي-السالمية-قطعة-11','السالمية — قطعة 11','حولي',650,null,4,4),
].map((p, i) => ({
  ...p,
  title: `${p.type} ${p.category} في ${p.location}`,
  description: 'ملخص مواصفات من رصد السوق لأغراض التجربة. يحتاج السعر والتوفر والتفويض تأكيداً من المكتب.',
  status: 'reference', ownerType: 'external', sourceKind: 'market-research',
  observedAt, createdAt: new Date(Date.parse(observedAt) - i * 1000).toISOString(),
  sourcePublishedAt: ['163655','163667'].includes(p.sourceId) ? '2026-10-19' : null,
  availabilityVerified: false, marketingAuthorized: false,
  mediaRights: 'not-confirmed', features: [], images: [], videos: [],
  priceBasis: p.category === 'للبدل' ? 'exchange_difference' : p.category === 'للإيجار' ? 'monthly' : 'total',
  researchNote: p.sourceId === '163667' ? 'عدد الحمامات متعارض بين وصف المصدر وملخصه؛ لم يعتمد.' : '',
}));

export const marketResearch = {
  observedAt, exhaustive: false, count: marketFindings.length,
  scope: 'Kuwait', method: 'Public search results and source pages; no crawling or media copying.',
  excluded: ['Sakan 161090: source explicitly says no longer available', 'Nominal or conflicting prices: omitted', 'Mixed related-result snippets: omitted'],
  sources: [
    {name:'4Sale',url:'https://www.q84sale.com/ar/property',termsUrl:'https://www.q84sale.com/en/terms-and-conditions',state:'indexed-only',count:marketFindings.filter(p=>p.source==='4Sale').length},
    {name:'سكن',url:'https://sakan.co/ar',termsUrl:'https://sakan.co/ar/terms-and-conditions',state:'permission-required-for-media',count:marketFindings.filter(p=>p.source==='سكن').length},
    {name:'السوق المفتوح',url:'https://kw.opensooq.com/ar/عقارات',termsUrl:'https://kw.opensooq.com/en/termOfUse',state:'automated-extraction-restricted',count:0},
  ],
};
