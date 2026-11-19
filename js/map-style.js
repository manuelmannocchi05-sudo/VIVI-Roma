/* VIVI Roma — prototipo Protomaps: colori della mappa vettoriale.
   Partono dal tema «light» di @protomaps/basemaps e riprendono i toni di OpenStreetMap Carto (lo sfondo
   approvato), così il filtro CSS già usato sulla mappa (#map .leaflet-tile-pane) dà lo stesso aspetto. */
export const TILE_AREA={south:41.875,west:12.445,north:41.92,east:12.52};   /* riquadro estratto in tiles/ */
export const TILE_URL="tiles/{z}/{x}/{y}.mvt.gz";
/* Sorgente dei tasselli per protomaps-leaflet: file .mvt.gz statici (nessuna richiesta Range, va bene su qualsiasi
   hosting). Se l'hosting li decomprime già (Content-Encoding), i byte arrivano senza l'intestazione gzip e si usano
   così come sono. Tassello assente (fuori dall'area estratta): mappa vuota in quel punto, nessun errore. */
export const canDecompress=()=>typeof DecompressionStream==="function";
export function tileSource(base){
  return {async getZxy(z,x,y,signal){
    const res=await fetch(base.replace("{z}",z).replace("{x}",x).replace("{y}",y),{signal});
    if(!res.ok)return undefined;
    const buf=await res.arrayBuffer(),u8=new Uint8Array(buf);
    if(u8[0]!==0x1f||u8[1]!==0x8b)return {data:buf};
    const data=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    return {data};
  }};
}
export const TILE_MAX_DATA_ZOOM=15;
export const ATTRIBUTION='<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const casing="#bfb19a",minor="#ffffff";
export const FLAVOR={
  background:"#e9e2d5",earth:"#e9e2d5",
  park_a:"#cdeab6",park_b:"#bfe3a4",hospital:"#f5e4e0",industrial:"#ebdbe8",school:"#f1ead5",
  wood_a:"#c8dfb5",wood_b:"#add19e",pedestrian:"#ece8df",scrub_a:"#d6e6c3",scrub_b:"#c8d7ab",
  glacier:"#eef3f5",sand:"#f5e9c6",beach:"#fff1ba",aerodrome:"#e9e7e2",runway:"#d4d0c9",
  water:"#aad3df",zoo:"#d6ecc9",military:"#efe4e0",
  tunnel_other_casing:casing,tunnel_minor_casing:casing,tunnel_link_casing:casing,tunnel_major_casing:casing,tunnel_highway_casing:casing,
  tunnel_other:"#f3f0ea",tunnel_minor:"#f3f0ea",tunnel_link:"#f3f0ea",tunnel_major:"#f6efdf",tunnel_highway:"#f6e6c8",
  pier:"#f2efe9",buildings:"#d5c9b9",
  minor_service_casing:casing,minor_casing:casing,link_casing:casing,major_casing_late:"#d9c9a8",highway_casing_late:"#d4b98c",
  other:"#f7f5f0",minor_service:minor,minor_a:minor,minor_b:minor,link:"#fdf3dc",
  major_casing_early:"#d9c9a8",major:"#fcefcf",highway_casing_early:"#d4b98c",highway:"#f9dfae",
  railway:"#b3aca2",boundaries:"#b9a9b8",
  bridges_other_casing:casing,bridges_minor_casing:casing,bridges_link_casing:casing,bridges_major_casing:"#d9c9a8",bridges_highway_casing:"#d4b98c",
  bridges_other:"#f7f5f0",bridges_minor:minor,bridges_link:"#fdf3dc",bridges_major:"#fcefcf",bridges_highway:"#f9dfae",
  roads_label_minor:"#6f675e",roads_label_minor_halo:"#fbf9f4",roads_label_major:"#5f574e",roads_label_major_halo:"#fbf9f4",
  ocean_label:"#4f7d93",subplace_label:"#6a625a",subplace_label_halo:"#f6f2ea",city_label:"#3f3a35",city_label_halo:"#f6f2ea",
  state_label:"#9b938a",state_label_halo:"#f6f2ea",country_label:"#8d857c",address_label:"#8d857c",address_label_halo:"#fbf9f4",
  pois:{blue:"#4f7d93",green:"#4e7a55",lapis:"#4f6aa8",pink:"#a8577f",red:"#a8574f",slategray:"#6f6a80",tangerine:"#a8742f",turquoise:"#3f8f93"}
};

/* Regole di disegno ed etichette: quelle di protomaps-leaflet per questi colori, con due ritocchi per avvicinarsi
   alla densità di informazioni della mappa approvata: nomi delle vie minori da zoom 15 (invece di 16) e nomi
   dei parchi, dei monumenti e delle piazze più importanti da zoom 15 (solo quelli con min_zoom ≤ zoom − 2). */
const POI_KINDS=["park","garden","attraction","museum","archaeological_site","monument","castle","viewpoint","fountain","square"];
export function mapRules(pm,lang){
  const labelRules=pm.labelRules(FLAVOR,lang).map(r=>r.dataLayer==="roads"&&r.minzoom===16?{...r,minzoom:15}:r);
  labelRules.push({dataLayer:"pois",minzoom:15,
    symbolizer:new pm.CenteredTextSymbolizer({labelProps:["name"],fill:"#6a7563",stroke:"#f4efe6",width:2,font:"italic 500 11px Inter, sans-serif"}),
    filter:(z,f)=>POI_KINDS.includes(f.props.kind)&&!!f.props.name&&(f.props.min_zoom===undefined||f.props.min_zoom<=z-2)});
  return {paintRules:pm.paintRules(FLAVOR),labelRules,backgroundColor:FLAVOR.background};
}
