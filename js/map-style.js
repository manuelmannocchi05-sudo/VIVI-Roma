/* VIVI Roma — prototipo Protomaps: dati, sorgente e stile della mappa vettoriale.
   Stile disegnato per VIVI (non un tema di serie): sfondo avorio caldo, parchi verde tenue, Tevere ben visibile,
   strade principali con bordo dorato, strade secondarie bianche, nomi in italiano dove esistono, poche etichette.
   Nessun filtro CSS sopra la mappa vettoriale: i colori sono già quelli finali (il filtro resta solo per OSM). */

/* Area dei tasselli in tiles/ (vedi tools/maps/area-roma.json). protomaps-leaflet disegna allo zoom N della mappa
   i dati dello zoom N-1 (tasselli vettoriali da 512 px): dati 12-15 sul catalogo con 1,6 km di margine (zoom 13-16
   della mappa, oltre il 16 si ingrandiscono i vettori), dati 11 su un riquadro più ampio (zoom 12 della mappa).
   La mappa non scende sotto il 12 e non esce dal riquadro di dettaglio: nessuno sfondo vuoto. */
export const TILE_AREA_DETAIL={west:12.427,south:41.821,east:12.583,north:41.934};
export const TILE_AREA_WIDE={west:12.33,south:41.76,east:12.67,north:41.99};
export const MAP_MIN_ZOOM=12;
export const TILE_MAX_DATA_ZOOM=15;
export const TILE_URL="tiles/{z}/{x}/{y}.mvt.gz";
export const ATTRIBUTION='<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/* Sorgente dei tasselli per protomaps-leaflet: file .mvt.gz statici (nessuna richiesta Range: va bene su qualsiasi
   hosting statico). Se l'hosting li decomprime già (Content-Encoding), i byte arrivano senza intestazione gzip e si
   usano così come sono. Tassello inesistente (404, fuori area): zona vuota, nessun errore. Rete assente: errore,
   così la mappa può avvisare. Ogni richiesta è annullabile (signal): spostandosi in fretta non si scarica il superfluo. */
export const canDecompress=()=>typeof DecompressionStream==="function";
export function tileSource(base,{onError}={}){
  return {async getZxy(z,x,y,signal){
    let res;
    try{res=await fetch(base.replace("{z}",z).replace("{x}",x).replace("{y}",y),{signal});}
    catch(e){if(e&&e.name!=="AbortError"&&onError)onError(e);throw e;}   /* protomaps-leaflet non emette «tileerror»: si avvisa qui */
    if(res.status===404)return undefined;
    if(!res.ok){const e=new Error("tassello "+z+"/"+x+"/"+y+": "+res.status);if(onError)onError(e);throw e;}
    const buf=await res.arrayBuffer(),u8=new Uint8Array(buf);
    if(u8[0]!==0x1f||u8[1]!==0x8b)return {data:buf};
    const data=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    return {data};
  }};
}

/* Palette (colori VIVI: verde #263F35, avorio #F5F1E8, oro #C6A66A) */
export const COLORS={
  background:"#F3EDE2",     /* avorio caldo */
  pedestrian:"#EEE6D7",     /* piazze e aree pedonali */
  civic:"#EFE8DB",          /* scuole, ospedali, aree pubbliche: appena distinte */
  park:"#DCE5C9",           /* parchi e giardini: verde tenue */
  wood:"#CFDCB9",
  grass:"#E2E8CF",
  water:"#A8C8D2",          /* Tevere */
  waterLine:"#8DB6C3",
  waterLabel:"#4B7787",
  building:"#E6DDCD",
  buildingEdge:"#DCD1BE",
  rail:"#BFB4A2",
  path:"#E3D8C4",
  minor:"#FFFFFF",minorCase:"#DDD1BC",
  major:"#FBF1DA",majorCase:"#CDAE74",
  highway:"#F3DDAA",highwayCase:"#BE9A5C",
  label:"#3E3A33",labelMinor:"#5E574C",halo:"#F8F4EC",
  park_label:"#55704C",area_label:"#7A6E5D"
};

/* larghezze in pixel per zoom (interpolazione lineare tra i punti) */
const lin=stops=>z=>{if(z<=stops[0][0])return stops[0][1];for(let i=1;i<stops.length;i++)if(z<=stops[i][0]){const [z0,v0]=stops[i-1],[z1,v1]=stops[i];return v0+(v1-v0)*(z-z0)/(z1-z0);}return stops[stops.length-1][1];};
const W={
  highway:lin([[12,1.6],[14,3.6],[15,5.5],[17,11],[19,22]]),
  major:lin([[12,0.9],[13,1.6],[14,2.8],[15,4.6],[17,9.5],[19,19]]),
  minor:lin([[13,0.5],[14,1.1],[15,2.4],[17,6.5],[19,14]]),
  path:lin([[14,0.5],[15,0.8],[17,1.6]]),
  rail:lin([[12,0.6],[15,1.2],[17,2]]),
  river:lin([[12,1],[14,2],[16,4]])
};
const caseW=(f,extra)=>z=>f(z)+(z>=14?extra(z):z>=13?0.8:0);
const kindIs=(...k)=>(z,f)=>k.includes(f.props.kind);
const notTunnel=(z,f)=>!f.props.is_tunnel;
/* nome italiano quando c'è (name:it), altrimenti il nome locale; si evitano le forme latine dei ruderi minori
   perché le etichette dei monumenti non si disegnano (li nominano già marcatori e schede) */
const NAME=["name:it","name"];

export function mapRules(pm){
  const P=(dataLayer,color,filter,extra={})=>({dataLayer,filter,symbolizer:new pm.PolygonSymbolizer({fill:color,...extra})});
  const Ln=(dataLayer,opts,filter,minzoom)=>({dataLayer,filter,minzoom,symbolizer:new pm.LineSymbolizer({lineCap:"round",lineJoin:"round",...opts})});
  const C=COLORS;
  const paintRules=[
    {dataLayer:"earth",symbolizer:new pm.PolygonSymbolizer({fill:C.background})},
    P("landuse",C.civic,kindIs("school","university","college","hospital","military","industrial","railway")),
    P("landuse",C.grass,kindIs("grass","grassland","scrub","village_green","allotments","farmland","meadow")),
    P("landuse",C.park,kindIs("park","garden","cemetery","playground","golf_course","national_park","protected_area","nature_reserve","zoo","pitch","recreation_ground","dog_park")),
    P("landuse",C.wood,kindIs("wood","forest")),
    P("landuse",C.pedestrian,kindIs("pedestrian","pier","platform")),
    {dataLayer:"water",filter:(z,f)=>f.geomType===3,symbolizer:new pm.PolygonSymbolizer({fill:C.water})},
    Ln("water",{color:C.waterLine,width:W.river},(z,f)=>f.geomType===2&&["river","canal"].includes(f.props.kind)),
    {dataLayer:"buildings",minzoom:14,symbolizer:new pm.PolygonSymbolizer({fill:C.building,opacity:z=>z<15?0.75:1})},
    /* bordi delle strade (sotto) */
    Ln("roads",{color:C.minorCase,width:caseW(W.minor,z=>z>=16?2:1.4)},(z,f)=>notTunnel(z,f)&&f.props.kind==="minor_road",14),
    Ln("roads",{color:C.majorCase,width:caseW(W.major,z=>z>=16?2.4:1.6)},(z,f)=>notTunnel(z,f)&&f.props.kind==="major_road",13),
    Ln("roads",{color:C.highwayCase,width:caseW(W.highway,z=>z>=16?2.6:1.8)},(z,f)=>notTunnel(z,f)&&f.props.kind==="highway",12),
    /* binari e sentieri */
    Ln("roads",{color:C.rail,width:W.rail,dash:[3,3]},(z,f)=>f.props.kind==="rail"&&!f.props.is_tunnel,12),
    Ln("roads",{color:C.path,width:W.path},(z,f)=>notTunnel(z,f)&&["path","other"].includes(f.props.kind)&&f.props.kind_detail!=="pier",15),
    /* riempimento delle strade (sopra) */
    Ln("roads",{color:C.minor,width:W.minor},(z,f)=>notTunnel(z,f)&&f.props.kind==="minor_road",13),
    Ln("roads",{color:C.major,width:W.major},(z,f)=>notTunnel(z,f)&&f.props.kind==="major_road",12),
    Ln("roads",{color:C.highway,width:W.highway},(z,f)=>notTunnel(z,f)&&f.props.kind==="highway",12)
  ];
  const T=(opts)=>({labelProps:NAME,stroke:C.halo,width:3,fontFamily:"Inter, system-ui, sans-serif",...opts});
  const labelRules=[
    /* Tevere */
    {dataLayer:"water",minzoom:12,filter:(z,f)=>f.props.kind==="river"&&f.geomType===2,
      symbolizer:new pm.LineLabelSymbolizer(T({fill:C.waterLabel,fontStyle:"italic",fontWeight:500,fontSize:z=>z<14?12:13,letterSpacing:1}))},
    /* strade principali dallo zoom 13 della mappa, secondarie dal 15 (le soglie delle regole sono zoom dei dati, uno in meno) */
    {dataLayer:"roads",minzoom:13,filter:(z,f)=>["highway","major_road"].includes(f.props.kind)&&!!f.props.name,
      symbolizer:new pm.LineLabelSymbolizer(T({fill:C.label,fontWeight:600,fontSize:z=>z<15?11.5:12.5}))},
    {dataLayer:"roads",minzoom:14,filter:(z,f)=>f.props.kind==="minor_road"&&!!f.props.name,
      symbolizer:new pm.LineLabelSymbolizer(T({fill:C.labelMinor,fontWeight:500,fontSize:z=>z<15?10.5:11.5,repeatDistance:200}))},
    /* quartieri (Trastevere, Monti, Garbatella…), solo agli zoom bassi e medi */
    {dataLayer:"places",minzoom:12,maxzoom:15,filter:(z,f)=>["neighbourhood","macrohood","locality"].includes(f.props.kind)&&f.props.name!=="Roma"&&!/^Roma \d/.test(f.props.name)&&(f.props.min_zoom===undefined||f.props.min_zoom<=z+1),
      symbolizer:new pm.CenteredTextSymbolizer(T({fill:C.area_label,fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:1.2}))},
    /* nomi dei parchi e delle ville più grandi */
    {dataLayer:"pois",minzoom:14,filter:(z,f)=>["park","garden","nature_reserve"].includes(f.props.kind)&&!!f.props.name&&(f.props.min_zoom===undefined||f.props.min_zoom<=z-1),
      symbolizer:new pm.CenteredTextSymbolizer(T({fill:C.park_label,fontStyle:"italic",fontWeight:500,fontSize:11.5}))}
  ];
  return {paintRules,labelRules,backgroundColor:C.background};
}
