// pages/api/suredone/get-item.js
// Fetches a single item from SureDone by SKU
// Updated: Returns ALL fields from SureDone headers

export default async function handler(req, res) {
  // Allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { sku } = req.query;

  if (!sku) {
    return res.status(400).json({ 
      success: false,
      error: 'SKU is required'
    });
  }

  try {
    const item = await getSureDoneItem(sku);
    
    if (item) {
      return res.status(200).json({
        success: true,
        item: item
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

  } catch (error) {
    console.error('SureDone get-item error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item',
      details: error.message
    });
  }
}

/**
 * Get a single item from SureDone by SKU
 * Uses /search/items/{query} endpoint which returns ALL fields
 */
async function getSureDoneItem(sku) {
  const SUREDONE_USER = process.env.SUREDONE_USER;
  const SUREDONE_TOKEN = process.env.SUREDONE_TOKEN;
  const SUREDONE_URL = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!SUREDONE_USER || !SUREDONE_TOKEN) {
    throw new Error('SureDone credentials not configured');
  }

  // Use /search/items/{query} endpoint with guid exact match
  const searchQuery = `guid:=${sku}`;
  const searchUrl = `${SUREDONE_URL}/search/items/${encodeURIComponent(searchQuery)}`;

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-user': SUREDONE_USER,
      'x-auth-token': SUREDONE_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`SureDone API error: ${response.status}`);
  }

  const data = await response.json();

  // Search returns array of items - find exact match
  if (data && typeof data === 'object') {
    // SureDone search returns results directly, not wrapped
    const items = Array.isArray(data) ? data : Object.values(data).filter(v => typeof v === 'object' && v.guid);
    
    if (items.length > 0) {
      // Find exact match
      const item = items.find(i => i.guid?.toLowerCase() === sku.toLowerCase()) || items[0];
      return formatItem(item);
    }
  }

  return null;
}

/**
 * Format item data - returns ALL fields from SureDone
 * Based on complete SureDone Headers CSV (305 core fields)
 */
function formatItem(item) {
  if (!item) return null;

  // Count images
  let imageCount = 0;
  for (let i = 1; i <= 12; i++) {
    if (item[`media${i}`]) imageCount++;
  }

  // Return ALL core SureDone fields
  return {
    // ========== Core Identifiers ==========
    sku: item.sku || item.guid || '',
    guid: item.guid || item.sku || '',
    stock: item.stock || '0',
    price: item.price || '',
    title: item.title || '',
    
    // ========== Basic Info ==========
    brand: item.brand || '',
    manufacturer: item.manufacturer || '',
    mpn: item.mpn || '',
    partnumber: item.partnumber || '',
    model: item.model || '',
    upc: item.upc || '',
    gtin: item.gtin || '',
    condition: item.condition || '',
    usertype: item.usertype || '',
    style: item.style || '',
    size: item.size || '',
    color: item.color || '',
    other: item.other || '',
    notes: item.notes || '',
    
    // ========== Descriptions ==========
    longdescription: item.longdescription || '',
    shortdescription: item.shortdescription || '',
    
    // ========== Shipping/Dimensions ==========
    weight: item.weight || '',
    boxlength: item.boxlength || '',
    boxwidth: item.boxwidth || '',
    boxheight: item.boxheight || '',
    boxweight: item.boxweight || '',
    boxshape: item.boxshape || '',
    length: item.length || '',
    width: item.width || '',
    height: item.height || '',
    depth: item.depth || '',
    diameter: item.diameter || '',
    dimensions: item.dimensions || '',
    totalheight: item.totalheight || '',
    shelf: item.shelf || '',
    
    // ========== eBay Categories & Profiles ==========
    ebaycatid: item.ebaycatid || '',
    ebaystoreid: item.ebaystoreid || '',
    ebaystoreid2: item.ebaystoreid2 || '',
    ebaypaymentprofileid: item.ebaypaymentprofileid || '',
    ebayreturnprofileid: item.ebayreturnprofileid || '',
    ebayshippingprofileid: item.ebayshippingprofileid || '',
    ebaytemplate: item.ebaytemplate || '',
    ebaybuyitnow: item.ebaybuyitnow || '',
    ebayid: item.ebayid || '',
    ebayconditiondescriptors: item.ebayconditiondescriptors || '',
    
    // ========== Electrical Specifications ==========
    voltage: item.voltage || '',
    inputvoltage: item.inputvoltage || '',
    outputvoltage: item.outputvoltage || '',
    voltagerating: item.voltagerating || '',
    voltagecompatibility: item.voltagecompatibility || '',
    actualvoltageratingac: item.actualvoltageratingac || '',
    actualvoltageratingdc: item.actualvoltageratingdc || '',
    nominalvoltageratingac: item.nominalvoltageratingac || '',
    nominalratedinputvoltage: item.nominalratedinputvoltage || '',
    actualratedinputvoltage: item.actualratedinputvoltage || '',
    dcvoltagerange: item.dcvoltagerange || '',
    supplyvoltage: item.supplyvoltage || '',
    coilvoltage: item.coilvoltage || '',
    amperage: item.amperage || '',
    inputamperage: item.inputamperage || '',
    outputamperage: item.outputamperage || '',
    amperagerange: item.amperagerange || '',
    current: item.current || '',
    currentrating: item.currentrating || '',
    nominalcurrentrating: item.nominalcurrentrating || '',
    currenttype: item.currenttype || '',
    maxinputcurrent: item.maxinputcurrent || '',
    fullloadamps: item.fullloadamps || '',
    stallcurrent: item.stallcurrent || '',
    phase: item.phase || '',
    numberofphases: item.numberofphases || '',
    powerphase: item.powerphase || '',
    hz: item.hz || '',
    frequency: item.frequency || '',
    powerfrequency: item.powerfrequency || '',
    outputhz: item.outputhz || '',
    watts: item.watts || '',
    watt: item.watt || '',
    maxwattage: item.maxwattage || '',
    kw: item.kw || '',
    kva: item.kva || '',
    powerrating: item.powerrating || '',
    ratedpower: item.ratedpower || '',
    nominalpowerrating: item.nominalpowerrating || '',
    outputpower: item.outputpower || '',
    
    // ========== Motor Specifications ==========
    horsepower: item.horsepower || '',
    ratedloadhp: item.ratedloadhp || '',
    spindlehorsepower: item.spindlehorsepower || '',
    rpm: item.rpm || '',
    baserpm: item.baserpm || '',
    noloadrpm: item.noloadrpm || '',
    highestspindlespeedrpm: item.highestspindlespeedrpm || '',
    torque: item.torque || '',
    stalltorque: item.stalltorque || '',
    ratedfullloadtorque: item.ratedfullloadtorque || '',
    contstalltorqueinlb: item.contstalltorqueinlb || '',
    nm: item.nm || '',
    frame: item.frame || '',
    motortype: item.motortype || '',
    enclosuretype: item.enclosuretype || '',
    insulationclass: item.insulationclass || '',
    nemadesignletter: item.nemadesignletter || '',
    fullstepangle: item.fullstepangle || '',
    dcstatorwindingtype: item.dcstatorwindingtype || '',
    reversiblenonreversible: item.reversiblenonreversible || '',
    
    // ========== Drive/Speed Control ==========
    ratio: item.ratio || '',
    gearratio: item.gearratio || '',
    
    // ========== Pneumatic/Hydraulic Specifications ==========
    psi: item.psi || '',
    maxpsi: item.maxpsi || '',
    maxbar: item.maxbar || '',
    maxmpa: item.maxmpa || '',
    mpa: item.mpa || '',
    pressure: item.pressure || '',
    maxpressure: item.maxpressure || '',
    maximumpressure: item.maximumpressure || '',
    ratedpressure: item.ratedpressure || '',
    maxoperatingpressure: item.maxoperatingpressure || '',
    maxfluidpressure: item.maxfluidpressure || '',
    portsize: item.portsize || '',
    portdiameter: item.portdiameter || '',
    bore: item.bore || '',
    borediameter: item.borediameter || '',
    stroke: item.stroke || '',
    strokelength: item.strokelength || '',
    flowrate: item.flowrate || '',
    gpm: item.gpm || '',
    maximumairflow: item.maximumairflow || '',
    cylinderaction: item.cylinderaction || '',
    cylindertype: item.cylindertype || '',
    hydraulicpumptype: item.hydraulicpumptype || '',
    pumpaction: item.pumpaction || '',
    reservoircapacity: item.reservoircapacity || '',
    actuation: item.actuation || '',
    actuatortype: item.actuatortype || '',
    numberofways: item.numberofways || '',
    
    // ========== Control/Automation Specifications ==========
    controllerplatform: item.controllerplatform || '',
    processor: item.processor || '',
    communications: item.communications || '',
    communicationstandard: item.communicationstandard || '',
    series: item.series || '',
    revision: item.revision || '',
    version: item.version || '',
    firmwarerevision: item.firmwarerevision || '',
    fwrevision: item.fwrevision || '',
    rev: item.rev || '',
    controltype: item.controltype || '',
    controlinput: item.controlinput || '',
    analoginput: item.analoginput || '',
    analogdigital: item.analogdigital || '',
    interfacetype: item.interfacetype || '',
    connectiontype: item.connectiontype || '',
    connectionsize: item.connectionsize || '',
    
    // ========== Sensor Specifications ==========
    sensingrange: item.sensingrange || '',
    operatingdistance: item.operatingdistance || '',
    sensortype: item.sensortype || '',
    sensingtechnology: item.sensingtechnology || '',
    outputtype: item.outputtype || '',
    outputvdc: item.outputvdc || '',
    ouputvoltage: item.ouputvoltage || '',
    responsetime: item.responsetime || '',
    minobjsize: item.minobjsize || '',
    sensibleobject: item.sensibleobject || '',
    beamgap: item.beamgap || '',
    guardedarea: item.guardedarea || '',
    actualfieldofview: item.actualfieldofview || '',
    sensitivityvdcmm: item.sensitivityvdcmm || '',
    
    // ========== Switch/Relay Specifications ==========
    numberofpoles: item.numberofpoles || '',
    numberofcircuits: item.numberofcircuits || '',
    contactmaterial: item.contactmaterial || '',
    switchaction: item.switchaction || '',
    actiontype: item.actiontype || '',
    trippingtype: item.trippingtype || '',
    resetactuatortype: item.resetactuatortype || '',
    
    // ========== Mechanical Specifications ==========
    shaftdiameter: item.shaftdiameter || '',
    shaftinput: item.shaftinput || '',
    rotation: item.rotation || '',
    dynamicloadrating: item.dynamicloadrating || '',
    load: item.load || '',
    capacity: item.capacity || '',
    liftcapacity: item.liftcapacity || '',
    loadcapacitylbs: item.loadcapacitylbs || '',
    capacitymaxweight: item.capacitymaxweight || '',
    liftheight: item.liftheight || '',
    maximummastliftheight: item.maximummastliftheight || '',
    loweredmastliftheight: item.loweredmastliftheight || '',
    platformheight: item.platformheight || '',
    overalllength: item.overalllength || '',
    displacement: item.displacement || '',
    pipesize: item.pipesize || '',
    npt: item.npt || '',
    thread: item.thread || '',
    terminationtype: item.terminationtype || '',
    mountingtype: item.mountingtype || '',
    mountingstyle: item.mountingstyle || '',
    mount: item.mount || '',
    compatiblemountingtype: item.compatiblemountingtype || '',
    
    // ========== Material/Construction ==========
    material: item.material || '',
    construction: item.construction || '',
    constuction: item.constuction || '',
    body: item.body || '',
    bodytype: item.bodytype || '',
    bodymaterial: item.bodymaterial || '',
    bladematerial: item.bladematerial || '',
    ventilationtype: item.ventilationtype || '',
    
    // ========== Equipment/Machine Specifications ==========
    equipmenttype: item.equipmenttype || '',
    equipmentmake: item.equipmentmake || '',
    toolmodel: item.toolmodel || '',
    make: item.make || '',
    robottype: item.robottype || '',
    roboticscontrolstype: item.roboticscontrolstype || '',
    payload: item.payload || '',
    axis: item.axis || '',
    cycles: item.cycles || '',
    increment: item.increment || '',
    resolver: item.resolver || '',
    tablelength: item.tablelength || '',
    tablewidth: item.tablewidth || '',
    xaxistravelbed: item.xaxistravelbed || '',
    yaxistravelbed: item.yaxistravelbed || '',
    zaxistravelbed: item.zaxistravelbed || '',
    suitablefor: item.suitablefor || '',
    compatibleequipmenttype: item.compatibleequipmenttype || '',
    
    // ========== Transformer Specifications ==========
    primaryinput: item.primaryinput || '',
    primaryvoltageratingac: item.primaryvoltageratingac || '',
    primarycurrentrating: item.primarycurrentrating || '',
    secondaryoutput: item.secondaryoutput || '',
    secondaryvoltageratingac: item.secondaryvoltageratingac || '',
    secondarycurrentrating: item.secondarycurrentrating || '',
    turnsratio: item.turnsratio || '',
    minimumoperatingfrequency: item.minimumoperatingfrequency || '',
    maximumoperatingfrequency: item.maximumoperatingfrequency || '',
    conversionfunction: item.conversionfunction || '',
    currentconversion: item.currentconversion || '',
    
    // ========== Fan/Blower Specifications ==========
    fanblowertype: item.fanblowertype || '',
    axialfanbearingtype: item.axialfanbearingtype || '',
    
    // ========== Other Specifications ==========
    application: item.application || '',
    features: item.features || '',
    unittype: item.unittype || '',
    parttype: item.parttype || '',
    outlets: item.outlets || '',
    outlettype: item.outlettype || '',
    numberofoutlets: item.numberofoutlets || '',
    cable: item.cable || '',
    screensize: item.screensize || '',
    tension: item.tension || '',
    pulsesperrevolution: item.pulsesperrevolution || '',
    maximumamperage: item.maximumamperage || '',
    switchingfrequency: item.switchingfrequency || '',
    dischargeopening: item.dischargeopening || '',
    numberofrods: item.numberofrods || '',
    suitablemedia: item.suitablemedia || '',
    bundlelisting: item.bundlelisting || '',
    rmin: item.rmin || '',
    shape: item.shape || '',
    angle: item.angle || '',
    
    // ========== Date/Reference Fields ==========
    serialnumber: item.serialnumber || '',
    datecode: item.datecode || '',
    mfgdate: item.mfgdate || '',
    modelyear: item.modelyear || '',
    replaces: item.replaces || '',
    
    // ========== Equipment-specific ==========
    forklifttype: item.forklifttype || '',
    tiretype: item.tiretype || '',
    hours: item.hours || '',
    attachmentmodel: item.attachmentmodel || '',
    fueltype: item.fueltype || '',
    powersource: item.powersource || '',
    tonnage: item.tonnage || '',
    refrigerant: item.refrigerant || '',
    emptyweight: item.emptyweight || '',
    bussinput: item.bussinput || '',
    centrifugalpumptype: item.centrifugalpumptype || '',
    countryoforigin: item.countryoforigin || '',
    countryregionofmanufacture: item.countryregionofmanufacture || '',
    countryregionofmanufactur: item.countryregionofmanufactur || '',
    modifieditem: item.modifieditem || '',
    indicatortype: item.indicatortype || '',
    measuredparameters: item.measuredparameters || '',
    gpu: item.gpu || '',
    graphicsprocessingtype: item.graphicsprocessingtype || '',
    chipsetgpumodel: item.chipsetgpumodel || '',
    connectivity: item.connectivity || '',
    
    // ========== Images ==========
    media1: item.media1 || '',
    media2: item.media2 || '',
    media3: item.media3 || '',
    media4: item.media4 || '',
    media5: item.media5 || '',
    media6: item.media6 || '',
    media7: item.media7 || '',
    media8: item.media8 || '',
    media9: item.media9 || '',
    media10: item.media10 || '',
    media11: item.media11 || '',
    media12: item.media12 || '',
    mediax: item.mediax || '',
    media1alttext: item.media1alttext || '',
    media2alttext: item.media2alttext || '',
    media3alttext: item.media3alttext || '',
    media4alttext: item.media4alttext || '',
    media5alttext: item.media5alttext || '',
    media6alttext: item.media6alttext || '',
    media7alttext: item.media7alttext || '',
    media8alttext: item.media8alttext || '',
    media9alttext: item.media9alttext || '',
    media10alttext: item.media10alttext || '',
    media11alttext: item.media11alttext || '',
    media12alttext: item.media12alttext || '',
    thumbnail: item.media1 || null,
    imageCount: imageCount,
    
    // ========== BigCommerce Fields ==========
    bigcommerceid: item.bigcommerceid || '',
    bigcommerceproductid: item.bigcommerceproductid || ''
  };
}
