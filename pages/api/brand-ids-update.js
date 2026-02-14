// =============================================================================
// CONSOLIDATED BigCommerce Brand ID Mappings for suredone-create-listing.js
// Updated: February 14, 2026
// Total entries: 238 lookup keys → ~200 unique brand families
// =============================================================================
//
// SEO DECISIONS:
// - "Oriental Motor" not "Oriental Motor Co. LTD" (shorter = better for search)
// - "Allen-Bradley" with hyphen (official branding, most searched form)
// - "Schneider Electric" not "Schneider" alone (full name ranks better)
// - "IFM" not "ifm efector" (consolidated brand, IFM is universal)
// - "Pepperl+Fuchs" with plus sign (official branding)
// - "SEW-Eurodrive" with hyphen (official format)
// - "Bosch Rexroth" not "Mannesmann Rexroth" (current name since 2001)
// - "Bodine Electric" not "Bodine Electric Company" (shorter)
// - Duplicate BigCommerce entries consolidated to lowest/primary ID
// - Misspellings removed (e.g., "Stober Antriebstechink", "Littlefuse")
//
// USAGE: getBrandId() lowercases the input and looks up in this map.
// Multiple keys can point to the same ID to catch common variations.
// =============================================================================

const BRAND_IDS = {

  // === A ===
  'abb': '86',
  'acme': '206',
  'acme electric': '4632',
  'acme transformer': '4488',
  'aeg': '719',
  'aeg/modicon': '204',
  'allen bradley': '40',
  'allen-bradley': '40',
  'ametek': '142',
  'amci': '887',
  'anaheim automation': '288',
  'appleton': '749',
  'applied motion': '889',
  'applied motion products': '889',
  'asco': '298',
  'ashcroft': '4113',
  'automation direct': '286',
  'automationdirect': '286',
  'automation direct stride': '695',
  'autonics': '649',
  'avtron': '4351',

  // === B ===
  'b&r': '97',
  'b&r automation': '97',
  'br automation': '97',
  'baldor': '92',
  'baldor reliance': '4626',
  'balluff': '230',
  'banner': '73',
  'banner engineering': '73',
  'barksdale': '240',
  'baumer': '813',
  'baumer electric': '813',
  'beckhoff': '76',
  'bei': '232',
  'bei industrial encoders': '232',
  'beijer': '4350',
  'beijer electronics': '4350',
  'benshaw': '5274',
  'bernstein': '739',
  'bimba': '196',
  'bodine': '236',
  'bodine electric': '236',
  'bonfiglioli': '244',
  'bosch': '168',
  'bosch rexroth': '807',
  'boston gear': '237',
  'browning': '235',
  'burkert': '299',
  'bussmann': '68',
  'cooper bussmann': '42',

  // === C ===
  'carlo gavazzi': '285',
  'ckd': '157',
  'clippard': '278',
  'cognex': '170',
  'control techniques': '4501',
  'cosel': '856',
  'crouse-hinds': '308',
  'crouzet': '370',
  'crydom': '4203',
  'cutler hammer': '72',
  'cutler-hammer': '72',

  // === D ===
  'danfoss': '335',
  'dart controls': '756',
  'datalogic': '319',
  'dayton': '337',
  'destaco': '334',
  'di-soric': '5362',
  'dodge': '140',
  'dunkermotoren': '4264',
  'dwyer': '327',
  'dwyer instruments': '322',
  'dynapar': '317',

  // === E ===
  'eaton': '329',
  'eaton cutler hammer': '331',
  'eaton moeller': '5561',
  'emerson': '355',
  'encoder products': '4239',
  'enerpac': '346',
  'euchner': '5308',

  // === F ===
  'fanuc': '118',
  'ferraz shawmut': '61',
  'festo': '44',
  'finder': '4546',
  'fuji': '84',
  'fuji electric': '84',

  // === G ===
  'ge': '88',
  'general electric': '88',
  'ge fanuc': '342',
  'ge-fanuc': '342',
  'ge motors': '5486',
  'gimatic': '4294',
  'graco': '156',

  // === H ===
  'hammond': '381',
  'hammond manufacturing': '4726',
  'harting': '4301',
  'heidenhain': '385',
  'hengstler': '4391',
  'hevi-duty': '4731',
  'hitachi': '396',
  'hiwin': '5097',
  'hoffman': '380',
  'honeywell': '382',
  'hubbell': '395',
  'humphrey': '390',

  // === I ===
  'iai': '150',
  'iai corporation': '121',
  'idec': '391',
  'ifm': '4114',
  'ifm efector': '4114',
  'ifm electronic': '4114',
  'ina': '388',
  'ina bearings': '388',

  // === K ===
  'kb electronics': '425',
  'keyence': '47',
  'klockner moeller': '750',
  'kollmorgen': '4157',
  'koyo': '593',
  'kuka': '4642',

  // === L ===
  'lambda': '581',
  'leeson': '655',
  'lenze': '918',
  'leroy somer': '663',
  'leroy-somer': '663',
  'leuze': '4853',
  'leuze electronic': '4853',
  'leviton': '4421',
  'lincoln electric': '4663',
  'littelfuse': '62',
  'lumberg': '4686',

  // === M ===
  'macromatic': '751',
  'magnecraft': '4454',
  'maple systems': '4099',
  'marathon': '910',
  'marathon electric': '4637',
  'mean well': '427',
  'mersen': '5487',
  'minarik': '829',
  'minarik drives': '829',
  'mitsubishi': '158',
  'mitsubishi electric': '437',
  'modicon': '446',
  'moeller': '451',
  'moxa': '4274',
  'murr elektronik': '456',

  // === N ===
  'nachi': '462',
  'nidec': '4352',
  'nord': '455',
  'nord drivesystems': '455',
  'nordson': '119',
  'norgren': '465',
  'nsk': '457',
  'nsk bearings': '457',
  'ntn': '463',
  'ntn bearings': '463',
  'numatics': '440',

  // === O ===
  'omron': '39',
  'opto 22': '4220',
  'oriental motor': '200',

  // === P ===
  'panasonic': '478',
  'parker': '89',
  'parker hannifin': '89',
  'patlite': '479',
  'pepperl+fuchs': '477',
  'pepperl fuchs': '477',
  'pfannenberg': '4693',
  'phoenix contact': '192',
  'pilz': '504',
  'pizzato': '5549',
  'power one': '513',
  'power-one': '513',
  'pro-face': '529',
  'proface': '529',
  'prosoft': '5212',
  'prosense': '4480',
  'puls': '524',
  'puls dimension': '524',

  // === R ===
  'red lion': '43',
  'red lion controls': '4555',
  'reliance': '93',
  'reliance electric': '93',
  'renishaw': '519',
  'rexnord': '711',
  'rexroth': '87',
  'rexroth indramat': '4865',
  'rhino': '676',
  'rhino automation direct': '5385',
  'rittal': '850',
  'rockwell': '540',
  'rockwell automation': '540',
  'ross': '509',
  'ross controls': '509',

  // === S ===
  'saftronics': '650',
  'sanyo denki': '507',
  'schmersal': '526',
  'schneider': '521',
  'schneider electric': '521',
  'schneider automation': '497',
  'schunk': '166',
  'sew eurodrive': '153',
  'sew-eurodrive': '153',
  'sick': '49',
  'siemens': '46',
  'skf': '541',
  'smc': '56',
  'sola': '565',
  'sola hevi-duty': '5307',
  'spectrum controls': '5288',
  'sprecher+schuh': '562',
  'sprecher schuh': '562',
  'square d': '141',
  'staubli': '5343',
  'stober': '5328',
  'sumitomo': '559',
  'sunx': '143',

  // === T ===
  'tdk lambda': '581',
  'tdk-lambda': '581',
  'teco': '4194',
  'telemecanique': '52',
  'thk': '621',
  'timken': '599',
  'toshiba': '144',
  'tri-tronics': '622',
  'tsubaki': '145',
  'turck': '75',

  // === U ===
  'us motors': '4564',

  // === V ===
  'vacon': '4339',
  'vexta': '489',
  'vickers': '137',

  // === W ===
  'wago': '50',
  'watlow': '826',
  'weg': '264',
  'weidmuller': '262',
  'wenglor': '5510',
  'werma': '263',
  'wittenstein': '643',

  // === Y ===
  'yaskawa': '82',
  'yaskawa electric': '82',
  'yokogawa': '148',
};
