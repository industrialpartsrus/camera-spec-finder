// =============================================================================
// ITEM SPECIFICS MAPPING CONFIGURATION
// =============================================================================
// This file defines how AI-extracted specs map to:
// 1. eBay item specifics (ebayitemspecifics* fields in SureDone)
// 2. Website/BigCommerce standardized fields (core fields in SureDone)
// Field names are EXACT matches from Suredone_Headers.csv
// =============================================================================

// -----------------------------------------------------------------------------
// STANDARDIZED WEBSITE FIELDS (60-70 core fields for BigCommerce/Website)
// These are clean, consistent fields for product filtering on your website
// -----------------------------------------------------------------------------
export const WEBSITE_STANDARD_FIELDS = [
  // === IDENTIFICATION ===
  'brand',
  'manufacturer',
  'mpn',
  'model',
  'partnumber',
  'series',
  'revision',
  'version',
  'usertype', // AI-generated descriptive type like "General Purpose Motor"

  // === ELECTRICAL - PRIMARY ===
  'voltage',
  'inputvoltage',
  'outputvoltage',
  'amperage',
  'inputamperage',
  'outputamperage',
  'phase',
  'hz',
  'watts',
  'kw',
  'kva',

  // === ELECTRICAL - SECONDARY ===
  'coilvoltage',
  'voltagerating',
  'currentrating',
  'fullloadamps',
  'frequency',

  // === MECHANICAL - MOTORS ===
  'horsepower',
  'rpm',
  'frame',
  'motortype',
  'torque',
  'enclosuretype',

  // === MECHANICAL - DIMENSIONS ===
  'length',
  'width',
  'height',
  'depth',
  'diameter',
  'shaftdiameter',
  'dimensions',

  // === MECHANICAL - OTHER ===
  'capacity',
  'flowrate',
  'gpm',
  'psi',
  'pressure',
  'maxpressure',
  'material',
  'construction',
  'mountingtype',

  // === CONTROL/AUTOMATION ===
  'controllerplatform',
  'processor',
  'communications',
  'interfacetype',
  'connectiontype',
  'sensortype',

  // === CONDITION/STATUS ===
  'condition',
  'application',
  'equipmenttype',
  'powersource',

  // === PHYSICAL ===
  'color',
  'size',
  'bodytype',
  'bodymaterial',

  // === OPERATIONAL ===
  'operatingdistance',
  'sensingrange',
  'ratio',
  'cycles',

  // === MISC ===
  'features',
  'countryoforigin',
  'countryregionofmanufacture'
];

// -----------------------------------------------------------------------------
// EBAY ITEM SPECIFICS MAPPING (EXACT field names from Suredone_Headers.csv)
// Maps common AI-extracted field names to their exact ebayitemspecifics* fields
// -----------------------------------------------------------------------------
export const EBAY_FIELD_MAPPING = {
  // === MOTORS - HORSEPOWER ===
  'horsepower': 'ebayitemspecificsmotorhorsepower',
  'hp': 'ebayitemspecificsmotorhorsepower',
  'motor horsepower': 'ebayitemspecificsmotorhorsepower',
  'rated horsepower': 'ebayitemspecificsratedhorsepower',
  'rated hp': 'ebayitemspecificsratedhorsepower',
  'rated load hp': 'ebayitemspecificsratedloadhp',
  'net horsepower': 'ebayitemspecificsnethorsepowerhp',
  'engine hp': 'ebayitemspecificsenginehp',

  // === MOTORS - RPM ===
  'rpm': 'ebayitemspecificsratedrpm',
  'rated rpm': 'ebayitemspecificsratedrpm',
  'base rpm': 'ebayitemspecificsbaserpm',
  'no load rpm': 'ebayitemspecificsnoloadrpm',
  'max rpm': 'ebayitemspecificsmaximumrpm',
  'maximum rpm': 'ebayitemspecificsmaximumrpm',
  'max no load rpm': 'ebayitemspecificsmaximumnoloadrpm',
  'max spindle speed': 'ebayitemspecificsmaxspindlespeedrpm',
  'spindle speed': 'ebayitemspecificshighestspindlespeedrpm',

  // === MOTORS - FRAME/CONSTRUCTION ===
  'frame': 'ebayitemspecificsnemaframesize',
  'nema frame': 'ebayitemspecificsnemaframesize',
  'frame size': 'ebayitemspecificsnemaframesize',
  'iec frame size': 'ebayitemspecificsiecframesize',
  'nema frame suffix': 'ebayitemspecificsnemaframesuffix',
  'service factor': 'ebayitemspecificsservicefactor',
  'insulation class': 'ebayitemspecificsinsulationclass',
  'nema design': 'ebayitemspecificsnemadesignletter',
  'nema design letter': 'ebayitemspecificsnemadesignletter',
  'motor type': 'ebayitemspecificsacmotortype',
  'ac motor type': 'ebayitemspecificsacmotortype',
  'special motor construction': 'ebayitemspecificsspecialmotorconstruction',
  'shaft angle': 'ebayitemspecificsshaftangle',
  'shaft orientation': 'ebayitemspecificsshaftorientation',
  'shaft type': 'ebayitemspecificsshafttype',

  // === VOLTAGE/ELECTRICAL ===
  'voltage': 'ebayitemspecificsratedvoltage',
  'rated voltage': 'ebayitemspecificsratedvoltage',
  'input voltage': 'ebayitemspecificsnominalinputvoltagerating',
  'nominal input voltage': 'ebayitemspecificsnominalinputvoltagerating',
  'output voltage': 'ebayitemspecificsouputvoltage',
  'output voltage ac': 'ebayitemspecificsoutputvoltageratingac',
  'output voltage dc': 'ebayitemspecificsoutputvoltageratingdc',
  'ac voltage': 'ebayitemspecificsacvoltagerating',
  'dc voltage': 'ebayitemspecificsdcvoltagerating',
  'coil voltage': 'ebayitemspecificscoilvoltagerating',
  'control voltage': 'ebayitemspecificscontrolvoltage',
  'supply voltage': 'ebayitemspecificssupplyvoltage',
  'operating voltage': 'ebayitemspecificsoperatingvoltage',
  'voltage range': 'ebayitemspecificsvoltagerange',
  'voltage rating ac': 'ebayitemspecificsvoltageratingac',
  'voltage rating dc': 'ebayitemspecificsvoltageratingdc',
  'voltage compatibility': 'ebayitemspecificsvoltagecompatibility',
  'input voltage range': 'ebayitemspecificsinputvoltagerange',
  'actual rated input voltage': 'ebayitemspecificsactualratedinputvoltage',
  'nominal voltage': 'ebayitemspecificsnominalvoltage',
  'nominal voltage dc': 'ebayitemspecificsnominalvoltageratingdc',

  // === CURRENT/AMPERAGE ===
  'amperage': 'ebayitemspecificsamps',
  'amps': 'ebayitemspecificsamps',
  'current': 'ebayitemspecificsactualcurrentrating',
  'current rating': 'ebayitemspecificsactualcurrentrating',
  'full load amps': 'ebayitemspecificsfullloadamps',
  'max input current': 'ebayitemspecificsmaxinputcurrent',
  'maximum input current': 'ebayitemspecificsmaximuminputcurrent',
  'max current output': 'ebayitemspecificsmaximumcurrentoutput',
  'max peak output current': 'ebayitemspecificsmaximumpeakoutputcurrent',
  'stall current': 'ebayitemspecificsstallcurrent',
  'no load current': 'ebayitemspecificsnoloadcurrent',
  'primary current rating': 'ebayitemspecificsprimarycurrentrating',
  'contact current rating': 'ebayitemspecificscontactcurrentrating',

  // === PHASE/FREQUENCY ===
  'phase': 'ebayitemspecificsacphase',
  'ac phase': 'ebayitemspecificsacphase',
  'current phase': 'ebayitemspecificscurrentphase',
  'power phase': 'ebayitemspecificspowerphase',
  'number of phases': 'ebayitemspecificsnumberofphases',
  'frequency': 'ebayitemspecificsacfrequencyrating',
  'ac frequency': 'ebayitemspecificsacfrequencyrating',
  'hz': 'ebayitemspecificsacfrequencyrating',
  'power frequency': 'ebayitemspecificspowerfrequency',
  'min operating frequency': 'ebayitemspecificsminimumoperatingfrequency',
  'max operating frequency': 'ebayitemspecificsmaximumoperatingfrequency',

  // === POWER ===
  'watts': 'ebayitemspecificswattage',
  'wattage': 'ebayitemspecificswattage',
  'power': 'ebayitemspecificspower',
  'power rating': 'ebayitemspecificspowerrating',
  'power rating w': 'ebayitemspecificspowerratingw',
  'power rating va': 'ebayitemspecificspowerratingva',
  'power w': 'ebayitemspecificspowerw',
  'power kw': 'ebayitemspecificspowerkw',
  'max wattage': 'ebayitemspecificsmaxwattage',
  'maximum wattage': 'ebayitemspecificsmaximumwattage',
  'rated power': 'ebayitemspecificsratedpower',
  'output power': 'ebayitemspecificsoutputpower',
  'max output power': 'ebayitemspecificsmaxoutputpower',
  'max output watts': 'ebayitemspecificsmaxoutputwatts',
  'rated output watts': 'ebayitemspecificsratedoutputwatts',
  'maximum power': 'ebayitemspecificsmaximumpower',

  // === TORQUE ===
  'torque': 'ebayitemspecificscontinuoustorque',
  'continuous torque': 'ebayitemspecificscontinuoustorque',
  'holding torque': 'ebayitemspecificsholdingtorque',
  'stall torque': 'ebayitemspecificsstalltorque',
  'rated torque': 'ebayitemspecificsratedfullloadtorque',
  'rated full load torque': 'ebayitemspecificsratedfullloadtorque',
  'starting torque': 'ebayitemspecificsstartinglockedrotortorque',
  'rpm at max torque': 'ebayitemspecificsrpmatmaximumtorque',

  // === PRESSURE/FLOW ===
  'pressure': 'ebayitemspecificsratedpressure',
  'rated pressure': 'ebayitemspecificsratedpressure',
  'max pressure': 'ebayitemspecificsmaximumpressure',
  'maximum pressure': 'ebayitemspecificsmaximumpressure',
  'operating pressure': 'ebayitemspecificsoperatingpressure',
  'max adjustable pressure': 'ebayitemspecificsmaximumadjustablepressure',
  'min adjustable pressure': 'ebayitemspecificsminimumadjustablepressure',
  'max output pressure': 'ebayitemspecificsmaximumoutputpressure',
  'psi': 'ebayitemspecificsmaxpsi',
  'max psi': 'ebayitemspecificsmaxpsi',
  'flow rate': 'ebayitemspecificsmaximumflowrate',
  'max flow rate': 'ebayitemspecificsmaximumflowrate',
  'min flow rate': 'ebayitemspecificsminimumflowrate',
  'max flow rating': 'ebayitemspecificsmaximumflowrating',
  'airflow': 'ebayitemspecificsairflowvolume',
  'airflow volume': 'ebayitemspecificsairflowvolume',
  'airflow cfm': 'ebayitemspecificsairflowvolumecfm',
  'cfm': 'ebayitemspecificsairflowvolumecfm',
  'max cfm': 'ebayitemspecificsmaxpowercfm',

  // === DIMENSIONS ===
  'length': 'ebayitemspecificsitemlength',
  'item length': 'ebayitemspecificsitemlength',
  'actual length': 'ebayitemspecificsactuallengthfeet',
  'width': 'ebayitemspecificsitemwidth',
  'item width': 'ebayitemspecificsitemwidth',
  'height': 'ebayitemspecificsitemheight',
  'item height': 'ebayitemspecificsitemheight',
  'depth': 'ebayitemspecificsitemdepth',
  'item depth': 'ebayitemspecificsitemdepth',
  'thickness': 'ebayitemspecificsitemthickness',
  'item thickness': 'ebayitemspecificsitemthickness',
  'weight': 'ebayitemspecificsitemweight',
  'item weight': 'ebayitemspecificsitemweight',
  'diameter': 'ebayitemspecificsitemdiameter',
  'item diameter': 'ebayitemspecificsitemdiameter',
  'blade diameter': 'ebayitemspecificsbladediameter',
  'wheel diameter': 'ebayitemspecificswheeldiameter',
  'bore diameter': 'ebayitemspecificsboresize',
  'bore size': 'ebayitemspecificsboresize',
  'bore': 'ebayitemspecificsboresize',
  'shaft diameter': 'ebayitemspecificsshaftdiameter',
  'inlet diameter': 'ebayitemspecificsinletdiameter',
  'outlet diameter': 'ebayitemspecificsoutletdiameter',
  'inlet port diameter': 'ebayitemspecificsinletportdiameter',
  'outlet port diameter': 'ebayitemspecificsoutletportdiameter',
  'port diameter': 'ebayitemspecificsportdiameter',
  'connection diameter': 'ebayitemspecificsconnectiondiameter',
  'inside diameter': 'ebayitemspecificsinsidediameter',
  'outside diameter': 'ebayitemspecificsoutsidediameter',
  'pitch diameter': 'ebayitemspecificspitchdiameter',
  'roller diameter': 'ebayitemspecificsrollerdiameter',
  'roller width': 'ebayitemspecificsrollerwidth',
  'overall depth': 'ebayitemspecificsoveralldepth',
  'face diameter': 'ebayitemspecificsfacediameter',

  // === MOUNTING/CONSTRUCTION ===
  'mounting type': 'ebayitemspecificsmountingtype',
  'mounting': 'ebayitemspecificsmounting',
  'mounting style': 'ebayitemspecificsmountingstyle',
  'mounting position': 'ebayitemspecificsmountingposition',
  'mounting location': 'ebayitemspecificsmountinglocation',
  'mount type': 'ebayitemspecificsmounttype',
  'enclosure': 'ebayitemspecificsenclosure',
  'enclosure type': 'ebayitemspecificsenclosure',
  'ip rating': 'ebayitemspecificsiprating',
  'protection against liquids': 'ebayitemspecificsprotectionagainstliquids',
  'material': 'ebayitemspecificshousingmaterial',
  'housing material': 'ebayitemspecificshousingmaterial',
  'body material': 'ebayitemspecificsbodymaterial',
  'pump housing material': 'ebayitemspecificspumphousingmaterial',
  'construction': 'ebayitemspecificsconstructiontype',
  'construction type': 'ebayitemspecificsconstructiontype',
  'gear material': 'ebayitemspecificsgearmaterial',
  'disc material': 'ebayitemspecificsdiscmaterial',
  'bowl material': 'ebayitemspecificsbowlmaterial',
  'blade material': 'ebayitemspecificsbladematerial',

  // === CONTROL/COMMUNICATION ===
  'communication': 'ebayitemspecificscommunicationstandard',
  'communication standard': 'ebayitemspecificscommunicationstandard',
  'communication protocol': 'ebayitemspecificscommunicationstandard',
  'interface': 'ebayitemspecificsinterfacecardtype',
  'interface type': 'ebayitemspecificsinterfacecardtype',
  'control type': 'ebayitemspecificscontroltype',
  'control style': 'ebayitemspecificscontrolstyle',
  'control': 'ebayitemspecificscontrol',
  'connectivity': 'ebayitemspecificsconnectivity',
  'network connectivity': 'ebayitemspecificsnetworkconnectivity',
  'wired wireless': 'ebayitemspecificswiredwireless',

  // === CYLINDERS/PNEUMATICS ===
  'cylinder type': 'ebayitemspecificscylindertype',
  'cylinder action': 'ebayitemspecificscylinderaction',
  'stroke length': 'ebayitemspecificsstrokelength',
  'stroke': 'ebayitemspecificsstrokelength',
  'number of rods': 'ebayitemspecificsnumberofrods',

  // === VALVES ===
  'valve type': 'ebayitemspecificssolenoidvalvetype',
  'solenoid valve type': 'ebayitemspecificssolenoidvalvetype',
  'butterfly valve type': 'ebayitemspecificsbutterflyvalvetype',
  'pressure reducing valve type': 'ebayitemspecificspressurereducingvalvetype',
  'valve operation': 'ebayitemspecificsvalveoperation',
  'number of ways': 'ebayitemspecificsnumberofways',
  'number of positions': 'ebayitemspecificsnumberofpositions',
  'actuator type': 'ebayitemspecificsactuatortype',
  'actuation type': 'ebayitemspecificsactuationtype',
  'actuation force': 'ebayitemspecificsactuationforce',

  // === PUMPS ===
  'pump type': 'ebayitemspecificspumptype',
  'pump action': 'ebayitemspecificspumpaction',
  'pump housing material': 'ebayitemspecificspumphousingmaterial',
  'centrifugal pump type': 'ebayitemspecificscentrifugalpumptype',
  'hydraulic pump type': 'ebayitemspecificshydraulicpumptype',
  'diaphragm pump type': 'ebayitemspecificsdiaphragmpumptype',

  // === SENSORS ===
  'sensor type': 'ebayitemspecificssensortype',
  'sensing type': 'ebayitemspecificssensingtype',
  'sensing technology': 'ebayitemspecificssensortype',
  'sensing range': 'ebayitemspecificsnominalsensingradius',
  'sensing radius': 'ebayitemspecificsnominalsensingradius',
  'nominal sensing radius': 'ebayitemspecificsnominalsensingradius',
  'actual sensing radius': 'ebayitemspecificsactualsensingradius',
  'operating distance': 'ebayitemspecificsoperatingdistance',
  'field of view': 'ebayitemspecificsfieldofview',
  'actual field of view': 'ebayitemspecificsactualfieldofview',

  // === ROBOTS/AUTOMATION ===
  'number of axes': 'ebayitemspecificsnumberofaxes',
  'payload': 'ebayitemspecificspayload',
  'reach': 'ebayitemspecificsarmreach',
  'arm reach': 'ebayitemspecificsarmreach',
  'max reach height': 'ebayitemspecificsmaximumreachheight',
  'rotation angle': 'ebayitemspecificsrotationangle',
  'angle of rotation': 'ebayitemspecificsangleofrotation',

  // === DRIVES/VFDs ===
  'inverter duty rating': 'ebayitemspecificsinvertervectordutyrating',
  'switching frequency': 'ebayitemspecificsswitchingfrequency',

  // === CIRCUIT BREAKERS/RELAYS ===
  'circuit breaker type': 'ebayitemspecificscircuitbreakertype',
  'fuse type': 'ebayitemspecificsfusetype',
  'fuse classification': 'ebayitemspecificsfuseclassification',
  'fuse speed': 'ebayitemspecificsfusespeed',
  'fuse body type': 'ebayitemspecificsfusebodytype',
  'contact form': 'ebayitemspecificscontactform',
  'contact configuration': 'ebayitemspecificscontactconfiguration',
  'contact material': 'ebayitemspecificscontactmaterial',
  'number of poles': 'ebayitemspecificsnumberofpoles',
  'pole configuration': 'ebayitemspecificspoleconfiguration',
  'number of throws': 'ebayitemspecificsnumberofthrows',
  'number of circuits': 'ebayitemspecificsnumberofcircuits',
  'current conversion': 'ebayitemspecificscurrentconversion',
  'conversion function': 'ebayitemspecificsconversionfunction',

  // === BUTTONS/SWITCHES ===
  'button type': 'ebayitemspecificsbuttontype',
  'button shape': 'ebayitemspecificsbuttonshape',
  'button color': 'ebayitemspecificsbuttoncolor',
  'illumination': 'ebayitemspecificsillumination',
  'switch action': 'ebayitemspecificsswitchaction',
  'switch style': 'ebayitemspecificsswitchstyle',
  'operator type': 'ebayitemspecificsoperatortype',

  // === DISPLAY/HMI ===
  'display': 'ebayitemspecificsdisplay',
  'display type': 'ebayitemspecificsdisplaytype',
  'display screen size': 'ebayitemspecificsdisplayscreensize',
  'screen size': 'ebayitemspecificsscreensize',
  'display resolution': 'ebayitemspecificsdisplayresolution',
  'max resolution': 'ebayitemspecificsmaxresolution',
  'maximum resolution': 'ebayitemspecificsmaximumresolution',
  'touchscreen': 'ebayitemspecificstouchscreen',
  'brightness': 'ebayitemspecificsbrightness',
  'contrast ratio': 'ebayitemspecificscontrastratio',

  // === ENCODERS/GEARS ===
  'pulses per revolution': 'ebayitemspecificspulsesperrevolution',
  'encoding type': 'ebayitemspecificsencodingtype',
  'number of teeth': 'ebayitemspecificsnumberofteeth',
  'gear ratio': 'ebayitemspecificsgearratio',
  'nominal ratio': 'ebayitemspecificsnominalratio',

  // === BEARINGS ===
  'bearing type': 'ebayitemspecificsbearingstype',
  'bearings type': 'ebayitemspecificsbearingstype',
  'bearing insert type': 'ebayitemspecificsbearinginserttype',
  'bearing bushing part type': 'ebayitemspecificsbearingbushingparttype',
  'bearing bore diameter': 'ebayitemspecificsborediameter',
  'bearing bore': 'ebayitemspecificsborediameter',
  'bearing id': 'ebayitemspecificsborediameter',
  'bearing inner diameter': 'ebayitemspecificsborediameter',
  'bearing outside diameter': 'ebayitemspecificsoutsidediameter',
  'bearing outer diameter': 'ebayitemspecificsoutsidediameter',
  'bearing od': 'ebayitemspecificsoutsidediameter',
  'bearing width': 'ebayitemspecificswidth',
  'bearing material': 'ebayitemspecificsmaterial',
  'seal type': 'ebayitemspecificssealtype',

  // === FILTERS ===
  'filter type': 'ebayitemspecificsfiltertype',
  'filter material': 'ebayitemspecificsfiltermaterial',
  'filter rating': 'ebayitemspecificsfilterrating',
  'filter features': 'ebayitemspecificsfilterfeatures',
  'filtration style': 'ebayitemspecificsfiltrationstyle',

  // === TRANSFORMERS ===
  'primary voltage': 'ebayitemspecificsprimaryvoltageratingac',
  'primary voltage ac': 'ebayitemspecificsprimaryvoltageratingac',
  'primary voltage dc': 'ebayitemspecificsprimaryvoltageratingdc',
  'secondary voltage': 'ebayitemspecificssecondaryvoltageratingac',
  'secondary voltage ac': 'ebayitemspecificssecondaryvoltageratingac',
  'secondary voltage dc': 'ebayitemspecificssecondaryvoltageratingdc',
  'turns ratio': 'ebayitemspecificsturnsratio',

  // === TEMPERATURE ===
  'temperature range': 'ebayitemspecificstemperaturerange',
  'operating temperature': 'ebayitemspecificsoperatingtemperature',
  'max operating temperature': 'ebayitemspecificsmaximumoperatingtemperatu',
  'min operating temperature': 'ebayitemspecificsminimumoperatingtemperatu',
  'temperature': 'ebayitemspecificstemperature',
  'temperature control': 'ebayitemspecificstemperaturecontrol',

  // === CAPACITY/LOAD ===
  'load capacity': 'ebayitemspecificsloadcapacity',
  'load capacity lbs': 'ebayitemspecificsloadcapacitylbs',
  'rated load': 'ebayitemspecificsratedload',
  'max load': 'ebayitemspecificsmaximumload',
  'operating load': 'ebayitemspecificsoperatingload',
  'operating weight': 'ebayitemspecificsoperatingweight',
  'tank capacity': 'ebayitemspecificstankcapacity',
  'air tank capacity': 'ebayitemspecificsairtankcapacity',
  'reservoir capacity': 'ebayitemspecificsreservoircapacity',
  'nominal capacity': 'ebayitemspecificsnominalcapacity',
  'cooling capacity': 'ebayitemspecificscoolingcapacity',
  'btu cooling rating': 'ebayitemspecificsbtucoolingrating',
  'btu heating rating': 'ebayitemspecificsbtuheatingrating',
  'heating btu': 'ebayitemspecificsheatingbtu',

  // === SPEED/BLADES ===
  'number of speeds': 'ebayitemspecificsnumberofspeeds',
  'number of speed': 'ebayitemspecificsnumberofspeed',
  'fan speed': 'ebayitemspecificsfanspeed',
  'blower motor speed': 'ebayitemspecificsblowermotorspeed',
  'number of blades': 'ebayitemspecificsnumberofblades',
  'number of fan motors': 'ebayitemspecificsnumberoffanmotors',

  // === GENERAL PRODUCT INFO ===
  'brand': 'ebayitemspecificsbrand',
  'mpn': 'ebayitemspecificsmpn',
  'model': 'ebayitemspecificsmodel',
  'type': 'ebayitemspecificstype',
  'product type': 'ebayitemspecificsproducttype',
  'product': 'ebayitemspecificsproduct',
  'features': 'ebayitemspecificsfeatures',
  'function': 'ebayitemspecificsfunction',
  'application': 'ebayitemspecificsapplication',
  'suitable for': 'ebayitemspecificssuitablefor',
  'compatible equipment': 'ebayitemspecificscompatibleequipmenttype',
  'compatible equipment type': 'ebayitemspecificscompatibleequipmenttype',
  'compatible brand': 'ebayitemspecificscompatiblebrand',
  'compatible material': 'ebayitemspecificscompatiblematerial',

  // === COUNTRY/ORIGIN ===
  'country of origin': 'ebayitemspecificscountryoforigin',
  'country of manufacture': 'ebayitemspecificscountryoforigin',
  'origin': 'ebayitemspecificscountryoforigin',
  'made in': 'ebayitemspecificscountryoforigin',

  // === APPEARANCE ===
  'color': 'ebayitemspecificscolor',
  'manufacturer color': 'ebayitemspecificsmanufacturercolor',
  'shape': 'ebayitemspecificsshape',
  'box shape': 'ebayitemspecificsboxshape',
  'orientation': 'ebayitemspecificsorientation',
  'finish': 'ebayitemspecificsfinish',

  // === MISC ===
  'number of pins': 'ebayitemspecificsnumberofpins',
  'number of ports': 'ebayitemspecificsnumberofports',
  'number of outlets': 'ebayitemspecificsnumberofoutlets',
  'number of channels': 'ebayitemspecificsnumberofchannels',
  'number of stages': 'ebayitemspecificsnumberofstages',
  'number of steps': 'ebayitemspecificsnumberofsteps',
  'outlet type': 'ebayitemspecificsoutlettype',
  'outlet style': 'ebayitemspecificsoutsletstyle',
  'socket type': 'ebayitemspecificssockettype',
  'cable length': 'ebayitemspecificscablelength',
  'hose length': 'ebayitemspecificshoselength',
  'wire diameter': 'ebayitemspecificswirediameter',
  'wire style': 'ebayitemspecificswirestyle',
  'modified item': 'ebayitemspecificsmodifieditem',
  'custom bundle': 'ebayitemspecificscustombundle',
  'bundle description': 'ebayitemspecificsbundledescription',
  'items included': 'ebayitemspecificsitemsincluded',
  'battery included': 'ebayitemspecificsbatteryincluded',
  'manufacturer warranty': 'ebayitemspecificsmanufacturerwarranty',
  'year manufactured': 'ebayitemspecificsyearmanufactured',

  // === COMPUTERS/ELECTRONICS ===
  'processor speed': 'ebayitemspecificsprocessorspeed',
  'processor model': 'ebayitemspecificsprocessormodel',
  'cpu brand': 'ebayitemspecificscpubrand',
  'cpu clock speed': 'ebayitemspecificscpuclockspeed',
  'number of cpu cores': 'ebayitemspecificsnumberofcpucores',
  'ram size': 'ebayitemspecificsramsize',
  'memory size': 'ebayitemspecificsmemorysize',
  'memory type': 'ebayitemspecificsmemorytype',
  'memory': 'ebayitemspecificsmemory',
  'memory features': 'ebayitemspecificsmemoryfeatures',
  'hard drive capacity': 'ebayitemspecificsharddrivecapacity',
  'ssd capacity': 'ebayitemspecificsssdcapacity',
  'storage capacity': 'ebayitemspecificsstoragecapacity',
  'gpu': 'ebayitemspecificsgpu',
  'chipset manufacturer': 'ebayitemspecificschipsetmanufacturer',
  'chipset gpu model': 'ebayitemspecificschipsetgpumodel',
  'graphics processing type': 'ebayitemspecificsgraphicsprocessingtype',
  'operating system': 'ebayitemspecificsoperatingsystem',
  'motherboard brand': 'ebayitemspecificsmotherboardbrand',
  'number of memory slots': 'ebayitemspecificsnumberofmemoryslots',

  // === EFFICIENCY/PERFORMANCE ===
  'efficiency': 'ebayitemspecificsefficiency',
  'energy efficiency ratio': 'ebayitemspecificsenergyefficiencyratioeer',
  'performance level': 'ebayitemspecificsperformancelevel',
  'analog digital': 'ebayitemspecificsanalogdigital'
};

// -----------------------------------------------------------------------------
// REVERSE MAPPING: eBay field -> Common name (for display purposes)
// -----------------------------------------------------------------------------
export const EBAY_TO_DISPLAY_NAME = {
  'ebayitemspecificsmotorhorsepower': 'Motor Horsepower',
  'ebayitemspecificsratedhorsepower': 'Rated Horsepower',
  'ebayitemspecificsratedloadhp': 'Rated Load (HP)',
  'ebayitemspecificsnethorsepowerhp': 'Net Horsepower (HP)',
  'ebayitemspecificsratedrpm': 'Rated RPM',
  'ebayitemspecificsbaserpm': 'Base RPM',
  'ebayitemspecificsnoloadrpm': 'No Load RPM',
  'ebayitemspecificsmaximumrpm': 'Maximum RPM',
  'ebayitemspecificsratedvoltage': 'Rated Voltage',
  'ebayitemspecificsacphase': 'AC Phase',
  'ebayitemspecificsacfrequencyrating': 'AC Frequency Rating',
  'ebayitemspecificsnemaframesize': 'NEMA Frame Size',
  'ebayitemspecificsiecframesize': 'IEC Frame Size',
  'ebayitemspecificsservicefactor': 'Service Factor',
  'ebayitemspecificsinsulationclass': 'Insulation Class',
  'ebayitemspecificsnemadesignletter': 'NEMA Design Letter',
  'ebayitemspecificsacmotortype': 'AC Motor Type',
  'ebayitemspecificsmountingtype': 'Mounting Type',
  'ebayitemspecificsenclosure': 'Enclosure',
  'ebayitemspecificscountryoforigin': 'Country of Origin',
  'ebayitemspecificscontinuoustorque': 'Continuous Torque',
  'ebayitemspecificsholdingtorque': 'Holding Torque',
  'ebayitemspecificsamps': 'Amperage',
  'ebayitemspecificsactualcurrentrating': 'Current Rating',
  'ebayitemspecificsbearingstype': 'Bearings Type',
  'ebayitemspecificsborediameter': 'Bore Diameter',
  'ebayitemspecificsoutsidediameter': 'Outside Diameter',
  'ebayitemspecificswidth': 'Width',
  'ebayitemspecificsmaterial': 'Material',
  'ebayitemspecificssealtype': 'Seal Type'
};

// -----------------------------------------------------------------------------
// WEBSITE FIELD -> eBay FIELD CROSS-REFERENCE
// When AI populates a website field, also populate the corresponding eBay field(s)
// This ensures BOTH website AND eBay fields are always populated
// -----------------------------------------------------------------------------
export const WEBSITE_TO_EBAY_MAPPING = {
  // Motors - populate both motor horsepower AND rated horsepower
  'horsepower': ['ebayitemspecificsmotorhorsepower', 'ebayitemspecificsratedhorsepower'],
  'rpm': ['ebayitemspecificsratedrpm'],
  'frame': ['ebayitemspecificsnemaframesize'],
  'motortype': ['ebayitemspecificsacmotortype'],
  'enclosuretype': ['ebayitemspecificsenclosure'],

  // Electrical
  'voltage': ['ebayitemspecificsratedvoltage', 'ebayitemspecificsactualratedinputvoltage'],
  'inputvoltage': ['ebayitemspecificsnominalinputvoltagerating', 'ebayitemspecificsinputvoltagerange'],
  'outputvoltage': ['ebayitemspecificsouputvoltage', 'ebayitemspecificsoutputvoltageratingac'],
  'amperage': ['ebayitemspecificsamps', 'ebayitemspecificsactualcurrentrating'],
  'phase': ['ebayitemspecificsacphase', 'ebayitemspecificscurrentphase'],
  'hz': ['ebayitemspecificsacfrequencyrating'],
  'frequency': ['ebayitemspecificsacfrequencyrating', 'ebayitemspecificspowerfrequency'],
  'watts': ['ebayitemspecificswattage'],
  'kw': ['ebayitemspecificspowerkw'],
  'kva': ['ebayitemspecificskva'],
  'coilvoltage': ['ebayitemspecificscoilvoltagerating'],

  // Mechanical
  'torque': ['ebayitemspecificscontinuoustorque'],
  'mountingtype': ['ebayitemspecificsmountingtype'],
  'psi': ['ebayitemspecificsmaxpsi', 'ebayitemspecificsratedpressure'],
  'pressure': ['ebayitemspecificsratedpressure', 'ebayitemspecificsmaximumpressure'],
  'maxpressure': ['ebayitemspecificsmaximumpressure', 'ebayitemspecificsmaximumoutputpressure'],
  'flowrate': ['ebayitemspecificsmaximumflowrate'],
  'gpm': ['ebayitemspecificsgpm'],
  'material': ['ebayitemspecificshousingmaterial', 'ebayitemspecificsbodymaterial'],

  // Control/Sensors
  'communications': ['ebayitemspecificscommunicationstandard'],
  'sensortype': ['ebayitemspecificssensortype'],
  'sensingrange': ['ebayitemspecificsnominalsensingradius'],
  'operatingdistance': ['ebayitemspecificsoperatingdistance'],

  // Dimensions
  'length': ['ebayitemspecificsitemlength'],
  'width': ['ebayitemspecificsitemwidth'],
  'height': ['ebayitemspecificsitemheight'],
  'depth': ['ebayitemspecificsitemdepth'],
  'diameter': ['ebayitemspecificsitemdiameter', 'ebayitemspecificsbladediameter'],
  'shaftdiameter': ['ebayitemspecificsshaftdiameter'],

  // Country/Origin - populate BOTH fields
  'countryoforigin': ['ebayitemspecificscountryoforigin'],
  'countryregionofmanufacture': ['ebayitemspecificscountryoforigin']
};

// -----------------------------------------------------------------------------
// FUNCTION: Map AI-extracted specs to both website and eBay fields
// -----------------------------------------------------------------------------
export function mapSpecsToFields(aiExtractedSpecs) {
  const result = {
    websiteFields: {},
    ebayFields: {}
  };

  for (const [key, value] of Object.entries(aiExtractedSpecs)) {
    if (!value || value === '' || value === 'N/A' || value === 'Unknown') continue;

    const normalizedKey = key.toLowerCase().trim().replace(/[_\s]+/g, '');

    // Check if this is a standard website field
    const websiteField = WEBSITE_STANDARD_FIELDS.find(f =>
      f.toLowerCase().replace(/[_\s]+/g, '') === normalizedKey
    );

    if (websiteField) {
      result.websiteFields[websiteField] = value;

      // Also map to eBay if there's a cross-reference
      if (WEBSITE_TO_EBAY_MAPPING[websiteField]) {
        for (const ebayField of WEBSITE_TO_EBAY_MAPPING[websiteField]) {
          result.ebayFields[ebayField] = value;
        }
      }
    }

    // Check direct eBay mapping
    const keyVariants = [
      key,
      key.toLowerCase(),
      key.toLowerCase().replace(/_/g, ' '),
      key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
    ];

    for (const variant of keyVariants) {
      if (EBAY_FIELD_MAPPING[variant]) {
        result.ebayFields[EBAY_FIELD_MAPPING[variant]] = value;
        break;
      }
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// FUNCTION: Get all valid eBay item specifics field names
// -----------------------------------------------------------------------------
export function getValidEbayFields() {
  return new Set(Object.values(EBAY_FIELD_MAPPING));
}

// -----------------------------------------------------------------------------
// FUNCTION: Validate that a field name is a valid eBay item specific
// -----------------------------------------------------------------------------
export function isValidEbayField(fieldName) {
  return fieldName.startsWith('ebayitemspecifics') &&
         Object.values(EBAY_FIELD_MAPPING).includes(fieldName);
}

// -----------------------------------------------------------------------------
// FUNCTION: Generate usertype value (AI-generated descriptive product type)
// Examples: "General Purpose Motor", "Industrial Proximity Sensor", etc.
// -----------------------------------------------------------------------------
export function generateUserType(productCategory, specifications = {}) {
  const categoryTypeMap = {
    'Electric Motors': specifications.enclosuretype
      ? `${specifications.enclosuretype} Electric Motor`
      : 'General Purpose Motor',
    'Servo Motors': 'Industrial Servo Motor',
    'Servo Drives': 'Industrial Servo Drive',
    'VFDs': 'Variable Frequency Drive',
    'PLCs': 'Programmable Logic Controller',
    'HMIs': 'Human Machine Interface',
    'Power Supplies': 'Industrial Power Supply',
    'I/O Modules': 'Industrial I/O Module',
    'Proximity Sensors': 'Industrial Proximity Sensor',
    'Photoelectric Sensors': 'Photoelectric Sensor',
    'Light Curtains': 'Safety Light Curtain',
    'Laser Sensors': 'Industrial Laser Sensor',
    'Pressure Sensors': 'Industrial Pressure Sensor',
    'Temperature Sensors': 'Industrial Temperature Sensor',
    'Pneumatic Cylinders': 'Pneumatic Air Cylinder',
    'Pneumatic Valves': 'Pneumatic Control Valve',
    'Pneumatic Grippers': 'Pneumatic Gripper',
    'Hydraulic Pumps': 'Hydraulic Pump',
    'Hydraulic Valves': 'Hydraulic Control Valve',
    'Hydraulic Cylinders': 'Hydraulic Cylinder',
    'Circuit Breakers': 'Industrial Circuit Breaker',
    'Contactors': 'Motor Contactor',
    'Safety Relays': 'Safety Relay Module',
    'Control Relays': 'Industrial Control Relay',
    'Bearings': 'Industrial Bearing',
    'Linear Bearings': 'Linear Motion Bearing',
    'Encoders': 'Rotary Encoder',
    'Gearboxes': 'Industrial Gearbox',
    'Transformers': 'Industrial Transformer',
    'Industrial Gateways': 'Industrial Communication Gateway',
    'Network Modules': 'Industrial Network Module'
  };

  return categoryTypeMap[productCategory] || 'Industrial Equipment';
}

export default {
  WEBSITE_STANDARD_FIELDS,
  EBAY_FIELD_MAPPING,
  EBAY_TO_DISPLAY_NAME,
  WEBSITE_TO_EBAY_MAPPING,
  mapSpecsToFields,
  getValidEbayFields,
  isValidEbayField,
  generateUserType
};
